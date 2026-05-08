// ==UserScript==
// @name         NetSuite SC Roster Calendar Refresh Launcher
// @namespace    ns-scm-tools-fy27
// @version      27.0.0.1B
// @description  Launches the local SC calendar refresh console from NetSuite saved search 1311451.
// @author       Michael Anderson
// @match        https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @run-at       document-idle
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/netsuite-sc-roster-calendar-refresh.user.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/netsuite-sc-roster-calendar-refresh.user.js
// ==/UserScript==

(function () {
  "use strict";

  const SAVED_SEARCH_ID = "1311451";
  const REFRESH_CONSOLE_URL = "file:///Users/michaean/Documents/Outlook%20Calendar%20Project%20-%20JPK/calendar-refresh.html";
  const MAX_DIRECT_URL_LENGTH = 90000;
  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  const params = new URLSearchParams(window.location.search);
  if (params.get("searchid") !== SAVED_SEARCH_ID) return;

  const headerAliases = {
    name: ["name", "employee", "consultant", "solutionconsultant", "sc", "salesconsultant"],
    email: ["email", "emailaddress", "workemail", "employeeemail"],
    title: ["title", "jobtitle"],
    manager: ["manager", "teammanager", "managerteamname", "managerteam", "teamname"],
    team: ["team", "teamname", "managerteamname", "managerteam", "manager"],
    industryFamily: ["industryfamily", "industyfamily", "industry", "industryvertical", "industrygroup"],
    legacyOrg: ["directoramo", "directamo", "legacydesignation", "legacy", "designation", "directamolegacydesignation", "directoramolegacydesignation"],
    region: ["region", "salesregion", "scregion"],
    location: ["state", "location", "office", "homestate"]
  };

  function normalizeHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function cellText(cell) {
    return String(cell ? cell.textContent : "").replace(/\s+/g, " ").trim();
  }

  function rowCells(row) {
    return Array.from(row.querySelectorAll("th,td")).map(cellText);
  }

  function findIndex(headers, key) {
    const aliases = headerAliases[key] || [];
    return headers.findIndex(header => aliases.includes(header));
  }

  function inferNameFromEmail(email) {
    return normalizeEmail(email).split("@")[0].split(/[._-]+/).filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function normalizeLegacyOrg(value) {
    const text = String(value || "").trim();
    if (/amo/i.test(text)) return "AMO";
    if (/direct/i.test(text)) return "Direct";
    return text || "Active SC";
  }

  function inferTeam(manager) {
    const text = String(manager || "").trim();
    if (!text) return "NetSuite Roster";
    return text.includes(",") ? text.split(",")[0].trim() : text.split(/\s+/).slice(-1)[0];
  }

  function inferTimeZoneFromRegion(value) {
    const text = String(value || "").toLowerCase();
    if (/(pacific|west|california|ca|washington|wa|oregon|or|nevada|nv)/.test(text)) return "America/Los_Angeles";
    if (/(mountain|denver|colorado|co|arizona|az|utah|ut)/.test(text)) return "America/Denver";
    if (/(central|texas|tx|illinois|il|minnesota|mn|alabama|al|wisconsin|wi)/.test(text)) return "America/Chicago";
    if (/(east|eastern|new york|ny|massachusetts|ma|florida|fl|virginia|va|north carolina|nc|south carolina|sc|connecticut|ct|tennessee|tn|michigan|mi|ohio|oh)/.test(text)) return "America/New_York";
    return "";
  }

  function extractEmail(row, cells, indexes) {
    if (indexes.email >= 0 && cells[indexes.email]) {
      const match = cells[indexes.email].match(EMAIL_REGEX);
      if (match) return normalizeEmail(match[0]);
    }

    const mailto = row.querySelector('a[href^="mailto:"]');
    if (mailto) {
      return normalizeEmail(mailto.getAttribute("href").replace(/^mailto:/i, "").split("?")[0]);
    }

    const rowMatch = cells.join(" ").match(EMAIL_REGEX);
    return rowMatch ? normalizeEmail(rowMatch[0]) : "";
  }

  function parseTable(table) {
    const rows = Array.from(table.querySelectorAll("tr"));
    const rowData = rows.map(row => ({ row, cells: rowCells(row) })).filter(item => item.cells.length);
    const headerIndex = rowData.findIndex(item => {
      const normalized = item.cells.map(normalizeHeader);
      return normalized.some(header => headerAliases.email.includes(header))
        || normalized.some(header => header.includes("emailaddress"));
    });

    if (headerIndex < 0) return [];

    const headers = rowData[headerIndex].cells.map(normalizeHeader);
    const indexes = Object.fromEntries(Object.keys(headerAliases).map(key => [key, findIndex(headers, key)]));
    const getValue = (cells, key) => indexes[key] >= 0 ? String(cells[indexes[key]] || "").trim() : "";

    return rowData.slice(headerIndex + 1).map(({ row, cells }) => {
      const email = extractEmail(row, cells, indexes);
      if (!email) return null;

      const manager = getValue(cells, "manager");
      const team = getValue(cells, "team") || inferTeam(manager);
      const region = getValue(cells, "region");
      const location = getValue(cells, "location") || region;
      const name = getValue(cells, "name") || inferNameFromEmail(email);

      return {
        name,
        email,
        title: getValue(cells, "title"),
        manager,
        team,
        industryFamily: getValue(cells, "industryFamily"),
        legacyOrg: normalizeLegacyOrg(getValue(cells, "legacyOrg")),
        region,
        location,
        timeZone: inferTimeZoneFromRegion(region || location),
        source: `NetSuite saved search ${SAVED_SEARCH_ID}`
      };
    }).filter(Boolean);
  }

  function collectRoster() {
    const tables = Array.from(document.querySelectorAll("table"))
      .map(table => ({
        table,
        emailMatches: (table.textContent.match(new RegExp(EMAIL_REGEX.source, "gi")) || []).length
      }))
      .filter(item => item.emailMatches)
      .sort((a, b) => b.emailMatches - a.emailMatches);

    for (const item of tables) {
      const people = parseTable(item.table);
      if (people.length) {
        return [...new Map(people.map(person => [person.email, person])).values()]
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return [];
  }

  function setClipboard(text) {
    try {
      if (typeof GM_setClipboard === "function") {
        GM_setClipboard(text, "text");
        return true;
      }
    } catch (error) {
      console.warn("GM_setClipboard failed", error);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(error => console.warn("Clipboard write failed", error));
      return true;
    }

    return false;
  }

  function buildRefreshUrl(payload) {
    const url = new URL(REFRESH_CONSOLE_URL);
    url.searchParams.set("days", "21");
    url.searchParams.set("source", `netsuite-saved-search-${SAVED_SEARCH_ID}`);
    url.searchParams.set("roster", JSON.stringify(payload));
    return url.href;
  }

  function openRefreshConsole(url) {
    try {
      if (typeof GM_openInTab === "function") {
        GM_openInTab(url, { active: true, insert: true, setParent: true });
        return true;
      }
    } catch (error) {
      console.warn("GM_openInTab failed", error);
    }

    const opened = window.open(url, "_blank");
    return Boolean(opened);
  }

  function updateStatus(message, tone = "") {
    const status = document.getElementById("scr-calendar-refresh-launcher-status");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function launchRefreshConsole() {
    const people = collectRoster();
    if (!people.length) {
      updateStatus("No visible consultant rows with email addresses were found.", "bad");
      return;
    }

    const payload = {
      importedAt: new Date().toISOString(),
      source: window.location.href,
      people
    };
    const payloadJson = JSON.stringify(payload, null, 2);
    const refreshUrl = buildRefreshUrl(payload);
    setClipboard(payloadJson);

    if (refreshUrl.length > MAX_DIRECT_URL_LENGTH) {
      openRefreshConsole(REFRESH_CONSOLE_URL);
      updateStatus(`Copied a ${people.length}-person roster. URL was too long, so paste the copied payload into the refresh console.`, "warn");
      return;
    }

    const opened = openRefreshConsole(refreshUrl);
    updateStatus(
      opened
        ? `Opened refresh console with ${people.length} consultant${people.length === 1 ? "" : "s"}. Roster JSON copied as backup.`
        : "Browser blocked the local file launch. Refresh URL copied to clipboard.",
      opened ? "good" : "warn"
    );

    if (!opened) setClipboard(refreshUrl);
  }

  function copyRoster() {
    const people = collectRoster();
    if (!people.length) {
      updateStatus("No visible consultant rows with email addresses were found.", "bad");
      return;
    }

    setClipboard(JSON.stringify({
      importedAt: new Date().toISOString(),
      source: window.location.href,
      people
    }, null, 2));
    updateStatus(`Copied ${people.length} consultant${people.length === 1 ? "" : "s"} to clipboard.`, "good");
  }

  function insertLauncher() {
    if (document.getElementById("scr-calendar-refresh-launcher")) return;

    const launcher = document.createElement("div");
    launcher.id = "scr-calendar-refresh-launcher";
    launcher.innerHTML = `
      <div class="scr-calendar-refresh-title">SC Calendar Refresh</div>
      <button type="button" id="scr-open-calendar-refresh">Open refresh console</button>
      <button type="button" id="scr-copy-calendar-roster">Copy roster JSON</button>
      <div id="scr-calendar-refresh-launcher-status">Ready for saved search ${SAVED_SEARCH_ID}.</div>
    `;
    document.body.appendChild(launcher);

    document.getElementById("scr-open-calendar-refresh").addEventListener("click", launchRefreshConsole);
    document.getElementById("scr-copy-calendar-roster").addEventListener("click", copyRoster);
  }

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #scr-calendar-refresh-launcher {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 999999;
        width: 280px;
        padding: 12px;
        border: 1px solid #b8c2cc;
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        background: #ffffff;
        color: #1f2933;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
      }

      #scr-calendar-refresh-launcher .scr-calendar-refresh-title {
        margin-bottom: 8px;
        font-weight: 700;
      }

      #scr-calendar-refresh-launcher button {
        display: block;
        width: 100%;
        margin: 6px 0;
        padding: 7px 8px;
        border: 0;
        border-radius: 4px;
        background: #36677d;
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      #scr-calendar-refresh-launcher button:hover {
        background: #24495a;
      }

      #scr-calendar-refresh-launcher-status {
        min-height: 28px;
        margin-top: 8px;
        line-height: 1.35;
        color: #52606d;
      }

      #scr-calendar-refresh-launcher-status[data-tone="good"] {
        color: #1f7a4d;
      }

      #scr-calendar-refresh-launcher-status[data-tone="warn"] {
        color: #996a13;
      }

      #scr-calendar-refresh-launcher-status[data-tone="bad"] {
        color: #b42318;
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();
  insertLauncher();
})();
