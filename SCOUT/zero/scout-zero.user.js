// ==UserScript==
// @name         SCOUT ZERO
// @namespace    https://github.com/mcanderson14/ns_scm_tools_fy27
// @version      z27.0.6
// @description  Minimal SCOUT staffing tool for NetSuite SC Request pages.
// @author       Michael Anderson
// @match        https://nlcorp.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/custom/custrecordentry.nl*
// @homepageURL  https://github.com/mcanderson14/ns_scm_tools_fy27/tree/main/SCOUT/zero
// @grant        GM_xmlhttpRequest
// @connect      nlcorp.app.netsuite.com
// @connect      nlcorp-sb2.app.netsuite.com
// @grant        unsafeWindow
// @run-at       document-idle
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/zero/scout-zero.user.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/zero/scout-zero.user.js
// ==/UserScript==

/* ================================================================
   SCOUT ZERO
   Upgrade path: https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/zero/scout-zero.user.js

   A stripped SC staffing surface:
   - cache/select a Solution Consultant
   - select an AMO deliverable when relevant
   - staff the request
   No calendar integration, skills search, dashboards, GPT, history,
   customer license lookup, or workload/skill ranking.
   ================================================================ */

(function () {
  "use strict";

  const SCRIPT_VERSION = "z27.0.6";
  const LOG_PREFIX = "[SCOUT ZERO]";
  const SCOUT_ZERO_LOGO_URL = "https://raw.githubusercontent.com/mcanderson14/ns_scm_logos/main/SCOUT-Zero.png";
  const SC_ROSTER_SEARCH_URL = "https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?rectype=1572&searchtype=Custom&style=REPORT&sortcol=Custom_NAME_raw&sortdir=ASC&csv=HTML&OfficeXML=F&pdf=&size=50&twbx=F&report=T&grid=&searchid=1311451&dle=T";
  const SC_ROSTER_SEARCH_ID = "1311451";
  const SC_ROSTER_RECORD_TYPE = "customrecord_emproster";
  const SCR_RECORD_TYPE = "customrecord2840";
  const SCR_FIELD_TYPE = "custrecord_screq_type";
  const SCR_FIELD_DELIVERABLE = "custrecord_screq_engmnt_deliverable";
  const SCR_FIELD_OPP = "custrecord_screq_opportunity";
  const SCR_FIELD_STATUS = "custrecord_screq_status";
  const SCR_FIELD_ASSIGNEE = "custrecord_screq_assignee";
  const SCR_FIELD_ASSIGNEE_EMPLOYEE = "custrecord_screq_assignee_employee";
  const SCR_FIELD_ASSIGNED_LEAD = "custrecord_screq_assigned_lead";
  const SCR_FIELD_HASHTAGS = "custrecord_screq_hashtags";
  const SCR_FIELD_DETAILS = "custrecord_screq_details";
  const SCR_FIELD_ENGAGEMENT_NOTES = "custrecord_screq_engmnt_notes";
  const SCR_REQUEST_DETAILS_MAX_CHARS = 4000;
  const CACHE_KEY = "scout-zero-sc-card-cache-v1";
  const PENDING_KEY = "scout-zero-pending-staff-action-v1";
  const PANEL_OPEN_KEY = "scout-zero-panel-open-v1";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // refresh SC names at least once every 24 hours
  const NETSUITE_FORM_INIT_TIMEOUT_MS = 20000;
  const NETSUITE_FORM_INIT_POLL_MS = 250;
  const PENDING_STAFFING_SAVE_DELAY_MS = 1600;
  const QUICK_RESULT_LIMIT = 12;

  const ASSIGNEE_EMPLOYEE_CACHE = {};
  let rosterCache = { rows: [], fetchedAt: 0, source: "" };
  let lookupSeq = 0;

  const AMO_DELIVERABLE_TEMPLATES = {
    "Upsell": (sc, mgr) =>
`${mgr} staffing ${sc} - Please make sure we are following the correct ROE:
Internal KT (30 min call)
Include: SC, AMO
Next Steps: Schedule Discovery call w/ Customer, Send Consensus video
Discovery Call (45-60 min)
NS Attendees: SC, AMO
Customer Attendees: Decision Maker(s), Process Owners
Next Steps: Schedule Demo (if needed), Create CSER and have SC update notes to reflect Standard SOW or Complex SOW
Demo Call (if needed, 45-60 min)
NS Attendees: SC, AMO
Customer Attendees: Decision Maker(s), Process Owners
CSER - Attach notes to CSER. SP will create Standard SOW
Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Platform": (sc, mgr) =>
`${mgr} - ${sc} - Please submit a second SCR if you require a TCOE Resource.
Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Business Review": (sc, mgr) =>
`${mgr} ${sc} - PLEASE BE SURE to schedule these meetings:
KT (30 min) to strategize the deal - use the KT+ doc for guidance
BR (90 min)
Post BR (30) to brain dump and talk next steps and complete Customer Review record
Good luck with ${sc}!

`,

    "ACS/LCS": (sc, mgr) =>
`${mgr} - ${sc} - Please include an AMOSS Resource.
Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Customer Satisfaction": (sc, mgr) =>
`${mgr} - ${sc} - Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Net New": (sc, mgr) =>
`${mgr} - ${sc} - Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Revenue Save/Renewal": (sc, mgr) =>
`${mgr} ${sc} - PLEASE BE SURE to schedule these meetings:
KT (30 min) to strategize the deal - use the KT+ doc for guidance
BR (90 min)
Post BR (30) to brain dump and talk next steps and complete Customer Review record
Good luck with ${sc}!

`,

    "Whitespacing": (sc, mgr) =>
`${mgr} ${sc} - Please ensure we are using all of the tools available to prepare for the Whitespacing engagement, including: Whitespace AI, SuitePulse, Customer Record, and the Customer's website.
Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,

    "Professional Services": (sc, mgr) =>
`${mgr} staffing ${sc} - Please make sure we book time on the SC's Calendar for prep. Please try not to schedule time directly after another customer engagement.
Good luck with ${sc}!

`,
  };
  const AMO_DELIVERABLE_NO_TEMPLATE_OPTIONS = ["Business Discussion"];

  function ns() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  var nlapiGetUser = function () { return ns().nlapiGetUser(); };
  var nlapiGetFieldValue = function (f) { return ns().nlapiGetFieldValue(f); };
  var nlapiGetFieldText = function (f) { return ns().nlapiGetFieldText(f); };
  var nlapiSetFieldValue = function (f, v, fire, sync) { return ns().nlapiSetFieldValue(f, v, fire, sync); };
  var nlapiSetFieldText = function (f, t, fire, sync) { return ns().nlapiSetFieldText(f, t, fire, sync); };
  var nlapiSearchRecord = function (type, id, filters, cols) { return ns().nlapiSearchRecord(type, id, filters, cols); };
  var nlapiSearchGlobal = function (keywords) { return ns().nlapiSearchGlobal ? ns().nlapiSearchGlobal(keywords) : []; };
  var nlapiLookupField = function (type, id, fields, text) {
    if (!ns().nlapiLookupField) throw new Error("nlapiLookupField unavailable");
    return ns().nlapiLookupField(type, id, fields, text);
  };
  var nlobjSearchFilter = function (name, join, op, val, val2) {
    return new ns().nlobjSearchFilter(name, join, op, val, val2);
  };
  var nlobjSearchColumn = function (name, join, summary) {
    return new ns().nlobjSearchColumn(name, join, summary);
  };

  function escHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(value) {
    return escHtml(value).replace(/'/g, "&#39;");
  }

  function normalizeLoose(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ", ")
      .trim();
  }

  function normalizeRosterDisplayName(value) {
    return normalizeName(value).replace(/^\d{3,}\s+/, "");
  }

  function normalizeAmoDeliverableName(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (/^upsell\s*-/i.test(text)) return "Upsell";
    return text;
  }

  function isValidAmoDeliverableName(value) {
    const text = normalizeAmoDeliverableName(value);
    if (!text || /^\d+$/.test(text)) return false;
    if (/^more options\b/i.test(text)) return false;
    if (/\bfunction\s*\(/i.test(text)) return false;
    if (/[{};]/.test(text)) return false;
    return text.length <= 80;
  }

  function getBaseAmoDeliverableOptions() {
    const seen = new Set();
    return [
      ...Object.keys(AMO_DELIVERABLE_TEMPLATES),
      ...AMO_DELIVERABLE_NO_TEMPLATE_OPTIONS,
      getCurrentAmoDeliverableFromForm(),
    ].map(normalizeAmoDeliverableName)
      .filter(name => {
        const key = name.toLowerCase();
        if (!isValidAmoDeliverableName(name) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function todayFullString() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
  }

  function todayShortString() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  }

  function getInitials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase())
      .join("");
  }

  function getCurrentScrId() {
    try {
      return new URLSearchParams(window.location.search).get("id") ||
        nlapiGetFieldValue("id") ||
        nlapiGetFieldValue("internalid") ||
        "";
    } catch (e) {
      return "";
    }
  }

  function isScrPage() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("rectype") === "2840" || /customrecord2840/i.test(document.body && document.body.innerText || "");
    } catch (e) {
      return false;
    }
  }

  function isScrEditMode() {
    const params = new URLSearchParams(window.location.search);
    if (/^t$/i.test(params.get("e") || "")) return true;
    return Boolean(document.getElementById("submitter") ||
      document.querySelector('input[type="submit"][value="Save"], button[name="submitter"]'));
  }

  function isNetSuiteFormInitialized() {
    try {
      const form = ns().NS && ns().NS.form;
      if (!form || typeof form.isInited !== "function") return true;
      return form.isInited() === true;
    } catch (e) {
      return false;
    }
  }

  function waitForNetSuiteFormInitialized(actionLabel) {
    if (isNetSuiteFormInitialized()) return Promise.resolve(true);
    setPanelStatus(`Waiting on NetSuite before ${actionLabel}...`, "info");
    const startedAt = Date.now();
    return new Promise(resolve => {
      const poll = function () {
        if (isNetSuiteFormInitialized()) {
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= NETSUITE_FORM_INIT_TIMEOUT_MS) {
          console.warn(LOG_PREFIX, "NetSuite form did not initialize before action:", actionLabel);
          setPanelStatus(`NetSuite is still initializing. Refresh and try ${actionLabel} again.`, "error");
          resolve(false);
          return;
        }
        setTimeout(poll, NETSUITE_FORM_INIT_POLL_MS);
      };
      setTimeout(poll, NETSUITE_FORM_INIT_POLL_MS);
    });
  }

  function runWhenNetSuiteFormInitialized(actionLabel, callback) {
    waitForNetSuiteFormInitialized(actionLabel).then(ok => {
      if (!ok) return;
      try {
        callback();
      } catch (e) {
        console.error(LOG_PREFIX, "Action failed:", actionLabel, e);
        setPanelStatus(`Could not complete ${actionLabel}. Check console for details.`, "error");
      }
    });
  }

  function getAccessibleDocuments() {
    const docs = [];
    const seen = new Set();
    function visit(win) {
      try {
        if (!win || !win.document || seen.has(win.document)) return;
        seen.add(win.document);
        docs.push(win.document);
        for (let i = 0; i < win.frames.length; i += 1) visit(win.frames[i]);
      } catch (e) {
        /* inaccessible frame */
      }
    }
    try { visit(ns().top || ns()); } catch (e) { /* ignore */ }
    try { visit(ns()); } catch (e) { /* ignore */ }
    try { visit(window); } catch (e) { /* ignore */ }
    if (!seen.has(document)) docs.push(document);
    return docs;
  }

  function findFieldControls(fieldId) {
    const controls = [];
    const seen = new Set();
    const attrValue = String(fieldId).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const ids = [
      fieldId,
      `${fieldId}_fs`,
      `${fieldId}_val`,
      `${fieldId}_display`,
      `${fieldId}_selected`,
      `${fieldId}_unselected`,
      `${fieldId}_avail`,
      `inpt_${fieldId}`,
      `inpt_${fieldId}_display`,
    ];
    const suffixes = ["_fs", "_val", "_display", "_selected", "_unselected", "_avail"];
    function allowed(value) {
      value = String(value || "");
      return suffixes.some(suffix => value === `${fieldId}${suffix}` || value.startsWith(`${fieldId}${suffix}_`));
    }
    function add(el, trusted) {
      if (!el || seen.has(el)) return;
      if (!trusted) {
        const id = el.id || "";
        const name = el.name || "";
        const dataFieldId = el.getAttribute && (el.getAttribute("data-fieldid") || el.getAttribute("data-name"));
        const exact = id === fieldId || name === fieldId || dataFieldId === fieldId || ids.includes(id) || ids.includes(name);
        if (!exact && !allowed(id) && !allowed(name)) return;
      }
      seen.add(el);
      controls.push(el);
    }
    getAccessibleDocuments().forEach(doc => {
      ids.forEach(id => {
        const el = doc.getElementById(id);
        add(el, true);
        try {
          if (el && el.querySelectorAll) {
            el.querySelectorAll('input, select, textarea, span[id$="_val"]').forEach(child => add(child, true));
          }
        } catch (e) {
          /* keep scanning */
        }
      });
      try {
        doc.querySelectorAll(`[name="${attrValue}"], [data-fieldid="${attrValue}"], [data-name="${attrValue}"], [id^="${attrValue}_"], [name^="${attrValue}_"]`).forEach(el => add(el, false));
      } catch (e) {
        /* selector may not be supported */
      }
    });
    return controls;
  }

  function dispatchFieldEvents(el) {
    if (!el) return;
    try {
      const EventCtor = (el.ownerDocument && el.ownerDocument.defaultView && el.ownerDocument.defaultView.Event) || Event;
      ["input", "change", "blur"].forEach(eventName => {
        el.dispatchEvent(new EventCtor(eventName, { bubbles: true }));
      });
    } catch (e) {
      /* best effort */
    }
  }

  function triggerNetSuiteFieldEvents(fieldId) {
    try {
      findFieldControls(fieldId).forEach(dispatchFieldEvents);
    } catch (e) {
      /* best effort */
    }
  }

  function readCurrentRecordField(fieldId, textMode) {
    try {
      const rec = ns().nlapiGetCurrentRecord && ns().nlapiGetCurrentRecord();
      if (!rec) return "";
      const method = textMode ? "getFieldText" : "getFieldValue";
      if (typeof rec[method] === "function") return normalizeFieldReadResult(rec[method](fieldId));
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function normalizeFieldReadResult(value) {
    if (Array.isArray(value)) return value.map(normalizeFieldReadResult).filter(Boolean).join(", ");
    if (value == null) return "";
    if (typeof value === "object") {
      if (value.text != null) return String(value.text).trim();
      if (value.value != null) return String(value.value).trim();
    }
    return String(value).replace(/\s+/g, " ").trim();
  }

  function lookupCurrentScrField(fieldId, textMode) {
    const scrId = getCurrentScrId();
    if (!scrId) return "";
    try {
      return normalizeFieldReadResult(nlapiLookupField(SCR_RECORD_TYPE, scrId, fieldId, Boolean(textMode)));
    } catch (e) {
      /* lookup may be unavailable */
    }
    return "";
  }

  function readDomFieldDisplayText(fieldId) {
    const controls = findFieldControls(fieldId);
    for (const el of controls) {
      try {
        if (el.tagName === "SELECT" && el.selectedIndex >= 0) {
          const opt = el.options[el.selectedIndex];
          const text = normalizeFieldReadResult(opt && (opt.text || opt.label || opt.value));
          if (text) return text;
        }
        const text = normalizeFieldReadResult(el.textContent || "");
        if (text) return text;
      } catch (e) {
        /* keep trying */
      }
    }
    for (const el of controls) {
      try {
        if (el.type && String(el.type).toLowerCase() === "hidden") continue;
        if ("value" in el && el.value != null && String(el.value).trim() !== "") return normalizeFieldReadResult(el.value);
      } catch (e) {
        /* keep trying */
      }
    }
    return "";
  }

  function readFormField(fieldId) {
    const textReaders = [
      () => normalizeFieldReadResult(nlapiGetFieldText(fieldId)),
      () => readCurrentRecordField(fieldId, true),
      () => lookupCurrentScrField(fieldId, true),
      () => readDomFieldDisplayText(fieldId),
    ];
    for (const reader of textReaders) {
      try {
        const value = reader();
        if (value) return value;
      } catch (e) {
        /* try next */
      }
    }

    const valueReaders = [
      () => normalizeFieldReadResult(nlapiGetFieldValue(fieldId)),
      () => readCurrentRecordField(fieldId, false),
      () => lookupCurrentScrField(fieldId, false),
    ];
    for (const reader of valueReaders) {
      try {
        const value = reader();
        if (value) return value;
      } catch (e) {
        /* try next */
      }
    }
    return "";
  }

  function readFormFieldValue(fieldId) {
    const readers = [
      () => normalizeFieldReadResult(nlapiGetFieldValue(fieldId)),
      () => readCurrentRecordField(fieldId, false),
      () => lookupCurrentScrField(fieldId, false),
    ];
    for (const reader of readers) {
      try {
        const value = reader();
        if (value) return value;
      } catch (e) {
        /* try next */
      }
    }
    return "";
  }

  function readFormTextField(fieldId) {
    try {
      const value = nlapiGetFieldValue(fieldId);
      if (value != null) return String(value);
    } catch (e) {
      /* field may not be registered */
    }
    const controls = findFieldControls(fieldId);
    for (const el of controls) {
      if ("value" in el && el.value != null) return String(el.value);
      const text = el.textContent || "";
      if (text) return text;
    }
    return "";
  }

  function setDomFieldControls(fieldId, value) {
    let wrote = false;
    findFieldControls(fieldId).forEach(el => {
      try {
        if ("value" in el) {
          el.value = value;
          el.setAttribute("value", value);
        } else {
          el.textContent = value;
        }
        dispatchFieldEvents(el);
        wrote = true;
      } catch (e) {
        /* keep trying */
      }
    });
    return wrote;
  }

  function setFormTextField(fieldId, value) {
    let wrote = false;
    try {
      nlapiSetFieldValue(fieldId, value, true);
      wrote = true;
    } catch (e) {
      try {
        nlapiSetFieldValue(fieldId, value, false);
        wrote = true;
      } catch (inner) {
        /* try DOM fallback */
      }
    }

    try {
      const rec = ns().nlapiGetCurrentRecord && ns().nlapiGetCurrentRecord();
      if (rec && typeof rec.setFieldValue === "function") {
        rec.setFieldValue(fieldId, value);
        wrote = true;
      } else if (rec && typeof rec.setValue === "function") {
        rec.setValue({ fieldId, value, ignoreFieldChange: false, forceSyncSourcing: true });
        wrote = true;
      }
    } catch (e) {
      /* current-record fallback may not be available */
    }

    if (!wrote && setDomFieldControls(fieldId, value)) wrote = true;
    if (!wrote) console.warn(LOG_PREFIX, "Unable to write text field:", fieldId);
    return wrote;
  }

  function setFieldValueWithSyncSourcing(fieldId, value) {
    let wrote = false;
    try {
      nlapiSetFieldValue(fieldId, value, true, true);
      wrote = true;
    } catch (e) {
      try {
        nlapiSetFieldValue(fieldId, value, true);
        wrote = true;
      } catch (inner) {
        /* try current-record fallback */
      }
    }
    try {
      const rec = ns().nlapiGetCurrentRecord && ns().nlapiGetCurrentRecord();
      if (rec && typeof rec.setValue === "function") {
        rec.setValue({ fieldId, value, ignoreFieldChange: false, forceSyncSourcing: true });
        wrote = true;
      } else if (rec && typeof rec.setFieldValue === "function") {
        rec.setFieldValue(fieldId, value);
        wrote = true;
      }
    } catch (e) {
      /* current-record fallback may not be available */
    }
    triggerNetSuiteFieldEvents(fieldId);
    return wrote;
  }

  function releaseActiveNetSuiteFieldFocus() {
    try {
      getAccessibleDocuments().forEach(doc => {
        const active = doc.activeElement;
        if (active && active !== doc.body && typeof active.blur === "function") {
          dispatchFieldEvents(active);
          active.blur();
        }
      });
    } catch (e) {
      /* best effort */
    }
    try {
      if (document.body && typeof document.body.focus === "function") {
        if (!document.body.hasAttribute("tabindex")) document.body.setAttribute("tabindex", "-1");
        document.body.focus({ preventScroll: true });
      }
    } catch (e) {
      /* optional */
    }
  }

  function scheduleNetSuiteFieldFocusRelease() {
    releaseActiveNetSuiteFieldFocus();
    [150, 700].forEach(delay => setTimeout(releaseActiveNetSuiteFieldFocus, delay));
  }

  function saveNetSuiteForm() {
    releaseActiveNetSuiteFieldFocus();
    const selectors = [
      "#submitter",
      "#btn_multibutton_submitter",
      'input[name="submitter"]',
      'input[type="submit"][value="Save"]',
      'input[type="button"][value="Save"]',
      'button[name="submitter"]',
      'button[value="Save"]',
    ];
    for (const doc of getAccessibleDocuments()) {
      for (const selector of selectors) {
        const btn = doc.querySelector(selector);
        if (btn) {
          releaseActiveNetSuiteFieldFocus();
          btn.click();
          return true;
        }
      }
    }
    console.warn(LOG_PREFIX, "Save button not found.");
    return false;
  }

  function goToEditMode() {
    const url = new URL(window.location.href);
    url.searchParams.set("e", "T");
    window.location.assign(url.toString());
  }

  function storePendingStaffAction(action) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      ...action,
      scrId: getCurrentScrId(),
      savedAt: Date.now(),
    }));
    setPanelStatus("Opening edit mode to apply SCOUT ZERO staffing...", "info");
    goToEditMode();
  }

  function getRosterEmployeeId(rosterId) {
    const key = String(rosterId || "").trim();
    if (!key) return "";
    if (Object.prototype.hasOwnProperty.call(ASSIGNEE_EMPLOYEE_CACHE, key)) return ASSIGNEE_EMPLOYEE_CACHE[key];
    let employeeId = "";
    try {
      employeeId = String(nlapiLookupField(SC_ROSTER_RECORD_TYPE, key, "custrecord_emproster_emp") || "").trim();
    } catch (e) {
      console.warn(LOG_PREFIX, "Could not resolve assignee employee for roster:", key, e.message || e);
    }
    ASSIGNEE_EMPLOYEE_CACHE[key] = employeeId;
    return employeeId;
  }

  function setStatus(id) {
    setFieldValueWithSyncSourcing(SCR_FIELD_STATUS, id);
  }

  function setAssignee(rosterId) {
    setFieldValueWithSyncSourcing(SCR_FIELD_ASSIGNEE, rosterId);
    const employeeId = getRosterEmployeeId(rosterId);
    if (employeeId) setFieldValueWithSyncSourcing(SCR_FIELD_ASSIGNEE_EMPLOYEE, employeeId);
    setTimeout(() => triggerNetSuiteFieldEvents(SCR_FIELD_ASSIGNEE), 250);
  }

  function setLeadAssigned(assignAsLead) {
    setFieldValueWithSyncSourcing(SCR_FIELD_ASSIGNED_LEAD, assignAsLead ? "T" : "F");
  }

  function getRequestDetails() {
    try {
      return nlapiGetFieldValue(SCR_FIELD_DETAILS) || "";
    } catch (e) {
      return readFormTextField(SCR_FIELD_DETAILS);
    }
  }

  function getHashtags() {
    try {
      return nlapiGetFieldValue(SCR_FIELD_HASHTAGS) || "";
    } catch (e) {
      return readFormTextField(SCR_FIELD_HASHTAGS);
    }
  }

  function hasHashtag(current, tag) {
    const escaped = String(tag || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[\\s,;])${escaped}(?=$|[\\s,;])`, "i").test(String(current || ""));
  }

  function addHashtagOnce(tag) {
    const current = getHashtags();
    if (hasHashtag(current, tag)) return;
    setFieldValueWithSyncSourcing(SCR_FIELD_HASHTAGS, current ? `${tag},${current}` : tag);
  }

  function prependRequestDetails(text) {
    const prefix = String(text || "");
    if (!prefix) return;
    const existing = getRequestDetails();
    const remaining = Math.max(0, SCR_REQUEST_DETAILS_MAX_CHARS - prefix.length);
    let nextValue = prefix + String(existing || "").slice(0, remaining);
    if (nextValue.length > SCR_REQUEST_DETAILS_MAX_CHARS) nextValue = nextValue.slice(0, SCR_REQUEST_DETAILS_MAX_CHARS);
    setFormTextField(SCR_FIELD_DETAILS, nextValue);
  }

  function appendNotesText(current, notes) {
    const existing = String(current || "").trim();
    return existing ? `${existing}\n\n${notes}` : notes;
  }

  function alreadyContainsNote(current, marker) {
    if (!marker) return false;
    if (marker instanceof RegExp) return marker.test(current);
    const normalize = value => String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return normalize(current).includes(normalize(marker));
  }

  function appendEngagementNotesTemplate(empName) {
    const initials = getInitials(empName);
    const notes = [
      todayFullString(),
      "Last Steps:",
      "Next Steps:",
      "Red Flags: ",
      "Value/Impact:",
      `[${initials}]`,
    ].join("\n");
    try {
      const current = readFormTextField(SCR_FIELD_ENGAGEMENT_NOTES);
      if (alreadyContainsNote(current, notes)) return;
      setFormTextField(SCR_FIELD_ENGAGEMENT_NOTES, appendNotesText(current, notes));
    } catch (e) {
      console.warn(LOG_PREFIX, "appendEngagementNotesTemplate error:", e.message || e);
    }
  }

  function wrapStaffingNote(requestDetailsScript, empName) {
    const header = `-- ADDED by ${empName} on ${todayShortString()} --\n`;
    const footer = "----- end of SC assignment ----\n\n";
    const body = String(requestDetailsScript || "").trimEnd();
    return header + (body ? `${body}\n` : "") + footer;
  }

  function buildDefaultStaffingRequestNote(scName) {
    return `${scName} has been staffed, please schedule upcoming strategy meeting with the SC.\n`;
  }

  function getCurrentAmoDeliverableFromForm() {
    const rawValue = String(readFormFieldValue(SCR_FIELD_DELIVERABLE) || "").trim();
    const formText = readFormField(SCR_FIELD_DELIVERABLE);
    const normalizedText = normalizeAmoDeliverableName(formText);
    if (isValidAmoDeliverableName(normalizedText)) return normalizedText;
    const normalizedRaw = normalizeAmoDeliverableName(rawValue);
    return isValidAmoDeliverableName(normalizedRaw) ? normalizedRaw : "";
  }

  function getSelectedAmoDeliverable() {
    const picker = document.getElementById("scout-zero-deliverable");
    const selected = normalizeAmoDeliverableName(picker && picker.value);
    if (isValidAmoDeliverableName(selected)) return selected;
    return getCurrentAmoDeliverableFromForm();
  }

  function syncDeliverableToForm(deliverableText) {
    if (!deliverableText) return false;
    let wrote = false;
    try {
      nlapiSetFieldText(SCR_FIELD_DELIVERABLE, deliverableText, true);
      wrote = true;
    } catch (e) {
      try {
        nlapiSetFieldValue(SCR_FIELD_DELIVERABLE, deliverableText, true);
        wrote = true;
      } catch (inner) {
        console.warn(LOG_PREFIX, "syncDeliverableToForm error:", inner.message || inner);
      }
    }
    triggerNetSuiteFieldEvents(SCR_FIELD_DELIVERABLE);
    return wrote;
  }

  function isCurrentScrAmo() {
    const reqType = `${readFormField(SCR_FIELD_TYPE)} ${readFormField("custrecord_screq_request_type")}`;
    return /amo/i.test(reqType);
  }

  function checkLeadOnOpp() {
    try {
      const oppId = (nlapiGetFieldValue(SCR_FIELD_OPP) || "").trim();
      if (!oppId) return null;
      const currentId = nlapiGetFieldValue("internalid") || "";
      const rows = nlapiSearchRecord(SCR_RECORD_TYPE, null, [
        new nlobjSearchFilter(SCR_FIELD_OPP, null, "is", oppId),
        new nlobjSearchFilter(SCR_FIELD_ASSIGNED_LEAD, null, "is", "T"),
        new nlobjSearchFilter(SCR_FIELD_STATUS, null, "noneof", [4, 5]),
      ], [
        new nlobjSearchColumn("internalid"),
        new nlobjSearchColumn(SCR_FIELD_ASSIGNEE),
      ]) || [];
      for (let i = 0; i < rows.length; i += 1) {
        const id = rows[i].getValue("internalid");
        if (id && id !== currentId) return rows[i].getText(SCR_FIELD_ASSIGNEE) || "another SC";
      }
      return null;
    } catch (e) {
      console.warn(LOG_PREFIX, "checkLeadOnOpp:", e.message || e);
      return null;
    }
  }

  function applyStaffing(scId, scName, empName, options) {
    const opts = options || {};
    const isAmo = Boolean(opts.isAmo);
    const deliverable = isAmo ? normalizeAmoDeliverableName(opts.deliverable) : "";
    const tmplFn = isAmo && deliverable && isValidAmoDeliverableName(deliverable)
      ? AMO_DELIVERABLE_TEMPLATES[deliverable]
      : null;
    const requestDetailsBaseScript = tmplFn ? tmplFn(scName, empName) : buildDefaultStaffingRequestNote(scName);

    setStatus(2);
    setAssignee(scId);
    setLeadAssigned(!opts.hasLeadOnOpp);
    addHashtagOnce("#scoutzero");
    addHashtagOnce("#scout");
    prependRequestDetails(wrapStaffingNote(requestDetailsBaseScript, empName));
    appendEngagementNotesTemplate(empName);
    if (isAmo && deliverable && isValidAmoDeliverableName(deliverable)) syncDeliverableToForm(deliverable);
    scheduleNetSuiteFieldFocusRelease();
  }

  function staffSelectedSc(empName) {
    const selected = getSelectedRosterFromInput();
    if (!selected || !isValidRosterRow(selected)) {
      setPanelStatus("Select an SC before staffing.", "error");
      focusScInput();
      return;
    }

    const amo = isCurrentScrAmo();
    const deliverable = amo ? getSelectedAmoDeliverable() : "";
    if (amo && !deliverable) {
      showBlankDeliverableWarning(() => staffSelectedScWithResolvedValues(selected, empName, amo, ""));
      return;
    }
    staffSelectedScWithResolvedValues(selected, empName, amo, deliverable);
  }

  function staffSelectedScWithResolvedValues(selected, empName, amo, deliverable) {
    const hasLeadOnOpp = Boolean(checkLeadOnOpp());
    const action = {
      type: "staff",
      scId: selected.id,
      scName: selected.name,
      empName,
      isAmo: amo,
      deliverable,
      hasLeadOnOpp,
    };
    if (!isScrEditMode()) {
      storePendingStaffAction(action);
      return;
    }
    runWhenNetSuiteFormInitialized(`staffing ${selected.name}`, function () {
      applyStaffing(selected.id, selected.name, empName, action);
      const label = amo && deliverable ? ` (${deliverable})` : "";
      setPanelStatus(`Staffed ${selected.name}${label}. Save the record to confirm.`, "success");
    });
  }

  function resumePendingStaffAction() {
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
    } catch (e) {
      sessionStorage.removeItem(PENDING_KEY);
    }
    if (!pending) return;
    if (pending.scrId && pending.scrId !== getCurrentScrId()) return;
    if (Date.now() - Number(pending.savedAt || 0) > 10 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    if (pending.type !== "staff") {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }
    if (!isScrEditMode()) return;

    runWhenNetSuiteFormInitialized(`staffing ${pending.scName}`, function () {
      applyStaffing(pending.scId, pending.scName, pending.empName, pending);
      sessionStorage.removeItem(PENDING_KEY);
      setPanelStatus(`Applied staffing changes for ${pending.scName}; saving record...`, "success");
      setTimeout(function () {
        triggerNetSuiteFieldEvents(SCR_FIELD_ASSIGNEE);
        releaseActiveNetSuiteFieldFocus();
        setTimeout(saveNetSuiteForm, 250);
      }, PENDING_STAFFING_SAVE_DELAY_MS);
    });
  }

  function saveRosterCache(rows, source) {
    rosterCache = {
      rows: dedupeRosterRows(rows),
      fetchedAt: Date.now(),
      source: source || "cache",
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rosterCache));
    } catch (e) {
      console.warn(LOG_PREFIX, "Could not write roster cache:", e.message || e);
    }
    return rosterCache;
  }

  function cacheRosterCard(row) {
    const normalized = normalizeRosterRow(row);
    if (!isValidRosterRow(normalized)) return;
    rosterCache = {
      rows: dedupeRosterRows([...(rosterCache.rows || []), normalized]),
      fetchedAt: rosterCache.fetchedAt || Date.now(),
      source: rosterCache.source || "selected roster card",
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rosterCache));
    } catch (e) {
      console.warn(LOG_PREFIX, "Could not cache selected roster card:", e.message || e);
    }
    renderDatalist(rosterCache.rows);
    setCacheMeta();
  }

  function loadStoredRosterCache() {
    try {
      const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (stored && Array.isArray(stored.rows)) {
        rosterCache = {
          rows: dedupeRosterRows(stored.rows),
          fetchedAt: Number(stored.fetchedAt || 0),
          source: stored.source || "stored",
        };
      }
    } catch (e) {
      rosterCache = { rows: [], fetchedAt: 0, source: "" };
    }
    return rosterCache;
  }

  function cacheIsFresh(cache) {
    return cache && cache.rows && cache.rows.length && Date.now() - Number(cache.fetchedAt || 0) < CACHE_TTL_MS;
  }

  function dedupeRosterRows(rows) {
    const byId = new Map();
    (rows || []).forEach(row => {
      const normalized = normalizeRosterRow(row);
      if (!isValidRosterRow(normalized)) return;
      const existing = byId.get(normalized.id);
      byId.set(normalized.id, { ...(existing || {}), ...normalized });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  function normalizeRosterRow(row) {
    return {
      id: String(row && (row.id || row.employeeId || row.internalid) || "").trim(),
      name: normalizeRosterDisplayName(row && (row.name || row.employee || row.text)),
      manager: normalizeName(row && row.manager),
      email: String(row && row.email || "").trim(),
      team: String(row && (row.team || row.vertical || row.salesTeam || row.salesteam) || "").trim(),
      location: String(row && row.location || "").trim(),
      tier: String(row && row.tier || "").trim(),
      region: String(row && row.region || "").trim(),
      employeeRecId: String(row && row.employeeRecId || "").trim(),
    };
  }

  function isScrLikeResultName(name) {
    const text = normalizeRosterDisplayName(name);
    return /\b(?:opportunity|opp(?:ortunity)?\s*#|sc\s*request|scr)\b/i.test(text) ||
      /\|\s*opportunity\b/i.test(text);
  }

  function isValidRosterRow(row) {
    if (!row || !row.id || !row.name) return false;
    if (!/^\d+$/.test(String(row.id))) return false;
    if (isScrLikeResultName(row.name)) return false;
    return isLikelyPersonName(row.name);
  }

  function readResultValue(result, fieldId, join) {
    try {
      return (join ? result.getValue(fieldId, join) : result.getValue(fieldId)) || "";
    } catch (e) {
      return "";
    }
  }

  function readResultText(result, fieldId, join) {
    try {
      return (join ? result.getText(fieldId, join) : result.getText(fieldId)) || "";
    } catch (e) {
      return "";
    }
  }

  function rosterRowsFromSearchResults(rows) {
    return (rows || []).map(r => normalizeRosterRow({
      id: readResultValue(r, "internalid"),
      name: readResultValue(r, "name"),
      manager: readResultText(r, "custrecord_emproster_mgrroster"),
      email: readResultValue(r, "email", "custrecord_emproster_emp"),
      team: readResultText(r, "custrecord_emproster_salesteam"),
      location: readResultText(r, "custrecord_emproster_olocation"),
      tier: readResultText(r, "custrecord_emproster_sales_tier").replace("Solution Consultant - ", ""),
      employeeRecId: readResultValue(r, "custrecord_emproster_emp"),
    }));
  }

  function rosterColumnSetBuilders() {
    return [
      () => [
        new nlobjSearchColumn("internalid"),
        new nlobjSearchColumn("name"),
        new nlobjSearchColumn("custrecord_emproster_emp"),
        new nlobjSearchColumn("custrecord_emproster_mgrroster"),
        new nlobjSearchColumn("custrecord_emproster_salesteam"),
        new nlobjSearchColumn("custrecord_emproster_olocation"),
        new nlobjSearchColumn("custrecord_emproster_sales_tier"),
        new nlobjSearchColumn("email", "custrecord_emproster_emp"),
      ],
      () => [
        new nlobjSearchColumn("internalid"),
        new nlobjSearchColumn("name"),
        new nlobjSearchColumn("custrecord_emproster_emp"),
      ],
      () => [
        new nlobjSearchColumn("internalid"),
        new nlobjSearchColumn("name"),
      ],
    ];
  }

  function runRosterSearch(searchId, filterBuilders, label) {
    const builders = filterBuilders && filterBuilders.length ? filterBuilders : [() => null];
    for (const buildFilters of builders) {
      let filters = null;
      try {
        filters = buildFilters ? buildFilters() : null;
      } catch (e) {
        console.warn(LOG_PREFIX, `${label || "Roster"} filter build failed:`, e.message || e);
        continue;
      }
      for (const buildCols of rosterColumnSetBuilders()) {
        let cols = [];
        try {
          cols = buildCols();
        } catch (e) {
          console.warn(LOG_PREFIX, `${label || "Roster"} column build failed:`, e.message || e);
          continue;
        }
        try {
          const rows = nlapiSearchRecord(SC_ROSTER_RECORD_TYPE, searchId || null, filters, cols) || [];
          const normalized = dedupeRosterRows(rosterRowsFromSearchResults(rows));
          if (normalized.length) return normalized;
        } catch (e) {
          console.warn(LOG_PREFIX, `${label || "Roster"} search attempt failed:`, e.message || e);
        }
      }
    }
    return [];
  }

  function runRosterSearchForEmployee(employeeId, label) {
    const id = String(employeeId || "").trim();
    if (!id) return [];
    return runRosterSearch(null, [
      () => [
        new nlobjSearchFilter("custrecord_emproster_emp", null, "is", id),
        new nlobjSearchFilter("custrecord_emproster_rosterstatus", null, "is", 1),
        new nlobjSearchFilter("custrecord_emproster_eminactive", null, "is", "F"),
      ],
      () => [
        new nlobjSearchFilter("custrecord_emproster_emp", null, "is", id),
      ],
    ], label || "Employee roster lookup");
  }

  function lookupRosterCardById(rosterId, fallbackName) {
    const id = String(rosterId || "").trim();
    if (!/^\d+$/.test(id)) return null;

    try {
      const valueFields = [
        "name",
        "custrecord_emproster_emp",
      ];
      const textFields = [
        "custrecord_emproster_mgrroster",
        "custrecord_emproster_salesteam",
        "custrecord_emproster_olocation",
        "custrecord_emproster_sales_tier",
      ];
      const values = nlapiLookupField(SC_ROSTER_RECORD_TYPE, id, valueFields, false) || {};
      const texts = nlapiLookupField(SC_ROSTER_RECORD_TYPE, id, textFields, true) || {};
      const row = normalizeRosterRow({
        id,
        name: values.name || fallbackName,
        manager: texts.custrecord_emproster_mgrroster,
        team: texts.custrecord_emproster_salesteam,
        location: texts.custrecord_emproster_olocation,
        tier: normalizeName(texts.custrecord_emproster_sales_tier).replace("Solution Consultant - ", ""),
        employeeRecId: values.custrecord_emproster_emp,
      });
      return isValidRosterRow(row) ? row : null;
    } catch (e) {
      try {
        const name = nlapiLookupField(SC_ROSTER_RECORD_TYPE, id, "name", false) || fallbackName;
        const row = normalizeRosterRow({ id, name });
        return isValidRosterRow(row) ? row : null;
      } catch (inner) {
        return null;
      }
    }
  }

  function readGlobalResultId(result) {
    try {
      if (result && typeof result.getId === "function") return String(result.getId() || "").trim();
    } catch (e) {
      /* try field fallback */
    }
    return readResultValue(result, "internalid") || readResultValue(result, "id");
  }

  function readGlobalResultType(result) {
    const readers = [
      () => result && typeof result.getRecordType === "function" ? result.getRecordType() : "",
      () => readResultValue(result, "recordtype"),
      () => readResultText(result, "recordtype"),
      () => readResultValue(result, "type"),
      () => readResultText(result, "type"),
    ];
    for (const reader of readers) {
      try {
        const value = String(reader() || "").trim();
        if (value) return value;
      } catch (e) {
        /* try next */
      }
    }
    return "";
  }

  function readGlobalResultName(result) {
    const fields = ["name", "entityid", "altname", "title"];
    for (const field of fields) {
      const text = normalizeName(readResultText(result, field) || readResultValue(result, field));
      if (text) return text;
    }
    try {
      const value = normalizeName(result && (result.name || result.text || result.entityid));
      if (value) return value;
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function globalResultToRosterRows(result) {
    const id = readGlobalResultId(result);
    const name = normalizeRosterDisplayName(readGlobalResultName(result));
    const type = readGlobalResultType(result);
    const typeLoose = normalizeLoose(type);
    if (!id) return [];

    if (/customrecord\s*2840|customrecord2840|sc\s*request|scr/i.test(type) || isScrLikeResultName(name)) {
      return [];
    }

    if (/emproster|employee roster|solution consultant roster|customrecord.*1572/.test(typeLoose)) {
      return [normalizeRosterRow({ id, name })];
    }

    if (/\bemployee\b/.test(typeLoose) || typeLoose === "employee") {
      return runRosterSearchForEmployee(id, "Global employee roster lookup");
    }

    if (!typeLoose && isLikelyPersonName(name)) {
      const rosterCard = lookupRosterCardById(id, name);
      if (rosterCard) return [rosterCard];
      return runRosterSearchForEmployee(id, "Global person roster lookup");
    }

    return [];
  }

  function searchGlobalRosterByName(searchTerm) {
    const term = String(searchTerm || "").trim();
    if (!term || typeof nlapiSearchGlobal !== "function") return [];
    const keywords = [`"${term}"`, term];
    const rows = [];
    const seenGlobalIds = new Set();

    for (const keyword of keywords) {
      try {
        const results = nlapiSearchGlobal(keyword) || [];
        for (const result of results) {
          const globalKey = `${readGlobalResultType(result)}:${readGlobalResultId(result)}`;
          if (seenGlobalIds.has(globalKey)) continue;
          seenGlobalIds.add(globalKey);
          rows.push(...globalResultToRosterRows(result));
          if (rows.length >= QUICK_RESULT_LIMIT) return dedupeRosterRows(rows);
        }
      } catch (e) {
        console.warn(LOG_PREFIX, "Global roster lookup failed:", e.message || e);
      }
    }

    return dedupeRosterRows(rows);
  }

  function getSearchUrlForCurrentHost() {
    try {
      const url = new URL(SC_ROSTER_SEARCH_URL);
      if (/nlcorp-sb2/i.test(window.location.hostname)) url.hostname = "nlcorp-sb2.app.netsuite.com";
      return url.toString();
    } catch (e) {
      return SC_ROSTER_SEARCH_URL;
    }
  }

  function requestText(url) {
    return new Promise((resolve, reject) => {
      if (typeof fetch === "function") {
        fetch(url, { credentials: "include", cache: "no-store" })
          .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.text();
          })
          .then(resolve)
          .catch(fetchError => {
            if (typeof GM_xmlhttpRequest === "undefined") {
              reject(fetchError);
              return;
            }
            gmRequestText(url).then(resolve).catch(reject);
          });
        return;
      }
      gmRequestText(url).then(resolve).catch(reject);
    });
  }

  function gmRequestText(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === "undefined") {
        reject(new Error("No request API available"));
        return;
      }
      GM_xmlhttpRequest({
        method: "GET",
        url,
        headers: { "Cache-Control": "no-cache" },
        onload: res => {
          if (res.status >= 200 && res.status < 300) resolve(res.responseText || "");
          else reject(new Error(`HTTP ${res.status}`));
        },
        onerror: () => reject(new Error("Request failed")),
        ontimeout: () => reject(new Error("Request timed out")),
        timeout: 15000,
      });
    });
  }

  function parseSavedSearchRows(html) {
    const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
    const tables = Array.from(doc.querySelectorAll("table"));
    const rows = [];
    tables.forEach(table => {
      const headerCells = Array.from(table.querySelectorAll("tr")).find(tr => {
        const text = normalizeLoose(tr.textContent || "");
        return /\bname\b/.test(text) || /\bsolution consultant\b/.test(text) || /\bemail\b/.test(text);
      });
      const headers = headerCells ? Array.from(headerCells.children).map(cell => normalizeLoose(cell.textContent || "")) : [];
      Array.from(table.querySelectorAll("tr")).forEach(tr => {
        const cells = Array.from(tr.children);
        if (cells.length < 1 || tr === headerCells) return;
        const row = parseSavedSearchTableRow(cells, headers);
        if (row && row.id && row.name) rows.push(row);
      });
    });
    return dedupeRosterRows(rows);
  }

  function parseSavedSearchTableRow(cells, headers) {
    const link = cells
      .flatMap(cell => Array.from(cell.querySelectorAll("a[href*='rectype=1572'], a[href*='customrecordentry.nl']")))
      .find(anchor => /(?:rectype=1572|customrecord_emproster|id=)/i.test(anchor.href || anchor.getAttribute("href") || ""));
    let id = "";
    let linkedName = "";
    if (link) {
      const href = link.getAttribute("href") || link.href || "";
      try {
        const url = new URL(href, window.location.origin);
        id = url.searchParams.get("id") || "";
      } catch (e) {
        const match = href.match(/[?&]id=(\d+)/i);
        id = match ? match[1] : "";
      }
      linkedName = normalizeName(link.textContent || "");
    }

    const values = cells.map(cell => normalizeName(cell.textContent || ""));
    const byHeader = {};
    headers.forEach((header, index) => {
      if (!header || !values[index]) return;
      byHeader[header] = values[index];
    });

    const name = linkedName ||
      pickByHeader(byHeader, ["name", "employee", "solution consultant", "sc"]) ||
      values.find(text => isLikelyPersonName(text)) ||
      "";

    return normalizeRosterRow({
      id,
      name,
      manager: pickByHeader(byHeader, ["manager", "sc manager", "mgr"]),
      email: pickByHeader(byHeader, ["email", "e mail"]),
      team: pickByHeader(byHeader, ["sales team", "team", "vertical amo", "vertical"]),
      location: pickByHeader(byHeader, ["location", "office location", "olocation"]),
      tier: pickByHeader(byHeader, ["tier", "sales tier"]),
      region: pickByHeader(byHeader, ["region", "subregion", "sales subregion"]),
    });
  }

  function pickByHeader(byHeader, keys) {
    const normalizedKeys = keys.map(normalizeLoose);
    const exact = normalizedKeys.map(key => byHeader[key]).find(Boolean);
    if (exact) return exact;
    const header = Object.keys(byHeader).find(name => normalizedKeys.some(key => name === key || name.includes(key) || key.includes(name)));
    return header ? byHeader[header] : "";
  }

  function isLikelyPersonName(value) {
    const text = normalizeName(value);
    if (!text || text.length > 80) return false;
    if (/@|http|netsuite|custom|internal id|date|status/i.test(text)) return false;
    return /^[A-Za-z][A-Za-z'.-]+(?:,\s*|\s+)[A-Za-z][A-Za-z'.-]+/.test(text);
  }

  function loadRowsFromSavedSearchApi() {
    return runRosterSearch(SC_ROSTER_SEARCH_ID, [() => null], "Saved search API");
  }

  async function refreshRosterCache(force) {
    loadStoredRosterCache();
    if (!force && cacheIsFresh(rosterCache)) {
      renderDatalist(rosterCache.rows);
      setCacheMeta();
      return rosterCache.rows;
    }

    setPanelStatus("Caching SC names...", "info");
    let htmlRows = [];
    try {
      const html = await requestText(getSearchUrlForCurrentHost());
      htmlRows = parseSavedSearchRows(html);
    } catch (e) {
      console.warn(LOG_PREFIX, "Saved search HTML cache failed:", e.message || e);
    }

    const apiRows = loadRowsFromSavedSearchApi();
    const rows = dedupeRosterRows([...(htmlRows || []), ...(apiRows || [])]);
    if (rows.length) {
      const source = apiRows.length >= htmlRows.length ? "saved search api" : "saved search html";
      saveRosterCache(rows, source);
      renderDatalist(rows);
      setPanelStatus(`Cached ${rows.length} SCs.`, "success");
      setCacheMeta();
      return rows;
    }

    if (rosterCache.rows.length) {
      renderDatalist(rosterCache.rows);
      setPanelStatus(`Using cached SC list (${rosterCache.rows.length}).`, "info");
      setCacheMeta();
      return rosterCache.rows;
    }

    setPanelStatus("SC cache unavailable. Type a name to search NetSuite.", "error");
    setCacheMeta();
    return [];
  }

  function renderDatalist(rows) {
    const list = document.getElementById("scout-zero-sc-list");
    if (!list) return;
    list.innerHTML = (rows || []).map(row => {
      const label = [row.name, row.team, row.manager].filter(Boolean).join(" - ");
      return `<option value="${escAttr(row.name)}" label="${escAttr(label)}"></option>`;
    }).join("");
  }

  function formatCacheAge(fetchedAt) {
    if (!fetchedAt) return "not cached";
    const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    return `${hours}h ago`;
  }

  function setCacheMeta() {
    const meta = document.getElementById("scout-zero-cache-meta");
    if (!meta) return;
    const count = rosterCache.rows.length || 0;
    const age = formatCacheAge(rosterCache.fetchedAt);
    meta.textContent = count ? `${count} SCs cached, ${age}` : "SC cache not loaded";
  }

  function searchCachedRoster(query) {
    const q = normalizeLoose(query);
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return (rosterCache.rows || [])
      .map(row => {
        const haystack = normalizeLoose([row.name, row.team, row.manager, row.email].filter(Boolean).join(" "));
        let score = 99;
        const name = normalizeLoose(row.name);
        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (tokens.every(token => haystack.includes(token))) score = 2;
        else if (haystack.includes(q)) score = 3;
        return { row, score };
      })
      .filter(item => item.score < 99)
      .sort((a, b) => a.score - b.score || a.row.name.localeCompare(b.row.name))
      .map(item => item.row);
  }

  function searchRosterByName(searchTerm) {
    const term = String(searchTerm || "").trim();
    if (!term) return [];
    return runRosterSearch(null, [
      () => [
        new nlobjSearchFilter("name", null, "contains", term),
        new nlobjSearchFilter("custrecord_emproster_rosterstatus", null, "is", 1),
        new nlobjSearchFilter("custrecord_emproster_eminactive", null, "is", "F"),
        new nlobjSearchFilter("custrecord_emproster_sales_qb", null, "is", 25),
      ],
      () => [
        new nlobjSearchFilter("name", null, "contains", term),
        new nlobjSearchFilter("custrecord_emproster_rosterstatus", null, "is", 1),
        new nlobjSearchFilter("custrecord_emproster_eminactive", null, "is", "F"),
      ],
      () => [
        new nlobjSearchFilter("name", null, "contains", term),
      ],
    ], "Roster lookup");
  }

  function lookupRoster(query) {
    const cached = searchCachedRoster(query);
    if (cached.length) return cached;
    const parts = String(query || "").trim().split(/\s+/).filter(Boolean);
    const term = parts.length > 1 ? parts[parts.length - 1] : String(query || "").trim();
    const direct = searchRosterByName(term);
    if (direct.length) return direct;
    return searchGlobalRosterByName(query);
  }

  function focusScInput() {
    const input = document.getElementById("scout-zero-sc-input");
    if (input) input.focus();
  }

  function getSelectedRosterFromInput() {
    const input = document.getElementById("scout-zero-sc-input");
    const hidden = document.getElementById("scout-zero-sc-id");
    const value = normalizeName(input && input.value);
    const hiddenId = hidden && hidden.value;
    if (hiddenId) {
      const row = (rosterCache.rows || []).find(item => String(item.id) === String(hiddenId));
      if (row && isValidRosterRow(row) && normalizeLoose(row.name) === normalizeLoose(value)) return row;
    }
    const exact = (rosterCache.rows || []).find(row => isValidRosterRow(row) && normalizeLoose(row.name) === normalizeLoose(value));
    if (exact) return exact;
    const result = lookupRoster(value).find(row => isValidRosterRow(row) && normalizeLoose(row.name) === normalizeLoose(value));
    return result || null;
  }

  function renderLookupResults(rows) {
    const box = document.getElementById("scout-zero-results");
    if (!box) return;
    const cleanRows = dedupeRosterRows(rows).slice(0, QUICK_RESULT_LIMIT);
    if (!cleanRows.length) {
      box.innerHTML = '<div class="scout-zero-empty">No matching active SC found.</div>';
      return;
    }
    box.innerHTML = cleanRows.map(row => `
      <button type="button" class="scout-zero-result" data-id="${escAttr(row.id)}" data-name="${escAttr(row.name)}">
        <span class="scout-zero-result-name">${escHtml(row.name)}</span>
        <span class="scout-zero-result-meta">${escHtml([row.team, row.manager, row.location].filter(Boolean).join(" - "))}</span>
      </button>
    `).join("");
    box.querySelectorAll(".scout-zero-result").forEach(btn => {
      btn.addEventListener("click", () => selectRosterRowById(btn.dataset.id, btn.dataset.name));
    });
  }

  function selectRosterRowById(id, name) {
    let row = (rosterCache.rows || []).find(item => String(item.id) === String(id));
    if (!row) row = normalizeRosterRow({ id, name });
    if (!isValidRosterRow(row)) {
      setPanelStatus("That result is not an SC roster card. Choose an SC card result.", "error");
      return;
    }
    cacheRosterCard(row);
    const input = document.getElementById("scout-zero-sc-input");
    const hidden = document.getElementById("scout-zero-sc-id");
    if (input) input.value = row.name;
    if (hidden) hidden.value = row.id;
    renderSelectedCard(row);
    setPanelStatus(`Selected ${row.name}.`, "info");
  }

  function renderSelectedCard(row) {
    const card = document.getElementById("scout-zero-selected");
    if (!card) return;
    if (!row || !row.id) {
      card.innerHTML = "";
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const meta = [row.team, row.manager, row.location, row.email].filter(Boolean).join(" - ");
    card.innerHTML = `
      <div class="scout-zero-card-name">${escHtml(row.name)}</div>
      <div class="scout-zero-card-meta">${escHtml(meta || "SC roster card")}</div>
    `;
  }

  function scheduleLookup() {
    const input = document.getElementById("scout-zero-sc-input");
    const hidden = document.getElementById("scout-zero-sc-id");
    const query = input ? input.value.trim() : "";
    if (hidden) hidden.value = "";
    renderSelectedCard(null);
    const seq = ++lookupSeq;
    if (!query) {
      const box = document.getElementById("scout-zero-results");
      if (box) box.innerHTML = "";
      return;
    }
    window.setTimeout(() => {
      if (seq !== lookupSeq) return;
      const rows = lookupRoster(query);
      renderLookupResults(rows);
      if (rows.length === 1 && normalizeLoose(rows[0].name) === normalizeLoose(query)) {
        selectRosterRowById(rows[0].id, rows[0].name);
      }
    }, 160);
  }

  function buildDeliverableOptions() {
    const current = getCurrentAmoDeliverableFromForm();
    const options = getBaseAmoDeliverableOptions();
    return `<option value="">Select deliverable</option>` + options.map(name => {
      const selected = current && normalizeLoose(current) === normalizeLoose(name) ? " selected" : "";
      const noTemplate = AMO_DELIVERABLE_TEMPLATES[name] ? "" : ' data-no-template="true"';
      return `<option value="${escAttr(name)}"${selected}${noTemplate}>${escHtml(name)}</option>`;
    }).join("");
  }

  function refreshDeliverableUi() {
    const row = document.getElementById("scout-zero-deliverable-row");
    const picker = document.getElementById("scout-zero-deliverable");
    if (!row || !picker) return;
    const amo = isCurrentScrAmo();
    row.hidden = !amo;
    picker.innerHTML = buildDeliverableOptions();
    if (amo && picker.value) syncDeliverableToForm(picker.value);
  }

  function setPanelStatus(message, tone) {
    const el = document.getElementById("scout-zero-status");
    if (!el) return;
    el.textContent = message || "";
    el.dataset.tone = tone || "info";
  }

  function showBlankDeliverableWarning(onContinue) {
    const overlay = document.createElement("div");
    overlay.className = "scout-zero-modal-backdrop";
    overlay.innerHTML = `
      <div class="scout-zero-modal" role="dialog" aria-modal="true" aria-labelledby="scout-zero-modal-title">
        <h3 id="scout-zero-modal-title">AMO Deliverable Is Blank</h3>
        <p>This request appears to be AMO. Staff without a deliverable?</p>
        <div class="scout-zero-modal-actions">
          <button type="button" class="scout-zero-btn scout-zero-btn-ghost" id="scout-zero-modal-cancel">Cancel</button>
          <button type="button" class="scout-zero-btn scout-zero-btn-primary" id="scout-zero-modal-continue">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#scout-zero-modal-cancel").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#scout-zero-modal-continue").addEventListener("click", () => {
      overlay.remove();
      onContinue();
    });
  }

  function buildPanelHTML() {
    return `
      <div class="scout-zero-header">
        <img src="${escAttr(SCOUT_ZERO_LOGO_URL)}" alt="SCOUT ZERO" class="scout-zero-logo">
        <button type="button" class="scout-zero-close" id="scout-zero-close" aria-label="Close">x</button>
      </div>
      <div class="scout-zero-body">
        <input type="hidden" id="scout-zero-sc-id">
        <label class="scout-zero-label" for="scout-zero-sc-input">Solution Consultant</label>
        <div class="scout-zero-combobox">
          <input id="scout-zero-sc-input" type="text" list="scout-zero-sc-list" autocomplete="off" placeholder="Type or select an SC">
          <datalist id="scout-zero-sc-list"></datalist>
          <button type="button" id="scout-zero-refresh" title="Refresh SC cache">Refresh</button>
        </div>
        <div id="scout-zero-selected" class="scout-zero-selected" hidden></div>
        <div id="scout-zero-results" class="scout-zero-results"></div>

        <div id="scout-zero-deliverable-row" class="scout-zero-field" hidden>
          <label class="scout-zero-label" for="scout-zero-deliverable">AMO Deliverable</label>
          <select id="scout-zero-deliverable"></select>
        </div>

        <button type="button" id="scout-zero-staff" class="scout-zero-staff">Staff</button>
        <div class="scout-zero-footer">
          <span id="scout-zero-cache-meta">SC cache not loaded</span>
          <span>v${escHtml(SCRIPT_VERSION)}</span>
        </div>
        <div id="scout-zero-status" class="scout-zero-status" data-tone="info"></div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById("scout-zero-styles")) return;
    const style = document.createElement("style");
    style.id = "scout-zero-styles";
    style.textContent = `
      :root {
        --scout-zero-panel-w: 390px;
        --scout-zero-bg: #ffffff;
        --scout-zero-ink: #121821;
        --scout-zero-muted: #5f6875;
        --scout-zero-line: #d9dee7;
        --scout-zero-accent: #12805c;
        --scout-zero-accent-dark: #0b5c43;
        --scout-zero-warm: #f4b84a;
        --scout-zero-soft: #f6f8fb;
        --scout-zero-danger: #b42318;
        --scout-zero-shadow: 0 18px 42px rgba(20, 28, 38, 0.22);
      }
      html.scout-zero-open body {
        padding-right: var(--scout-zero-panel-w) !important;
        transition: padding-right 160ms ease;
      }
      #scout-zero-toggle {
        position: fixed;
        right: 18px;
        top: 138px;
        z-index: 999999;
        min-width: 96px;
        height: 36px;
        border: 1px solid #0b5c43;
        border-radius: 8px;
        background: #0b5c43;
        color: #fff;
        font: 700 12px/1 Arial, sans-serif;
        letter-spacing: 0;
        cursor: pointer;
        box-shadow: 0 10px 24px rgba(12, 68, 49, 0.24);
      }
      #scout-zero-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: var(--scout-zero-panel-w);
        z-index: 999998;
        display: flex;
        flex-direction: column;
        background: var(--scout-zero-bg);
        color: var(--scout-zero-ink);
        border-left: 1px solid var(--scout-zero-line);
        box-shadow: var(--scout-zero-shadow);
        transform: translateX(104%);
        transition: transform 180ms ease;
        font-family: Arial, Helvetica, sans-serif;
      }
      #scout-zero-panel.open {
        transform: translateX(0);
      }
      .scout-zero-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 74px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--scout-zero-line);
        background: #101820;
      }
      .scout-zero-logo {
        max-width: 210px;
        max-height: 44px;
        object-fit: contain;
      }
      .scout-zero-close {
        width: 30px;
        height: 30px;
        border: 1px solid rgba(255,255,255,0.26);
        border-radius: 8px;
        background: rgba(255,255,255,0.08);
        color: #fff;
        cursor: pointer;
        font: 700 16px/1 Arial, sans-serif;
      }
      .scout-zero-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        overflow: auto;
      }
      .scout-zero-label {
        display: block;
        color: var(--scout-zero-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0;
      }
      .scout-zero-combobox {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 74px;
        gap: 8px;
      }
      #scout-zero-sc-input,
      #scout-zero-deliverable {
        width: 100%;
        min-height: 38px;
        box-sizing: border-box;
        border: 1px solid var(--scout-zero-line);
        border-radius: 8px;
        background: #fff;
        color: var(--scout-zero-ink);
        font: 13px/1.3 Arial, sans-serif;
        padding: 8px 10px;
      }
      #scout-zero-refresh {
        min-height: 38px;
        border: 1px solid var(--scout-zero-line);
        border-radius: 8px;
        background: var(--scout-zero-soft);
        color: var(--scout-zero-ink);
        cursor: pointer;
        font: 700 12px/1 Arial, sans-serif;
      }
      .scout-zero-results {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .scout-zero-result {
        width: 100%;
        min-height: 44px;
        border: 1px solid var(--scout-zero-line);
        border-radius: 8px;
        background: #fff;
        color: var(--scout-zero-ink);
        cursor: pointer;
        text-align: left;
        padding: 8px 10px;
      }
      .scout-zero-result:hover {
        border-color: var(--scout-zero-accent);
        background: #f1faf6;
      }
      .scout-zero-result-name,
      .scout-zero-card-name {
        display: block;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.25;
      }
      .scout-zero-result-meta,
      .scout-zero-card-meta {
        display: block;
        margin-top: 3px;
        color: var(--scout-zero-muted);
        font-size: 11px;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      .scout-zero-selected {
        border: 1px solid rgba(18, 128, 92, 0.35);
        border-radius: 8px;
        background: #eefaf4;
        padding: 10px;
      }
      .scout-zero-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .scout-zero-staff {
        width: 100%;
        min-height: 42px;
        border: 1px solid var(--scout-zero-accent-dark);
        border-radius: 8px;
        background: var(--scout-zero-accent);
        color: #fff;
        cursor: pointer;
        font: 800 13px/1 Arial, sans-serif;
      }
      .scout-zero-staff:hover {
        background: var(--scout-zero-accent-dark);
      }
      .scout-zero-footer {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--scout-zero-muted);
        font-size: 11px;
        border-top: 1px solid var(--scout-zero-line);
        padding-top: 10px;
      }
      .scout-zero-status,
      .scout-zero-empty {
        min-height: 18px;
        color: var(--scout-zero-muted);
        font-size: 12px;
        line-height: 1.35;
      }
      .scout-zero-status[data-tone="success"] {
        color: var(--scout-zero-accent-dark);
      }
      .scout-zero-status[data-tone="error"] {
        color: var(--scout-zero-danger);
      }
      .scout-zero-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 16, 24, 0.42);
      }
      .scout-zero-modal {
        width: min(360px, calc(100vw - 32px));
        border-radius: 8px;
        background: #fff;
        color: var(--scout-zero-ink);
        box-shadow: var(--scout-zero-shadow);
        padding: 18px;
        font-family: Arial, Helvetica, sans-serif;
      }
      .scout-zero-modal h3 {
        margin: 0 0 8px;
        font-size: 16px;
      }
      .scout-zero-modal p {
        margin: 0;
        color: var(--scout-zero-muted);
        font-size: 13px;
        line-height: 1.45;
      }
      .scout-zero-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .scout-zero-btn {
        min-height: 34px;
        border-radius: 8px;
        padding: 0 12px;
        cursor: pointer;
        font: 700 12px/1 Arial, sans-serif;
      }
      .scout-zero-btn-ghost {
        border: 1px solid var(--scout-zero-line);
        background: #fff;
        color: var(--scout-zero-ink);
      }
      .scout-zero-btn-primary {
        border: 1px solid var(--scout-zero-accent-dark);
        background: var(--scout-zero-accent);
        color: #fff;
      }
      @media (max-width: 720px) {
        :root {
          --scout-zero-panel-w: min(100vw, 390px);
        }
        html.scout-zero-open body {
          padding-right: 0 !important;
        }
        #scout-zero-toggle {
          right: 12px;
          top: auto;
          bottom: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function openPanel() {
    const panel = document.getElementById("scout-zero-panel");
    const toggle = document.getElementById("scout-zero-toggle");
    if (!panel) return;
    panel.classList.add("open");
    if (toggle) toggle.hidden = true;
    document.documentElement.classList.add("scout-zero-open");
    localStorage.setItem(PANEL_OPEN_KEY, "true");
    refreshDeliverableUi();
    refreshRosterCache(false);
  }

  function closePanel() {
    const panel = document.getElementById("scout-zero-panel");
    const toggle = document.getElementById("scout-zero-toggle");
    if (!panel) return;
    panel.classList.remove("open");
    if (toggle) toggle.hidden = false;
    document.documentElement.classList.remove("scout-zero-open");
    localStorage.setItem(PANEL_OPEN_KEY, "false");
  }

  function injectPanel(empName) {
    injectStyles();
    if (document.getElementById("scout-zero-panel")) return;

    const toggle = document.createElement("button");
    toggle.id = "scout-zero-toggle";
    toggle.type = "button";
    toggle.textContent = "SCOUT ZERO";
    toggle.title = "Open SCOUT ZERO";
    document.body.appendChild(toggle);

    const panel = document.createElement("div");
    panel.id = "scout-zero-panel";
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    toggle.addEventListener("click", openPanel);
    document.getElementById("scout-zero-close").addEventListener("click", closePanel);
    document.getElementById("scout-zero-refresh").addEventListener("click", () => refreshRosterCache(true));
    document.getElementById("scout-zero-sc-input").addEventListener("input", scheduleLookup);
    document.getElementById("scout-zero-sc-input").addEventListener("keydown", ev => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const rows = lookupRoster(ev.currentTarget.value);
        if (rows.length) selectRosterRowById(rows[0].id, rows[0].name);
      }
    });
    document.getElementById("scout-zero-deliverable").addEventListener("change", ev => {
      if (ev.currentTarget.value) syncDeliverableToForm(ev.currentTarget.value);
    });
    document.getElementById("scout-zero-staff").addEventListener("click", () => staffSelectedSc(empName));

    loadStoredRosterCache();
    renderDatalist(rosterCache.rows);
    setCacheMeta();
    refreshDeliverableUi();
    resumePendingStaffAction();

    if (localStorage.getItem(PANEL_OPEN_KEY) === "true") setTimeout(openPanel, 250);
    else setTimeout(() => refreshRosterCache(false), 500);
  }

  function getLookupValue(payload, fieldId) {
    if (!payload || typeof payload !== "object") return "";
    const value = payload[fieldId];
    if (value && typeof value === "object") return value.text || value.name || value.value || "";
    return value || "";
  }

  function lookupCurrentUserName(curUser) {
    if (!curUser) return "";
    try {
      const fields = nlapiLookupField("employee", curUser, ["entityid", "altname", "firstname", "lastname", "email"]) || {};
      const first = getLookupValue(fields, "firstname");
      const last = getLookupValue(fields, "lastname");
      return getLookupValue(fields, "altname") ||
        getLookupValue(fields, "entityid") ||
        [first, last].filter(Boolean).join(" ") ||
        getLookupValue(fields, "email") ||
        "";
    } catch (e) {
      console.warn(LOG_PREFIX, "Could not resolve current employee name:", e.message || e);
      return "";
    }
  }

  function waitForNlapi(cb, waited) {
    waited = waited || 0;
    if (typeof ns().nlapiGetUser !== "undefined" && typeof ns().nlapiSearchRecord !== "undefined") {
      cb();
    } else if (waited < 15000) {
      setTimeout(() => waitForNlapi(cb, waited + 300), 300);
    } else {
      console.warn(LOG_PREFIX, "Timed out waiting for NetSuite nlapi.");
    }
  }

  waitForNlapi(() => {
    if (!isScrPage()) return;
    let empName = "SCOUT ZERO User";
    try {
      empName = lookupCurrentUserName(nlapiGetUser()) || empName;
    } catch (e) {
      console.warn(LOG_PREFIX, "Unable to read current user:", e.message || e);
    }
    injectPanel(empName);
  });
})();
