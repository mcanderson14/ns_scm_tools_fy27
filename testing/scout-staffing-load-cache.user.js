// ==UserScript==
// @name         SCOUT Staffing Load Cache Bridge
// @namespace    ns-scm-tools-fy27
// @version      27.0.2
// @description  Refreshes the SCOUT staffing-dashboard workload cache from NetSuite saved search 1324335.
// @author       Michael Anderson
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html*
// @match        file://*/staffing-dashboard.html*
// @match        https://nlcorp.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @match        https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @connect      nlcorp.app.netsuite.com
// @connect      nlcorp-sb2.app.netsuite.com
// @run-at       document-end
// ==/UserScript==

(function () {
  "use strict";

  const SAVED_SEARCH_ID = "1324335";
  const NETSUITE_HOST = window.location.hostname.includes("nlcorp-sb2")
    ? "nlcorp-sb2.app.netsuite.com"
    : "nlcorp.app.netsuite.com";
  const SAVED_SEARCH_URL = `https://${NETSUITE_HOST}/app/common/search/savedsearchresults.nl?searchid=${SAVED_SEARCH_ID}`;
  const DASHBOARD_STORAGE_KEY = "scout-staffing-dashboard-load-report-v1";
  const GM_CACHE_KEY = "scout-staffing-dashboard-load-report-gm-v1";
  const PAGE_REQUEST_TYPE = "scout-staffing-load-refresh-request";
  const PAGE_RESPONSE_TYPE = "scout-staffing-load-refresh-response";
  const STALE_AFTER_MS = 4 * 60 * 60 * 1000;
  const BUTTON_ID = "scout-staffing-load-cache-refresh";
  const STATUS_ID = "scout-staffing-load-cache-status";

  let refreshPromise = null;

  function pageWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function getBrowserDateStamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readLoadField(record, aliases) {
    if (!record || typeof record !== "object") return "";
    const wanted = aliases.map(normalizeKey);
    const key = Object.keys(record).find(item => wanted.includes(normalizeKey(item)));
    return key ? record[key] : "";
  }

  function cellText(cell) {
    return String(cell ? cell.textContent : "").replace(/\s+/g, " ").trim();
  }

  function rowsToObjects(grid) {
    if (!Array.isArray(grid) || !grid.length) return [];
    const headerIndex = grid.findIndex(row => {
      const keys = row.map(normalizeKey);
      return keys.includes("scname") || keys.includes("email") || keys.includes("totalscrs");
    });
    if (headerIndex < 0) return [];

    const headers = grid[headerIndex].map(header => String(header || "").trim());
    return grid.slice(headerIndex + 1)
      .filter(row => row.some(Boolean))
      .map(row => headers.reduce((record, header, index) => {
        if (header) record[header] = row[index] || "";
        return record;
      }, {}))
      .filter(record => {
        const name = readLoadField(record, ["SC NAME", "SC", "Name", "Consultant"]);
        return name && normalizeKey(name) !== "total";
      });
  }

  function parseHtmlTableRows(html) {
    const documentNode = new DOMParser().parseFromString(html, "text/html");
    const tables = [...documentNode.querySelectorAll("table")];
    let bestRows = [];
    tables.forEach(table => {
      const grid = [...table.querySelectorAll("tr")].map(row =>
        [...row.querySelectorAll("th,td")].map(cellText)
      );
      const rows = rowsToObjects(grid);
      if (rows.length > bestRows.length) bestRows = rows;
    });
    return bestRows;
  }

  function parseSavedSearchHtml(html) {
    const rows = parseHtmlTableRows(html);
    if (!rows.length) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "NetSuite response";
      throw new Error(`No staffing rows were parsed from saved search ${SAVED_SEARCH_ID}. Response title: ${title}`);
    }
    return rows;
  }

  function gmGet(key, fallback = null) {
    try {
      if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    } catch (error) {
      console.warn("SCOUT load cache: GM_getValue failed", error);
    }
    return fallback;
  }

  function gmSet(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        GM_setValue(key, value);
        return true;
      }
    } catch (error) {
      console.warn("SCOUT load cache: GM_setValue failed", error);
    }
    return false;
  }

  function readPageStorageReport() {
    try {
      const payload = pageWindow().localStorage?.getItem(DASHBOARD_STORAGE_KEY);
      const report = payload ? JSON.parse(payload) : null;
      return report && Array.isArray(report.rows) ? report : null;
    } catch (error) {
      return null;
    }
  }

  function isReportFresh(report) {
    if (!report?.rows?.length || !report.refreshedAt) return false;
    return Date.now() - new Date(report.refreshedAt).getTime() < STALE_AFTER_MS;
  }

  function isReportNewer(left, right) {
    const leftMs = left?.refreshedAt ? new Date(left.refreshedAt).getTime() : 0;
    const rightMs = right?.refreshedAt ? new Date(right.refreshedAt).getTime() : 0;
    return leftMs > rightMs;
  }

  function writePageStorageReport(report) {
    try {
      pageWindow().localStorage?.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(report));
      const CustomEventCtor = pageWindow().CustomEvent || CustomEvent;
      pageWindow().dispatchEvent(new CustomEventCtor("scout-staffing-load-cache-updated", {
        detail: {
          source: report.source,
          searchId: report.searchId,
          rows: report.rows.length,
          refreshedAt: report.refreshedAt
        }
      }));
      return true;
    } catch (error) {
      console.warn("SCOUT load cache: page localStorage write failed", error);
      return false;
    }
  }

  function mirrorGmCacheToPageStorage() {
    const gmReport = gmGet(GM_CACHE_KEY, null);
    if (!gmReport?.rows?.length) return gmReport || null;
    const pageReport = readPageStorageReport();
    if (!pageReport || isReportNewer(gmReport, pageReport)) {
      writePageStorageReport(gmReport);
    }
    return gmReport;
  }

  function fetchWithGm(url) {
    const request = {
      method: "GET",
      url,
      timeout: 120000,
      headers: {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      withCredentials: true
    };

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          ...request,
          onload: response => {
            if (response.status >= 200 && response.status < 300) resolve(response.responseText || "");
            else reject(new Error(`NetSuite saved search returned ${response.status}`));
          },
          onerror: () => reject(new Error("Could not reach NetSuite saved search.")),
          ontimeout: () => reject(new Error("NetSuite saved search timed out."))
        });
      });
    }

    if (typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function") {
      return Promise.resolve(GM.xmlHttpRequest(request)).then(response => {
        if (response.status >= 200 && response.status < 300) return response.responseText || "";
        throw new Error(`NetSuite saved search returned ${response.status}`);
      });
    }

    return fetch(url, {
      credentials: "include",
      cache: "no-store"
    }).then(response => {
      if (!response.ok) throw new Error(`NetSuite saved search returned ${response.status}`);
      return response.text();
    });
  }

  async function refreshStaffingLoadCache() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      setStatus("Refreshing staffing data...", "loading");
      try {
        const html = await fetchWithGm(SAVED_SEARCH_URL);
        const rows = parseSavedSearchHtml(html);
        const report = {
          cacheDate: getBrowserDateStamp(),
          refreshedAt: new Date().toISOString(),
          staleAfterMs: STALE_AFTER_MS,
          source: "NetSuite saved search",
          searchId: SAVED_SEARCH_ID,
          sourceUrl: SAVED_SEARCH_URL,
          rowCount: rows.length,
          rows
        };
        gmSet(GM_CACHE_KEY, report);
        writePageStorageReport(report);
        setStatus(`Staffing data refreshed: ${rows.length} rows`, "good");
        updateButtonState(report);
        return report;
      } catch (error) {
        setStatus(`Refresh failed: ${error.message}`, "bad");
        throw error;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  function formatRefreshTime(report) {
    if (!report?.refreshedAt) return "never";
    try {
      return new Date(report.refreshedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch (error) {
      return "unknown";
    }
  }

  function latestReport() {
    const pageReport = readPageStorageReport();
    const gmReport = gmGet(GM_CACHE_KEY, null);
    return isReportNewer(pageReport, gmReport) ? pageReport : gmReport;
  }

  function setStatus(message, tone = "") {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function updateButtonState(report = latestReport()) {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    const fresh = isReportFresh(report);
    button.classList.toggle("is-stale", !fresh);
    button.title = fresh
      ? `Staffing data refreshed at ${formatRefreshTime(report)}`
      : "Staffing data is stale or missing. Refresh from NetSuite saved search 1324335.";
    setStatus(
      report?.rows?.length
        ? `${report.rows.length} rows cached; refreshed ${formatRefreshTime(report)}${fresh ? "" : " (stale)"}`
        : "Staffing data cache is missing.",
      fresh ? "good" : "warn"
    );
  }

  function insertStyles() {
    if (document.getElementById("scout-staffing-load-cache-styles")) return;
    const style = document.createElement("style");
    style.id = "scout-staffing-load-cache-styles";
    style.textContent = `
      #${BUTTON_ID} {
        border: 1px solid rgba(19, 33, 44, 0.2);
        border-radius: 7px;
        background: #E2C06B;
        color: #13212C;
        cursor: pointer;
        font: 800 12px/1.1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        min-height: 32px;
        padding: 7px 10px;
        white-space: nowrap;
      }
      #${BUTTON_ID}:hover { filter: brightness(1.04); }
      #${BUTTON_ID}:disabled { cursor: wait; opacity: 0.72; }
      #${BUTTON_ID}.is-stale {
        animation: scoutLoadCachePulse 1.55s ease-in-out infinite;
        box-shadow: 0 0 0 0 rgba(226, 192, 107, 0.7);
      }
      #${STATUS_ID} {
        color: rgba(255, 255, 255, 0.74);
        font: 700 11px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin-left: 4px;
      }
      #${STATUS_ID}[data-tone="good"] { color: #c8f7df; }
      #${STATUS_ID}[data-tone="warn"] { color: #ffe8a3; }
      #${STATUS_ID}[data-tone="bad"] { color: #ffd1cb; }
      .scout-staffing-cache-floating {
        position: fixed;
        top: 74px;
        right: 18px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 9px;
        background: rgba(19, 33, 44, 0.9);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.26);
      }
      .scout-staffing-cache-floating #${STATUS_ID} {
        max-width: 190px;
      }
      @keyframes scoutLoadCachePulse {
        0% { box-shadow: 0 0 0 0 rgba(226, 192, 107, 0.72); }
        70% { box-shadow: 0 0 0 8px rgba(226, 192, 107, 0); }
        100% { box-shadow: 0 0 0 0 rgba(226, 192, 107, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  function insertButton() {
    if (document.getElementById(BUTTON_ID)) return;
    insertStyles();

    const button = document.createElement("button");
    button.type = "button";
    button.id = BUTTON_ID;
    button.textContent = "Refresh Staffing Data";

    const status = document.createElement("span");
    status.id = STATUS_ID;

    const dashboardTarget = document.querySelector(".refresh-row");
    const scoutTarget = document.querySelector(".sc-header-actions, .scout-header-actions, #scout-header-actions, [data-scout-header-actions]");

    if (dashboardTarget) {
      dashboardTarget.prepend(status);
      dashboardTarget.prepend(button);
    } else if (scoutTarget) {
      scoutTarget.prepend(status);
      scoutTarget.prepend(button);
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "scout-staffing-cache-floating";
      wrapper.append(button, status);
      document.body.appendChild(wrapper);
    }

    button.addEventListener("click", async () => {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Refreshing...";
      try {
        await refreshStaffingLoadCache();
      } catch (error) {
        console.warn("SCOUT load cache refresh failed", error);
      } finally {
        button.disabled = false;
        button.textContent = originalText || "Refresh Staffing Data";
        updateButtonState();
      }
    });

    updateButtonState(mirrorGmCacheToPageStorage() || latestReport());
  }

  function publishBridgeApi() {
    pageWindow().__SCOUT_STAFFING_LOAD_BRIDGE = {
      installed: true,
      version: "27.0.2",
      searchId: SAVED_SEARCH_ID,
      installedAt: new Date().toISOString()
    };
    pageWindow().refreshScoutStaffingLoadFromNetSuite = refreshStaffingLoadCache;
    pageWindow().getScoutStaffingLoadCache = () => latestReport();
  }

  function installPageMessageBridge() {
    window.addEventListener("message", async event => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (!data || data.type !== PAGE_REQUEST_TYPE || !data.requestId) return;
      try {
        const report = await refreshStaffingLoadCache();
        pageWindow().postMessage({
          type: PAGE_RESPONSE_TYPE,
          requestId: data.requestId,
          ok: true,
          report
        }, "*");
      } catch (error) {
        pageWindow().postMessage({
          type: PAGE_RESPONSE_TYPE,
          requestId: data.requestId,
          ok: false,
          message: error.message || String(error)
        }, "*");
      }
    });

    const script = document.createElement("script");
    script.textContent = `(() => {
      const requestType = ${JSON.stringify(PAGE_REQUEST_TYPE)};
      const responseType = ${JSON.stringify(PAGE_RESPONSE_TYPE)};
      const storageKey = ${JSON.stringify(DASHBOARD_STORAGE_KEY)};
      window.__SCOUT_STAFFING_LOAD_BRIDGE = Object.assign({}, window.__SCOUT_STAFFING_LOAD_BRIDGE, {
        installed: true,
        mode: "postMessage",
        version: "27.0.2",
        searchId: ${JSON.stringify(SAVED_SEARCH_ID)},
        installedAt: new Date().toISOString()
      });
      window.getScoutStaffingLoadCache = window.getScoutStaffingLoadCache || function () {
        try { return JSON.parse(localStorage.getItem(storageKey) || "null"); }
        catch (error) { return null; }
      };
      window.refreshScoutStaffingLoadFromNetSuite = window.refreshScoutStaffingLoadFromNetSuite || function () {
        return new Promise((resolve, reject) => {
          const requestId = "scout-load-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          const timer = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            reject(new Error("SCOUT Staffing Load Cache Bridge did not respond."));
          }, 125000);
          function onMessage(event) {
            const data = event.data || {};
            if (!data || data.type !== responseType || data.requestId !== requestId) return;
            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            if (data.ok) resolve(data.report || null);
            else reject(new Error(data.message || "Staffing load refresh failed."));
          }
          window.addEventListener("message", onMessage);
          window.postMessage({ type: requestType, requestId }, "*");
        });
      };
    })();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  publishBridgeApi();
  installPageMessageBridge();
  mirrorGmCacheToPageStorage();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertButton, { once: true });
  } else {
    insertButton();
  }

  window.setInterval(() => updateButtonState(), 60 * 1000);
})();
