// ==UserScript==
// @name         SCOUT Industry Skills Heat Map
// @namespace    ns-scm-tools-fy27
// @version      27.0.0
// @description  Adds a SCOUT 1:1 industry skills heat map to NetSuite saved search 1326590.
// @author       Michael Anderson
// @match        https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://nlcorp.app.netsuite.com/app/common/search/searchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/searchresults.nl*
// @grant        GM_setClipboard
// @run-at       document-end
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/scout-industry-skills-heatmap.user.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/scout-industry-skills-heatmap.user.js
// ==/UserScript==

(function () {
  "use strict";

  const SCRIPT_VERSION = "27.0.0";
  const SAVED_SEARCH_ID = "1326590";
  const SCRIPT_UPDATE_URL = "https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/scout-industry-skills-heatmap.user.js";
  const ROOT_ID = "scout-industry-skills-heatmap";
  const STYLE_ID = "scout-industry-skills-heatmap-styles";
  const STORAGE_KEY = "scout-industry-skills-heatmap-state-v1";
  const ALL = "__all__";
  const STALE_AFTER_DAYS = 120;
  const MAX_REVIEW_ITEMS = 12;

  const headerAliases = {
    employee: ["employee", "sc", "solutionconsultant", "salesconsultant", "consultant", "name"],
    industryFamily: ["industryfamily", "industry", "vertical", "industryvertical", "industrygroup"],
    industrySubGroup: ["industrysubgroup", "industrysubgroupname", "subgroup", "industrygrouping", "subvertical"],
    subIndustry: ["subindustry", "subindustryname", "industrysegment", "segment"],
    rating: ["rating", "currentrating", "skillrating", "industryrating"],
    lastUpdated: ["lastupdated", "lastmodified", "updated", "dateupdated", "modified"]
  };

  const ratingMeta = {
    0: { label: "0 - No Knowledge", shortLabel: "No Knowledge", bg: "#F8E3DF", fg: "#7F231A", accent: "#C74634" },
    1: { label: "1 - Familiar", shortLabel: "Familiar", bg: "#F9E8B8", fg: "#6E4A00", accent: "#C98616" },
    2: { label: "2 - Working", shortLabel: "Working", bg: "#D9EDF4", fg: "#174C61", accent: "#3B7C92" },
    3: { label: "3 - Strong", shortLabel: "Strong", bg: "#DDEEDC", fg: "#245C33", accent: "#4C825C" }
  };

  const params = new URLSearchParams(window.location.search || "");
  if (params.get("searchid") !== SAVED_SEARCH_ID) return;

  let appModel = null;
  let nativeTable = null;
  let retryCount = 0;
  let state = loadState();

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadState() {
    const fallback = {
      employee: ALL,
      family: ALL,
      subgroup: ALL,
      mode: "all",
      query: "",
      nativeHidden: false
    };

    try {
      return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (error) {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("SCOUT heat map: could not save filters", error);
    }
  }

  function cellText(cell) {
    return cleanText(cell ? cell.textContent : "");
  }

  function rowCells(row) {
    return Array.from(row.querySelectorAll("th,td")).map(cellText);
  }

  function findHeaderIndex(headers, key) {
    const aliases = headerAliases[key] || [];
    return headers.findIndex(header => aliases.includes(header));
  }

  function parseRatingScore(value) {
    const text = cleanText(value);
    const numberMatch = text.match(/-?\d+(?:\.\d+)?/);
    if (numberMatch) {
      const score = Math.round(Number(numberMatch[0]));
      if (Number.isFinite(score)) return Math.max(0, Math.min(3, score));
    }

    if (/no\s*knowledge|none|unknown/i.test(text)) return 0;
    if (/familiar|basic|limited/i.test(text)) return 1;
    if (/working|intermediate|proficient/i.test(text)) return 2;
    if (/strong|advanced|expert|demo/i.test(text)) return 3;
    return null;
  }

  function parseNetSuiteDate(value) {
    const text = cleanText(value);
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!match) {
      const fallback = Date.parse(text);
      return Number.isFinite(fallback) ? fallback : null;
    }

    let year = Number(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, Number(match[1]) - 1, Number(match[2]));
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }

  function formatDate(ms) {
    if (!ms) return "";
    try {
      return new Date(ms).toLocaleDateString([], { month: "numeric", day: "numeric", year: "numeric" });
    } catch (error) {
      return "";
    }
  }

  function daysSince(ms) {
    if (!ms) return null;
    return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
  }

  function isStale(record) {
    const age = daysSince(record.lastUpdatedMs);
    return age !== null && age > STALE_AFTER_DAYS;
  }

  function makeRowKey(record) {
    return [
      record.industryFamily,
      record.industrySubGroup,
      record.subIndustry
    ].map(normalizeKey).join("|");
  }

  function parseTableCandidate(table) {
    const rowData = Array.from(table.querySelectorAll("tr"))
      .map(row => ({ row, cells: rowCells(row) }))
      .filter(item => item.cells.some(Boolean));

    const headerIndex = rowData.findIndex(item => {
      const normalized = item.cells.map(normalizeKey);
      return findHeaderIndex(normalized, "employee") >= 0
        && findHeaderIndex(normalized, "subIndustry") >= 0
        && findHeaderIndex(normalized, "rating") >= 0;
    });

    if (headerIndex < 0) return [];

    const headers = rowData[headerIndex].cells.map(normalizeKey);
    const indexes = Object.fromEntries(Object.keys(headerAliases).map(key => [key, findHeaderIndex(headers, key)]));
    const getValue = (cells, key) => indexes[key] >= 0 ? cleanText(cells[indexes[key]]) : "";

    return rowData.slice(headerIndex + 1).map(({ cells }) => {
      const employee = getValue(cells, "employee");
      const subIndustry = getValue(cells, "subIndustry");
      const ratingText = getValue(cells, "rating");
      if (!employee || normalizeKey(employee) === "total" || !subIndustry) return null;

      const ratingScore = parseRatingScore(ratingText);
      const lastUpdatedText = getValue(cells, "lastUpdated");
      const record = {
        employee,
        industryFamily: getValue(cells, "industryFamily") || "Unmapped",
        industrySubGroup: getValue(cells, "industrySubGroup") || "Unmapped",
        subIndustry,
        ratingText,
        ratingScore,
        lastUpdatedText,
        lastUpdatedMs: parseNetSuiteDate(lastUpdatedText)
      };
      record.rowKey = makeRowKey(record);
      return record;
    }).filter(Boolean);
  }

  function collectRecords() {
    const candidates = Array.from(document.querySelectorAll("table")).map(table => ({
      table,
      records: parseTableCandidate(table)
    })).filter(item => item.records.length);

    candidates.sort((a, b) => b.records.length - a.records.length);
    if (!candidates.length) return { table: null, records: [] };

    const seen = new Map();
    candidates[0].records.forEach(record => {
      const key = `${normalizeKey(record.employee)}|${record.rowKey}`;
      const existing = seen.get(key);
      if (!existing || (record.lastUpdatedMs || 0) >= (existing.lastUpdatedMs || 0)) {
        seen.set(key, record);
      }
    });

    return {
      table: candidates[0].table,
      records: Array.from(seen.values())
    };
  }

  function alphaSort(left, right) {
    return String(left || "").localeCompare(String(right || ""), undefined, { sensitivity: "base" });
  }

  function buildModel(records) {
    const people = Array.from(new Set(records.map(record => record.employee))).sort(alphaSort);
    const families = Array.from(new Set(records.map(record => record.industryFamily))).sort(alphaSort);
    const rowMap = new Map();
    const cellMap = new Map();

    records.forEach(record => {
      if (!rowMap.has(record.rowKey)) {
        rowMap.set(record.rowKey, {
          key: record.rowKey,
          family: record.industryFamily,
          subgroup: record.industrySubGroup,
          subIndustry: record.subIndustry
        });
      }
      cellMap.set(`${record.employee}|${record.rowKey}`, record);
    });

    const rows = Array.from(rowMap.values()).sort((left, right) => {
      return alphaSort(left.family, right.family)
        || alphaSort(left.subgroup, right.subgroup)
        || alphaSort(left.subIndustry, right.subIndustry);
    });

    return { records, people, families, rows, cellMap };
  }

  function recordMatchesQuery(record, query) {
    if (!query) return true;
    const haystack = [
      record.employee,
      record.industryFamily,
      record.industrySubGroup,
      record.subIndustry,
      record.ratingText
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function recordMatchesMode(record) {
    if (state.mode === "gaps") return record.ratingScore === null || record.ratingScore <= 1;
    if (state.mode === "strong") return record.ratingScore >= 3;
    if (state.mode === "stale") return isStale(record);
    return true;
  }

  function recordPasses(record, options = {}) {
    if (!record) return false;
    if (!options.ignoreEmployee && state.employee !== ALL && record.employee !== state.employee) return false;
    if (state.family !== ALL && record.industryFamily !== state.family) return false;
    if (state.subgroup !== ALL && record.industrySubGroup !== state.subgroup) return false;
    if (!recordMatchesQuery(record, state.query)) return false;
    if (!options.ignoreMode && !recordMatchesMode(record)) return false;
    return true;
  }

  function selectedPeople() {
    if (!appModel) return [];
    if (state.employee !== ALL && appModel.people.includes(state.employee)) return [state.employee];
    return appModel.people;
  }

  function getRecord(employee, rowKey) {
    return appModel?.cellMap.get(`${employee}|${rowKey}`) || null;
  }

  function visibleRows() {
    const people = selectedPeople();
    return appModel.rows.filter(row => {
      return people.some(employee => recordPasses(getRecord(employee, row.key)));
    });
  }

  function visibleRecords(options = {}) {
    return appModel.records
      .filter(record => recordPasses(record, options))
      .sort((left, right) => alphaSort(left.employee, right.employee)
        || alphaSort(left.industryFamily, right.industryFamily)
        || alphaSort(left.industrySubGroup, right.industrySubGroup)
        || alphaSort(left.subIndustry, right.subIndustry));
  }

  function statsFor(records) {
    const stats = {
      total: records.length,
      rated: 0,
      sum: 0,
      zero: 0,
      one: 0,
      two: 0,
      three: 0,
      twoPlus: 0,
      gaps: 0,
      stale: 0,
      latestMs: 0
    };

    records.forEach(record => {
      if (record.ratingScore !== null) {
        stats.rated += 1;
        stats.sum += record.ratingScore;
        if (record.ratingScore === 0) stats.zero += 1;
        if (record.ratingScore === 1) stats.one += 1;
        if (record.ratingScore === 2) stats.two += 1;
        if (record.ratingScore === 3) stats.three += 1;
        if (record.ratingScore >= 2) stats.twoPlus += 1;
        if (record.ratingScore <= 1) stats.gaps += 1;
      } else {
        stats.gaps += 1;
      }
      if (isStale(record)) stats.stale += 1;
      if ((record.lastUpdatedMs || 0) > stats.latestMs) stats.latestMs = record.lastUpdatedMs;
    });

    stats.average = stats.rated ? stats.sum / stats.rated : 0;
    stats.coveragePct = stats.total ? Math.round((stats.twoPlus / stats.total) * 100) : 0;
    return stats;
  }

  function displayName(name) {
    const text = cleanText(name);
    if (!text.includes(",")) return text;
    const parts = text.split(",").map(part => part.trim()).filter(Boolean);
    return parts.length >= 2 ? `${parts[1]} ${parts[0]}` : text;
  }

  function shortName(name) {
    const text = displayName(name);
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return text;
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }

  function pct(value, total) {
    return total ? `${Math.round((value / total) * 100)}%` : "0%";
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        --scout-ink: #172126;
        --scout-muted: #5f6b70;
        --scout-border: #d9dddf;
        --scout-panel: #ffffff;
        --scout-soft: #f7f8f8;
        --scout-ocean: #36677D;
        --scout-red: #C74634;
        --scout-green: #4C825C;
        color: var(--scout-ink);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 12px 10px 16px;
      }
      #${ROOT_ID} * { box-sizing: border-box; }
      #${ROOT_ID} .scout-shell {
        border: 1px solid var(--scout-border);
        border-radius: 8px;
        background: var(--scout-panel);
        box-shadow: 0 14px 36px rgba(18, 33, 44, 0.14);
        overflow: hidden;
      }
      #${ROOT_ID} .scout-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        background: linear-gradient(135deg, #172126 0%, #274A59 100%);
        color: #fff;
      }
      #${ROOT_ID} h2 {
        font-size: 18px;
        line-height: 1.2;
        margin: 0 0 4px;
        letter-spacing: 0;
      }
      #${ROOT_ID} .scout-meta {
        color: rgba(255, 255, 255, 0.78);
        font-size: 12px;
        font-weight: 650;
      }
      #${ROOT_ID} .scout-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      #${ROOT_ID} button,
      #${ROOT_ID} select,
      #${ROOT_ID} input,
      #${ROOT_ID} a.scout-button {
        border: 1px solid rgba(23, 33, 38, 0.2);
        border-radius: 7px;
        font: 700 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${ROOT_ID} button,
      #${ROOT_ID} a.scout-button {
        align-items: center;
        background: #fff;
        color: var(--scout-ink);
        cursor: pointer;
        display: inline-flex;
        min-height: 32px;
        padding: 7px 10px;
        text-decoration: none;
      }
      #${ROOT_ID} button:hover,
      #${ROOT_ID} a.scout-button:hover { background: #f2f6f7; }
      #${ROOT_ID} .scout-button-primary {
        background: #E2C06B;
        border-color: rgba(226, 192, 107, 0.8);
      }
      #${ROOT_ID} .scout-controls {
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(190px, 1.4fr) minmax(170px, 1fr) minmax(170px, 1fr) minmax(145px, 0.8fr) minmax(190px, 1.2fr) auto;
        padding: 14px 18px;
        background: #f7f8f8;
        border-bottom: 1px solid var(--scout-border);
      }
      #${ROOT_ID} .scout-control label {
        color: var(--scout-muted);
        display: block;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      #${ROOT_ID} select,
      #${ROOT_ID} input {
        background: #fff;
        color: var(--scout-ink);
        min-height: 34px;
        padding: 7px 9px;
        width: 100%;
      }
      #${ROOT_ID} .scout-toggle {
        align-self: end;
        display: flex;
        gap: 7px;
        min-height: 34px;
        align-items: center;
        color: var(--scout-muted);
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }
      #${ROOT_ID} .scout-toggle input { width: auto; min-height: auto; }
      #${ROOT_ID} .scout-kpis {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(5, minmax(120px, 1fr));
        padding: 14px 18px 6px;
      }
      #${ROOT_ID} .scout-kpi {
        border: 1px solid var(--scout-border);
        border-radius: 8px;
        background: #fff;
        padding: 11px 12px;
      }
      #${ROOT_ID} .scout-kpi-label {
        color: var(--scout-muted);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      #${ROOT_ID} .scout-kpi-value {
        font-size: 20px;
        font-weight: 850;
        line-height: 1.1;
        margin-top: 4px;
      }
      #${ROOT_ID} .scout-main {
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
        padding: 12px 18px 18px;
      }
      #${ROOT_ID} .scout-panel-title {
        align-items: center;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 8px;
      }
      #${ROOT_ID} .scout-panel-title h3 {
        font-size: 14px;
        line-height: 1.2;
        margin: 0;
      }
      #${ROOT_ID} .scout-count {
        color: var(--scout-muted);
        font-size: 11px;
        font-weight: 750;
      }
      #${ROOT_ID} .scout-matrix-wrap {
        border: 1px solid var(--scout-border);
        border-radius: 8px;
        max-height: 70vh;
        overflow: auto;
      }
      #${ROOT_ID} table.scout-matrix {
        border-collapse: separate;
        border-spacing: 0;
        min-width: 100%;
        table-layout: fixed;
      }
      #${ROOT_ID} .scout-matrix th,
      #${ROOT_ID} .scout-matrix td {
        border-bottom: 1px solid #e7e9ea;
        border-right: 1px solid #e7e9ea;
        padding: 0;
        text-align: center;
        vertical-align: middle;
      }
      #${ROOT_ID} .scout-matrix thead th {
        background: #edf3f5;
        color: #25343a;
        font-size: 11px;
        font-weight: 850;
        height: 38px;
        position: sticky;
        top: 0;
        z-index: 3;
      }
      #${ROOT_ID} .scout-row-head {
        background: #fff;
        left: 0;
        min-width: 310px;
        position: sticky;
        text-align: left !important;
        width: 310px;
        z-index: 2;
      }
      #${ROOT_ID} thead .scout-row-head { z-index: 4; background: #edf3f5; }
      #${ROOT_ID} .scout-row-label {
        display: grid;
        gap: 2px;
        padding: 8px 10px;
        text-align: left;
      }
      #${ROOT_ID} .scout-family {
        color: var(--scout-ocean);
        font-size: 10px;
        font-weight: 850;
        text-transform: uppercase;
      }
      #${ROOT_ID} .scout-subgroup {
        color: var(--scout-muted);
        font-size: 11px;
        font-weight: 650;
      }
      #${ROOT_ID} .scout-subindustry {
        color: var(--scout-ink);
        font-size: 12px;
        font-weight: 800;
        line-height: 1.2;
      }
      #${ROOT_ID} .scout-person-button {
        background: transparent;
        border: 0;
        color: inherit;
        display: inline;
        font-size: 11px;
        font-weight: 850;
        min-height: 0;
        padding: 0;
        white-space: normal;
      }
      #${ROOT_ID} .scout-rating-cell {
        height: 38px;
        min-width: 58px;
        width: 58px;
      }
      #${ROOT_ID} .scout-rating {
        align-items: center;
        display: flex;
        height: 100%;
        justify-content: center;
        min-height: 38px;
        width: 100%;
      }
      #${ROOT_ID} .scout-rating span {
        border-radius: 999px;
        display: inline-flex;
        font-size: 12px;
        font-weight: 900;
        height: 24px;
        justify-content: center;
        line-height: 24px;
        min-width: 24px;
        padding: 0 8px;
      }
      #${ROOT_ID} .scout-rating-missing {
        background: #f4f5f5;
        color: #8a9498;
      }
      #${ROOT_ID} .scout-rating-stale {
        box-shadow: inset 0 -3px 0 rgba(199, 70, 52, 0.45);
      }
      #${ROOT_ID} .scout-review {
        border: 1px solid var(--scout-border);
        border-radius: 8px;
        background: #fff;
        min-width: 0;
        overflow: hidden;
      }
      #${ROOT_ID} .scout-review-header {
        border-bottom: 1px solid var(--scout-border);
        padding: 12px;
      }
      #${ROOT_ID} .scout-review-header h3 {
        font-size: 15px;
        margin: 0 0 4px;
      }
      #${ROOT_ID} .scout-review-header p {
        color: var(--scout-muted);
        font-size: 12px;
        font-weight: 650;
        margin: 0;
      }
      #${ROOT_ID} .scout-review-section {
        border-bottom: 1px solid #edf0f1;
        padding: 12px;
      }
      #${ROOT_ID} .scout-review-section:last-child { border-bottom: 0; }
      #${ROOT_ID} .scout-review-section h4 {
        font-size: 12px;
        letter-spacing: 0.04em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      #${ROOT_ID} .scout-list {
        display: grid;
        gap: 7px;
        margin: 0;
        padding: 0;
      }
      #${ROOT_ID} .scout-list li {
        display: grid;
        gap: 1px;
        list-style: none;
      }
      #${ROOT_ID} .scout-list strong {
        font-size: 12px;
        line-height: 1.2;
      }
      #${ROOT_ID} .scout-list span {
        color: var(--scout-muted);
        font-size: 11px;
        line-height: 1.25;
      }
      #${ROOT_ID} .scout-notes {
        background: #f7f8f8;
        border: 1px solid var(--scout-border);
        border-radius: 7px;
        color: #25343a;
        font: 650 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        margin: 8px 0 0;
        max-height: 220px;
        overflow: auto;
        padding: 9px;
        white-space: pre-wrap;
      }
      #${ROOT_ID} .scout-empty {
        color: var(--scout-muted);
        font-size: 12px;
        font-weight: 700;
        padding: 18px;
        text-align: center;
      }
      #${ROOT_ID} .scout-person-summary {
        border-collapse: collapse;
        width: 100%;
      }
      #${ROOT_ID} .scout-person-summary th,
      #${ROOT_ID} .scout-person-summary td {
        border-bottom: 1px solid #edf0f1;
        font-size: 11px;
        padding: 6px 4px;
        text-align: right;
      }
      #${ROOT_ID} .scout-person-summary th:first-child,
      #${ROOT_ID} .scout-person-summary td:first-child { text-align: left; }
      #${ROOT_ID} .scout-person-summary button {
        background: transparent;
        border: 0;
        color: var(--scout-ocean);
        display: inline;
        min-height: 0;
        padding: 0;
      }
      @media (max-width: 1100px) {
        #${ROOT_ID} .scout-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        #${ROOT_ID} .scout-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        #${ROOT_ID} .scout-main { grid-template-columns: 1fr; }
      }
      @media (max-width: 720px) {
        #${ROOT_ID} { margin: 8px 4px 14px; }
        #${ROOT_ID} .scout-header { display: grid; }
        #${ROOT_ID} .scout-controls,
        #${ROOT_ID} .scout-kpis { grid-template-columns: 1fr; }
        #${ROOT_ID} .scout-row-head { min-width: 240px; width: 240px; }
      }
    `;
    document.head.appendChild(style);
  }

  function optionHtml(value, label, selectedValue) {
    return `<option value="${escapeHtml(value)}"${value === selectedValue ? " selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function subgroupOptions() {
    const records = appModel.records.filter(record => state.family === ALL || record.industryFamily === state.family);
    return Array.from(new Set(records.map(record => record.industrySubGroup))).sort(alphaSort);
  }

  function renderControls() {
    const employeeOptions = [
      optionHtml(ALL, "All SCs", state.employee),
      ...appModel.people.map(person => optionHtml(person, displayName(person), state.employee))
    ].join("");

    const familyOptions = [
      optionHtml(ALL, "All families", state.family),
      ...appModel.families.map(family => optionHtml(family, family, state.family))
    ].join("");

    const subgroups = subgroupOptions();
    if (state.subgroup !== ALL && !subgroups.includes(state.subgroup)) state.subgroup = ALL;

    const subgroupHtml = [
      optionHtml(ALL, "All sub-groups", state.subgroup),
      ...subgroups.map(subgroup => optionHtml(subgroup, subgroup, state.subgroup))
    ].join("");

    const modeOptions = [
      optionHtml("all", "All ratings", state.mode),
      optionHtml("gaps", "Gaps: 0-1", state.mode),
      optionHtml("strong", "Strengths: 3", state.mode),
      optionHtml("stale", `Stale: ${STALE_AFTER_DAYS}+ days`, state.mode)
    ].join("");

    return `
      <div class="scout-controls">
        <div class="scout-control">
          <label for="scout-heatmap-employee">SC</label>
          <select id="scout-heatmap-employee">${employeeOptions}</select>
        </div>
        <div class="scout-control">
          <label for="scout-heatmap-family">Industry Family</label>
          <select id="scout-heatmap-family">${familyOptions}</select>
        </div>
        <div class="scout-control">
          <label for="scout-heatmap-subgroup">Sub-Group</label>
          <select id="scout-heatmap-subgroup">${subgroupHtml}</select>
        </div>
        <div class="scout-control">
          <label for="scout-heatmap-mode">View</label>
          <select id="scout-heatmap-mode">${modeOptions}</select>
        </div>
        <div class="scout-control">
          <label for="scout-heatmap-query">Search</label>
          <input id="scout-heatmap-query" type="search" value="${escapeHtml(state.query)}" placeholder="Sub-industry, family, SC">
        </div>
        <label class="scout-toggle">
          <input id="scout-heatmap-native-toggle" type="checkbox"${state.nativeHidden ? " checked" : ""}>
          Hide native results
        </label>
      </div>
    `;
  }

  function renderKpis(records, rows) {
    const stats = statsFor(records);
    const personCount = selectedPeople().length;
    return `
      <div class="scout-kpis">
        <div class="scout-kpi">
          <div class="scout-kpi-label">SCs</div>
          <div class="scout-kpi-value">${personCount}</div>
        </div>
        <div class="scout-kpi">
          <div class="scout-kpi-label">Visible Ratings</div>
          <div class="scout-kpi-value">${stats.total}</div>
        </div>
        <div class="scout-kpi">
          <div class="scout-kpi-label">2+ Coverage</div>
          <div class="scout-kpi-value">${stats.coveragePct}%</div>
        </div>
        <div class="scout-kpi">
          <div class="scout-kpi-label">Average</div>
          <div class="scout-kpi-value">${stats.average.toFixed(2)}</div>
        </div>
        <div class="scout-kpi">
          <div class="scout-kpi-label">Rows</div>
          <div class="scout-kpi-value">${rows.length}</div>
        </div>
      </div>
    `;
  }

  function renderRatingCell(record) {
    if (!record || record.ratingScore === null) {
      return `<td class="scout-rating-cell"><div class="scout-rating scout-rating-missing"><span>-</span></div></td>`;
    }

    const meta = ratingMeta[record.ratingScore] || ratingMeta[0];
    const age = daysSince(record.lastUpdatedMs);
    const title = [
      displayName(record.employee),
      record.subIndustry,
      record.ratingText || meta.label,
      record.lastUpdatedText ? `Last updated ${record.lastUpdatedText}` : "",
      age !== null ? `${age} days old` : ""
    ].filter(Boolean).join(" | ");

    return `
      <td class="scout-rating-cell">
        <div class="scout-rating${isStale(record) ? " scout-rating-stale" : ""}" title="${escapeHtml(title)}" style="background:${meta.bg}; color:${meta.fg};">
          <span style="background:${meta.accent}; color:#fff;">${record.ratingScore}</span>
        </div>
      </td>
    `;
  }

  function renderMatrix(rows) {
    const people = selectedPeople();
    if (!rows.length) {
      return `
        <div>
          <div class="scout-panel-title">
            <h3>Heat Map</h3>
            <span class="scout-count">0 rows</span>
          </div>
          <div class="scout-matrix-wrap"><div class="scout-empty">No matching ratings.</div></div>
        </div>
      `;
    }

    const header = people.map(person => `
      <th class="scout-rating-cell">
        <button class="scout-person-button" type="button" data-scout-person="${escapeHtml(person)}" title="${escapeHtml(displayName(person))}">
          ${escapeHtml(shortName(person))}
        </button>
      </th>
    `).join("");

    const body = rows.map(row => {
      const cells = people.map(person => renderRatingCell(getRecord(person, row.key))).join("");
      return `
        <tr>
          <th class="scout-row-head">
            <div class="scout-row-label">
              <span class="scout-family">${escapeHtml(row.family)}</span>
              <span class="scout-subgroup">${escapeHtml(row.subgroup)}</span>
              <span class="scout-subindustry">${escapeHtml(row.subIndustry)}</span>
            </div>
          </th>
          ${cells}
        </tr>
      `;
    }).join("");

    return `
      <div>
        <div class="scout-panel-title">
          <h3>Heat Map</h3>
          <span class="scout-count">${rows.length} sub-industries x ${people.length} SCs</span>
        </div>
        <div class="scout-matrix-wrap">
          <table class="scout-matrix">
            <thead>
              <tr>
                <th class="scout-row-head">Industry</th>
                ${header}
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function topRecords(records, predicate, limit = MAX_REVIEW_ITEMS) {
    return records.filter(predicate).sort((left, right) => {
      return (right.ratingScore ?? -1) - (left.ratingScore ?? -1)
        || alphaSort(left.industryFamily, right.industryFamily)
        || alphaSort(left.industrySubGroup, right.industrySubGroup)
        || alphaSort(left.subIndustry, right.subIndustry);
    }).slice(0, limit);
  }

  function renderRecordList(records, emptyText) {
    if (!records.length) return `<div class="scout-empty">${escapeHtml(emptyText)}</div>`;
    return `
      <ul class="scout-list">
        ${records.map(record => `
          <li>
            <strong>${escapeHtml(record.subIndustry)}</strong>
            <span>${escapeHtml(record.industryFamily)} / ${escapeHtml(record.industrySubGroup)} | ${escapeHtml(record.ratingText || ratingMeta[record.ratingScore]?.label || "Unrated")}${record.lastUpdatedText ? ` | ${escapeHtml(record.lastUpdatedText)}` : ""}</span>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function personSummaries(records) {
    const byPerson = new Map();
    records.forEach(record => {
      if (!byPerson.has(record.employee)) byPerson.set(record.employee, []);
      byPerson.get(record.employee).push(record);
    });

    return Array.from(byPerson.entries()).map(([employee, personRecords]) => {
      const stats = statsFor(personRecords);
      return { employee, stats };
    }).sort((left, right) => alphaSort(left.employee, right.employee));
  }

  function renderTeamReview(records) {
    const summaries = personSummaries(records);
    const rows = summaries.map(item => `
      <tr>
        <td><button type="button" data-scout-person="${escapeHtml(item.employee)}">${escapeHtml(displayName(item.employee))}</button></td>
        <td>${item.stats.average.toFixed(2)}</td>
        <td>${item.stats.coveragePct}%</td>
        <td>${item.stats.gaps}</td>
        <td>${item.stats.stale}</td>
      </tr>
    `).join("");

    return `
      <aside class="scout-review">
        <div class="scout-review-header">
          <h3>Team Rollup</h3>
          <p>${records.length} visible ratings from saved search ${SAVED_SEARCH_ID}</p>
        </div>
        <div class="scout-review-section">
          <h4>SC Summary</h4>
          <table class="scout-person-summary">
            <thead><tr><th>SC</th><th>Avg</th><th>2+</th><th>Gap</th><th>Stale</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="scout-review-section">
          <h4>Notes</h4>
          <button type="button" class="scout-button-primary" id="scout-heatmap-copy-notes">Copy Team Notes</button>
          <pre class="scout-notes">${escapeHtml(buildNotes(records))}</pre>
        </div>
      </aside>
    `;
  }

  function renderPersonReview(records) {
    const person = state.employee;
    const stats = statsFor(records);
    const strengths = topRecords(records, record => record.ratingScore === 3);
    const working = topRecords(records, record => record.ratingScore === 2, 8);
    const gaps = topRecords(records, record => record.ratingScore === null || record.ratingScore <= 1);
    const stale = records.filter(isStale).sort((left, right) => (left.lastUpdatedMs || 0) - (right.lastUpdatedMs || 0)).slice(0, MAX_REVIEW_ITEMS);

    return `
      <aside class="scout-review">
        <div class="scout-review-header">
          <h3>${escapeHtml(displayName(person))}</h3>
          <p>${stats.coveragePct}% at 2+ | ${stats.gaps} gaps | ${stats.stale} stale | latest ${escapeHtml(formatDate(stats.latestMs) || "not dated")}</p>
        </div>
        <div class="scout-review-section">
          <h4>3 Rated Strengths</h4>
          ${renderRecordList(strengths, "No rating 3 strengths in the current filter.")}
        </div>
        <div class="scout-review-section">
          <h4>2 Rated Working Knowledge</h4>
          ${renderRecordList(working, "No rating 2 items in the current filter.")}
        </div>
        <div class="scout-review-section">
          <h4>0-1 Growth Watch</h4>
          ${renderRecordList(gaps, "No 0-1 gaps in the current filter.")}
        </div>
        <div class="scout-review-section">
          <h4>Stale Ratings</h4>
          ${renderRecordList(stale, `No ratings older than ${STALE_AFTER_DAYS} days in the current filter.`)}
        </div>
        <div class="scout-review-section">
          <h4>1:1 Notes</h4>
          <button type="button" class="scout-button-primary" id="scout-heatmap-copy-notes">Copy 1:1 Notes</button>
          <pre class="scout-notes">${escapeHtml(buildNotes(records))}</pre>
        </div>
      </aside>
    `;
  }

  function renderReview(records) {
    return state.employee === ALL ? renderTeamReview(records) : renderPersonReview(records);
  }

  function buildNotes(records) {
    const stats = statsFor(records);
    const scope = state.employee === ALL ? "Team" : displayName(state.employee);
    const lines = [
      `SCOUT Industry Skills Review - ${scope}`,
      `Source: NetSuite saved search ${SAVED_SEARCH_ID}`,
      `Version: ${SCRIPT_VERSION}`,
      `Visible ratings: ${stats.total}`,
      `Average rating: ${stats.average.toFixed(2)}`,
      `2+ coverage: ${stats.coveragePct}%`,
      `Gaps at 0-1: ${stats.gaps}`,
      `Stale ratings over ${STALE_AFTER_DAYS} days: ${stats.stale}`
    ];

    if (state.employee === ALL) {
      lines.push("", "SC rollup:");
      personSummaries(records).forEach(item => {
        lines.push(`- ${displayName(item.employee)}: avg ${item.stats.average.toFixed(2)}, 2+ ${item.stats.coveragePct}%, gaps ${item.stats.gaps}, stale ${item.stats.stale}`);
      });
      return lines.join("\n");
    }

    const strengths = topRecords(records, record => record.ratingScore === 3, 6).map(record => record.subIndustry);
    const gaps = topRecords(records, record => record.ratingScore === null || record.ratingScore <= 1, 8).map(record => `${record.subIndustry} (${record.ratingText || "Unrated"})`);
    const stale = records.filter(isStale).slice(0, 6).map(record => `${record.subIndustry} (${record.lastUpdatedText || "undated"})`);

    lines.push("", "Strengths:");
    lines.push(strengths.length ? strengths.map(item => `- ${item}`).join("\n") : "- None in current filter");
    lines.push("", "Growth watch:");
    lines.push(gaps.length ? gaps.map(item => `- ${item}`).join("\n") : "- None in current filter");
    lines.push("", "Refresh candidates:");
    lines.push(stale.length ? stale.map(item => `- ${item}`).join("\n") : "- None in current filter");
    return lines.join("\n");
  }

  function renderShell() {
    const records = visibleRecords();
    const rows = visibleRows();
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    root.innerHTML = `
      <div class="scout-shell">
        <div class="scout-header">
          <div>
            <h2>SCOUT Industry Skills Heat Map</h2>
            <div class="scout-meta">Saved search ${SAVED_SEARCH_ID} | ${appModel.records.length} parsed rows | v${SCRIPT_VERSION}</div>
          </div>
          <div class="scout-actions">
            <button type="button" id="scout-heatmap-export">Export CSV</button>
            <button type="button" id="scout-heatmap-reset">Reset Filters</button>
            <a class="scout-button scout-button-primary" href="${escapeHtml(SCRIPT_UPDATE_URL)}" target="_blank" rel="noopener noreferrer">Install / Update</a>
          </div>
        </div>
        ${renderControls()}
        ${renderKpis(records, rows)}
        <div class="scout-main">
          ${renderMatrix(rows)}
          ${renderReview(records)}
        </div>
      </div>
    `;

    wireEvents(root);
    syncNativeTableVisibility();
  }

  function wireEvents(root) {
    const bindValue = (id, key) => {
      const element = root.querySelector(`#${id}`);
      if (!element) return;
      element.addEventListener("change", () => {
        state[key] = element.value;
        if (key === "family") state.subgroup = ALL;
        saveState();
        renderShell();
      });
    };

    bindValue("scout-heatmap-employee", "employee");
    bindValue("scout-heatmap-family", "family");
    bindValue("scout-heatmap-subgroup", "subgroup");
    bindValue("scout-heatmap-mode", "mode");

    const query = root.querySelector("#scout-heatmap-query");
    if (query) {
      query.addEventListener("input", () => {
        state.query = query.value;
        saveState();
        window.clearTimeout(query._scoutHeatmapTimer);
        query._scoutHeatmapTimer = window.setTimeout(renderShell, 160);
      });
    }

    const nativeToggle = root.querySelector("#scout-heatmap-native-toggle");
    if (nativeToggle) {
      nativeToggle.addEventListener("change", () => {
        state.nativeHidden = nativeToggle.checked;
        saveState();
        syncNativeTableVisibility();
      });
    }

    root.querySelectorAll("[data-scout-person]").forEach(button => {
      button.addEventListener("click", () => {
        state.employee = button.getAttribute("data-scout-person") || ALL;
        saveState();
        renderShell();
      });
    });

    const reset = root.querySelector("#scout-heatmap-reset");
    if (reset) {
      reset.addEventListener("click", () => {
        state = {
          employee: ALL,
          family: ALL,
          subgroup: ALL,
          mode: "all",
          query: "",
          nativeHidden: state.nativeHidden
        };
        saveState();
        renderShell();
      });
    }

    const exportButton = root.querySelector("#scout-heatmap-export");
    if (exportButton) exportButton.addEventListener("click", exportCsv);

    const copyNotes = root.querySelector("#scout-heatmap-copy-notes");
    if (copyNotes) copyNotes.addEventListener("click", () => copyText(buildNotes(visibleRecords())));
  }

  function syncNativeTableVisibility() {
    if (!nativeTable) return;
    nativeTable.style.display = state.nativeHidden ? "none" : "";
  }

  function copyText(text) {
    try {
      if (typeof GM_setClipboard === "function") {
        GM_setClipboard(text, "text");
        return;
      }
    } catch (error) {
      console.warn("SCOUT heat map: GM_setClipboard failed", error);
    }

    navigator.clipboard?.writeText(text).catch(error => {
      console.warn("SCOUT heat map: clipboard write failed", error);
    });
  }

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const rows = visibleRecords();
    const header = ["Employee", "Industry Family", "Industry Sub-Group", "Sub-Industry", "Rating", "Rating Score", "Last Updated"];
    const csvRows = [
      header.map(csvCell).join(","),
      ...rows.map(record => [
        displayName(record.employee),
        record.industryFamily,
        record.industrySubGroup,
        record.subIndustry,
        record.ratingText,
        record.ratingScore ?? "",
        record.lastUpdatedText
      ].map(csvCell).join(","))
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const scope = state.employee === ALL ? "team" : normalizeKey(displayName(state.employee)) || "sc";
    const date = new Date().toISOString().slice(0, 10);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scout-industry-skills-heatmap-${scope}-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function insertError(message) {
    installStyles();
    let root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      document.body.prepend(root);
    }
    root.innerHTML = `
      <div class="scout-shell">
        <div class="scout-header">
          <div>
            <h2>SCOUT Industry Skills Heat Map</h2>
            <div class="scout-meta">Saved search ${SAVED_SEARCH_ID} | v${SCRIPT_VERSION}</div>
          </div>
        </div>
        <div class="scout-empty">${escapeHtml(message)}</div>
      </div>
    `;
  }

  function init() {
    const result = collectRecords();
    if (!result.records.length) {
      retryCount += 1;
      if (retryCount < 20) {
        window.setTimeout(init, 350);
      } else {
        insertError("No saved-search rows were found. Confirm the result columns include Employee, Sub-Industry, Rating, and Last Updated.");
      }
      return;
    }

    nativeTable = result.table;
    appModel = buildModel(result.records);
    installStyles();

    const root = document.createElement("div");
    root.id = ROOT_ID;
    if (nativeTable?.parentNode) {
      nativeTable.parentNode.insertBefore(root, nativeTable);
    } else {
      document.body.prepend(root);
    }
    renderShell();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
