// ==UserScript==
// @name         SC Calendar Dashboard Data Bridge
// @namespace    scm-tools-calendar-dashboard
// @version      27.0.0.3
// @description  Injects locally synced SC calendar data into the hosted staffing dashboard.
// @author       Michael Anderson
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html*
// @match        https://raw.githack.com/mcanderson14/ns_scm_tools_fy27/*/staffing-dashboard.html*
// @include      file://*/calendar-refresh.html*
// @include      file://*/staffing-dashboard.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

/* globals GM_getValue, GM_setValue, GM_deleteValue, GM_registerMenuCommand */

(function () {
	"use strict";

	const CACHE_KEY = "sc-calendar-dashboard-bridge-cache-v1";
	const DASHBOARD_FILE = "staffing-dashboard.html";
	const REFRESH_FILE = "calendar-refresh.html";

	function normalizeEmail(value) {
		return String(value || "").trim().toLowerCase();
	}

	function isDashboardPage() {
		return window.location.pathname.endsWith(`/${DASHBOARD_FILE}`) || window.location.pathname.endsWith(DASHBOARD_FILE);
	}

	function isRefreshPage() {
		return window.location.pathname.endsWith(`/${REFRESH_FILE}`) || window.location.pathname.endsWith(REFRESH_FILE);
	}

	function safeParseJson(value, fallback) {
		try {
			return JSON.parse(value);
		} catch {
			return fallback;
		}
	}

	function getStoredCache() {
		return safeParseJson(GM_getValue(CACHE_KEY, ""), null);
	}

	function setStoredCache(cache) {
		GM_setValue(CACHE_KEY, JSON.stringify(cache));
	}

	function buildCacheFromWindow() {
		const loadedEmails = Array.isArray(window.DIRECT_CONNECTOR_LOADED_EMAILS)
			? window.DIRECT_CONNECTOR_LOADED_EMAILS.map(normalizeEmail).filter(Boolean)
			: [];
		const availability = Array.isArray(window.DIRECT_CONNECTOR_AVAILABILITY) ? window.DIRECT_CONNECTOR_AVAILABILITY : [];
		const events = Array.isArray(window.DIRECT_CONNECTOR_EVENTS) ? window.DIRECT_CONNECTOR_EVENTS : [];
		const roster = Array.isArray(window.SC_STAFFING_IMPORTED_ROSTER) ? window.SC_STAFFING_IMPORTED_ROSTER : [];
		const warnings = Array.isArray(window.DIRECT_CONNECTOR_SYNC_WARNINGS) ? window.DIRECT_CONNECTOR_SYNC_WARNINGS : [];
		const metadata = window.DIRECT_CONNECTOR_SYNC_METADATA || {};
		const availabilityEmails = availability.map((snapshot) => normalizeEmail(snapshot.email)).filter(Boolean);
		const eventEmails = events.map((event) => normalizeEmail(event.email)).filter(Boolean);

		return {
			version: 1,
			source: "tampermonkey-calendar-dashboard-bridge",
			bridgeUpdatedAt: new Date().toISOString(),
			pageUrl: window.location.href,
			roster,
			loadedEmails: [...new Set([...loadedEmails, ...availabilityEmails, ...eventEmails])].sort(),
			availability,
			events,
			warnings,
			metadata,
		};
	}

	function hasUsefulCache(cache) {
		return Boolean(
			cache &&
				((Array.isArray(cache.loadedEmails) && cache.loadedEmails.length > 0) ||
					(Array.isArray(cache.availability) && cache.availability.length > 0) ||
					(Array.isArray(cache.events) && cache.events.length > 0) ||
					(Array.isArray(cache.roster) && cache.roster.length > 0))
		);
	}

	function storeCacheFromCurrentPage(reason = "page-load") {
		const cache = buildCacheFromWindow();

		if (!hasUsefulCache(cache)) {
			console.warn("SC Calendar Dashboard Bridge: no calendar cache data found on this page.");
			return false;
		}

		cache.reason = reason;
		setStoredCache(cache);
		console.info("SC Calendar Dashboard Bridge: stored local calendar cache.", {
			loadedEmails: cache.loadedEmails.length,
			availabilitySnapshots: cache.availability.length,
			events: cache.events.length,
			roster: cache.roster.length,
			bridgeUpdatedAt: cache.bridgeUpdatedAt,
		});
		return true;
	}

	function injectCacheIntoDashboard(cache) {
		if (!hasUsefulCache(cache)) {
			console.warn("SC Calendar Dashboard Bridge: no stored cache available for dashboard injection.");
			return;
		}

		const payload = JSON.stringify(cache).replace(/</g, "\\u003c");
		const script = document.createElement("script");
		script.textContent = `
(function () {
  const cache = ${payload};

  function preferBridgeArray(currentValue, bridgeValue) {
    if (Array.isArray(currentValue) && currentValue.length > 0) return currentValue;
    return Array.isArray(bridgeValue) ? bridgeValue : [];
  }

  function protectArrayGlobal(name, bridgeValue) {
    let value = Array.isArray(bridgeValue) ? bridgeValue : [];
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      get() {
        return value;
      },
      set(nextValue) {
        value = preferBridgeArray(nextValue, value);
      }
    });
  }

  function protectObjectGlobal(name, bridgeValue) {
    let value = bridgeValue && typeof bridgeValue === "object" ? bridgeValue : {};
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: true,
      get() {
        return value;
      },
      set(nextValue) {
        if (nextValue && typeof nextValue === "object" && Object.keys(nextValue).length > 0) {
          value = { ...value, ...nextValue };
        }
      }
    });
  }

  protectArrayGlobal("SC_STAFFING_IMPORTED_ROSTER", cache.roster);
  protectArrayGlobal("DIRECT_CONNECTOR_LOADED_EMAILS", cache.loadedEmails);
  protectArrayGlobal("DIRECT_CONNECTOR_AVAILABILITY", cache.availability);
  protectArrayGlobal("DIRECT_CONNECTOR_EVENTS", cache.events);
  protectArrayGlobal("DIRECT_CONNECTOR_SYNC_WARNINGS", cache.warnings);
  protectObjectGlobal("DIRECT_CONNECTOR_SYNC_METADATA", {
    ...(cache.metadata || {}),
    source: "tampermonkey-calendar-dashboard-bridge",
    bridgeUpdatedAt: cache.bridgeUpdatedAt,
    loadedEmails: Array.isArray(cache.loadedEmails) ? cache.loadedEmails.length : 0,
    availabilitySnapshots: Array.isArray(cache.availability) ? cache.availability.length : 0,
    events: Array.isArray(cache.events) ? cache.events.length : 0,
    roster: Array.isArray(cache.roster) ? cache.roster.length : 0
  });
  window.SCR_ASSISTANT_DASHBOARD_ASSET_SOURCE = {
    html: window.location.href,
    events: "tampermonkey-calendar-dashboard-bridge",
    bridgeUpdatedAt: cache.bridgeUpdatedAt
  };
})();`;

		(document.head || document.documentElement).appendChild(script);
		script.remove();
		console.info("SC Calendar Dashboard Bridge: injected local calendar cache.", {
			loadedEmails: cache.loadedEmails.length,
			availabilitySnapshots: cache.availability.length,
			events: cache.events.length,
			roster: cache.roster.length,
			bridgeUpdatedAt: cache.bridgeUpdatedAt,
		});
	}

	function showBridgeStatus() {
		const cache = getStoredCache();
		const message = hasUsefulCache(cache)
			? [
					"SC Calendar Dashboard Bridge cache is available.",
					`Loaded emails: ${cache.loadedEmails?.length || 0}`,
					`Availability snapshots: ${cache.availability?.length || 0}`,
					`Events: ${cache.events?.length || 0}`,
					`Roster rows: ${cache.roster?.length || 0}`,
					`Updated: ${cache.bridgeUpdatedAt || "unknown"}`,
				].join("\n")
			: "No SC Calendar Dashboard Bridge cache is stored yet. Open calendar-refresh.html after a sync to store it.";
		alert(message);
	}

	function registerMenuCommands() {
		GM_registerMenuCommand("SC Calendar Bridge: status", showBridgeStatus);
		GM_registerMenuCommand("SC Calendar Bridge: clear cache", () => {
			GM_deleteValue(CACHE_KEY);
			alert("SC Calendar Dashboard Bridge cache cleared.");
		});

		if (isRefreshPage() || isDashboardPage()) {
			GM_registerMenuCommand("SC Calendar Bridge: store cache from this page", () => {
				const stored = storeCacheFromCurrentPage("menu-command");
				alert(stored ? "Stored SC calendar cache for hosted dashboard use." : "No SC calendar cache data was found on this page.");
			});
		}
	}

	registerMenuCommands();

	if (isDashboardPage()) {
		injectCacheIntoDashboard(getStoredCache());
	}

	if (isRefreshPage()) {
		window.addEventListener("load", () => {
			window.setTimeout(() => {
				storeCacheFromCurrentPage("calendar-refresh-load");
			}, 500);
		});
	}
})();
