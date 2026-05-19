/*
 * SC Calendar Dashboard launch helper.
 *
 * Use this as a Tampermonkey @require in any NetSuite helper script that needs
 * to open the SC calendar dashboard:
 *
 * // @require https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-dashboard-launch-helper.js
 *
 * Then call:
 * window.SC_CALENDAR_DASHBOARD.open({
 *   consultant: "first.last@oracle.com",
 *   consultantName: "First Last",
 *   date: "2026-05-14",
 *   zone: "America/New_York",
 *   duration: 60,
 *   source: "my-tampermonkey-script"
 * });
 */
(function () {
	"use strict";

	const DEFAULT_DASHBOARD_URL = "https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html";

	function normalizeEmail(value) {
		return String(value || "").trim().toLowerCase();
	}

	function normalizeConsultant(value) {
		if (!value) {
			return null;
		}

		if (typeof value === "string") {
			const email = normalizeEmail(value);
			return email ? { email } : null;
		}

		const email = normalizeEmail(value.email || value.consultant || value.value);
		if (!email) {
			return null;
		}

		return {
			id: value.id || "",
			name: value.name || value.consultantName || value.label || email,
			email,
			manager: value.manager || "",
			team: value.team || "",
			legacyOrg: value.legacyOrg || value.legacy || value.industryFamily || "",
			location: value.location || value.officeLocation || value.state || "",
			timeZone: value.timeZone || value.zone || "",
			source: value.source || "",
		};
	}

	function normalizeConsultants(options) {
		const values = [];

		if (Array.isArray(options.consultants)) {
			values.push(...options.consultants);
		} else if (typeof options.consultants === "string") {
			values.push(...options.consultants.split(","));
		}

		if (options.consultant || options.email) {
			values.push({
				email: options.consultant || options.email,
				name: options.consultantName || options.name,
				manager: options.manager,
				team: options.team,
				legacyOrg: options.legacyOrg,
				location: options.location || options.officeLocation || options.state,
				timeZone: options.timeZone || options.zone,
				source: options.source,
			});
		}

		const peopleByEmail = new Map();
		values
			.map(normalizeConsultant)
			.filter(Boolean)
			.forEach((person) => {
				peopleByEmail.set(person.email, {
					...(peopleByEmail.get(person.email) || {}),
					...person,
				});
			});

		return Array.from(peopleByEmail.values());
	}

	function addParam(url, name, value) {
		if (value === undefined || value === null || value === "") {
			return;
		}

		url.searchParams.set(name, String(value));
	}

	function buildUrl(options = {}) {
		const url = new URL(options.dashboardUrl || DEFAULT_DASHBOARD_URL, window.location.href);
		const people = normalizeConsultants(options);
		const emails = people.map((person) => person.email).filter(Boolean);
		const roster = Array.isArray(options.roster) && options.roster.length > 0 ? options.roster : people;

		if (emails.length > 1) {
			url.searchParams.set("consultants", emails.join(","));
		} else if (emails.length === 1) {
			url.searchParams.set("consultant", emails[0]);
			addParam(url, "consultantName", people[0].name);
		}

		if (roster.length > 0) {
			url.searchParams.set("roster", JSON.stringify(roster));
		}

		addParam(url, "date", options.date);
		addParam(url, "zone", options.zone || options.timeZone);
		addParam(url, "duration", options.duration);
		addParam(url, "skill", options.skill);
		addParam(url, "source", options.source || "tampermonkey");

		return url.href;
	}

	function copyText(text) {
		if (typeof GM_setClipboard === "function") {
			GM_setClipboard(text);
			return Promise.resolve(true);
		}

		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			return navigator.clipboard.writeText(text).then(() => true);
		}

		return Promise.resolve(false);
	}

	async function open(options = {}) {
		const url = buildUrl(options);
		const result = {
			url,
			opened: false,
			method: "",
		};

		try {
			if (typeof GM !== "undefined" && GM && typeof GM.openInTab === "function") {
				await GM.openInTab(url, {
					active: true,
					insert: true,
					setParent: true,
				});
				result.opened = true;
				result.method = "GM.openInTab";
				return result;
			}
		} catch (error) {
			result.error = `GM.openInTab: ${error.message || error}`;
		}

		try {
			if (typeof GM_openInTab === "function") {
				GM_openInTab(url, {
					active: true,
					insert: true,
					setParent: true,
				});
				result.opened = true;
				result.method = "GM_openInTab";
				return result;
			}
		} catch (error) {
			result.error = [result.error, `GM_openInTab: ${error.message || error}`].filter(Boolean).join(" | ");
		}

		try {
			const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
			if (openedWindow) {
				result.opened = true;
				result.method = "window.open";
				return result;
			}
			result.error = [result.error, "window.open: popup blocked"].filter(Boolean).join(" | ");
		} catch (error) {
			result.error = [result.error, `window.open: ${error.message || error}`].filter(Boolean).join(" | ");
		}

		await copyText(url);
		return result;
	}

	window.SC_CALENDAR_DASHBOARD = Object.freeze({
		DEFAULT_DASHBOARD_URL,
		buildUrl,
		open,
		copyUrl: async (options = {}) => {
			const url = buildUrl(options);
			await copyText(url);
			return url;
		},
	});

	window.buildScCalendarDashboardUrl = buildUrl;
	window.openScCalendarDashboard = open;
})();
