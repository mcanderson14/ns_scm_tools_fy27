// ==UserScript==
// @name         NetSuite SC Roster Calendar Refresh Helper
// @namespace    scm-tools-calendar-refresh
// @version      27.0.0.10
// @description  Copies the NetSuite SC roster saved search into the calendar refresh page.
// @author       Michael Anderson
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/netsuite-sc-roster-calendar-refresh.user.js
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/netsuite-sc-roster-calendar-refresh.user.js
// @include      https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl*searchid=1311451*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html*
// @match        https://raw.githack.com/mcanderson14/ns_scm_tools_fy27/*/calendar-refresh.html*
// @include      file://*/calendar-refresh.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM.openInTab
// @run-at       document-idle
// ==/UserScript==

/* globals GM_getValue, GM_setValue, GM_deleteValue, GM_registerMenuCommand, GM_setClipboard, GM_openInTab, GM */

(function () {
	"use strict";

	const GITHUB_PAGES_BASE_URL = "https://mcanderson14.github.io/ns_scm_tools_fy27";
	const DEFAULT_REFRESH_URL = `${GITHUB_PAGES_BASE_URL}/calendar-refresh.html`;
	const LEGACY_REFRESH_URL_RE = /(?:oracle-my\.sharepoint\.com\/.*\/calendar-refresh\.(?:html|aspx)|file:\/\/.*\/calendar-refresh\.html)/i;
	const REFRESH_URL_KEY = "netsuite-sc-roster-calendar-refresh-url-v1";
	const ROSTER_TRANSFER_KEY = "netsuite-sc-roster-calendar-refresh-roster-v1";
	const SEARCH_ID = "1311451";
	const NETSUITE_ROSTER_HOST = "nlcorp.app.netsuite.com";
	const NETSUITE_ROSTER_PATH = "/app/common/search/savedsearchresults.nl";
	const NETSUITE_ROSTER_PARAMS = {
		rectype: "1572",
		searchtype: "Custom",
		style: "REPORT",
		sortcol: "Custom_NAME_raw",
		sortdir: "ASC",
		csv: "HTML",
		OfficeXML: "F",
		size: "50",
		twbx: "F",
		report: "T",
		searchid: SEARCH_ID,
		dle: "T",
	};

	function normalizeHeader(value) {
		return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
	}

	function normalizeEmail(value) {
		return String(value || "").trim().toLowerCase();
	}

	function escapeHtml(value) {
		return String(value || "")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	function normalizeRefreshUrl(value) {
		const url = String(value || "").trim();
		if (!url || LEGACY_REFRESH_URL_RE.test(url)) return DEFAULT_REFRESH_URL;
		return url;
	}

	function getRefreshUrl() {
		return normalizeRefreshUrl(GM_getValue(REFRESH_URL_KEY, DEFAULT_REFRESH_URL));
	}

	function isCalendarRefreshPage() {
		return /calendar-refresh\.html$/i.test(window.location.pathname);
	}

	function isRosterSearchPage() {
		const url = new URL(window.location.href);
		if (url.hostname !== NETSUITE_ROSTER_HOST) return false;
		if (url.pathname !== NETSUITE_ROSTER_PATH) return false;
		return Object.entries(NETSUITE_ROSTER_PARAMS)
			.every(([key, value]) => url.searchParams.get(key) === value);
	}

	function setRefreshUrl() {
		const current = getRefreshUrl();
		const next = window.prompt("Calendar refresh page URL", current);
		if (!next) return;
		GM_setValue(REFRESH_URL_KEY, normalizeRefreshUrl(next));
		alert("Calendar refresh URL saved.");
	}

	function resetRefreshUrl() {
		GM_deleteValue(REFRESH_URL_KEY);
		alert(`Calendar refresh URL reset to the GitHub Pages refresh page.\n\n${DEFAULT_REFRESH_URL}`);
	}

	function getCellText(cell) {
		return String(cell?.innerText || cell?.textContent || "")
			.replace(/\u00a0/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}

	function getValue(row, indexes, key) {
		const index = indexes[key];
		return index >= 0 ? String(row[index] || "").trim() : "";
	}

	function findEmail(row) {
		const direct = row.find((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || "").trim()));
		if (direct) return normalizeEmail(direct);
		const joined = row.join(" ");
		const match = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
		return match ? normalizeEmail(match[0]) : "";
	}

	function inferNameFromEmail(email) {
		return normalizeEmail(email)
			.split("@")[0]
			.split(/[._-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(" ");
	}

	function extractStateFromOfficeLocation(value) {
		const text = String(value || "").trim();
		if (!text) return "";
		const match = text.match(/^US[-\s]+([A-Z]{2})$/i);
		if (match) return match[1].toUpperCase();
		const token = text.toUpperCase().split(/[^A-Z]+/).find((item) => /^[A-Z]{2}$/.test(item));
		return token || "";
	}

	function normalizeLegacyOrg(value) {
		const text = String(value || "").trim();
		if (/amo/i.test(text)) return "AMO";
		if (/direct/i.test(text)) return "Direct";
		return text || "Active SC";
	}

	function inferTimeZoneFromOfficeLocation(officeLocation, fallbackRegion = "") {
		const state = extractStateFromOfficeLocation(officeLocation);
		const timeZoneByState = {
			AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
			CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DC: "America/New_York",
			DE: "America/New_York", FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
			IA: "America/Chicago", ID: "America/Denver", IL: "America/Chicago", IN: "America/New_York",
			KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", MA: "America/New_York",
			MD: "America/New_York", ME: "America/New_York", MI: "America/New_York", MN: "America/Chicago",
			MO: "America/Chicago", MS: "America/Chicago", MT: "America/Denver", NC: "America/New_York",
			ND: "America/Chicago", NE: "America/Chicago", NH: "America/New_York", NJ: "America/New_York",
			NM: "America/Denver", NV: "America/Los_Angeles", NY: "America/New_York", OH: "America/New_York",
			OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
			SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago",
			UT: "America/Denver", VA: "America/New_York", VT: "America/New_York", WA: "America/Los_Angeles",
			WI: "America/Chicago", WV: "America/New_York", WY: "America/Denver",
		};
		if (state && timeZoneByState[state]) return timeZoneByState[state];
		const region = String(fallbackRegion || "").toLowerCase();
		if (/(pacific|west)/.test(region)) return "America/Los_Angeles";
		if (/mountain/.test(region)) return "America/Denver";
		if (/central/.test(region)) return "America/Chicago";
		if (/(east|eastern)/.test(region)) return "America/New_York";
		return "";
	}

	function parseTable(table) {
		const matrix = Array.from(table.querySelectorAll("tr"))
			.map((tr) => Array.from(tr.querySelectorAll("th,td")).map(getCellText))
			.filter((row) => row.some(Boolean));
		if (matrix.length < 2) return [];

		const headerIndex = matrix.findIndex((row) => {
			const headers = row.map(normalizeHeader);
			return headers.some((header) => ["email", "emailaddress", "emailadress", "workemail"].includes(header));
		});
		if (headerIndex < 0) return [];

		const headers = matrix[headerIndex].map(normalizeHeader);
		const aliases = {
			name: ["scnameconsultant", "name", "employee", "consultant", "solutionconsultant", "sc", "salesconsultant"],
			email: ["emailadress", "emailaddress", "email", "emailaddresswork", "workemail", "employeeemail"],
			title: ["jobtitle", "title"],
			manager: ["manager", "teammanager", "managerteamname", "managerteam", "teamname"],
			team: ["team", "teamname", "managerteamname", "managerteam", "manager"],
			industryFamily: ["industryfamily", "industyfamily", "industry", "industryvertical", "industrygroup"],
			legacyOrg: ["directamolegacy", "directoramo", "directamo", "legacydesignation", "legacy", "designation", "directamolegacydesignation", "directoramolegacydesignation"],
			region: ["region", "salesregion", "scregion"],
			officeLocation: ["officelocation", "office", "location", "state", "homestate"],
		};
		const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [
			key,
			headers.findIndex((header) => names.includes(header)),
		]));

		return matrix.slice(headerIndex + 1)
			.map((row) => {
				const email = normalizeEmail(getValue(row, indexes, "email") || findEmail(row));
				if (!email) return null;
				const manager = getValue(row, indexes, "manager");
				const team = getValue(row, indexes, "team") || manager || "NetSuite Roster";
				const officeLocation = getValue(row, indexes, "officeLocation");
				const region = getValue(row, indexes, "region");
				const state = extractStateFromOfficeLocation(officeLocation);
				return {
					name: getValue(row, indexes, "name") || inferNameFromEmail(email),
					email,
					title: getValue(row, indexes, "title"),
					manager,
					team,
					industryFamily: getValue(row, indexes, "industryFamily"),
					legacyOrg: normalizeLegacyOrg(getValue(row, indexes, "legacyOrg")),
					region,
					officeLocation,
					state,
					location: officeLocation || state,
					timeZone: inferTimeZoneFromOfficeLocation(officeLocation, region),
					source: `NetSuite saved search ${SEARCH_ID}`,
				};
			})
			.filter(Boolean);
	}

	function extractRoster() {
		const candidates = Array.from(document.querySelectorAll("table"))
			.map(parseTable)
			.filter((people) => people.length > 0)
			.sort((a, b) => b.length - a.length);
		const people = candidates[0] || [];
		return Array.from(new Map(people.map((person) => [person.email, person])).values())
			.sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
	}

	function buildRosterPayload() {
		const people = extractRoster();
		if (!people.length) {
			throw new Error("No SC roster rows with email addresses were found on this page.");
		}
		return {
			importedAt: new Date().toISOString(),
			source: window.location.href,
			people,
		};
	}

	function copyRosterJson() {
		try {
			const payload = buildRosterPayload();
			GM_setClipboard(JSON.stringify(payload, null, 2));
			showStatus(`Copied ${payload.people.length} roster rows as JSON.`, "good");
		} catch (error) {
			showStatus(error.message, "bad");
		}
	}

	function openInTab(url) {
		if (typeof GM !== "undefined" && GM?.openInTab) {
			GM.openInTab(url, { active: true, insert: true, setParent: true });
			return;
		}
		if (typeof GM_openInTab === "function") {
			GM_openInTab(url, { active: true, insert: true, setParent: true });
			return;
		}
		window.open(url, "_blank", "noopener,noreferrer");
	}

	function sendRosterToRefresh() {
		try {
			const payload = buildRosterPayload();
			GM_setValue(ROSTER_TRANSFER_KEY, JSON.stringify(payload));
			showStatus(`Sent ${payload.people.length} roster rows to calendar refresh.`, "good");
			openInTab(getRefreshUrl());
		} catch (error) {
			showStatus(error.message, "bad");
		}
	}

	function showStatus(message, tone = "") {
		const status = document.getElementById("scRosterCalendarRefreshStatus");
		if (!status) return;
		status.textContent = message;
		status.style.color = tone === "bad" ? "#a63a2d" : tone === "good" ? "#247244" : "#657383";
	}

	function addNetSuitePanel() {
		if (document.getElementById("scRosterCalendarRefreshPanel")) return;

		const panel = document.createElement("div");
		panel.id = "scRosterCalendarRefreshPanel";
		panel.innerHTML = `
			<div style="font-weight:850;margin-bottom:8px;">SC Calendar Refresh</div>
			<button type="button" id="scRosterSendRefresh" style="background:#c74634;border:1px solid #a63a2d;color:white;border-radius:7px;font-weight:850;padding:8px 10px;cursor:pointer;">Send roster to refresh</button>
			<button type="button" id="scRosterCopyJson" style="background:white;border:1px solid #d8e1e8;color:#1f2a33;border-radius:7px;font-weight:850;padding:8px 10px;cursor:pointer;margin-left:6px;">Copy roster JSON</button>
			<div id="scRosterCalendarRefreshStatus" style="margin-top:8px;color:#657383;font-size:12px;line-height:1.35;">Ready.</div>
		`;
		Object.assign(panel.style, {
			position: "fixed",
			right: "18px",
			bottom: "18px",
			zIndex: "2147483647",
			background: "white",
			color: "#1f2a33",
			border: "1px solid #d8e1e8",
			borderRadius: "8px",
			boxShadow: "0 10px 24px rgba(31,42,51,.18)",
			padding: "12px",
			fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
			fontSize: "13px",
			maxWidth: "360px",
		});
		document.body.appendChild(panel);
		document.getElementById("scRosterSendRefresh").addEventListener("click", sendRosterToRefresh);
		document.getElementById("scRosterCopyJson").addEventListener("click", copyRosterJson);

		const count = extractRoster().length;
		showStatus(count ? `${count} roster rows detected.` : "Open the SC roster saved search results before sending.");
	}

	function tryImportIntoRefreshPage() {
		const raw = GM_getValue(ROSTER_TRANSFER_KEY, "");
		if (!raw) return;

		let payload = null;
		try {
			payload = JSON.parse(raw);
		} catch {
			GM_deleteValue(ROSTER_TRANSFER_KEY);
			return;
		}
		if (!Array.isArray(payload?.people) || !payload.people.length) return;

		const importRoster = () => {
			const textarea = document.getElementById("netsuiteRosterText");
			const button = document.getElementById("importNetSuiteRosterButton");
			if (!textarea || !button) return false;
			textarea.value = JSON.stringify(payload, null, 2);
			textarea.dispatchEvent(new Event("input", { bubbles: true }));
			button.click();
			GM_deleteValue(ROSTER_TRANSFER_KEY);
			return true;
		};

		if (importRoster()) return;
		let tries = 0;
		const timer = window.setInterval(() => {
			tries += 1;
			if (importRoster() || tries > 20) {
				window.clearInterval(timer);
			}
		}, 250);
	}

	function registerMenuCommands() {
		GM_registerMenuCommand("SC roster helper: set calendar refresh URL", setRefreshUrl);
		GM_registerMenuCommand("SC roster helper: reset calendar refresh URL", resetRefreshUrl);
		GM_registerMenuCommand("SC roster helper: copy roster JSON", copyRosterJson);
		GM_registerMenuCommand("SC roster helper: send roster to refresh", sendRosterToRefresh);
	}

	registerMenuCommands();

	if (isCalendarRefreshPage()) {
		tryImportIntoRefreshPage();
	} else if (isRosterSearchPage()) {
		addNetSuitePanel();
	}
})();
