// ==UserScript==
// @name         SCOUT Inline Calendar Drawer
// @namespace    ns-scm-tools-fy27
// @version      27.2.2
// @description  Lazy inline SC calendar/workload drawer for NetSuite SCOUT cards.
// @author       Michael Anderson
// @match        https://nlcorp.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/staffing-dashboard.html*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html*
// @match        file://*/staffing-dashboard.html*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/calendar-refresh.html*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html*
// @match        file://*/calendar-refresh.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @grant        unsafeWindow
// @run-at       document-idle
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js
// ==/UserScript==

(function () {
  "use strict";

  const VERSION = "27.2.2";
  const CALENDAR_CACHE_KEY = "scout-inline-calendar-drawer-calendar-cache-v1";
  const LOCAL_GRAPH_CACHE_KEY = "sc-staffing-dashboard-local-graph-cache-v1";
  const LEGACY_CALENDAR_CACHE_KEY = "sc-staffing-dashboard-calendar-cache-direct-connector-202605062230";
  const STAFFING_LOAD_STORAGE_KEY = "scout-staffing-dashboard-load-report-v1";
  const GRAPH_EXPLORER_TOKEN_VAULT_KEY = "sc-staffing-dashboard-graph-explorer-token-vault-v2";
  const GRAPH_EXPLORER_LOCAL_KEY_KEY = "sc-staffing-dashboard-graph-explorer-local-key-v1";
  const GRAPH_TOKEN_BRIDGE_KEY = "scout-inline-calendar-drawer-graph-token-bridge-v1";
  const GRAPH_GET_SCHEDULE_URL = "https://graph.microsoft.com/v1.0/me/calendar/getSchedule";
  const GRAPH_REFRESH_DAYS = 21;
  const GRAPH_REFRESH_BATCH_SIZE = 20;
  const GRAPH_CALENDAR_VIEW_DETAIL_LIMIT = 30;
  const GRAPH_CALENDAR_VIEW_DETAIL_CONCURRENCY = 4;
  const GRAPH_CALENDAR_VIEW_PAGE_LIMIT = 3;
  const GRAPH_TIME_ZONE_MAP = {
    "UTC": "UTC",
    "Etc/UTC": "UTC",
    "America/New_York": "Eastern Standard Time",
    "America/Chicago": "Central Standard Time",
    "America/Denver": "Mountain Standard Time",
    "America/Phoenix": "US Mountain Standard Time",
    "America/Los_Angeles": "Pacific Standard Time",
    "America/Halifax": "Atlantic Standard Time",
    "America/Anchorage": "Alaskan Standard Time",
    "Pacific/Honolulu": "Hawaiian Standard Time",
    "America/St_Johns": "Newfoundland Standard Time"
  };
  const GRAPH_AVAILABILITY_STATUS_MAP = {
    "1": { status: "tentative", subject: "Free/busy: Tentative hold" },
    "2": { status: "busy", subject: "Free/busy: Busy; subject unavailable" },
    "3": { status: "oof", subject: "Free/busy: Out of office; subject unavailable" },
    "4": { status: "workingElsewhere", subject: "Free/busy: Working elsewhere; subject unavailable" }
  };
  const DASHBOARD_URL = "https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/staffing-dashboard.html";
  const CALENDAR_REFRESH_URL = "https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/calendar-refresh.html";
  const CALENDAR_STALE_AFTER_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_DRAWER_START_MINUTES = 13 * 60;
  const DEFAULT_DRAWER_DURATION_MINUTES = 60;
  const DEFAULT_DRAWER_BUFFER_MINUTES = 60;
  const DRAWER_TIME_ZONES = [
    ["America/New_York", "Eastern (ET)"],
    ["America/Chicago", "Central (CT)"],
    ["America/Denver", "Mountain (MT)"],
    ["America/Phoenix", "Arizona (MST)"],
    ["America/Los_Angeles", "Pacific (PT)"],
    ["America/Halifax", "Atlantic (AT)"],
    ["America/Anchorage", "Alaska (AKT)"],
    ["Pacific/Honolulu", "Hawaii (HT)"],
    ["America/St_Johns", "Newfoundland (NT)"]
  ];
  const WORKDAY_START_MINUTES = 8 * 60;
  const WORKDAY_END_MINUTES = 17 * 60;
  const WORKDAY_MINUTES = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES;
  const DRAWER_ID = "scout-inline-calendar-drawer";
  const STYLE_ID = "scout-inline-calendar-drawer-style";
  const CALENDAR_PROMPT_ID = "scout-inline-calendar-stale-prompt";
  const INLINE_SELECTED_BUTTON_CLASS = "scid-inline-selected-btn";
  const SOURCE_CARD_CLASS_SELECTOR = ".sc-card,.sc-result-card,.sc-staff-card,.scout-card";
  const SOURCE_CARD_SELECTOR = "[data-email],[data-empname],[data-employee],[data-name],.sc-card,.sc-result-card,.sc-staff-card,.scout-card";
  const LOAD_NAME_ALIASES = ["SC NAME", "SC", "Name", "Consultant"];
  const LOAD_EMAIL_ALIASES = ["Email", "Email Address", "SC Email", "Work Email"];
  const LOAD_MANAGER_ALIASES = ["SC MANAGER", "Manager", "Manager Name", "SC Manager"];
  const LOAD_ORG_ALIASES = ["Type", "A/D", "Direct/AMO", "Legacy Org", "Legacy Team"];
  const LOAD_IN_PROGRESS_ALIASES = [
    "IN PROGRESS",
    "In Progress",
    "IN PROG",
    "In Prog",
    "SCRS IN PROGRESS",
    "SCRs IN PROGRESS",
    "SCRs In Progress",
    "SCR IN PROGRESS",
    "SCR In Progress",
    "SCRS IN PROG",
    "SCRs In Prog",
    "IN PROGRESS SCRS",
    "In Progress SCRs",
    "IN PROGRESS SCR",
    "In Progress SCR",
    "Current In Progress",
    "Current IP",
    "IP SCRs",
    "IP",
    "Active SCRs",
    "Active Requests",
    "Current Active Load"
  ];
  const LOAD_SCM_NOTE_ALIASES = [
    "SCM Notes",
    "SCM Note",
    "SCM Staffing Notes",
    "SCM Staffing Note",
    "SC Manager Staffing Notes",
    "SC Manager Staffing Note",
    "SC Staffing Notes",
    "SC Staffing Note",
    "Staffing Notes",
    "Staffing Note",
    "Manager Notes",
    "Manager Note",
    "Comments",
    "Comment",
    "Notes",
    "Formula (Text)",
    "Formula Text",
    "Formula"
  ];
  const LOAD_AVAILABILITY_NOTE_ALIASES = [
    "SC Availability Notes",
    "SC Availability Note",
    "SC Availability Notes Restricted",
    "SC Availability Notes (Restricted)",
    "Availability Notes",
    "Availability Note",
    "Availability Manager Notes",
    "Availability Manager Note",
    "Manager Availability Notes",
    "Manager Availability Note",
    "Resource Availability Notes",
    "Resource Availability Note",
    "Roster Availability Notes",
    "Roster Availability Note",
    "Avail Notes",
    "Avail Note",
    "SC Avail Notes",
    "SC Avail Note",
    "custrecord_emproster_avail_notes",
    "custrecord_emproster_avail_notes_res",
    "custrecord_emproster_availability_notes"
  ];
  let calendarCacheMemo = undefined;
  let loadReportMemo = undefined;
  const formatterCache = new Map();
  const zonedDateTimeCache = new Map();
  const sourceElementByKey = new Map();

  function pageWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  function isDashboardLikePage() {
    return /(?:staffing-dashboard|calendar-refresh)\.html/i.test(window.location.href || "");
  }

  function isNetSuiteScrPage() {
    return /\/app\/common\/custom\/custrecordentry\.nl/i.test(window.location.href || "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9,\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looseName(value) {
    return normalizeName(value).replace(/[^a-z0-9]/g, "");
  }

  function nameKeys(value) {
    const text = normalizeName(value);
    if (!text) return [];
    const keys = new Set([text, looseName(text)]);
    if (text.includes(",")) {
      const [last, rest] = text.split(",");
      const first = String(rest || "").trim().split(/\s+/)[0] || "";
      if (first && last) {
        keys.add(`${first} ${last.trim()}`);
        keys.add(looseName(`${first} ${last.trim()}`));
      }
    } else {
      const parts = text.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        keys.add(`${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`);
        keys.add(looseName(`${parts[parts.length - 1]}, ${parts[0]}`));
      }
    }
    return [...keys].filter(Boolean);
  }

  function emailNameKeys(email) {
    const local = normalizeEmail(email).split("@")[0] || "";
    if (!local) return [];
    const normalized = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!normalized) return [];
    const parts = normalized.split(/\s+/).filter(Boolean);
    const names = [normalized];
    if (parts.length >= 2) names.push(`${parts[parts.length - 1]}, ${parts.slice(0, -1).join(" ")}`);
    return names.flatMap(nameKeys);
  }

  function personNameKeySet(person) {
    return new Set([
      ...nameKeys(person?.name),
      ...emailNameKeys(person?.email)
    ].filter(Boolean));
  }

  function keySetsOverlap(left, right) {
    for (const key of left) {
      if (right.has(key)) return true;
    }
    return false;
  }

  function findFieldKey(record, aliases) {
    if (!record || typeof record !== "object") return "";
    const wanted = aliases.map(normalizeKey).filter(Boolean);
    const keys = Object.keys(record);
    const exact = keys.find(item => wanted.includes(normalizeKey(item)));
    if (exact) return exact;
    return keys.find(item => {
      const normalizedKey = normalizeKey(item);
      return wanted.some(alias => normalizedKey === alias || new RegExp(`^${alias}\\d+$`).test(normalizedKey));
    }) || "";
  }

  function readField(record, aliases) {
    const key = findFieldKey(record, aliases);
    return key ? record[key] : "";
  }

  function readFields(record, aliases) {
    if (!record || typeof record !== "object") return [];
    const wanted = aliases.map(normalizeKey).filter(Boolean);
    return Object.entries(record)
      .filter(([key]) => {
        const normalizedKey = normalizeKey(key);
        return wanted.some(alias => normalizedKey === alias || new RegExp(`^${alias}\\d+$`).test(normalizedKey));
      })
      .map(([, value]) => value);
  }

  function cleanLoadNote(value) {
    const text = String(value ?? "")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(line => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!text || /^(?:none|- none -|--|-|n\/a|na)$/i.test(text)) return "";
    return text;
  }

  function readLoadNotes(record, aliases) {
    const notes = [];
    readFields(record, aliases).forEach(value => {
      const note = cleanLoadNote(value);
      if (note && !notes.includes(note)) notes.push(note);
    });
    return notes.join("\n");
  }

  function numberFrom(value) {
    if (value == null || value === "") return 0;
    const clean = String(value).replace(/,/g, "").trim();
    const match = clean.match(/-?\d+(?:\.\d+)?/);
    const parsed = match ? Number(match[0]) : Number(clean);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  function formatNumber(value) {
    const number = numberFrom(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function readJsonLocalStorage(key) {
    try {
      const raw = pageWindow().localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeJsonLocalStorage(key, value) {
    try {
      pageWindow().localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function latestIsoDate(values) {
    let latest = 0;
    arrayFrom(values).forEach(value => {
      if (!value) return;
      const time = new Date(value).getTime();
      if (Number.isFinite(time) && time > latest) latest = time;
    });
    return latest ? new Date(latest).toISOString() : "";
  }

  function scanLocalStorageForCalendarCaches() {
    const found = [];
    try {
      const storage = pageWindow().localStorage;
      if (!storage) return found;
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!/calendar|graph|staffing-dashboard/i.test(key || "")) continue;
        const parsed = readJsonLocalStorage(key);
        if (!parsed || typeof parsed !== "object") continue;
        const eventCount = arrayFrom(parsed.directEvents).length + arrayFrom(parsed.events).length;
        const availabilityCount = arrayFrom(parsed.availability).length;
        const loadedCount = arrayFrom(parsed.loadedEmails).length;
        if (eventCount || availabilityCount || loadedCount) {
          found.push({ key, parsed, eventCount, availabilityCount, loadedCount });
        }
      }
    } catch (error) {
      console.warn("SCOUT inline calendar drawer: localStorage calendar scan failed", error);
    }
    return found;
  }

  function gmGet(key, fallback = null) {
    try {
      if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
    } catch (error) {
      console.warn("SCOUT inline calendar drawer: GM_getValue failed", error);
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
      console.warn("SCOUT inline calendar drawer: GM_setValue failed", error);
    }
    return false;
  }

  function decodeBase64Url(value) {
    const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function ensureGraphCrypto() {
    if (!window.crypto?.subtle) {
      throw new Error("Encrypted token storage requires Web Crypto. Use Chrome or Edge.");
    }
  }

  function getGraphExplorerTokenExpiry(token) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length < 2) return null;
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      const exp = Number(payload.exp || 0);
      return exp ? exp * 1000 : null;
    } catch (_) {
      return null;
    }
  }

  function captureGraphTokenBridge() {
    try {
      const storage = pageWindow().localStorage;
      if (!storage) return null;
      const tokenVault = readJsonLocalStorage(GRAPH_EXPLORER_TOKEN_VAULT_KEY);
      const localKey = storage.getItem(GRAPH_EXPLORER_LOCAL_KEY_KEY);
      if (!tokenVault || !localKey) return null;
      const bridged = {
        capturedAt: new Date().toISOString(),
        pageUrl: window.location.href,
        tokenVault,
        localKey
      };
      gmSet(GRAPH_TOKEN_BRIDGE_KEY, bridged);
      return bridged;
    } catch (error) {
      console.warn("SCOUT inline calendar drawer: token bridge capture failed", error);
      return null;
    }
  }

  function installGraphTokenBridgeCapture() {
    const capture = () => captureGraphTokenBridge();
    window.setTimeout(capture, 1000);
    window.setTimeout(capture, 6000);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      capture();
      if (attempts >= 12) window.clearInterval(timer);
    }, 5000);
    window.addEventListener("storage", event => {
      if (event.key === GRAPH_EXPLORER_TOKEN_VAULT_KEY || event.key === GRAPH_EXPLORER_LOCAL_KEY_KEY) {
        window.setTimeout(capture, 200);
      }
    });
    window.addEventListener("click", event => {
      const label = String(event.target?.textContent || event.target?.value || "");
      if (/save.*token|refresh.*token|open token refresh/i.test(label)) {
        window.setTimeout(capture, 1000);
        window.setTimeout(capture, 5000);
      }
    }, true);
  }

  async function decryptGraphTokenRecord(record, localKey) {
    ensureGraphCrypto();
    if (!record || record.kind !== "sc-calendar-graph-explorer-token-vault" || !record.ciphertext || !record.iv) {
      throw new Error("No saved Graph token was found. Open calendar refresh, save a token, then try Refresh Calendars again.");
    }
    if (record.keyMode === "passphrase") {
      throw new Error("The saved token requires a passphrase. Load it on the calendar refresh page first.");
    }
    if (!localKey) {
      throw new Error("The saved token key was not captured yet. Open the calendar refresh or dashboard page once, then return to NetSuite.");
    }

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      base64ToBytes(localKey),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const plaintext = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(record.iv) },
      cryptoKey,
      base64ToBytes(record.ciphertext)
    );
    const payload = JSON.parse(new TextDecoder().decode(plaintext));
    const expiresAt = Number(payload.expiresAt || getGraphExplorerTokenExpiry(payload.token) || 0);
    if (expiresAt && expiresAt <= Date.now()) {
      throw new Error("The saved Graph token expired. Open calendar refresh and save a fresh token.");
    }
    return String(payload.token || "");
  }

  async function getStoredGraphToken() {
    const localVault = readJsonLocalStorage(GRAPH_EXPLORER_TOKEN_VAULT_KEY);
    const localKey = pageWindow().localStorage?.getItem(GRAPH_EXPLORER_LOCAL_KEY_KEY);
    if (localVault && localKey) return decryptGraphTokenRecord(localVault, localKey);

    const bridged = gmGet(GRAPH_TOKEN_BRIDGE_KEY, null);
    if (bridged?.tokenVault && bridged?.localKey) {
      return decryptGraphTokenRecord(bridged.tokenVault, bridged.localKey);
    }
    throw new Error("No saved Graph token is available to the drawer. Open the calendar refresh/dashboard page once after saving a token so SCOUT can bridge it to NetSuite.");
  }

  function arrayFrom(value) {
    if (value instanceof Set) return [...value];
    return Array.isArray(value) ? value : [];
  }

  function collectEmail(value, set) {
    const email = normalizeEmail(value);
    if (email) set.add(email);
  }

  function eventKey(event) {
    return [
      normalizeEmail(event.email),
      String(event.status || "").toLowerCase(),
      String(event.subject || ""),
      String(event.start || ""),
      String(event.end || "")
    ].join("|");
  }

  function compactEvents(events) {
    const seen = new Set();
    return arrayFrom(events).map(event => ({
      email: normalizeEmail(event.email || event.mail || event.userPrincipalName),
      subject: String(event.subject || event.title || event.summary || "Calendar item"),
      status: String(event.status || event.showAs || event.freeBusyStatus || event.availability || "").trim(),
      start: extractDateValue(event.start) || extractDateValue(event.startDate) || event.startDateTime || "",
      end: extractDateValue(event.end) || extractDateValue(event.endDate) || event.endDateTime || "",
      isAllDay: Boolean(event.isAllDay),
      source: event.source || ""
    })).filter(event => event.email && event.start && event.end)
      .filter(event => {
        const key = eventKey(event);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function extractDateValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value.dateTime || value.date || value.value || "";
    return "";
  }

  function captureCalendarCacheFromDashboard() {
    const win = pageWindow();
    const localGraph = readJsonLocalStorage(LOCAL_GRAPH_CACHE_KEY) || {};
    const legacy = readJsonLocalStorage(LEGACY_CALENDAR_CACHE_KEY) || {};
    const discovered = scanLocalStorageForCalendarCaches();
    const events = compactEvents([
      ...arrayFrom(localGraph.directEvents),
      ...arrayFrom(localGraph.events),
      ...arrayFrom(legacy.events),
      ...arrayFrom(win.DIRECT_CONNECTOR_EVENTS),
      ...discovered.flatMap(item => [
        ...arrayFrom(item.parsed.directEvents),
        ...arrayFrom(item.parsed.events)
      ])
    ]);
    const availability = [
      ...arrayFrom(localGraph.availability),
      ...arrayFrom(win.DIRECT_CONNECTOR_AVAILABILITY),
      ...discovered.flatMap(item => arrayFrom(item.parsed.availability))
    ];
    const loadedEmails = new Set();
    arrayFrom(localGraph.loadedEmails).forEach(email => collectEmail(email, loadedEmails));
    arrayFrom(win.DIRECT_CONNECTOR_LOADED_EMAILS).forEach(email => collectEmail(email, loadedEmails));
    discovered.flatMap(item => arrayFrom(item.parsed.loadedEmails)).forEach(email => collectEmail(email, loadedEmails));
    events.forEach(event => collectEmail(event.email, loadedEmails));
    availability.forEach(item => collectEmail(item.email, loadedEmails));
    const roster = [
      ...arrayFrom(win.SC_STAFFING_IMPORTED_ROSTER),
      ...discovered.flatMap(item => arrayFrom(item.parsed.roster))
    ].map(person => ({
      name: person.name || person.employee || person.consultant || "",
      email: normalizeEmail(person.email),
      manager: person.manager || person.team || "",
      legacyOrg: person.legacyOrg || person.type || "",
      timeZone: person.timeZone || person.timezone || ""
    })).filter(person => person.email || person.name);

    if (!events.length && !loadedEmails.size && !roster.length) return null;
    const discoveredRefreshedAt = latestIsoDate(discovered.flatMap(item => [
      item.parsed.refreshedAt,
      item.parsed.cachedAt,
      item.parsed.capturedAt,
      item.parsed.updatedAt
    ]));
    const payload = {
      version: 1,
      capturedBy: `SCOUT Inline Calendar Drawer ${VERSION}`,
      capturedAt: new Date().toISOString(),
      pageUrl: window.location.href,
      sourceRefreshedAt: localGraph.refreshedAt || legacy.refreshedAt || discoveredRefreshedAt,
      windowStart: localGraph.start || "",
      windowEnd: localGraph.end || "",
      discoveredStorageKeys: discovered.map(item => item.key),
      loadedEmails: [...loadedEmails].sort(),
      roster,
      availability,
      events
    };
    gmSet(CALENDAR_CACHE_KEY, payload);
    calendarCacheMemo = payload;
    win.__SCOUT_INLINE_CALENDAR_DRAWER_CACHE = payload;
    return payload;
  }

  function installDashboardCapture() {
    const capture = () => {
      const payload = captureCalendarCacheFromDashboard();
      if (payload) {
        console.log(`SCOUT inline calendar drawer cache captured: ${payload.events.length} events, ${payload.loadedEmails.length} loaded emails`);
      }
    };
    window.setTimeout(capture, 2500);
    window.setTimeout(capture, 9000);
    window.addEventListener("scout-calendar-cache-updated", () => window.setTimeout(capture, 500));
    window.addEventListener("click", event => {
      const label = String(event.target?.textContent || event.target?.value || "");
      if (/refresh.*(token|calendar|selected)/i.test(label)) {
        window.setTimeout(capture, 5000);
        window.setTimeout(capture, 20000);
        window.setTimeout(capture, 60000);
      }
    }, true);
    window.addEventListener("storage", event => {
      if (event.key === LOCAL_GRAPH_CACHE_KEY || event.key === LEGACY_CALENDAR_CACHE_KEY) {
        window.setTimeout(capture, 500);
      }
    });
  }

  function getCalendarCache() {
    if (calendarCacheMemo !== undefined) return calendarCacheMemo;
    calendarCacheMemo = gmGet(CALENDAR_CACHE_KEY, null) || null;
    return calendarCacheMemo;
  }

  function refreshCalendarCacheMemo() {
    calendarCacheMemo = gmGet(CALENDAR_CACHE_KEY, null) || null;
    return calendarCacheMemo;
  }

  function mergeAndWriteDrawerGraphCache(next) {
    const existing = getCalendarCache() || {};
    const refreshedEmails = new Set(arrayFrom(next.loadedEmails).map(normalizeEmail).filter(Boolean));
    const keepForOtherEmailOrDate = item => {
      const email = normalizeEmail(item.email);
      return !refreshedEmails.has(email) || !calendarRecordOverlapsDateWindow(item, next.start, next.end);
    };
    const retainAvailability = item => {
      const email = normalizeEmail(item.email);
      return refreshedEmails.has(email)
        ? splitAvailabilityOutsideDateWindow(item, next.start, next.end)
        : [item];
    };
    const rosterMap = new Map(arrayFrom(existing.roster).map(person => [normalizeEmail(person.email), person]));
    arrayFrom(next.roster).forEach(person => {
      const email = normalizeEmail(person.email);
      if (email) rosterMap.set(email, { ...person, email });
    });

    const availability = [
      ...arrayFrom(existing.availability).flatMap(retainAvailability),
      ...arrayFrom(next.availability)
    ];
    const directEvents = [
      ...arrayFrom(existing.events).filter(keepForOtherEmailOrDate),
      ...arrayFrom(next.directEvents)
    ];
    const events = compactEvents([
      ...directEvents,
      ...eventsWithDetailedFallback(next.availability, next.directEvents)
    ]);
    const payload = {
      version: 1,
      capturedBy: `SCOUT Inline Calendar Drawer ${VERSION}`,
      capturedAt: new Date().toISOString(),
      refreshedAt: next.refreshedAt,
      sourceRefreshedAt: next.refreshedAt,
      pageUrl: window.location.href,
      windowStart: next.start,
      windowEnd: next.end,
      loadedEmails: [...new Set([
        ...arrayFrom(existing.loadedEmails),
        ...arrayFrom(next.loadedEmails)
      ].map(normalizeEmail).filter(Boolean))].sort(),
      roster: [...rosterMap.values()].sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email))),
      availability,
      events,
      errors: [
        ...arrayFrom(existing.errors),
        ...arrayFrom(next.errors)
      ].slice(-50)
    };

    gmSet(CALENDAR_CACHE_KEY, payload);
    calendarCacheMemo = payload;
    try {
      pageWindow().__SCOUT_INLINE_CALENDAR_DRAWER_CACHE = payload;
      writeJsonLocalStorage(LOCAL_GRAPH_CACHE_KEY, {
        version: 1,
        source: "scout-inline-drawer-graph-refresh",
        refreshedAt: next.refreshedAt,
        start: next.start,
        end: next.end,
        intervalMinutes: next.intervalMinutes,
        roster: payload.roster,
        loadedEmails: payload.loadedEmails,
        availability,
        directEvents: arrayFrom(next.directEvents),
        events: [],
        errors: payload.errors
      });
      window.dispatchEvent(new CustomEvent("scout-calendar-cache-updated", {
        detail: {
          source: "scout-inline-drawer-graph-refresh",
          refreshedAt: next.refreshedAt,
          loadedEmails: next.loadedEmails
        }
      }));
    } catch (_) {
      // LocalStorage is best-effort here; Tampermonkey storage is the drawer source of truth.
    }
    return payload;
  }

  function setDrawerRefreshStatus(root, message, tone = "") {
    const status = root?.querySelector("[data-scid-refresh-status]");
    if (!status) return;
    status.dataset.tone = tone || "";
    const msg = message || "";
    const needsRefreshLink = tone === "error" && /token|calendar refresh/i.test(msg);
    if (needsRefreshLink) {
      status.textContent = "";
      const text = document.createElement("span");
      text.textContent = msg;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scid-refresh-link";
      button.textContent = "Open Calendar Refresh";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openUrl(CALENDAR_REFRESH_URL);
      });
      status.append(text, button);
      return;
    }
    status.textContent = msg;
  }

  function buildDrawerGraphContext(root, people) {
    const filters = getDrawerFilters(root);
    const emails = [...new Set(uniquePeople(people).map(person => normalizeEmail(person.email)).filter(Boolean))];
    if (!emails.length) throw new Error("No consultant email was available for the drawer refresh.");
    const rosterByEmail = {};
    uniquePeople(people).forEach(person => {
      const email = normalizeEmail(person.email);
      if (!email) return;
      rosterByEmail[email] = {
        name: person.name || email,
        email,
        manager: person.manager || "",
        legacyOrg: person.legacyOrg || person.vertical || "",
        timeZone: person.timeZone || filters.timeZone || ""
      };
    });
    return {
      emails,
      rosterByEmail,
      start: filters.date,
      end: addDaysIso(filters.date, GRAPH_REFRESH_DAYS),
      intervalMinutes: 30,
      timeZone: filters.timeZone
    };
  }

  async function refreshDrawerCalendars(root = document.getElementById(DRAWER_ID)) {
    if (!root || root.hidden) return;
    const refreshButton = root.querySelector("[data-scid-refresh-token]");
    const originalText = refreshButton?.textContent || "Refresh Calendars";
    const people = uniquePeople(root.__scidPeople || []);
    let context = null;
    try {
      context = buildDrawerGraphContext(root, people);
      if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Refreshing...";
      }
      setDrawerRefreshStatus(root, `Refreshing ${context.emails.length} SC${context.emails.length === 1 ? "" : "s"} from Graph...`);
      const token = await getStoredGraphToken();
      const chunks = chunkArray(context.emails, GRAPH_REFRESH_BATCH_SIZE);
      const combined = {
        refreshedAt: new Date().toISOString(),
        start: context.start,
        end: context.end,
        intervalMinutes: context.intervalMinutes,
        loadedEmails: [],
        availability: [],
        directEvents: [],
        events: [],
        errors: [],
        roster: []
      };

      for (let index = 0; index < chunks.length; index += 1) {
        const emails = chunks[index];
        const payload = await fetchGraphSchedule(token, context, emails);
        const normalized = normalizeGraphSchedules(payload, context, emails, context.rosterByEmail);
        combined.loadedEmails.push(...normalized.loadedEmails);
        combined.availability.push(...normalized.availability);
        combined.directEvents.push(...normalized.directEvents);
        combined.errors.push(...normalized.errors);
        combined.roster.push(...normalized.roster);
        setDrawerRefreshStatus(root, `Graph schedule ${index + 1}/${chunks.length}: ${combined.directEvents.length} detailed item${combined.directEvents.length === 1 ? "" : "s"}...`);
      }

      if (context.emails.length <= GRAPH_CALENDAR_VIEW_DETAIL_LIMIT) {
        const detailResults = await mapWithConcurrency(
          context.emails,
          GRAPH_CALENDAR_VIEW_DETAIL_CONCURRENCY,
          async (email, index) => {
            const result = await fetchGraphCalendarView(token, context, email);
            setDrawerRefreshStatus(root, `Calendar detail ${index + 1}/${context.emails.length}: ${combined.directEvents.length + result.events.length} item${combined.directEvents.length + result.events.length === 1 ? "" : "s"}...`);
            return result;
          }
        );
        detailResults.forEach(result => {
          combined.directEvents.push(...arrayFrom(result?.events));
          combined.errors.push(...arrayFrom(result?.errors));
        });
      }

      combined.loadedEmails = [...new Set(combined.loadedEmails.map(normalizeEmail).filter(Boolean))].sort();
      combined.roster = [...new Map(combined.roster.map(person => [normalizeEmail(person.email), person])).values()];
      combined.directEvents = [...new Map(combined.directEvents.map(event => [
        `${normalizeEmail(event.email)}|${event.status}|${event.subject}|${event.start}|${event.end}`,
        event
      ])).values()];
      combined.events = eventsWithDetailedFallback(combined.availability, combined.directEvents);
      mergeAndWriteDrawerGraphCache(combined);
      refreshCalendarCacheMemo();
      renderDrawerPeople(root);
      setDrawerRefreshStatus(root, `Refreshed ${combined.loadedEmails.length} SC${combined.loadedEmails.length === 1 ? "" : "s"} at ${new Date(combined.refreshedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`, "ok");
      updateCalendarStalePrompt();
    } catch (error) {
      setDrawerRefreshStatus(root, error.message || "Calendar refresh failed.", "error");
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = originalText;
      }
    }
  }

  function calendarCacheTimestamp(cache) {
    const candidates = [
      cache?.sourceRefreshedAt,
      cache?.refreshedAt,
      cache?.capturedAt
    ];
    for (const value of candidates) {
      if (!value) continue;
      const time = new Date(value).getTime();
      if (Number.isFinite(time)) return time;
    }
    return 0;
  }

  function getCalendarCacheFreshness(cache = refreshCalendarCacheMemo()) {
    const timestamp = calendarCacheTimestamp(cache);
    const hasData = Boolean(cache && (
      arrayFrom(cache.events).length ||
      arrayFrom(cache.directEvents).length ||
      arrayFrom(cache.availability).length ||
      arrayFrom(cache.loadedEmails).length ||
      arrayFrom(cache.roster).length
    ));
    if (!hasData || !timestamp) {
      return {
        fresh: false,
        missing: !hasData,
        timestamp,
        ageMs: Infinity,
        message: hasData ? "Calendar data refresh time is unknown." : "Calendar data cache is missing."
      };
    }
    const ageMs = Date.now() - timestamp;
    const fresh = ageMs < CALENDAR_STALE_AFTER_MS;
    return {
      fresh,
      missing: false,
      timestamp,
      ageMs,
      message: fresh
        ? `Calendar data refreshed ${formatAge(ageMs)} ago.`
        : `Calendar data is ${formatAge(ageMs)} old.`
    };
  }

  function formatAge(ageMs) {
    if (!Number.isFinite(ageMs)) return "unknown";
    const minutes = Math.max(0, Math.round(ageMs / 60000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 48) return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  function getStaffingLoadReport() {
    if (loadReportMemo !== undefined) return loadReportMemo;
    const win = pageWindow();
    try {
      if (typeof win.getScoutStaffingLoadCache === "function") {
        const report = win.getScoutStaffingLoadCache();
        if (report?.rows?.length) {
          loadReportMemo = report;
          return loadReportMemo;
        }
      }
    } catch (error) {
      console.warn("SCOUT inline calendar drawer: could not read workload bridge", error);
    }
    const stored = readJsonLocalStorage(STAFFING_LOAD_STORAGE_KEY);
    loadReportMemo = stored?.rows?.length ? stored : null;
    return loadReportMemo;
  }

  function getLoadRowIdentity(row) {
    const name = readField(row, LOAD_NAME_ALIASES);
    const email = normalizeEmail(readField(row, LOAD_EMAIL_ALIASES));
    const manager = readField(row, LOAD_MANAGER_ALIASES);
    const legacyOrg = readField(row, LOAD_ORG_ALIASES);
    return { name, email, manager, legacyOrg };
  }

  function findLoadForPerson(person, options = {}) {
    const report = getStaffingLoadReport();
    const rows = arrayFrom(report?.rows);
    if (!rows.length) return null;
    const email = normalizeEmail(person.email);
    const keys = personNameKeySet(person);
    const scored = rows.map(row => {
      const identity = getLoadRowIdentity(row);
      const emailMatch = Boolean(email && identity.email === email);
      const nameMatch = Boolean(keys.size && keySetsOverlap(personNameKeySet(identity), keys));
      let score = 0;
      if (emailMatch) score += options.preferName ? 20 : 80;
      if (nameMatch) score += options.preferName ? 60 : 40;
      if (identity.email && isCalendarLoadedForEmail(identity.email)) score += 30;
      if (identity.manager && normalizeName(identity.manager) === normalizeName(person.manager)) score += 5;
      if (identity.legacyOrg && normalizeName(identity.legacyOrg) === normalizeName(person.vertical || person.legacyOrg)) score += 4;
      return { row, score };
    }).filter(candidate => candidate.score > 0)
      .sort((left, right) => right.score - left.score);
    return scored[0]?.row || null;
  }

  function summarizeLoad(load, legacyOrg) {
    if (!load) return null;
    const inProgressSource = findFieldKey(load, LOAD_IN_PROGRESS_ALIASES);
    const rawInProgressValue = inProgressSource ? load[inProgressSource] : "";
    const inProgress = numberFrom(rawInProgressValue);
    const thisMonth = numberFrom(readField(load, ["SCRs THIS MONTH", "This Month", "This Mo"]));
    const nextMonth = numberFrom(readField(load, ["SCRs NEXT MONTH", "Next Month", "Next Mo"]));
    const maxMonth = Math.max(thisMonth, nextMonth);
    const isAmo = /amo/i.test(String(legacyOrg || readField(load, ["Type", "A/D", "Direct/AMO", "Legacy Org"])));
    let label = "Light";
    let level = "green";
    if (isAmo) {
      if (inProgress >= 10 || maxMonth >= 16) {
        label = "Heavy";
        level = "red";
      } else if (inProgress >= 6 || maxMonth >= 9) {
        label = "Review";
        level = "yellow";
      }
    } else if (inProgress >= 7 || maxMonth >= 8) {
      label = "Heavy";
      level = "red";
    } else if (inProgress >= 4 || maxMonth >= 5) {
      label = "Review";
      level = "yellow";
    }
    return {
      level,
      label,
      isAmo,
      total: numberFrom(readField(load, ["Total SCRs", "Total", "SCRs"])),
      assignedLast10Days: numberFrom(readField(load, ["SCRS ASGND -10 DAYS", "SCRs ASGND -10 DAYS", "Assigned Last 10 Days", "-10 Days"])),
      inProgress,
      inProgressSource,
      rawInProgressValue,
      nextWeek: numberFrom(readField(load, ["SCRs NEXT WEEK", "Next Week", "Next Wk"])),
      thisMonth,
      nextMonth,
      note: `${isAmo ? "AMO" : "Direct"} load: ${formatNumber(inProgress)} in progress; ${formatNumber(maxMonth)} max this/next month.`
    };
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    const slash = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!slash) return null;
    return new Date(Number(slash[3]), Number(slash[1]) - 1, Number(slash[2]));
  }

  function isoDate(date) {
    const d = parseDate(date) || new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function addDaysIso(dateValue, days) {
    const [year, month, day] = String(dateValue).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function formatShortDate(dateValue) {
    const date = parseDate(`${dateValue}T12:00:00`);
    if (!date) return dateValue;
    return date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  }

  function formatLongDate(dateValue) {
    const date = parseDate(`${dateValue}T12:00:00`);
    if (!date) return dateValue;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function weekdayLabel(dateValue) {
    const date = parseDate(`${dateValue}T12:00:00`);
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  function isWeekend(dateValue) {
    const date = parseDate(`${dateValue}T12:00:00`);
    const day = date ? date.getDay() : 0;
    return day === 0 || day === 6;
  }

  function getCachedFormatter(key, options) {
    const cacheKey = `${key}|${JSON.stringify(options)}`;
    if (!formatterCache.has(cacheKey)) {
      formatterCache.set(cacheKey, new Intl.DateTimeFormat("en-US", options));
    }
    return formatterCache.get(cacheKey);
  }

  function getBrowserTimeZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
    } catch (_) {
      return "America/New_York";
    }
  }

  function isValidTimeZone(value) {
    if (!value) return false;
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalizeTimeZoneValue(value, fallback = getBrowserTimeZone()) {
    const text = String(value || "").trim();
    if (isValidTimeZone(text)) return text;
    const lower = text.toLowerCase();
    const match = DRAWER_TIME_ZONES.find(([zone, label]) => zone.toLowerCase() === lower || label.toLowerCase() === lower);
    return match?.[0] || fallback || "America/New_York";
  }

  function getZoneLabel(timeZone) {
    const normalized = normalizeTimeZoneValue(timeZone, "America/New_York");
    return DRAWER_TIME_ZONES.find(([value]) => value === normalized)?.[1] || normalized || "Local time";
  }

  function getTimeZoneOffset(date, timeZone) {
    timeZone = normalizeTimeZoneValue(timeZone, "America/New_York");
    const parts = getCachedFormatter(`offset|${timeZone}`, {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

    const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second)
    );
    return localAsUtc - date.getTime();
  }

  function zonedDateTime(dateValue, minutes, timeZone) {
    timeZone = normalizeTimeZoneValue(timeZone, "America/New_York");
    const cacheKey = `${dateValue}|${minutes}|${timeZone}`;
    if (zonedDateTimeCache.has(cacheKey)) return new Date(zonedDateTimeCache.get(cacheKey));
    const [year, month, day] = String(dateValue).split("-").map(Number);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const guess = new Date(Date.UTC(year, month - 1, day, hours, mins, 0));
    const timestamp = guess.getTime() - getTimeZoneOffset(guess, timeZone);
    zonedDateTimeCache.set(cacheKey, timestamp);
    return new Date(timestamp);
  }

  function workdayWindow(dateValue, timeZone = getDefaultDrawerTimeZone()) {
    const start = zonedDateTime(dateValue, WORKDAY_START_MINUTES, timeZone);
    const end = zonedDateTime(dateValue, WORKDAY_END_MINUTES, timeZone);
    return { start, end, minutes: WORKDAY_MINUTES };
  }

  function fullDayWindow(dateValue, timeZone = getDefaultDrawerTimeZone()) {
    return {
      start: zonedDateTime(dateValue, 0, timeZone),
      end: zonedDateTime(addDaysIso(dateValue, 1), 0, timeZone)
    };
  }

  function graphExplorerTimeZone(value) {
    const text = normalizeTimeZoneValue(value || "America/New_York", "America/New_York");
    return GRAPH_TIME_ZONE_MAP[text] || text;
  }

  function graphDateTimeToIso(value, timeZone) {
    const raw = String(value?.dateTime || value || "").trim();
    if (!raw) return "";
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw).toISOString();

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/);
    if (!match) return new Date(raw).toISOString();

    const [, year, month, day, hour, minute, second = "0"] = match;
    const guess = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
    return new Date(guess.getTime() - getTimeZoneOffset(guess, timeZone)).toISOString();
  }

  function getScheduleItemLocation(item) {
    const location = item?.location;
    if (!location) return "";
    if (typeof location === "string") return location;
    return location.displayName || location.locationUri || "";
  }

  function normalizeGraphScheduleItem(item, email, context) {
    const status = String(item?.status || item?.showAs || "busy");
    const start = graphDateTimeToIso(item?.start, context.timeZone);
    const end = graphDateTimeToIso(item?.end, context.timeZone);
    if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) return null;
    return {
      email: normalizeEmail(email),
      status,
      subject: String(item?.subject || (item?.isPrivate ? "Private calendar item" : "Calendar item")),
      location: getScheduleItemLocation(item),
      isPrivate: Boolean(item?.isPrivate),
      isAllDay: Boolean(item?.isAllDay),
      start,
      end,
      source: "Graph scheduleItems"
    };
  }

  function normalizeGraphCalendarViewItem(item, email, context) {
    if (!item || item.isCancelled) return null;
    const status = String(item.showAs || item.status || "busy");
    const start = graphDateTimeToIso(item.start, context.timeZone);
    const end = graphDateTimeToIso(item.end, context.timeZone);
    if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) return null;
    return {
      email: normalizeEmail(email),
      status,
      subject: String(item.subject || (item.isPrivate ? "Private calendar item" : "Calendar item")),
      location: getScheduleItemLocation(item),
      isPrivate: Boolean(item.isPrivate || item.sensitivity === "private"),
      isAllDay: Boolean(item.isAllDay),
      start,
      end,
      source: "Graph calendarView"
    };
  }

  async function fetchGraphSchedule(token, context, emails) {
    const timeZone = graphExplorerTimeZone(context.timeZone);
    const response = await fetch(GRAPH_GET_SCHEDULE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Prefer": `outlook.timezone="${timeZone}"`
      },
      body: JSON.stringify({
        schedules: emails,
        startTime: {
          dateTime: `${context.start}T00:00:00`,
          timeZone
        },
        endTime: {
          dateTime: `${context.end}T00:00:00`,
          timeZone
        },
        availabilityViewInterval: Number(context.intervalMinutes || 30)
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error?.message || payload.message || `Microsoft Graph returned ${response.status}`);
    }
    return payload;
  }

  async function fetchGraphCalendarView(token, context, email) {
    const timeZone = graphExplorerTimeZone(context.timeZone);
    const events = [];
    const errors = [];
    let page = 0;
    let url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}/calendarView`);
    url.searchParams.set("startDateTime", `${context.start}T00:00:00`);
    url.searchParams.set("endDateTime", `${context.end}T00:00:00`);
    url.searchParams.set("$select", "subject,start,end,showAs,isAllDay,isCancelled,isPrivate,sensitivity,location");
    url.searchParams.set("$top", "100");

    while (url && page < GRAPH_CALENDAR_VIEW_PAGE_LIMIT) {
      page += 1;
      try {
        const response = await fetch(url.toString(), {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Prefer": `outlook.timezone="${timeZone}"`
          }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          errors.push({
            email: normalizeEmail(email),
            responseCode: String(response.status),
            message: payload.error?.message || payload.message || `CalendarView returned ${response.status}`,
            start: `${context.start}T00:00:00.000Z`,
            end: `${context.end}T00:00:00.000Z`
          });
          break;
        }
        arrayFrom(payload.value).forEach(item => {
          const normalized = normalizeGraphCalendarViewItem(item, email, context);
          if (normalized) events.push(normalized);
        });
        url = payload["@odata.nextLink"] ? new URL(payload["@odata.nextLink"]) : null;
      } catch (error) {
        errors.push({
          email: normalizeEmail(email),
          message: error.message || "CalendarView request failed.",
          start: `${context.start}T00:00:00.000Z`,
          end: `${context.end}T00:00:00.000Z`
        });
        break;
      }
    }
    return { email: normalizeEmail(email), events, errors };
  }

  function chunkArray(values, size) {
    const chunks = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks.length ? chunks : [[]];
  }

  async function mapWithConcurrency(values, limit, mapper) {
    const results = new Array(values.length);
    let nextIndex = 0;
    const workerCount = Math.min(limit, values.length);
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await mapper(values[index], index);
      }
    }));
    return results;
  }

  function expandGraphAvailability(snapshot) {
    const view = String(snapshot.view || "");
    const intervalMs = Number(snapshot.intervalMinutes || 30) * 60 * 1000;
    const startMs = Date.parse(snapshot.start);
    const expanded = [];
    if (!view || !Number.isFinite(startMs) || !intervalMs) return expanded;

    let blockCode = null;
    let blockStart = 0;
    const flush = endIndex => {
      if (!blockCode || !GRAPH_AVAILABILITY_STATUS_MAP[blockCode]) return;
      expanded.push({
        email: normalizeEmail(snapshot.email),
        status: GRAPH_AVAILABILITY_STATUS_MAP[blockCode].status,
        subject: GRAPH_AVAILABILITY_STATUS_MAP[blockCode].subject,
        start: new Date(startMs + blockStart * intervalMs).toISOString(),
        end: new Date(startMs + endIndex * intervalMs).toISOString(),
        source: "Graph availabilityView"
      });
    };

    for (let index = 0; index <= view.length; index += 1) {
      const code = view[index] || "0";
      if (code === blockCode) continue;
      flush(index);
      blockCode = GRAPH_AVAILABILITY_STATUS_MAP[code] ? code : null;
      blockStart = index;
    }
    return expanded;
  }

  function normalizeGraphSchedules(payload, context, emails, rosterByEmail) {
    const expected = new Set(emails.map(normalizeEmail));
    const returned = new Set();
    const availability = [];
    const directEvents = [];
    const errors = [];
    const intervalMinutes = Number(context.intervalMinutes || 30);

    arrayFrom(payload.value).forEach(schedule => {
      const email = normalizeEmail(schedule.scheduleId || schedule.schedule_id);
      if (!expected.has(email)) return;
      returned.add(email);

      if (schedule.error) {
        errors.push({
          email,
          responseCode: schedule.error.responseCode || schedule.error.code || null,
          message: schedule.error.message || "Microsoft Graph returned an error for this schedule.",
          start: `${context.start}T00:00:00.000Z`,
          end: `${context.end}T00:00:00.000Z`
        });
      }

      const view = schedule.availabilityView || schedule.availability_view || "";
      if (view) {
        availability.push({
          email,
          start: `${context.start}T00:00:00.000Z`,
          intervalMinutes,
          view: String(view)
        });
      }

      const scheduleItems = Array.isArray(schedule.scheduleItems)
        ? schedule.scheduleItems
        : Array.isArray(schedule.schedule_items)
        ? schedule.schedule_items
        : [];
      scheduleItems.forEach(item => {
        const normalized = normalizeGraphScheduleItem(item, email, context);
        if (normalized) directEvents.push(normalized);
      });
    });

    [...expected].filter(email => !returned.has(email)).forEach(email => {
      errors.push({
        email,
        message: "Microsoft Graph did not return this schedule in the getSchedule response.",
        start: `${context.start}T00:00:00.000Z`,
        end: `${context.end}T00:00:00.000Z`
      });
    });

    return {
      loadedEmails: [...expected].sort(),
      availability,
      directEvents,
      errors,
      roster: [...expected].map(email => rosterByEmail[email]).filter(Boolean)
    };
  }

  function dateWindowStartMs(dateValue) {
    return Date.parse(`${dateValue}T00:00:00.000Z`);
  }

  function calendarRecordOverlapsDateWindow(record, startDate, endDate) {
    const refreshStartMs = dateWindowStartMs(startDate);
    const refreshEndMs = dateWindowStartMs(endDate);
    const recordStartMs = Date.parse(record?.start);
    const recordEndMs = Date.parse(record?.end || record?.start);
    if (![refreshStartMs, refreshEndMs, recordStartMs, recordEndMs].every(Number.isFinite)) return true;
    return recordStartMs < refreshEndMs && recordEndMs > refreshStartMs;
  }

  function splitAvailabilityOutsideDateWindow(snapshot, startDate, endDate) {
    const view = String(snapshot?.view || "");
    const intervalMs = Number(snapshot?.intervalMinutes || 30) * 60 * 1000;
    const snapshotStartMs = Date.parse(snapshot?.start);
    const refreshStartMs = dateWindowStartMs(startDate);
    const refreshEndMs = dateWindowStartMs(endDate);
    if (!view || !intervalMs || ![snapshotStartMs, refreshStartMs, refreshEndMs].every(Number.isFinite)) {
      return [snapshot];
    }

    const snapshotEndMs = snapshotStartMs + view.length * intervalMs;
    if (snapshotEndMs <= refreshStartMs || snapshotStartMs >= refreshEndMs) return [snapshot];

    const pieces = [];
    const pushPiece = (startIndex, endIndex) => {
      if (endIndex <= startIndex) return;
      pieces.push({
        ...snapshot,
        start: new Date(snapshotStartMs + startIndex * intervalMs).toISOString(),
        view: view.slice(startIndex, endIndex)
      });
    };
    const overlapStartIndex = Math.max(0, Math.floor((refreshStartMs - snapshotStartMs) / intervalMs));
    const overlapEndIndex = Math.min(view.length, Math.ceil((refreshEndMs - snapshotStartMs) / intervalMs));
    pushPiece(0, overlapStartIndex);
    pushPiece(overlapEndIndex, view.length);
    return pieces;
  }

  function eventsWithDetailedFallback(availability, directEvents) {
    const detailedEmails = new Set(directEvents.map(event => normalizeEmail(event.email)).filter(Boolean));
    return [
      ...directEvents,
      ...availability
        .flatMap(expandGraphAvailability)
        .filter(event => !detailedEmails.has(normalizeEmail(event.email)))
    ];
  }

  function overlapMinutes(start, end, eventStart, eventEnd) {
    const left = Math.max(start.getTime(), eventStart.getTime());
    const right = Math.min(end.getTime(), eventEnd.getTime());
    return Math.max(0, Math.round((right - left) / 60000));
  }

  function eventDates(event) {
    const start = parseDate(event.start);
    const end = parseDate(event.end);
    return start && end ? { start, end } : null;
  }

  function statusText(event) {
    return String(event.status || "").toLowerCase();
  }

  function subjectText(event) {
    return String(event.subject || "").toLowerCase();
  }

  function isFreeEvent(event) {
    return /free/.test(statusText(event)) || /^canceled:/i.test(event.subject || "");
  }

  function isPtoEvent(event) {
    const status = statusText(event);
    const subject = subjectText(event);
    return /oof|outofoffice|out of office/.test(status)
      || /\b(pto|ooo|out of office|vacation|holiday|sick day|personal day)\b/.test(subject);
  }

  function eventSeverity(event) {
    if (isFreeEvent(event)) return "free";
    if (isPtoEvent(event)) return "pto";
    const status = statusText(event);
    if (/tentative/.test(status)) return "soft";
    if (/workingelsewhere|working elsewhere/.test(status)) return "review";
    if (/busy/.test(status) || !status) return "hard";
    return "review";
  }

  function getPersonEvents(person, cache = getCalendarCache()) {
    return getEventsForEmail(person.email, cache);
  }

  function getEventsForEmail(emailValue, cache = getCalendarCache()) {
    const email = normalizeEmail(emailValue);
    if (!email || !cache) return [];
    return compactEvents(cache.events).filter(event => normalizeEmail(event.email) === email);
  }

  function isCalendarLoaded(person, cache = getCalendarCache()) {
    return isCalendarLoadedForEmail(person.email, cache);
  }

  function isCalendarLoadedForEmail(emailValue, cache = getCalendarCache()) {
    const email = normalizeEmail(emailValue);
    if (!email || !cache) return false;
    return arrayFrom(cache.loadedEmails).map(normalizeEmail).includes(email)
      || getEventsForEmail(email, cache).length > 0;
  }

  function findRosterForPerson(person, cache = getCalendarCache()) {
    const roster = arrayFrom(cache?.roster);
    if (!roster.length) return null;
    const sourceKeys = personNameKeySet(person);
    const sourceEmail = normalizeEmail(person.email);
    const sourceManager = normalizeName(person.manager);
    const sourceOrg = normalizeName(person.vertical || person.legacyOrg);
    const score = candidate => {
      let value = 0;
      if (isCalendarLoadedForEmail(candidate.email, cache)) value += 30;
      if (sourceEmail && normalizeEmail(candidate.email) === sourceEmail) value += 8;
      if (sourceManager && normalizeName(candidate.manager) === sourceManager) value += 6;
      if (sourceOrg && normalizeName(candidate.legacyOrg) === sourceOrg) value += 4;
      if (candidate.legacyOrg) value += 2;
      return value;
    };
    const nameMatches = roster
      .filter(candidate => sourceKeys.size && keySetsOverlap(personNameKeySet(candidate), sourceKeys))
      .sort((left, right) => score(right) - score(left));
    if (nameMatches.length) return nameMatches[0];
    if (!sourceEmail) return null;
    return roster.find(candidate => normalizeEmail(candidate.email) === sourceEmail) || null;
  }

  function resolvePersonFromCaches(person) {
    const cache = getCalendarCache();
    const sourceKey = person.sourceKey || personIdentityKey(person);
    const rosterMatch = findRosterForPerson(person, cache);
    let resolved = {
      ...person,
      sourceKey,
      originalName: person.originalName || person.name || "",
      originalEmail: person.originalEmail || person.email || ""
    };
    if (rosterMatch) {
      resolved = {
        ...resolved,
        name: rosterMatch.name || resolved.name,
        email: normalizeEmail(rosterMatch.email) || resolved.email,
        manager: rosterMatch.manager || resolved.manager,
        legacyOrg: rosterMatch.legacyOrg || resolved.legacyOrg || resolved.vertical,
        vertical: rosterMatch.legacyOrg || resolved.vertical || resolved.legacyOrg,
        timeZone: rosterMatch.timeZone || resolved.timeZone,
        resolvedFromCache: true
      };
    }
    const load = findLoadForPerson(resolved, { preferName: !rosterMatch && !isCalendarLoadedForEmail(resolved.email, cache) });
    const identity = getLoadRowIdentity(load);
    if (load) {
      const currentLoaded = isCalendarLoadedForEmail(resolved.email, cache);
      const loadLoaded = isCalendarLoadedForEmail(identity.email, cache);
      if (identity.name && !resolved.name) resolved.name = identity.name;
      if (identity.email && (!resolved.email || (!currentLoaded && loadLoaded))) resolved.email = identity.email;
      if (identity.manager && !resolved.manager) resolved.manager = identity.manager;
      if (identity.legacyOrg && !resolved.legacyOrg) resolved.legacyOrg = identity.legacyOrg;
      if (identity.legacyOrg && !resolved.vertical) resolved.vertical = identity.legacyOrg;
    }
    return resolved;
  }

  function dayStats(events, dateValue, timeZone = getDefaultDrawerTimeZone()) {
    const windowConfig = workdayWindow(dateValue, timeZone);
    const totals = { pto: 0, hard: 0, soft: 0, review: 0, open: 0, busy: 0, workdayMinutes: WORKDAY_MINUTES };
    events.forEach(event => {
      const dates = eventDates(event);
      if (!dates) return;
      const minutes = overlapMinutes(windowConfig.start, windowConfig.end, dates.start, dates.end);
      if (!minutes) return;
      const severity = eventSeverity(event);
      if (severity === "free") return;
      if (severity === "pto") totals.pto += minutes;
      else if (severity === "soft") totals.soft += minutes;
      else if (severity === "review") totals.review += minutes;
      else totals.hard += minutes;
    });
    totals.pto = Math.min(WORKDAY_MINUTES, totals.pto);
    totals.hard = Math.min(WORKDAY_MINUTES, totals.hard);
    totals.soft = Math.min(WORKDAY_MINUTES, totals.soft);
    totals.review = Math.min(WORKDAY_MINUTES, totals.review);
    totals.busy = Math.min(WORKDAY_MINUTES, totals.pto + totals.hard + totals.soft + totals.review);
    totals.open = Math.max(0, WORKDAY_MINUTES - totals.busy);
    return totals;
  }

  function eventOverlapsRange(event, start, end) {
    if (isFreeEvent(event)) return false;
    const dates = eventDates(event);
    return Boolean(dates && overlapMinutes(start, end, dates.start, dates.end) > 0);
  }

  function countCleanBlocks(events, startDate, days, durationMinutes, timeZone = getDefaultDrawerTimeZone()) {
    let count = 0;
    for (let index = 0; index < days; index += 1) {
      const dateValue = addDaysIso(startDate, index);
      if (isWeekend(dateValue)) continue;
      for (let startMinutes = WORKDAY_START_MINUTES; startMinutes <= WORKDAY_END_MINUTES - durationMinutes; startMinutes += 30) {
        const start = zonedDateTime(dateValue, startMinutes, timeZone);
        const end = new Date(start.getTime() + durationMinutes * 60000);
        if (!events.some(event => eventOverlapsRange(event, start, end))) count += 1;
      }
    }
    return count;
  }

  function getCalendarSignal(person, events, startDate, timeZone = getDefaultDrawerTimeZone()) {
    const isAmo = /amo/i.test(person.vertical || person.legacyOrg || "");
    const primaryDuration = isAmo ? 180 : 240;
    const secondaryDuration = isAmo ? 120 : 180;
    const primaryBlocks = countCleanBlocks(events, startDate, 14, primaryDuration, timeZone);
    const secondaryBlocks = countCleanBlocks(events, startDate, 14, secondaryDuration, timeZone);
    let level = "red";
    let label = "Red";
    if (primaryBlocks >= 5) {
      level = "green";
      label = "Green";
    } else if (secondaryBlocks >= 2) {
      level = "yellow";
      label = "Yellow";
    }
    const travel = events.some(event => /\b(travel|flight|onsite|on-site|airport|hotel)\b/i.test(event.subject || ""));
    return {
      level,
      label,
      primaryBlocks,
      secondaryBlocks,
      primaryHours: primaryDuration / 60,
      secondaryHours: secondaryDuration / 60,
      travel,
      note: `${secondaryBlocks} clean ${secondaryDuration / 60}h blocks; ${primaryBlocks} clean ${primaryDuration / 60}h blocks in the next 2 weeks.`
    };
  }

  function getSelectedScrDate() {
    const ids = [
      "meetingDate",
      "custrecord_screq_date_sc_needed",
      "custrecord_screq_date_needed",
      "custrecord_screq_meeting_date",
      "custrecord_screq_anticipated_customer_meeting_date"
    ];
    for (const id of ids) {
      const element = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      const value = element?.value || "";
      const parsed = parseDate(value);
      if (parsed) return isoDate(parsed);
    }
    return isoDate(new Date());
  }

  function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function clampDrawerNumber(value, fallback, allowedValues = null) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    if (allowedValues && !allowedValues.includes(number)) return fallback;
    return number;
  }

  function minutesToLabel(minutes) {
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  }

  function durationToLabel(minutes) {
    if (minutes < 60) return `${minutes} min`;
    if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
    return `${minutes} min`;
  }

  function formatTimeRange(start, end, timeZone = getDefaultDrawerTimeZone()) {
    return `${formatTime(start, timeZone)} - ${formatTime(end, timeZone)}`;
  }

  function populateDrawerStartOptions(select) {
    if (!select || select.options.length) return;
    for (let minutes = 7 * 60; minutes <= 18 * 60; minutes += 15) {
      const option = document.createElement("option");
      option.value = String(minutes);
      option.textContent = minutesToLabel(minutes);
      select.appendChild(option);
    }
  }

  function ensureSelectOption(select, value, label = value) {
    if (!select || !value) return;
    if ([...select.options].some(option => option.value === value)) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || value;
    select.appendChild(option);
  }

  function populateDrawerTimeZoneOptions(select) {
    if (!select || select.options.length) return;
    DRAWER_TIME_ZONES.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function getDefaultDrawerTimeZone(people = []) {
    const dashboardZone = document.getElementById("planningZone")?.value;
    if (dashboardZone) return normalizeTimeZoneValue(dashboardZone);
    const zones = uniquePeople(people)
      .map(person => person?.timeZone ? normalizeTimeZoneValue(person.timeZone, "") : "")
      .filter(Boolean);
    const uniqueZones = [...new Set(zones)];
    if (uniqueZones.length === 1) return uniqueZones[0];
    if (uniqueZones.length && people.length === 1) return uniqueZones[0];
    return normalizeTimeZoneValue(getBrowserTimeZone());
  }

  function getDrawerFilters(root = document.getElementById(DRAWER_ID)) {
    const durationValues = [30, 45, 60, 90, 120, 180];
    const bufferValues = [0, 15, 30, 45, 60, 90];
    const dateInput = root?.querySelector("[data-scid-filter-date]");
    const zoneSelect = root?.querySelector("[data-scid-filter-zone]");
    const startSelect = root?.querySelector("[data-scid-filter-start]");
    const durationSelect = root?.querySelector("[data-scid-filter-duration]");
    const bufferSelect = root?.querySelector("[data-scid-filter-buffer]");
    const selectedDate = isIsoDate(dateInput?.value) ? dateInput.value : getSelectedScrDate();
    const timeZone = normalizeTimeZoneValue(zoneSelect?.value || getDefaultDrawerTimeZone(root?.__scidPeople || []));
    return {
      date: selectedDate,
      timeZone,
      startMinutes: clampDrawerNumber(startSelect?.value, DEFAULT_DRAWER_START_MINUTES),
      durationMinutes: clampDrawerNumber(durationSelect?.value, DEFAULT_DRAWER_DURATION_MINUTES, durationValues),
      bufferMinutes: clampDrawerNumber(bufferSelect?.value, DEFAULT_DRAWER_BUFFER_MINUTES, bufferValues)
    };
  }

  function setDrawerControlDefaults(root, selectedDate = getSelectedScrDate(), people = []) {
    const dateInput = root?.querySelector("[data-scid-filter-date]");
    const zoneSelect = root?.querySelector("[data-scid-filter-zone]");
    const startSelect = root?.querySelector("[data-scid-filter-start]");
    const durationSelect = root?.querySelector("[data-scid-filter-duration]");
    const bufferSelect = root?.querySelector("[data-scid-filter-buffer]");
    const dashboardZone = document.getElementById("planningZone")?.value;
    const dashboardStart = document.getElementById("meetingStart")?.value;
    const dashboardDuration = document.getElementById("meetingDuration")?.value;
    const dashboardBuffer = document.getElementById("bufferMinutes")?.value;
    const defaultZone = normalizeTimeZoneValue(dashboardZone || getDefaultDrawerTimeZone(people));
    populateDrawerTimeZoneOptions(zoneSelect);
    populateDrawerStartOptions(startSelect);
    if (dateInput) dateInput.value = isIsoDate(selectedDate) ? selectedDate : getSelectedScrDate();
    ensureSelectOption(zoneSelect, defaultZone, getZoneLabel(defaultZone));
    if (zoneSelect) zoneSelect.value = defaultZone;
    if (startSelect) startSelect.value = String(clampDrawerNumber(dashboardStart, DEFAULT_DRAWER_START_MINUTES));
    if (durationSelect) durationSelect.value = String(clampDrawerNumber(dashboardDuration, DEFAULT_DRAWER_DURATION_MINUTES, [30, 45, 60, 90, 120, 180]));
    if (bufferSelect) bufferSelect.value = String(clampDrawerNumber(dashboardBuffer, DEFAULT_DRAWER_BUFFER_MINUTES, [0, 15, 30, 45, 60, 90]));
  }

  function drawerMeetingWindow(filters) {
    const meetingStart = zonedDateTime(filters.date, filters.startMinutes, filters.timeZone);
    const meetingEnd = new Date(meetingStart.getTime() + filters.durationMinutes * 60000);
    const protectedStart = new Date(meetingStart.getTime() - filters.bufferMinutes * 60000);
    const protectedEnd = new Date(meetingEnd.getTime() + filters.bufferMinutes * 60000);
    return {
      ...filters,
      meetingStart,
      meetingEnd,
      protectedStart,
      protectedEnd
    };
  }

  function analyzeDrawerMeetingWindow(events, filters) {
    const windowConfig = drawerMeetingWindow(filters);
    const conflicts = events
      .filter(event => !isFreeEvent(event))
      .map(event => {
        const dates = eventDates(event);
        if (!dates) return null;
        const protectedOverlap = overlapMinutes(windowConfig.protectedStart, windowConfig.protectedEnd, dates.start, dates.end);
        if (!protectedOverlap) return null;
        const meetingOverlap = overlapMinutes(windowConfig.meetingStart, windowConfig.meetingEnd, dates.start, dates.end);
        return {
          ...event,
          dates,
          severity: eventSeverity(event),
          protectedOverlap,
          meetingOverlap
        };
      })
      .filter(Boolean);

    const hardMeeting = conflicts
      .filter(item => ["hard", "pto"].includes(item.severity))
      .reduce((sum, item) => sum + item.meetingOverlap, 0);
    const hardBuffer = conflicts
      .filter(item => ["hard", "pto"].includes(item.severity) && item.meetingOverlap === 0)
      .reduce((sum, item) => sum + item.protectedOverlap, 0);
    const soft = conflicts
      .filter(item => item.severity === "soft")
      .reduce((sum, item) => sum + item.protectedOverlap, 0);
    const review = conflicts
      .filter(item => item.severity === "review")
      .reduce((sum, item) => sum + item.protectedOverlap, 0);

    let level = "green";
    let label = "Available";
    if (hardMeeting > 0) {
      level = "red";
      label = "Unavailable";
    } else if (hardBuffer > 0) {
      level = "yellow";
      label = "Buffer risk";
    } else if (soft > 0) {
      level = "yellow";
      label = "Soft conflict";
    } else if (review > 0) {
      level = "yellow";
      label = "Needs review";
    }

    return {
      ...windowConfig,
      conflicts,
      hardMeeting,
      hardBuffer,
      soft,
      review,
      level,
      label,
      note: `${formatTimeRange(windowConfig.meetingStart, windowConfig.meetingEnd, filters.timeZone)} ${getZoneLabel(filters.timeZone)}; ${filters.bufferMinutes} min buffer before and after.`
    };
  }

  function formatTime(date, timeZone = getDefaultDrawerTimeZone()) {
    timeZone = normalizeTimeZoneValue(timeZone, "America/New_York");
    return getCachedFormatter(`time|${timeZone}`, {
      timeZone,
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function renderLoadStats(loadSummary) {
    const cells = [
      ["Total", loadSummary?.total],
      ["-10 Days", loadSummary?.assignedLast10Days],
      ["In Prog", loadSummary?.inProgress],
      ["Next Wk", loadSummary?.nextWeek],
      ["This Mo", loadSummary?.thisMonth],
      ["Next Mo", loadSummary?.nextMonth]
    ];
    return `
      <div class="scid-stat-grid">
        ${cells.map(([label, value]) => `
          <div class="scid-stat"><span>${escapeHtml(label)}</span><strong>${value == null ? "-" : formatNumber(value)}</strong></div>
        `).join("")}
      </div>
    `;
  }

  function renderLoadNoteBlock(title, value) {
    const note = cleanLoadNote(value);
    if (!note) return "";
    return `
      <div class="scid-load-note">
        <span>${escapeHtml(title)}</span>
        <p>${escapeHtml(note)}</p>
      </div>
    `;
  }

  function renderLoadNotes(load) {
    if (!load) return "";
    return [
      renderLoadNoteBlock("SCM notes", readLoadNotes(load, LOAD_SCM_NOTE_ALIASES)),
      renderLoadNoteBlock("SC Availability Notes", readLoadNotes(load, LOAD_AVAILABILITY_NOTE_ALIASES))
    ].join("");
  }

  function renderCalendarLoadBar(stats) {
    const pct = value => Math.max(0, Math.round((value / WORKDAY_MINUTES) * 100));
    const pto = pct(stats.pto);
    const hard = pct(stats.hard);
    const soft = pct(stats.soft);
    const review = pct(stats.review);
    const open = Math.max(0, 100 - pto - hard - soft - review);
    const title = `${(stats.open / 60).toFixed(1)}h open; ${(stats.pto / 60).toFixed(1)}h PTO/OOO; ${(stats.hard / 60).toFixed(1)}h hard; ${(stats.soft / 60).toFixed(1)}h soft; ${(stats.review / 60).toFixed(1)}h review`;
    return `
      <div class="scid-load-bar" title="${escapeHtml(title)}">
        <span class="scid-pto" style="width:${pto}%"></span>
        <span class="scid-hard" style="width:${hard}%"></span>
        <span class="scid-soft" style="width:${soft}%"></span>
        <span class="scid-review" style="width:${review}%"></span>
        <span class="scid-open" style="width:${open}%"></span>
      </div>
      <div class="scid-subtle">${escapeHtml(title)}</div>
    `;
  }

  function renderMiniStrip(person, events, startDate, timeZone = getDefaultDrawerTimeZone()) {
    const days = Array.from({ length: 21 }, (_, index) => addDaysIso(startDate, index));
    return `
      <div class="scid-mini-strip" aria-label="21-day calendar strip">
        ${days.map(dateValue => {
          if (isWeekend(dateValue)) {
            return `<button class="scid-mini-day is-weekend" type="button" data-scid-date="${dateValue}" title="${weekdayLabel(dateValue)} ${formatShortDate(dateValue)}: weekend"><span></span><em>${weekdayLabel(dateValue)}<b>${formatShortDate(dateValue)}</b></em></button>`;
          }
          const stats = dayStats(events, dateValue, timeZone);
          const busyHeight = Math.min(100, Math.round(((stats.hard + stats.soft + stats.review) / WORKDAY_MINUTES) * 100));
          const ptoHeight = Math.min(100, Math.round((stats.pto / WORKDAY_MINUTES) * 100));
          const openHeight = Math.max(0, 100 - busyHeight - ptoHeight);
          const title = `${weekdayLabel(dateValue)} ${formatShortDate(dateValue)}: ${(stats.open / 60).toFixed(1)}h open, ${(stats.pto / 60).toFixed(1)}h PTO/OOO, ${((stats.hard + stats.soft + stats.review) / 60).toFixed(1)}h booked - click to show meetings`;
          return `
            <button class="scid-mini-day" type="button" data-scid-date="${dateValue}" title="${escapeHtml(title)}">
              <span>
                <i class="scid-open-fill" style="height:${openHeight}%"></i>
                <i class="scid-busy-fill" style="height:${busyHeight}%"></i>
                ${ptoHeight ? `<i class="scid-pto-fill" style="height:${ptoHeight}%"></i>` : ""}
              </span>
              <em>${weekdayLabel(dateValue)}<b>${formatShortDate(dateValue)}</b></em>
            </button>
          `;
        }).join("")}
      </div>
      <div class="scid-meeting-panel" data-scid-meeting-panel hidden></div>
    `;
  }

  function eventsForDay(events, dateValue, timeZone = getDefaultDrawerTimeZone()) {
    const windowConfig = fullDayWindow(dateValue, timeZone);
    return events.filter(event => {
      const dates = eventDates(event);
      return dates && overlapMinutes(windowConfig.start, windowConfig.end, dates.start, dates.end) > 0;
    }).sort((a, b) => parseDate(a.start) - parseDate(b.start));
  }

  function renderMeetings(events, dateValue, timeZone = getDefaultDrawerTimeZone()) {
    const dayRows = eventsForDay(events, dateValue, timeZone);
    const rows = dayRows.some(event => !isFreeBusyOnlyEvent(event))
      ? dayRows.filter(event => !isFreeBusyOnlyEvent(event))
      : dayRows;
    if (!rows.length) {
      return `
        <div class="scid-panel-heading">
          <strong>${escapeHtml(formatLongDate(dateValue))} meetings</strong>
          <button type="button" data-scid-close-day>Close</button>
        </div>
        <p class="scid-subtle">No meetings found for this day.</p>
      `;
    }
    return `
      <div class="scid-panel-heading">
        <strong>${escapeHtml(formatLongDate(dateValue))} meetings</strong>
        <button type="button" data-scid-close-day>Close</button>
      </div>
      <div class="scid-meeting-list">
        ${rows.map(event => {
          const dates = eventDates(event);
          return `
            <div class="scid-meeting scid-meeting-${eventSeverity(event)}">
              <strong>${formatTime(dates.start, timeZone)} - ${formatTime(dates.end, timeZone)} <span>${escapeHtml(event.status || "busy")}</span></strong>
              <p>${escapeHtml(event.subject || "Calendar item")}</p>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function scoreFromSignals(calendar, workload) {
    if (calendar.level === "red" || workload?.level === "red") return { score: 40, label: "Avoid", className: "red" };
    if (calendar.level === "green" && (!workload || workload.level === "green")) return { score: 85, label: "Staff", className: "green" };
    return { score: 65, label: "Review", className: "yellow" };
  }

  function signalDot(level) {
    return `<span class="scid-dot scid-${escapeHtml(level || "unknown")}"></span>`;
  }

  function isFreeBusyOnlyEvent(event) {
    return /^free\/busy:/i.test(String(event?.subject || "").trim());
  }

  function renderDrawerContent(person, filters = getDrawerFilters()) {
    const selectedDate = filters.date;
    const cache = getCalendarCache();
    const resolvedPerson = resolvePersonFromCaches(person);
    const events = getPersonEvents(resolvedPerson, cache);
    const calendarLoaded = isCalendarLoaded(resolvedPerson, cache);
    const selectedStats = calendarLoaded ? dayStats(events, selectedDate, filters.timeZone) : { open: 0, pto: 0, hard: 0, soft: 0, review: 0, busy: 0, workdayMinutes: WORKDAY_MINUTES };
    const meetingAnalysis = calendarLoaded
      ? analyzeDrawerMeetingWindow(events, filters)
      : { level: "unknown", label: "Unknown", note: "Calendar cache has not been captured for this SC." };
    const calendarSignal = calendarLoaded
      ? getCalendarSignal(resolvedPerson, events, selectedDate, filters.timeZone)
      : { level: "unknown", label: "Unknown", note: "Calendar cache has not been captured for this SC.", primaryBlocks: 0, secondaryBlocks: 0, primaryHours: 0, secondaryHours: 0, travel: false };
    const load = findLoadForPerson(resolvedPerson);
    const workload = summarizeLoad(load, resolvedPerson.vertical || resolvedPerson.legacyOrg);
    const recommendation = scoreFromSignals(calendarSignal, workload);
    const badgeClass = /amo/i.test(resolvedPerson.vertical || resolvedPerson.legacyOrg) ? "amo" : "direct";
    const fullUrl = buildFullDashboardUrl(resolvedPerson, filters);
    const staffKey = resolvedPerson.sourceKey || personIdentityKey(resolvedPerson);

    return `
      <div class="scid-card scid-rec-${recommendation.className}" data-scid-email="${escapeHtml(normalizeEmail(resolvedPerson.email))}">
        <section class="scid-person">
          <div class="scid-person-top">
            <div>
              <h3>${escapeHtml(resolvedPerson.name || resolvedPerson.email || "Selected SC")} <span class="scid-badge ${badgeClass}">${badgeClass === "amo" ? "AMO" : "Direct"}</span></h3>
              <p>${escapeHtml(resolvedPerson.manager || "Manager unavailable")}</p>
              <p>${escapeHtml(resolvedPerson.email || "")}</p>
            </div>
            <div class="scid-score scid-score-${recommendation.className}" title="Higher score means easier to staff.">
              <strong>${recommendation.score}</strong>
              <span>${recommendation.label}</span>
              <small>higher = easier</small>
            </div>
          </div>

          <div class="scid-signal-grid">
            <div><span>Proposed Meeting Time</span><strong>${signalDot(meetingAnalysis.level)}${escapeHtml(meetingAnalysis.label)}</strong><p>${calendarLoaded ? escapeHtml(meetingAnalysis.note) : "Calendar cache has not been captured for this SC."}</p></div>
            <div><span>Calendar Availability</span><strong>${signalDot(calendarSignal.level)}${escapeHtml(calendarSignal.label)}</strong><p>${calendarLoaded ? escapeHtml(calendarSignal.note) : "Open dashboard once to seed cache."}</p></div>
            <div><span>Workload</span><strong>${signalDot(workload?.level || "unknown")}${escapeHtml(workload?.label || "Unknown")}</strong><p>${escapeHtml(workload?.note || "No workload cache row matched.")}</p></div>
            <div><span>Staffability Score</span><strong>${recommendation.score}/100 ${escapeHtml(recommendation.label)}</strong><p>Higher score is easier to staff.</p></div>
          </div>

          ${calendarLoaded ? `<p class="scid-summary">${escapeHtml(calendarSignal.note)} ${calendarSignal.travel ? "Travel or onsite calendar language detected." : ""} ${escapeHtml(workload?.note || "")}</p>` : `<p class="scid-summary">No calendar cache found for this SC. Open the staffing dashboard or calendar refresh page with this test script enabled, then try again.</p>`}
        </section>

        <section class="scid-workload">
          <p class="scid-section-label">Workload</p>
          <div class="scid-signal-box">
            <span>Workload Signal</span>
            <strong>${signalDot(workload?.level || "unknown")}${escapeHtml(workload?.label || "Unknown")}</strong>
            <p>${escapeHtml(workload?.note || "No workload cache row matched this consultant.")}</p>
          </div>
          ${renderLoadStats(workload)}
          ${renderLoadNotes(load)}
        </section>

        <section class="scid-calendar">
          <p class="scid-section-label">Calendar Detail</p>
          <strong class="scid-date-open">${calendarLoaded ? `${(selectedStats.open / 60).toFixed(1)}h open on ${formatLongDate(selectedDate)} (${escapeHtml(getZoneLabel(filters.timeZone))})` : "Calendar cache unavailable"}</strong>
          ${renderCalendarLoadBar(selectedStats)}
          ${calendarLoaded ? renderMiniStrip(resolvedPerson, events, selectedDate, filters.timeZone) : ""}
        </section>
      </div>
      <div class="scid-footer">
        <span>${cache?.capturedAt ? `Calendar cache captured ${new Date(cache.capturedAt).toLocaleString()}` : "Calendar cache not captured yet."}</span>
        <div class="scid-footer-actions">
          <button type="button" class="scid-staff-action" data-scid-staff="${escapeHtml(staffKey)}">Staff this SC</button>
          <button type="button" data-scid-full-dashboard="${escapeHtml(fullUrl)}">Open full dashboard</button>
        </div>
      </div>
    `;
  }

  function buildFullDashboardUrl(person, filters = getDrawerFilters()) {
    const url = new URL(DASHBOARD_URL);
    if (person.email) url.searchParams.set("email", person.email);
    if (person.name) url.searchParams.set("consultant", person.name);
    if (person.manager) url.searchParams.set("manager", person.manager);
    if (filters?.date) url.searchParams.set("date", filters.date);
    if (filters?.timeZone) url.searchParams.set("zone", filters.timeZone);
    if (filters?.startMinutes != null) url.searchParams.set("start", String(filters.startMinutes));
    if (filters?.durationMinutes != null) url.searchParams.set("duration", String(filters.durationMinutes));
    if (filters?.bufferMinutes != null) url.searchParams.set("buffer", String(filters.bufferMinutes));
    return url.href;
  }

  function buildMultiDashboardUrl(people, filters = getDrawerFilters()) {
    const url = new URL(DASHBOARD_URL);
    const emails = uniquePeople(people).map(person => normalizeEmail(person.email)).filter(Boolean);
    if (emails.length === 1) {
      const person = uniquePeople(people)[0];
      return buildFullDashboardUrl(person, filters);
    }
    if (emails.length) url.searchParams.set("emails", emails.join(","));
    if (filters?.date) url.searchParams.set("date", filters.date);
    if (filters?.timeZone) url.searchParams.set("zone", filters.timeZone);
    if (filters?.startMinutes != null) url.searchParams.set("start", String(filters.startMinutes));
    if (filters?.durationMinutes != null) url.searchParams.set("duration", String(filters.durationMinutes));
    if (filters?.bufferMinutes != null) url.searchParams.set("buffer", String(filters.bufferMinutes));
    return url.href;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .scid-backdrop{position:fixed;inset:0;background:rgba(19,33,44,.42);z-index:2147483000;display:flex;justify-content:flex-end;align-items:stretch}
      .scid-backdrop[hidden]{display:none}
      .scid-drawer{width:min(1240px,calc(100vw - 44px));background:#f7f9fb;color:#182434;box-shadow:-16px 0 38px rgba(0,0,0,.28);display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif}
      .scid-header{display:flex;align-items:center;gap:14px;justify-content:space-between;background:#13212c;color:#fff;padding:14px 18px;border-bottom:4px solid #e2c06b;flex-wrap:wrap}
      .scid-header h2{margin:0;font-size:18px;line-height:1.15}
      .scid-header p{margin:3px 0 0;color:#cbd7df;font-size:12px}
      .scid-filter-bar{display:flex;align-items:flex-end;gap:8px;flex:1 1 560px;justify-content:flex-end}
      .scid-filter-bar label{display:flex;flex-direction:column;gap:3px;color:#cbd7df;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .scid-filter-bar input,.scid-filter-bar select{height:31px;border:1px solid rgba(226,192,107,.38);border-radius:7px;background:#fff;color:#13212c;font:700 12px/1 Arial,Helvetica,sans-serif;padding:4px 8px;min-width:96px}
      .scid-filter-bar input[type="date"]{min-width:132px}
      .scid-filter-bar [data-scid-filter-zone]{min-width:135px}
      .scid-header-actions{display:flex;align-items:center;gap:8px}
      .scid-header button,.scid-footer button{border:0;border-radius:7px;padding:8px 11px;font-weight:800;cursor:pointer}
      .scid-refresh-token{background:#e2c06b;color:#13212c}
      .scid-refresh-token:disabled{opacity:.72;cursor:wait}
      .scid-refresh-status{max-width:280px;color:#d8e5ec;font-size:12px;line-height:1.25}
      .scid-refresh-status[data-tone="ok"]{color:#bdf2ce}.scid-refresh-status[data-tone="error"]{color:#ffd0d0}
      .scid-refresh-status .scid-refresh-link{margin-left:8px;border:1px solid rgba(226,192,107,.55);background:transparent;color:#e2c06b;border-radius:6px;padding:5px 8px;font-size:11px;font-weight:900}
      .scid-close{background:#c74634;color:#fff;font-size:16px;line-height:1}
      .scid-body{padding:16px;overflow:auto}
      .scid-loading{border:1px solid #bfd0dc;background:#fff;border-radius:9px;padding:18px;font-weight:800;color:#31475a}
      .scid-card{display:grid;grid-template-columns:minmax(310px,.9fr) minmax(280px,.95fr) minmax(420px,1.25fr);gap:14px;border:1px solid #d7e1e8;background:#fff;border-radius:10px;padding:12px;border-left:5px solid #d28a00}
      .scid-rec-green{border-left-color:#23915c}.scid-rec-yellow{border-left-color:#d28a00}.scid-rec-red{border-left-color:#c74634}
      .scid-person,.scid-workload,.scid-calendar{min-width:0}.scid-workload,.scid-calendar{border-left:1px solid #d7e1e8;padding-left:14px}
      .scid-person-top{display:flex;justify-content:space-between;gap:12px}.scid-person h3{margin:0;font-size:21px;line-height:1.2}.scid-person p,.scid-subtle{margin:4px 0;color:#5f6f80;font-size:13px}
      .scid-badge{display:inline-flex;align-items:center;border-radius:999px;border:1px solid #b7d5e7;background:#e9f5fb;color:#1d5e82;font-size:12px;font-weight:900;padding:3px 9px;vertical-align:middle}.scid-badge.amo{border-color:#f2b5ae;background:#fff0ee;color:#a53021}
      .scid-score{border-radius:8px;border:1px solid #ffd88a;background:#fff7dc;min-width:68px;text-align:center;padding:7px 9px;align-self:flex-start}.scid-score strong{display:block;font-size:28px}.scid-score span{display:block;text-transform:uppercase;font-size:11px;font-weight:900;letter-spacing:.08em}.scid-score small{display:block;font-size:10px;color:#6b7280}.scid-score-green{border-color:#aadbbb;background:#edf9f1}.scid-score-red{border-color:#ffc1c1;background:#fff0f0}
      .scid-signal-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.scid-signal-grid>div,.scid-signal-box,.scid-stat{border:1px solid #d7e1e8;background:#f9fbfc;border-radius:8px;padding:9px}
      .scid-signal-grid span,.scid-signal-box span,.scid-section-label,.scid-stat span{text-transform:uppercase;font-size:11px;letter-spacing:.1em;color:#697778;font-weight:900}.scid-signal-grid strong,.scid-signal-box strong{display:block;margin-top:5px}.scid-signal-grid p,.scid-signal-box p{margin:4px 0 0;color:#5f6f80;font-size:12px}
      .scid-dot{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:7px;background:#8b98a5}.scid-green{background:#23915c}.scid-yellow{background:#d28a00}.scid-red{background:#c74634}.scid-unknown{background:#8b98a5}
      .scid-summary{font-size:13px;color:#526274;margin:12px 0 0}.scid-section-label{margin:0 0 8px}.scid-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.scid-stat strong{display:block;font-size:20px;margin-top:5px}
      .scid-date-open{display:block;margin:10px 0 8px;color:#526274}.scid-load-bar{height:18px;border-radius:999px;overflow:hidden;background:#e4eef3;display:flex;border:1px solid #c9d8e2}.scid-load-bar span{height:100%;display:block}.scid-pto{background:#8957e5}.scid-hard{background:#cf4c4a}.scid-soft{background:#c98500}.scid-review{background:#95a3b3}.scid-open{background:#2ca56f}.scid-load-note{margin-top:10px;border:1px solid #d5e1ea;background:#f7fafc;border-radius:8px;padding:10px;color:#263847}.scid-load-note span{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:900;color:#617082;margin-bottom:5px}.scid-load-note p{margin:0;white-space:pre-wrap;font-size:12px;line-height:1.35}
      .scid-mini-strip{margin-top:12px;display:flex;gap:5px;overflow-x:auto;padding:2px 2px 9px}.scid-mini-day{border:0;background:transparent;padding:0;cursor:pointer;min-width:31px;color:#4b5c6e}.scid-mini-day.is-weekend{min-width:12px}.scid-mini-day>span{display:flex;flex-direction:column-reverse;height:44px;border:1px solid #d2e3ec;background:#e9f6f9;border-radius:5px;overflow:hidden}.scid-mini-day.is-weekend>span{background:#e8f2f5}.scid-mini-day i{display:block;width:100%;flex:0 0 auto}.scid-open-fill{background:#2ca56f}.scid-busy-fill{background:#cf4c4a}.scid-pto-fill{background:#8957e5}.scid-mini-day em{display:block;font-style:normal;font-size:10px;font-weight:800;line-height:1.05;margin-top:4px}.scid-mini-day b{display:block}.scid-mini-day.is-selected>span{outline:2px solid #1e88d1;outline-offset:1px}
      .scid-meeting-panel{margin-top:10px;border:1px solid #d7e1e8;background:#f9fbfc;border-radius:8px;padding:10px}.scid-panel-heading{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.scid-panel-heading button{border:1px solid #d7e1e8;background:#fff;border-radius:6px;padding:5px 9px;font-weight:800;cursor:pointer}.scid-meeting{border-left:3px solid #8ca0b3;padding:4px 0 6px 10px;margin:5px 0}.scid-meeting strong{display:block}.scid-meeting span{font-size:11px;text-transform:uppercase;color:#697778}.scid-meeting p{margin:3px 0 0;color:#526274}.scid-meeting-pto{border-left-color:#8957e5}.scid-meeting-hard{border-left-color:#cf4c4a}.scid-meeting-soft{border-left-color:#c98500}.scid-meeting-review{border-left-color:#95a3b3}
      .scid-footer{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;color:#526274;font-size:12px}.scid-footer-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.scid-footer button{background:#e2c06b;color:#13212c}.scid-footer .scid-staff-action{background:#4c825c;color:#fff}
      .${INLINE_SELECTED_BUTTON_CLASS}{margin-left:6px;border:1px solid #d8c077!important;background:#fff7d7!important;color:#13212c!important;border-radius:7px!important;padding:6px 9px!important;font-weight:800!important;font-size:12px!important;line-height:1.1!important;cursor:pointer!important}
      .${INLINE_SELECTED_BUTTON_CLASS}:hover{background:#e2c06b!important}
      #${CALENDAR_PROMPT_ID}{display:flex;align-items:center;gap:8px;border-radius:9px;background:rgba(19,33,44,.92);box-shadow:0 10px 28px rgba(0,0,0,.24);padding:8px;color:#fff;font-family:Arial,Helvetica,sans-serif}
      #${CALENDAR_PROMPT_ID}[hidden]{display:none}
      #${CALENDAR_PROMPT_ID}.scid-calendar-prompt-inline{box-shadow:none;background:transparent;padding:0;color:inherit}
      #${CALENDAR_PROMPT_ID}.scid-calendar-prompt-floating{position:fixed;top:122px;right:18px;z-index:999999}
      #${CALENDAR_PROMPT_ID} button{border:1px solid rgba(19,33,44,.18);border-radius:7px;background:#e2c06b;color:#13212c;cursor:pointer;font-weight:900;font-size:12px;line-height:1.1;min-height:32px;padding:7px 10px;white-space:nowrap}
      #${CALENDAR_PROMPT_ID} span{color:#ffe8a3;font-size:11px;font-weight:800;line-height:1.2;max-width:210px}
      @media(max-width:980px){.scid-drawer{width:100vw}.scid-card{grid-template-columns:1fr}.scid-workload,.scid-calendar{border-left:0;border-top:1px solid #d7e1e8;padding-left:0;padding-top:12px}.scid-signal-grid{grid-template-columns:1fr}.scid-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function ensureDrawer() {
    ensureStyles();
    let root = document.getElementById(DRAWER_ID);
    if (root) return root;
    root = document.createElement("div");
    root.id = DRAWER_ID;
    root.className = "scid-backdrop";
    root.hidden = true;
    root.innerHTML = `
      <aside class="scid-drawer" role="dialog" aria-modal="true" aria-labelledby="scid-title">
        <header class="scid-header">
          <div>
            <h2 id="scid-title">SCOUT Calendar Drawer</h2>
            <p data-scid-subtitle>Lazy test view. Nothing loads until you click View Cal.</p>
          </div>
          <div class="scid-filter-bar" data-scid-filters aria-label="Calendar drawer filters">
            <label>Date <input type="date" data-scid-filter data-scid-filter-date></label>
            <label>Time Zone <select data-scid-filter data-scid-filter-zone></select></label>
            <label>Start <select data-scid-filter data-scid-filter-start></select></label>
            <label>Duration
              <select data-scid-filter data-scid-filter-duration>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
              </select>
            </label>
            <label>Buffer
              <select data-scid-filter data-scid-filter-buffer>
                <option value="0">None</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </label>
          </div>
          <div class="scid-header-actions">
            <button type="button" class="scid-refresh-token" data-scid-refresh-token>Refresh Calendars</button>
            <span class="scid-refresh-status" data-scid-refresh-status></span>
            <button type="button" class="scid-close" data-scid-close aria-label="Close">X</button>
          </div>
        </header>
        <div class="scid-body" data-scid-body></div>
      </aside>
    `;
    document.body.appendChild(root);
    root.addEventListener("click", event => {
      if (event.target === root || event.target.closest("[data-scid-close]")) {
        closeDrawer();
        return;
      }
      const staffButton = event.target.closest("[data-scid-staff]");
      if (staffButton) {
        event.preventDefault();
        event.stopPropagation();
        triggerOriginalStaffAction(staffButton.dataset.scidStaff);
        return;
      }
      const fullButton = event.target.closest("[data-scid-full-dashboard]");
      if (fullButton) {
        openUrl(fullButton.dataset.scidFullDashboard);
        return;
      }
      const refreshButton = event.target.closest("[data-scid-refresh-token]");
      if (refreshButton) {
        event.preventDefault();
        event.stopPropagation();
        refreshDrawerCalendars(root);
        return;
      }
      const dayButton = event.target.closest("[data-scid-date]");
      if (dayButton) {
        const card = dayButton.closest(".scid-card");
        const panel = card?.querySelector("[data-scid-meeting-panel]");
        const current = panel?.dataset.activeDate;
        root.querySelectorAll(".scid-mini-day.is-selected").forEach(item => item.classList.remove("is-selected"));
        if (!panel) return;
        if (current === dayButton.dataset.scidDate && !panel.hidden) {
          panel.hidden = true;
          panel.innerHTML = "";
          delete panel.dataset.activeDate;
          return;
        }
        const email = normalizeEmail(card?.dataset.scidEmail);
        const events = root.__scidEventsByEmail?.get(email) || [];
        panel.innerHTML = renderMeetings(events, dayButton.dataset.scidDate, getDrawerFilters(root).timeZone);
        panel.dataset.activeDate = dayButton.dataset.scidDate;
        panel.hidden = false;
        dayButton.classList.add("is-selected");
        return;
      }
      if (event.target.closest("[data-scid-close-day]")) {
        const card = event.target.closest(".scid-card");
        const panel = card?.querySelector("[data-scid-meeting-panel]");
        if (panel) {
          panel.hidden = true;
          panel.innerHTML = "";
          delete panel.dataset.activeDate;
        }
        root.querySelectorAll(".scid-mini-day.is-selected").forEach(item => item.classList.remove("is-selected"));
        return;
      }
    });
    const handleFilterChange = event => {
      if (!event.target.closest?.("[data-scid-filter]") || root.hidden) return;
      scheduleDrawerRender(root);
    };
    root.addEventListener("change", handleFilterChange);
    root.addEventListener("input", handleFilterChange);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !root.hidden) closeDrawer();
    });
    return root;
  }

  function ensureCalendarStalePrompt() {
    ensureStyles();
    const headerTarget = document.querySelector(".sc-header-actions, .scout-header-actions, #scout-header-actions, [data-scout-header-actions]");
    let prompt = document.getElementById(CALENDAR_PROMPT_ID);
    if (prompt) {
      if (headerTarget && !prompt.classList.contains("scid-calendar-prompt-inline")) {
        prompt.className = "scid-calendar-prompt-inline";
        headerTarget.prepend(prompt);
      }
      return prompt;
    }

    prompt = document.createElement("div");
    prompt.id = CALENDAR_PROMPT_ID;
    prompt.hidden = true;
    prompt.innerHTML = `
      <button type="button" data-scid-open-calendar-refresh>Open Calendar Refresh</button>
      <span data-scid-calendar-status></span>
    `;

    if (headerTarget) {
      prompt.className = "scid-calendar-prompt-inline";
      headerTarget.prepend(prompt);
    } else {
      prompt.className = "scid-calendar-prompt-floating";
      document.body.appendChild(prompt);
    }

    prompt.querySelector("[data-scid-open-calendar-refresh]")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openUrl(CALENDAR_REFRESH_URL);
    });
    return prompt;
  }

  function updateCalendarStalePrompt() {
    const prompt = ensureCalendarStalePrompt();
    const status = prompt.querySelector("[data-scid-calendar-status]");
    const button = prompt.querySelector("[data-scid-open-calendar-refresh]");
    const freshness = getCalendarCacheFreshness();
    prompt.hidden = freshness.fresh;
    if (freshness.fresh) return freshness;

    const message = freshness.missing
      ? "Calendar data cache is missing."
      : `${freshness.message} Refresh calendar data.`;
    if (status) status.textContent = message;
    if (button) {
      button.title = message;
      button.textContent = freshness.missing ? "Load Calendar Data" : "Refresh Calendar Data";
    }
    return freshness;
  }

  function installCalendarStalePrompt() {
    updateCalendarStalePrompt();
    window.setInterval(updateCalendarStalePrompt, 60 * 1000);
  }

  function closeDrawer() {
    const root = document.getElementById(DRAWER_ID);
    if (root) root.hidden = true;
  }

  function scheduleDrawerRender(root = document.getElementById(DRAWER_ID)) {
    if (!root || root.hidden) return;
    window.clearTimeout(root.__scidRenderTimer);
    root.__scidRenderTimer = window.setTimeout(() => renderDrawerPeople(root), 0);
  }

  function renderDrawerPeople(root = document.getElementById(DRAWER_ID)) {
    const people = uniquePeople(root?.__scidPeople || []);
    const body = root?.querySelector("[data-scid-body]");
    if (!root || !body || !people.length) return;
    const filters = getDrawerFilters(root);
    const subtitle = root.querySelector("[data-scid-subtitle]");
    if (subtitle) {
      subtitle.textContent = `${people.length === 1 ? "Rendering one SC" : `Rendering ${people.length} selected SCs`} in ${getZoneLabel(filters.timeZone)}.`;
    }
    const cache = getCalendarCache();
    const eventsByEmail = new Map();
    people.forEach(person => {
      eventsByEmail.set(normalizeEmail(person.email), getPersonEvents(person, cache));
    });
    root.__scidEventsByEmail = eventsByEmail;
    body.innerHTML = `
      ${people.map(person => renderDrawerContent(person, filters)).join("")}
      ${people.length > 1 ? `
        <div class="scid-footer">
          <span>${cache?.capturedAt ? `Calendar cache captured ${new Date(cache.capturedAt).toLocaleString()}` : "Calendar cache not captured yet."}</span>
          <button type="button" data-scid-full-dashboard="${escapeHtml(buildMultiDashboardUrl(people, filters))}">Open selected in dashboard</button>
        </div>
      ` : ""}
    `;
  }

  function openUrl(url) {
    if (!url) return;
    try {
      if (typeof GM_openInTab === "function") {
        GM_openInTab(url, { active: true, insert: true, setParent: true });
        return;
      }
    } catch (error) {
      console.warn("SCOUT inline calendar drawer: GM_openInTab failed", error);
    }
    window.open(url, "_blank", "noopener");
  }

  function uniquePeople(people) {
    const seen = new Set();
    return arrayFrom(people).filter(person => {
      const email = normalizeEmail(person?.email);
      const key = email || looseName(person?.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function personIdentityKey(person) {
    return normalizeEmail(person?.email) || looseName(person?.name);
  }

  function findSourceCard(element) {
    if (!element) return null;
    return element.closest?.(SOURCE_CARD_CLASS_SELECTOR)
      || element.parentElement?.closest?.(SOURCE_CARD_SELECTOR)
      || element.closest?.(SOURCE_CARD_SELECTOR)
      || element;
  }

  function rememberSourceElement(person, element) {
    const key = personIdentityKey(person);
    const source = findSourceCard(element);
    if (key && source) {
      sourceElementByKey.set(key, source);
      person.sourceKey = key;
    }
    return person;
  }

  function elementText(element) {
    return String([
      element?.textContent,
      element?.value,
      element?.title,
      element?.getAttribute?.("aria-label")
    ].filter(Boolean).join(" ")).replace(/\s+/g, " ").trim();
  }

  function isUsableButton(element) {
    if (!element || element.disabled || element.getAttribute("aria-disabled") === "true") return false;
    if (element.closest?.(`#${DRAWER_ID}`)) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(element) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    return true;
  }

  function findStaffButtonInElement(root) {
    if (!root?.querySelectorAll) return null;
    const candidates = [...root.querySelectorAll("button,a,input[type='button'],input[type='submit']")];
    return candidates.find(element => {
      if (!isUsableButton(element)) return false;
      const text = elementText(element);
      const className = String(element.className || "");
      const dataValues = Object.values(element.dataset || {}).join(" ");
      const haystack = `${text} ${className} ${dataValues}`;
      if (!/\bstaff\b/i.test(haystack)) return false;
      return !/view\s*cal|calendar|dashboard|compare|inline/i.test(text);
    }) || null;
  }

  function findSourceElementByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const directMatch = [...document.querySelectorAll("[data-email]")]
      .find(element => normalizeEmail(element.dataset?.email || element.getAttribute("data-email")) === normalized);
    return findSourceCard(directMatch);
  }

  function triggerOriginalStaffAction(personKey) {
    const key = normalizeEmail(personKey) || String(personKey || "");
    const source = sourceElementByKey.get(key) || findSourceElementByEmail(key);
    const staffButton = findStaffButtonInElement(source);
    if (!staffButton) {
      alert("SCOUT could not find the original Staff button for this SC card. Close the drawer and use the card's green Staff button.");
      return false;
    }
    closeDrawer();
    window.setTimeout(() => {
      staffButton.click();
    }, 0);
    return true;
  }

  function openDrawer(personOrPeople) {
    const sourcePeople = uniquePeople(Array.isArray(personOrPeople) ? personOrPeople : [personOrPeople]);
    const people = uniquePeople(sourcePeople.map(resolvePersonFromCaches));
    if (!people.length) return;
    const root = ensureDrawer();
    const title = root.querySelector("#scid-title");
    const subtitle = root.querySelector("[data-scid-subtitle]");
    const body = root.querySelector("[data-scid-body]");
    title.textContent = people.length === 1
      ? (people[0].name || people[0].email || "Selected SC")
      : `${people.length} selected SCs`;
    subtitle.textContent = people.length === 1
      ? "Rendering cached workload and calendar data for one SC."
      : "Rendering selected SCs from the same cached calendar/workload data.";
    body.innerHTML = `<div class="scid-loading">Loading cached SC calendar and workload...</div>`;
    root.__scidPeople = people;
    setDrawerControlDefaults(root, getSelectedScrDate(), people);
    root.hidden = false;
    scheduleDrawerRender(root);
  }

  function personFromElement(element) {
    const source = element?.dataset || {};
    const card = element?.closest?.(SOURCE_CARD_SELECTOR);
    const cardData = card?.dataset || {};
    return {
      email: normalizeEmail(source.email || cardData.email || card?.getAttribute?.("data-email")),
      name: source.empname || source.employee || source.name || cardData.empname || cardData.employee || cardData.name || "",
      manager: source.manager || cardData.manager || "",
      vertical: source.vertical || source.org || source.legacyOrg || cardData.vertical || cardData.org || cardData.legacyOrg || "",
      legacyOrg: source.vertical || source.org || source.legacyOrg || cardData.vertical || cardData.org || cardData.legacyOrg || ""
    };
  }

  function collectSelectedPeople() {
    const selectors = [
      ".sc-consultant-checkbox:checked",
      "input[type='checkbox'][data-email]:checked",
      "input[type='checkbox'][data-empname]:checked",
      "input[type='checkbox'][data-employee]:checked"
    ];
    return uniquePeople([...document.querySelectorAll(selectors.join(","))]
      .map(element => rememberSourceElement(personFromElement(element), element))
      .filter(person => person.email));
  }

  function isCalendarCompareButton(element) {
    if (!element || element.classList?.contains(INLINE_SELECTED_BUTTON_CLASS)) return false;
    const text = String(element.textContent || element.value || "").replace(/\s+/g, " ").trim();
    return /view all calendars|open selected calendars|open multiple calendars|compare calendars/i.test(text);
  }

  function installInlineSelectedButtons() {
    const buttons = [...document.querySelectorAll("button,a,input[type='button'],input[type='submit']")]
      .filter(isCalendarCompareButton);
    buttons.forEach(button => {
      const parent = button.parentElement;
      if (!parent || parent.querySelector(`.${INLINE_SELECTED_BUTTON_CLASS}`)) return;
      const inlineButton = document.createElement("button");
      inlineButton.type = "button";
      inlineButton.className = INLINE_SELECTED_BUTTON_CLASS;
      inlineButton.textContent = "Inline";
      inlineButton.title = "Open selected SC calendar cards in the inline drawer";
      inlineButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const people = collectSelectedPeople();
        if (!people.length) {
          alert("Select one or more SC checkboxes first.");
          return;
        }
        openDrawer(people);
      });
      button.insertAdjacentElement("afterend", inlineButton);
    });
  }

  function installNetSuiteClickInterceptor() {
    ensureStyles();
    installCalendarStalePrompt();
    document.addEventListener("click", event => {
      const button = event.target.closest(".sc-viewcal-btn,[data-scout-view-cal],[data-view-cal]");
      if (!button) return;
      const person = rememberSourceElement(personFromElement(button), button);
      if (!person.email) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openDrawer(person);
    }, true);

    let attempts = 0;
    const timer = window.setInterval(() => {
      installInlineSelectedButtons();
      attempts += 1;
      if (attempts >= 30) window.clearInterval(timer);
    }, 1000);
  }

  function exposeDiagnostics() {
    pageWindow().__SCOUT_INLINE_CALENDAR_DRAWER = {
      installed: true,
      version: VERSION,
      getCalendarCache,
      getCalendarCacheFreshness,
      captureCalendarCacheFromDashboard,
      getStaffingLoadReport,
      resolvePersonFromCaches,
      collectSelectedPeople,
      captureGraphTokenBridge,
      refreshOpenDrawerCalendars() {
        return refreshDrawerCalendars();
      },
      openSelected() {
        openDrawer(collectSelectedPeople());
      },
      openByEmail(email) {
        const cache = getCalendarCache();
        const rosterMatch = arrayFrom(cache?.roster).find(person => normalizeEmail(person.email) === normalizeEmail(email));
        openDrawer(rosterMatch || { email: normalizeEmail(email), name: email, manager: "", vertical: "" });
      }
    };
  }

  exposeDiagnostics();
  if (isDashboardLikePage()) {
    installGraphTokenBridgeCapture();
    installDashboardCapture();
  }
  if (isNetSuiteScrPage()) installNetSuiteClickInterceptor();
})();
