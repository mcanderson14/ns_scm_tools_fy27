// ==UserScript==
// @name         SCR Mgr Assistant Toolbar BETA
// @namespace    scrmgrassistant
// @copyright    Copyright © 2024 by Ryan Morrissey
// @version      27.0.0.35B
// @description  Adds an Assistant Toolbar with interactive buttons to all SC Request forms.
// @icon         https://cdn0.iconfinder.com/data/icons/phosphor-bold-vol-3-1/256/lifebuoy-duotone-512.png
// @tag          productivity
// @tag          work
// @author       Ryan Morrissey (https://github.com/23maverick23)
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2840*&e=T*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2840*&custparam_record_id=*
// @match        https://nlcorp.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2840*&e=T*
// @match        https://nlcorp.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=2840*&custparam_record_id=*
// @icon         https://www.google.com/s2/favicons?domain=netsuite.com
// @require      https://code.jquery.com/jquery-3.6.0.js
// @require      https://cdn.jsdelivr.net/npm/fomantic-ui@2.9.3/dist/semantic.min.js
// @require      https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.3/waitForKeyElements.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @require      https://userscripts-mirror.org/scripts/source/107941.user.js
// @require      https://fomantic-ui.com/javascript/library/tablesort.js
// @resource     FOMANTIC_CSS https://cdn.jsdelivr.net/npm/fomantic-ui@2.9.3/dist/semantic.min.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM.openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      *
// @run-at       document-idle
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/scm-toolbar.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/scm-toolbar.js
// @supportURL   https://github.com/mcanderson14/ns_scm_tools_fy27/issues
// ==/UserScript==

/* globals $, jQuery */
/* globals GM, GM_config, GM_SuperValue, waitForKeyElements, GM_setClipboard, GM_openInTab, GM_xmlhttpRequest */
/* globals nlapiSearchRecord, nlapiGetFieldValue, nlapiSetFieldValue, nlapiGetFieldValues, nlapiSetFieldValues, nlapiGetUser, nlobjSearchFilter, nlobjSearchColumn, nlapiStringToDate */

/**
 * +========================================================================+
 * |                                                                        |
 * |    ######   ##        #######  ########     ###    ##        ######    |
 * |   ##    ##  ##       ##     ## ##     ##   ## ##   ##       ##    ##   |
 * |   ##        ##       ##     ## ##     ##  ##   ##  ##       ##         |
 * |   ##   #### ##       ##     ## ########  ##     ## ##        ######    |
 * |   ##    ##  ##       ##     ## ##     ## ######### ##             ##   |
 * |   ##    ##  ##       ##     ## ##     ## ##     ## ##       ##    ##   |
 * |    ######   ########  #######  ########  ##     ## ########  ######    |
 * |                                                                        |
 * +========================================================================+
 */

const CACHE_DURATION_MS = 21600000; // duration in milliseconds, currently 6 hours
const SCRIPT_PREFIX = "BETA_"; // remove this later
const SCRIPT_ID = `${SCRIPT_PREFIX}assistant_config`;
const SCRIPT_CACHE_ID = `${SCRIPT_PREFIX}people_cache`;
const SCRIPT_VERSION = GM_info.script.version;
const CONFIG_TITLE = `${GM_info.script.name} (v${SCRIPT_VERSION})`;
const CALENDAR_DASHBOARD_MAC_HOME_PATH = "/Users/michaean";
const CALENDAR_DASHBOARD_DEFAULT_URL =
	/Windows/i.test(navigator.userAgent)
		? "file:///C:/netsuite/scm_tools/staffing-dashboard.html"
		: `file://${CALENDAR_DASHBOARD_MAC_HOME_PATH}/netsuite/scm_tools/staffing-dashboard.html`;
const CALENDAR_LOCAL_SCRIPT_DEFAULT_URL =
	/Windows/i.test(navigator.userAgent)
		? "file:///C:/netsuite/scm_tools/direct-connector-events.js"
		: `file://${CALENDAR_DASHBOARD_MAC_HOME_PATH}/netsuite/scm_tools/direct-connector-events.js`;
const CALENDAR_FOCUSED_AVAILABILITY_OVERRIDES = {
	"eric.baghdasarian@oracle.com": {
		start: "2026-05-06T07:00:00.000Z",
		intervalMinutes: 30,
		view: "000000000000000022022222222222222220000000000000000000000000000012222222110000002222220000000000000000000000000022222222022200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000222220000222222222220000000000000000000000000001122000022222222222222222000000000000000000000000022112222222222222220000000000000000000000000000222222222222220220000000000000000000000000000000022000022002200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002222222222222222220000000000000222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222000000000000000012222222222220222200000000000000000000000000000022222222002200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000222200000000000000000000000000000000000022000000002200000000000000000000",
	},
};

/**
 * Simple wrapper for console logging
 * @return {object} console.log instance
 */
var shout = (function () {
	var context = `${GM_info.script.name} >> `;
	return Function.prototype.bind.call(console.log, console, context);
})();

// Script code
(function () {
	"use strict";

	var $ = jQuery.noConflict(true);

	/**
	 * +==================================================================================+
	 * |                                                                                  |
	 * |    ######   ##     ##       ######   #######  ##    ## ######## ####  ######     |
	 * |   ##    ##  ###   ###      ##    ## ##     ## ###   ## ##        ##  ##    ##    |
	 * |   ##        #### ####      ##       ##     ## ####  ## ##        ##  ##          |
	 * |   ##   #### ## ### ##      ##       ##     ## ## ## ## ######    ##  ##   ####   |
	 * |   ##    ##  ##     ##      ##       ##     ## ##  #### ##        ##  ##    ##    |
	 * |   ##    ##  ##     ##      ##    ## ##     ## ##   ### ##        ##  ##    ##    |
	 * |    ######   ##     ##       ######   #######  ##    ## ##       ####  ######     |
	 * |                                                                                  |
	 * +==================================================================================+
	 */

	// Init the GM settings page
	const configFieldDefs = {
		theme: {
			label: "Theme",
			type: "select",
			options: ["red", "orange", "yellow", "green", "blue", "purple", "pink"],
			default: "red",
			section: ["Appearance", "Change how the assistant bar looks."],
		},
		showGB: {
			label: "Show General Business cross-vertical button",
			type: "checkbox",
			default: true,
			section: ["Buttons", "Enable/disable specific buttons in the assistant bar."],
		},
		showPR: {
			label: "Show Products cross-vertical button",
			type: "checkbox",
			default: true,
		},
		showHT: {
			label: "Show High Tech / Tiger cross-vertical button",
			type: "checkbox",
			default: true,
		},
		showEPM: {
			label: "Show EPM cross-vertical button",
			type: "checkbox",
			default: true,
		},
		showCancel: {
			label: "Show Cancel button",
			type: "checkbox",
			default: true,
		},
		showHold: {
			label: "Show On Hold button",
			type: "checkbox",
			default: true,
		},
		filterMe: {
			label: 'Filter "Assigned To" using: SC Manager = Me',
			type: "checkbox",
			default: true,
			section: ["Filters", "Set filters for the Assign To field (filters are additive)."],
		},
		filterVertical: {
			label: 'Filter "Assigned To" using: SC Vertical = My Vertical',
			type: "checkbox",
			default: true,
		},
		filterTier: {
			label: 'Filter "Assigned To" using: SC Tier = My Tier',
			type: "checkbox",
			default: false,
		},
		filterDirector: {
			label: 'Filter "Assigned To" using: SC Director = <name|none>',
			type: "select",
			options: ["", "jeff", "karl", "rebecca", "robyn", "lauren", "rob"],
			default: "",
		},
		initials: {
			label: "Name/Initials for text comments",
			type: "text",
			size: 50,
			title: "Put your text into square brackets [] !",
			default: "[SC Mgr]",
			section: ["Personalization", "Personalize text comments with your name or initials in brackets."],
		},
		hashtags: {
			label: "Customize Hashtags (comma separated list: apples,bananas,carrots)",
			type: "textarea",
			default: "apples,bananas,carrots",
		},
		showDebug: {
			label: "Show Debug button in assistant bar",
			type: "checkbox",
			default: false,
			section: ["Experimental Settings", "Only change these if you know what you're doing."],
		},
		includeBodyOfWork: {
			label: "Include SC Body of Work lookup",
			type: "checkbox",
			default: false,
		},
		includeAvailability: {
			label: "Include SC engagement workload data in dropdown",
			type: "checkbox",
			default: false,
		},
		removeIndustry: {
			label: "Remove SCs with 0 or empty industry ratings",
			type: "checkbox",
			default: false,
		},
		sortAvailabilityBy: {
			label: 'Sort "Assigned To" dropdown by: ',
			type: "select",
			options: ["SC Name", "30 day load", "In Play"],
			default: "SC Name",
		},
		sortAvailabilityDirection: {
			label: '"Assigned To" dropdown sort direction: ',
			type: "select",
			options: ["Asc", "Desc"],
			default: "Asc",
		},
		cacheRefreshDelay: {
			label: "Refresh SC availability (and workload) data every N hour(s)",
			type: "select",
			options: ["1", "2", "3", "4", "6"],
			default: "6",
		},
		cacheDateTime: {
			label: "Date/time of last cache refresh",
			type: "text",
			size: 50,
			title: "This is for information purposes only.",
			default: "",
			save: false,
		},
		aiStaffing: {
			label: "AI Staffing",
			type: "checkbox",
			default: false,
		},
		calendarDashboardUrl: {
			label: "Calendar dashboard URL",
			type: "text",
			size: 100,
			default: CALENDAR_DASHBOARD_DEFAULT_URL,
			section: ["Integrations", "Configure external tools launched from the assistant bar."],
		},
		calendarLocalScriptUrl: {
			label: "Calendar local data script URL",
			type: "text",
			size: 100,
			default: CALENDAR_LOCAL_SCRIPT_DEFAULT_URL,
		},
		forceRefreshCache: {
			label: "Force cache refresh",
			type: "checkbox",
			save: false,
			default: false,
		},
	};

	let modalSettingForm = document.createElement("form");
	modalSettingForm.setAttribute("id", "scr-modal-settings-form");
	modalSettingForm.setAttribute("class", "ui overlay fullscreen form modal");
	document.body.appendChild(modalSettingForm);

	let frame = document.createElement("div");
	frame.setAttribute("class", "scrolling content");
	document.getElementById("scr-modal-settings-form").appendChild(frame);

	GM_registerMenuCommand(`${GM_info.script.name} Settings`, () => {
		openConfig();
	});

	let gmc = new GM_config({
		id: `${SCRIPT_ID}`,
		title: `${GM_info.script.name} ${GM_info.script.version}`,
		fields: configFieldDefs,
		frame: frame,
		events: {
			init: init,
			save: function (values) {
				if (values.forceRefreshCache) {
					GM_SuperValue.set(`${SCRIPT_CACHE_ID}`, null);
					GM_SuperValue.set(`${SCRIPT_CACHE_ID}_ts`, null);
				}

				if (confirm(`${GM_info.script.name} >> The page will now refresh for changes to take effect.`)) {
					location.reload();
				}
				GM_config.close();
			},
			close: onClose,
		},
	});

	function openSettingsModal() {
		// opens staffing modal form
		$("#scr-modal-settings-form")
			.modal({
				inverted: true,
				closable: false,
			})
			.modal("setting", "transition", "scale")
			.modal("show");

		/**
		 * These are just "quality of life" improvements to remove and restyle the settings panel
		 * from the gm_config script. There isn't a nicer way to remove and reset all the classnames
		 * to follow fomantic naming, so we will live with this mess for now...
		 */

		$(`#${SCRIPT_ID}`).attr("style", ""); // remove default form styling
		$(`#${SCRIPT_ID}_header`).attr("class", "ui center aligned large header"); // remove default header styling
		$(`#${SCRIPT_ID} .section_header.center`).attr("class", "ui header"); // remove default section header styling
		$(`#${SCRIPT_ID} .section_desc.center`).attr("class", "grey sub header"); // remove default section subheader styling
		$(`[id^=${SCRIPT_ID}_section_desc]`).each(function () {
			$(this).siblings("[id^=assistant_config_section_header]").append(this);
		});
		$(`#${SCRIPT_ID} .section_header_holder`).attr("class", "ui segment"); // remove default section styling
		$(`#${SCRIPT_ID} label`).attr("class", ""); // remove default label styling
		$(`#${SCRIPT_ID} select`)
			.attr("class", "ui fluid selection dropdown") // remove default class for select
			.parent()
			.closest("div")
			.attr("class", "inline field"); // remove default class for select
		$(`#${SCRIPT_ID} select`).dropdown({ clearable: true }); // convert select to fancy
		$(`#${SCRIPT_ID} input:checkbox`)
			.attr("class", "hidden") // remove default class for checkbox
			.parent()
			.closest("div")
			.attr("class", "ui toggle checkbox") // remove default class for checkbox
			.wrap('<div class="inline field"></div>');
		$(`#${SCRIPT_ID} input:radio`).attr("class", "hidden");
		$(`#${SCRIPT_ID} input:radio+label`).each(function () {
			$(this).prev().addBack().wrapAll('<div class="ui radio checkbox" />');
		});
		$(`.ui.radio.checkbox`)
			.parent()
			.closest("div")
			.attr("class", "field")
			.parent()
			.closest("div")
			.attr("class", "inline fields");
		$(`#${SCRIPT_ID} input:checkbox`).parent().closest("div").checkbox(); // convert checkbox to fancy
		$(`#${SCRIPT_ID}_saveBtn`).attr("class", "ui green button"); // remove default class for buttons
		$(`#${SCRIPT_ID}_closeBtn`).attr("class", "ui black button").html("Dismiss"); // remove default class for buttons
		$(`#${SCRIPT_ID}_cacheDateTime_var`).attr("class", "disabled field"); // make field disabled
		$(`#${SCRIPT_ID}_field_cacheDateTime`).attr("readonly", ""); // make cache date/time field read-only
	}

	function closeSettingsModal() {
		$("#scr-modal-settings-form").modal("hide");
	}

	function openConfig() {
		gmc.open();
		openSettingsModal();
	}

	function onClose() {
		// gmc.close();
		closeSettingsModal();
	}

	// Helper for whenPageReady function
	const PAGE_READY = {
		timeout: true,
		startTimer: null,
	};

	// Executes the callback after the page finishes loading
	// Using a MutationObserver, a timout is set every time a new mutation happens,
	// if either the elapsed time bewteen mutations is greater than intervalTime or
	// the full elapsed time is greater than maxWaitTime the callback is executed
	function whenPageReady(callback, intervalTime, maxWaitTime = 3000) {
		PAGE_READY.startTimer = Date.now();
		shout("Waiting for page to load");

		const observerCallback = (mutationList, observer) => {
			if (PAGE_READY.timeout) {
				clearTimeout(PAGE_READY.timeout);
				if (Date.now() - PAGE_READY.startTimer > maxWaitTime) {
					shout("Max wait time exceded, loading script anyway!");
					clearTimeout(PAGE_READY.timeout);
					PAGE_READY.timeout = null;
					observer.disconnect();
					callback();
				} else {
					PAGE_READY.timeout = setTimeout(() => {
						shout(`Page ready in ${Date.now() - PAGE_READY.startTimer}ms!`);
						clearTimeout(PAGE_READY.timeout);
						PAGE_READY.timeout = null;
						observer.disconnect();
						callback();
					}, intervalTime);
				}
			} else {
				observer.disconnect();
			}
		};
		const observer = new MutationObserver(observerCallback);
		observer.observe(document.documentElement, {
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	/**
	 * +=================================+
	 * |                                 |
	 * |   #### ##    ## #### ########   |
	 * |    ##  ###   ##  ##     ##      |
	 * |    ##  ####  ##  ##     ##      |
	 * |    ##  ## ## ##  ##     ##      |
	 * |    ##  ##  ####  ##     ##      |
	 * |    ##  ##   ###  ##     ##      |
	 * |   #### ##    ## ####    ##      |
	 * |                                 |
	 * +=================================+
	 */

	function init() {
		whenPageReady(() => {
			buildToolbarAndForms();
		}, 250);
	}

	/**
	 * +=======================================+
	 * |                                       |
	 * |   ##     ##    ###    #### ##    ##   |
	 * |   ###   ###   ## ##    ##  ###   ##   |
	 * |   #### ####  ##   ##   ##  ####  ##   |
	 * |   ## ### ## ##     ##  ##  ## ## ##   |
	 * |   ##     ## #########  ##  ##  ####   |
	 * |   ##     ## ##     ##  ##  ##   ###   |
	 * |   ##     ## ##     ## #### ##    ##   |
	 * |                                       |
	 * +=======================================+
	 */

	function buildToolbarAndForms() {
		var cacheTime = GM_SuperValue.get(`${SCRIPT_CACHE_ID}_ts`, null);

		if (cacheTime) {
			var cacheDate = new Date(cacheTime);
			gmc.set("cacheDateTime", cacheDate);
			shout("Cache date/time = " + cacheDate.toString());
		}

		// DEBUGGING
		// waitForKeyElements("#scr-modal-request-form", (element) => {
		//     doReloadForm();
		// });

		var fomantic_css = GM_getResourceText("FOMANTIC_CSS");
		// GM_addStyle(fomantic_css);

		// custom CSS overrides
		GM_addStyle(/* syntax: css */ `.ui.dimmer { background-color:rgba(0,0,0,.85) !important; }`);
		GM_addStyle(
			/* syntax: css */ `.ui.dropdown > .text > .description, .ui.dropdown .menu > .item > .description {color:rgba(0,0,0,0.7) !important};`,
		);
		GM_addStyle(/* syntax: css */ `#solutionconsultant span.text {font-size:10pt !important;}`);
		GM_addStyle(/* syntax: css */ `#solutionconsultant span.description {font-size:8pt !important;}`);
		GM_addStyle(/* syntax: css */ `.selection.dropdown .text.default {font-size:1em !important;}`);
		GM_addStyle(/* syntax: css */ `#sc-mgr-assistant {margin-bottom: 20px;}`);
		GM_addStyle(/* syntax: css */ `
            #scr-modal-calendar-dashboard .content {
                padding: 0 !important;
                height: calc(100vh - 145px);
                display: flex !important;
                flex-direction: column;
            }

            #scr-calendar-dashboard-fallback {
                display: none;
                margin: 0 !important;
                border-radius: 0 !important;
            }

            #scr-calendar-dashboard-frame {
                display: block;
                width: 100%;
                height: 100%;
                flex: 1 1 auto;
                min-height: 0;
                border: 0;
                background: #f4f6f8;
            }
        `);

		class Person {
			constructor(id, first, last, location, status, notes, restricted, email, manager, team, legacyOrg, weight, inplay) {
				this._id = id;
				this._first = first;
				this._last = last;
				this._location = location;
				this._status = status;
				this._notes = notes;
				this._restricted = restricted;
				this._email = email || "";
				this._manager = manager || "";
				this._team = team || "";
				this._legacyOrg = legacyOrg || "";
				this._weight = weight || 0;
				this._inplay = inplay || 0;
			}

			get id() {
				return this._id;
			}

			set id(value) {
				this._id = value;
			}

			get first() {
				return this._first;
			}

			set first(value) {
				this._first = value;
			}

			get last() {
				return this._last;
			}

			set last(value) {
				this._last = value;
			}

			get location() {
				return this._location;
			}

			set location(value) {
				this._location = value;
			}

			get status() {
				return this._status;
			}

			set status(value) {
				this._status = value;
			}

			get notes() {
				return this._notes;
			}

			set notes(value) {
				this._notes = value;
			}

			get restricted() {
				return this._restricted;
			}

			set restricted(value) {
				this._restricted = value;
			}

			get email() {
				return this._email;
			}

			set email(value) {
				this._email = value;
			}

			get manager() {
				return this._manager;
			}

			set manager(value) {
				this._manager = value;
			}

			get team() {
				return this._team;
			}

			set team(value) {
				this._team = value;
			}

			get legacyOrg() {
				return this._legacyOrg;
			}

			set legacyOrg(value) {
				this._legacyOrg = value;
			}

			get weight() {
				return this._weight;
			}

			set weight(value) {
				this._weight = value;
			}

			get inplay() {
				return this._inplay;
			}

			set inplay(value) {
				this._inplay = value;
			}

			_fullname() {
				return `${this.first} ${this.last}`;
			}

			get fullname() {
				return this._fullname();
			}

			_shortLocation() {
				const regex = /(^\w+-\w+)/;
				var locArray = this.location.split(regex);
				if (!locArray || locArray.length == 1) {
					return "";
				}
				return locArray[1];
			}

			get shortLocation() {
				return this._shortLocation();
			}

			_colorToEmoji(status) {
				let emoji;

				switch (status) {
					case "Red":
						emoji = "🔴";
						break;
					case "Yellow":
						emoji = "🟡";
						break;
					case "Green":
						emoji = "🟢";
						break;
					default:
						emoji = "❓";
						break;
				}

				return emoji;
			}

			/* Getters for buliding dropdown content */

			get name() {
				return `${this.fullname} (based in ${this.shortLocation})`;
			}

			get statusColor() {
				return this._colorToEmoji(this.status);
			}

			get value() {
				return this.id;
			}

			get description() {
				let template = `
                    <div class="list">
                        <div class="item">
                            ${
															settings.includeAvailability
																? `<div class="right floated content">
                                    <div class="header" style="font-weight:bold;text-align:right;">${this.weight}</div>
                                    <div class="description" style="text-align:right;">${this.inplay} in play</div>
                                </div>`
																: ""
														}
                            <div class="content">
                                <div class="header" style="font-weight:bold;">${this.statusColor} ${this.notes}</div>
                                <div class="description" style="font-style:italic;color:#db2828 !important;">${
																	this.restricted
																}</div>
                            </div>
                        </div>
                    </div>
                    `;
				return template;
			}
		}

		/**
		 * +==========================================================================+
		 * |                                                                          |
		 * |    ######  ######## ######## ######## #### ##    ##  ######    ######    |
		 * |   ##    ## ##          ##       ##     ##  ###   ## ##    ##  ##    ##   |
		 * |   ##       ##          ##       ##     ##  ####  ## ##        ##         |
		 * |    ######  ######      ##       ##     ##  ## ## ## ##   ####  ######    |
		 * |         ## ##          ##       ##     ##  ##  #### ##    ##        ##   |
		 * |   ##    ## ##          ##       ##     ##  ##   ### ##    ##  ##    ##   |
		 * |    ######  ########    ##       ##    #### ##    ##  ######    ######    |
		 * |                                                                          |
		 * +==========================================================================+
		 */

		const settings = {
			theme: gmc.get("theme"),
			showGB: gmc.get("showGB"),
			showPR: gmc.get("showPR"),
			showHT: gmc.get("showHT"),
			showEPM: gmc.get("showEPM"),
			showCancel: gmc.get("showCancel"),
			showHold: gmc.get("showHold"),
			filterMe: gmc.get("filterMe"),
			filterVertical: gmc.get("filterVertical"),
			filterTier: gmc.get("filterTier"),
			filterDirector: gmc.get("filterDirector"),
			initials: gmc.get("initials"),
			showDebug: gmc.get("showDebug"),
			includeAvailability: gmc.get("includeAvailability"),
			removeIndustry: gmc.get("removeIndustry"),
			sortAvailabilityBy: gmc.get("sortAvailabilityBy"),
			sortAvailabilityDirection: gmc.get("sortAvailabilityDirection"),
			includeBodyOfWork: gmc.get("includeBodyOfWork"),
			cacheRefreshDelay: gmc.get("cacheRefreshDelay"),
			forceRefreshCache: gmc.get("forceRefreshCache"),
			aiStaffing: gmc.get("aiStaffing"),
			calendarDashboardUrl: gmc.get("calendarDashboardUrl"),
			calendarLocalScriptUrl: gmc.get("calendarLocalScriptUrl"),
			cacheDateTime: gmc.get("cacheDateTime"),
			hashtags: gmc.get("hashtags"),
		};

		shout(settings);

		/**
		 * +=========================================================================================+
		 * |                                                                                         |
		 * |   ######## ######## ##     ## ########  ##          ###    ######## ########  ######    |
		 * |      ##    ##       ###   ### ##     ## ##         ## ##      ##    ##       ##    ##   |
		 * |      ##    ##       #### #### ##     ## ##        ##   ##     ##    ##       ##         |
		 * |      ##    ######   ## ### ## ########  ##       ##     ##    ##    ######    ######    |
		 * |      ##    ##       ##     ## ##        ##       #########    ##    ##             ##   |
		 * |      ##    ##       ##     ## ##        ##       ##     ##    ##    ##       ##    ##   |
		 * |      ##    ######## ##     ## ##        ######## ##     ##    ##    ########  ######    |
		 * |                                                                                         |
		 * +=========================================================================================+
		 */

		/**
		 * ######   ######   ######      ######  ######## ##    ## ##       ########
		 * ##    ## ##    ## ##    ##    ##    ##    ##     ##  ##  ##       ##
		 * ##       ##       ##          ##          ##      ####   ##       ##
		 * ##        ######   ######      ######     ##       ##    ##       ######
		 * ##             ##       ##          ##    ##       ##    ##       ##
		 * ##    ## ##    ## ##    ##    ##    ##    ##       ##    ##       ##
		 *  ######   ######   ######      ######     ##       ##    ######## ########
		 *
		 */

		// Set UI settings
		GM_addStyle(/* syntax: css */ `
            :root {
                --menu-color-red    : #C6463330; /* #db282830; */
                --menu-color-orange : #AD562B30; /* #f5a97f45; */
                --menu-color-yellow : #E2BF6B30; /* #eed49f70; */
                --menu-color-green  : #85B49730; /* #21ba4530; */
                --menu-color-blue   : #558DA230; /* #54c8ff30; */
                --menu-color-purple : #60698830; /* #673ab730; */
                --menu-color-pink   : #FB867530; /* #f5bde670; */

                --btn-color-red    : hsl(8, 59%, 49%); /* #C74634; */
                --btn-color-orange : hsl(20, 60%, 42%); /* #D39E5C; */
                --btn-color-yellow : hsl(42, 67%, 65%); /* #E2C06B; */
                --btn-color-green  : hsl(143, 24%, 61%); /* #86B596; */
                --btn-color-teal   : var(--btn-color-purple); /* hsl(176, 33%, 38%); */
                --btn-color-blue   : hsl(196, 31%, 48%); /* #81B2C3; */
                --btn-color-purple : hsl(227, 17%, 45%); /* #606988; */
                --btn-color-pink   : hsl(8, 94%, 72%); /* #FB8675; */
                --btn-color-black  : hsl(199, 40%, 35%); /* #36677D; */

                --btn-hover-color-red    : hsl(8, 59%, 30%);
                --btn-hover-color-orange : hsl(20, 60%, 30%);
                --btn-hover-color-yellow : hsl(42, 67%, 50%);
                --btn-hover-color-green  : hsl(143, 24%, 45%);
                --btn-hover-color-teal   : var(--btn-hover-color-purple) ; /* hsl(176, 33%, 20%); */
                --btn-hover-color-blue   : hsl(196, 31%, 30%);
                --btn-hover-color-purple : hsl(227, 17%, 35%);
                --btn-hover-color-pink   : hsl(8, 94%, 60%);
                --btn-hover-color-black  : hsl(199, 40%, 25%);
            }

            /* MAIN MENU */
            .ui.menu {
                box-shadow:0 1px 2px 0 rgba(34, 36, 38, 0.15) !important;
                background-color: var(--menu-color-${settings.theme}) !important;
                border-radius: 0 !important;
            }

            /* CHECKBOX TOGGLE */
            .ui.toggle.checkbox input:checked ~ label::before {
                background-color: var(--btn-color-blue) !important;
            }

            /* LINKS */
            .ui a {
                color: var(--nsn-uif-redwood-color-light-text-link) !important;
                fill: var(--nsn-uif-redwood-color-light-text-link) !important;
            }
            .ui a:hover {
                text-decoration: underline !important;
                color: var(--nsn-uif-redwood-color-light-text-link) !important;
                fill: var(--nsn-uif-redwood-color-light-text-link) !important;
            }

            /* PROGRESS BAR */
            .ui.indicating.progress[data-percent^="1"] .bar,
            .ui.indicating.progress[data-percent^="2"] .bar {
              background-color: #C74734 !important;
            }
            .ui.indicating.progress[data-percent^="3"] .bar {
              background-color: #AD562B !important;
            }
            .ui.indicating.progress[data-percent^="4"] .bar,
            .ui.indicating.progress[data-percent^="5"] .bar {
              background-color: #D39E5C !important;
            }
            .ui.indicating.progress[data-percent^="6"] .bar {
              background-color: #E2BF6B !important;
            }
            .ui.indicating.progress[data-percent^="7"] .bar,
            .ui.indicating.progress[data-percent^="8"] .bar {
              background-color: #86B598 !important;
            }
            .ui.indicating.progress[data-percent^="9"] .bar,
            .ui.indicating.progress[data-percent^="100"] .bar {
              background-color: #769C6E !important;
            }

            .ui.table td[class*="red marked"].left,
            .ui.table tr[class*="red marked"].left {
              box-shadow: 0.4em 0 0 0 #C74734 inset !important;
            }
            .ui.table td[class*="yellow marked"].left,
            .ui.table tr[class*="yellow marked"].left {
              box-shadow: 0.4em 0 0 0 #D39E5C inset !important;
            }
            .ui.table td[class*="green marked"].left,
            .ui.table tr[class*="green marked"].left {
              box-shadow: 0.4em 0 0 0 #86B598 inset !important;
            }

            /* STAR RATING */
            .ui.yellow.rating .active.icon {
              color: #E2BF6B !important;
              text-shadow: 0 -1px 0 #D39E5C, -1px 0 0 #D39E5C, 0 1px 0 #D39E5C, 1px 0 0 #D39E5C !important;
            }

            /* CUSTOM BUTTONS */
            .ui.red.button {
                background-color: var(--btn-color-red) !important;
                color: #fff !important;
            }
            .ui.red.button:hover {
                background-color: var(--btn-hover-color-red) !important;
            }
            .ui.orange.button {
                background-color: var(--btn-color-orange) !important;
                color: #fff !important;
            }
            .ui.orange.button:hover {
                background-color: var(--btn-hover-color-orange) !important;
            }
            .ui.yellow.button {
                background-color: var(--btn-color-yellow) !important;
                color: #fff !important;
            }
            .ui.yellow.button:hover {
                background-color: var(--btn-hover-color-yellow) !important;
            }
            .ui.green.button {
                background-color: var(--btn-color-green) !important;
                color: #fff !important;
            }
            .ui.green.button:hover {
                background-color: var(--btn-hover-color-green) !important;
            }
            .ui.teal.button {
                background-color: var(--btn-color-teal) !important;
                color: #fff !important;
            }
            .ui.teal.button:hover {
                background-color: var(--btn-hover-color-teal) !important;
            }
            .ui.blue.button,
            .ui.primary.button {
                background-color: var(--btn-color-blue) !important;
                color: #fff !important;
            }
            .ui.blue.button:hover,
            .ui.primary.button:hover {
                background-color: var(--btn-hover-color-blue) !important;
            }
            .ui.purple.button {
                background-color: var(--btn-color-purple) !important;
                color: #fff !important;
            }
            .ui.purple.button:hover {
                background-color: var(--btn-hover-color-purple) !important;
            }
            .ui.pink.button {
                background-color: var(--btn-color-pink) !important;
                color: #fff !important;
            }
            .ui.pink.button:hover {
                background-color: var(--btn-hover-color-pink) !important;
            }
            .ui.black.button {
                background-color: var(--btn-color-black) !important;
                color: #fff !important;
            }
            .ui.black.button:hover {
                background-color: var(--btn-hover-color-black) !important;
            }

            /* LOADER */
            .ui.ui.blue.elastic.loader::before,
            .ui.blue.basic.elastic.loading.button::before,
            .ui.blue.basic.elastic.loading.button::after,
            .ui.ui.ui.blue.elastic.loading:not(.segment):not(.segments):not(.card)::before,
            .ui.ui.ui.blue.elastic.loading .input > i.icon::before,
            .ui.ui.ui.ui.blue.elastic.loading > i.icon::before,
            .ui.ui.ui.ui.blue.loading:not(.usual):not(.button)::after,
            .ui.ui.ui.ui.blue.loading .input > i.icon::after,
            .ui.ui.ui.ui.blue.loading > i.icon::after,
            .ui.ui.ui.blue.loader::after {
              color: #558CA1 !important;
            }

            /* LEGEND ICONS */
            .orange.icon {
                color: var(--btn-color-orange) !important;
            }
            .blue.icon {
                color: var(--btn-color-blue) !important;
            }
            .green.icon {
                color: var(--btn-color-green) !important;
            }
            .teal.icon {
                color: var(--btn-color-teal) !important;
            }
            .yellow.icon {
                color: var(--btn-color-yellow) !important;
            }
            .red.icon {
                color: var(--btn-color-red) !important;
            }
            .black.icon {
                color: var(--btn-color-black) !important;
            }
        `);

		var btnMenuProducts = /* syntax: html */ `
            <div class="item">
                <div class="ui tiny buttons">
                    <button class="ui orange button" id="_xvertprodwest">PR West</button>
                    <div class="or"></div>
                    <button class="ui orange button" id="_xvertprodeast">PR East</button>
                </div>
            </div>
            `;
		var btnMenuGB = /* syntax: html */ `
            <div class="item">
                <div class="ui tiny buttons">
                    <button class="ui blue button" id="_xvertgbwest">GB West</button>
                    <div class="or"></div>
                    <button class="ui blue button" id="_xvertgbeast">GB East</button>
                </div>
            </div>
            `;
		var btnMenuHT = /* syntax: html */ `
            <div class="item">
                <div class="ui tiny buttons">
                    <button class="ui green button" id="_xvertht">High Tech</button>
                </div>
            </div>
            `;
		var btnMenuEPM = /* syntax: html */ `
            <div class="item">
                <div class="ui tiny buttons">
                    <button class="ui teal button" id="_xvertepm">EPM</button>
                </div>
            </div>
            `;
		var btnMenuHold = /* syntax: html */ `
            <button class="ui tiny yellow icon button" id="_onhold" data-tooltip="Place SCR on hold" data-position="bottom right">
                <i class="hand paper icon"></i>
            </button>
            `;
		var btnMenuCancel = /* syntax: html */ `
            <button class="ui tiny red icon button" id="_cancelled" data-tooltip="Mark SCR cancelled" data-position="bottom right">
                <i class="times circle icon"></i>
            </button>
            `;
		var btnMenuDebug = /* syntax: html */ `
            <button class="ui tiny gray icon button" id="_debug" data-tooltip="Open script interface" data-position="bottom right">
                <i class="bug icon"></i>
            </button>
            `;
		var legendTemplatePR = /* syntax: html */ `
            <div class='item'>
                <i class='orange stop icon'></i>
                <div class='content'>
                    <div class='header'>Products West</div>
                    <div class='description'>assigned to robyn</div>
                </div>
            </div>
            <div class='item'>
                <i class='orange stop icon'></i>
                <div class='content'>
                    <div class='header'>Products East</div>
                    <div class='description'>assigned to lauren</div>
                </div>
            </div>
            `;
		var legendTemplateGB = /* syntax: html */ `
            <div class='item'>
                <i class='blue stop icon'></i>
                <div class='content'>
                    <div class='header'>General Business West</div>
                    <div class='description'>assigned to rebecca</div>
                </div>
            </div>
            <div class='item'>
                <i class='blue stop icon'></i>
                <div class='content'>
                    <div class='header'>General Business East</div>
                    <div class='description'>assigned to karl</div>
                </div>
            </div>
            `;
		var legendTemplateHT = /* syntax: html */ `
            <div class='item'>
                <i class='green stop icon'></i>
                <div class='content'>
                    <div class='header'>High Tech, Tiger</div>
                    <div class='description'>assigned to jeff</div>
                </div>
            </div>
            `;
		var legendTemplateEPM = /* syntax: html */ `
            <div class='item'>
                <i class='teal stop icon'></i>
                <div class='content'>
                    <div class='header'>EPM</div><div
                    class='description'>assigned to jason</div>
                </div>
            </div>
            `;
		var legendTemplateEMG = /* syntax: html */ `
            <div class='item'>
                <i class='grey hashtag icon'></i>
                <div class='content'>
                    <div class='description'>for Emerging queue, add #emg to hashtags</div>
                </div>
            </div>
            `;
		var legendBtnTemplate = /* syntax: html */ `
            <div class='header'>Toolbar Legend</div>
            <div class='content'>
                <div class='ui small list'>
                    ${settings.showPR === true ? `${legendTemplatePR}` : ""}
                    ${settings.showGB === true ? `${legendTemplateGB}` : ""}
                    ${settings.showHT === true ? `${legendTemplateHT}` : ""}
                    ${settings.showEPM === true ? `${legendTemplateEPM}` : ""}
                </div>

                <div class='ui divider'></div>

                <div class='ui small list'>
                    ${legendTemplateEMG}
                </div>

                <div class='ui divider'></div>

                <div class='ui small list'>
                    <div class='item'>
                        <i class='yellow stop icon'></i>
                        <div class='content'>
                            <div class='header'>On Hold</div>
                            <div class='description'>assign to myself, status on hold</div>
                        </div>
                    </div>
                    <div class='item'>
                        <i class='red stop icon'></i>
                        <div class='content'>
                            <div class='header'>Cancel Request</div>
                            <div class='description'>both statuses cancelled, lead is false</div>
                        </div>
                    </div>
                    <div class='item'>
                        <i class='black stop icon'></i>
                        <div class='content'>
                            <div class='header'>Settings</div>
                            <div class='description'>change toolbar preferences</div>
                        </div>
                    </div>
                </div>
            </div>
            `;
		/**
		 *
		 * ########  #######   #######  ##       ########     ###    ########
		 *    ##    ##     ## ##     ## ##       ##     ##   ## ##   ##     ##
		 *    ##    ##     ## ##     ## ##       ##     ##  ##   ##  ##     ##
		 *    ##    ##     ## ##     ## ##       ########  ##     ## ########
		 *    ##    ##     ## ##     ## ##       ##     ## ######### ##   ##
		 *    ##    ##     ## ##     ## ##       ##     ## ##     ## ##    ##
		 *    ##     #######   #######  ######## ########  ##     ## ##     ##
		 *
		 */

		var btnMenu = /* syntax: html */ `
            <!-- SC Mgr Assistant -->
            <div class="ui menu" id="sc-mgr-assistant">
                <div class="header item">
                    <i class="big colored ${settings.theme} life ring icon"></i>
                    ${SCRIPT_PREFIX.length > 0 ? '<div class="floating ui black label">BETA</div>' : ""}
                    Assistant (v${SCRIPT_VERSION})
                </div>
                ${settings.showPR === true ? `${btnMenuProducts}` : ""}
                ${settings.showGB === true ? `${btnMenuGB}` : ""}
                ${settings.showHT === true ? `${btnMenuHT}` : ""}
                ${settings.showEPM === true ? `${btnMenuEPM}` : ""}
                <div class="item">
                    <button class="ui tiny pink labeled icon button" id="_staffmyteam" data-tooltip="Open quick assign form" data-position="bottom right">
                        <i class="users cog icon"></i>
                        Quick Assign
                    </button>
                </div>
                <div class="item">
                    <button class="ui tiny grey icon button" id="_legend" data-variation="small wide" data-position="right center" data-html="${legendBtnTemplate}">
                        <i class="question icon"></i>
                    </button>
                </div>
                <div class="right menu">
                    <div class="item">
                        <div class="ui icon buttons">
                            ${settings.showHold === true ? `${btnMenuHold}` : ""}

                            ${settings.showCancel === true ? `${btnMenuCancel}` : ""}
                        </div>
                    </div>

                    <div class="item">
                        <div class="ui icon buttons">
                            ${settings.showDebug === true ? `${btnMenuDebug}` : ""}

                            <button class="ui tiny black icon button" id="_settings" data-tooltip="Open settings form" data-position="bottom right">
                                <i class="cog circle icon"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
		function fldIndustryHTml(id, width) {
			return /* syntax: html */ `
                <div class="${width ? width : "sixteen"} wide required field">
                    <label>SC Industry</label>
                    <div class="ui fluid search selection clearable dropdown" id="${id}">
                        <input type="hidden" name="${id}">
                        <i class="dropdown icon"></i>
                        <div class="default text">Provide an SC Industry</div>
                        <div class="menu">
                            <div class="header">Agriculture</div>
                            <div class="item" data-value="9">Agriculture General (Agriculture)</div>
                            <div class="header">Business Services</div>
                            <div class="item" data-value="1">Advertising & Marketing (Business Services)</div>
                            <div class="item" data-value="4">Commercial Printing (Business Services)</div>
                            <div class="item" data-value="3">Custom Software & IT Services (IT VAR) (Business Services)</div>
                            <div class="item" data-value="108">Field Service Management in Business Services (Business Services)</div>
                            <div class="item" data-value="103">Franchise (Business Services) (Business Services)</div>
                            <div class="item" data-value="2">HR & Staffing (Business Services)</div>
                            <div class="item" data-value="8">Management Consulting (Business Services)</div>
                            <div class="item" data-value="6">Research & Development (Business Services)</div>
                            <div class="item" data-value="102">Security Products and Services (Business Services)</div>
                            <div class="header">Construction</div>
                            <div class="item" data-value="10">Architecture, Engineering & Design (Construction)</div>
                            <div class="item" data-value="109">Field Service Management in Construction (Construction)</div>
                            <div class="item" data-value="110">General Contractors (Construction)</div>
                            <div class="item" data-value="111">Real Estate Developer/Build (Construction)</div>
                            <div class="item" data-value="112">Specialty Trade (Construction)</div>
                            <div class="header">Consumer Services</div>
                            <div class="item" data-value="5">Consumer Services General (Consumer Services)</div>
                            <div class="item" data-value="104">Franchise (Consumer Services) (Consumer Services)</div>
                            <div class="header">Education</div>
                            <div class="item" data-value="11">Campus Bookstores (Education)</div>
                            <div class="item" data-value="12">Education General (Education)</div>
                            <div class="header">Energy, Utilities & Waste</div>
                            <div class="item" data-value="16">Energy, Utilities & Waste General (Energy, Utilities & Waste)</div>
                            <div class="item" data-value="106">Oil and Gas (Energy, Utilities & Waste)</div>
                            <div class="item" data-value="113">Solar (Energy, Utilities & Waste)</div>
                            <div class="header">Finance</div>
                            <div class="item" data-value="17">Cryptocurrency (Finance) (Finance)</div>
                            <div class="item" data-value="13">Financial Services General (Finance)</div>
                            <div class="item" data-value="14">Lending & Brokerage (Finance)</div>
                            <div class="item" data-value="15">Venture Capital & Private Equity (Finance)</div>
                            <div class="header">Government</div>
                            <div class="item" data-value="20">Government General (Government)</div>
                            <div class="header">Healthcare Services</div>
                            <div class="item" data-value="21">Federally Qualified Healthcare (FQHC) (Healthcare Services)</div>
                            <div class="item" data-value="22">Healthcare/Elderly/Veterinary Services (Healthcare Services)</div>
                            <div class="item" data-value="101">Life Sciences and Biotech (Healthcare) (Healthcare Services)</div>
                            <div class="item" data-value="24">Medical Laboratories & Imaging Centers (Healthcare Services)</div>
                            <div class="header">Holding Companies & Conglomerates</div>
                            <div class="item" data-value="25">Holding Companies & Conglomerates General (Holding Companies & Conglomerates)</div>
                            <div class="header">Hospitality</div>
                            <div class="item" data-value="114">Amusement Parks, Arcades & Attractions (Hospitality)</div>
                            <div class="item" data-value="27">Cultural & Informational Centers (Hospitality)</div>
                            <div class="item" data-value="105">Franchise (Hospitality) (Hospitality)</div>
                            <div class="item" data-value="29">Gambling & Gaming (Hospitality)</div>
                            <div class="item" data-value="30">Lodging & Resorts (Hospitality)</div>
                            <div class="item" data-value="31">Restaurants (Hospitality)</div>
                            <div class="item" data-value="32">Sports Teams & Leagues (Hospitality)</div>
                            <div class="header">Hospitals & Physicians Clinics</div>
                            <div class="item" data-value="33">Hospitals & Physicians Clinics & Dental Offices General (Hospitals & Physicians Clinics)</div>
                            <div class="header">Insurance</div>
                            <div class="item" data-value="36">Insurance General (Insurance)</div>
                            <div class="header">Law Firms & Legal Services</div>
                            <div class="item" data-value="37">Law Firms & Legal Services General (Law Firms & Legal Services)</div>
                            <div class="header">Manufacturing</div>
                            <div class="item" data-value="40">Aerospace & Defense (Manufacturing)</div>
                            <div class="item" data-value="115">Field Service Management in Manufacturing (Manufacturing)</div>
                            <div class="item" data-value="41">Food & Beverage (Manufacturing)</div>
                            <div class="item" data-value="107">Food & Beverage Meat & Seafood (Manufacturing)</div>
                            <div class="item" data-value="42">Industrial Machinery & Equipment (Manufacturing)</div>
                            <div class="item" data-value="43">Job Shop (Manufacturing)</div>
                            <div class="item" data-value="44">Life Sciences and Biotech (Mfg) (Manufacturing)</div>
                            <div class="item" data-value="45">Medical Devices & Equipment (Manufacturing)</div>
                            <div class="item" data-value="46">Pharmaceuticals (Manufacturing)</div>
                            <div class="item" data-value="47">Textiles & Apparel (Manufacturing)</div>
                            <div class="item" data-value="48">Wholesale (Mfg) (Manufacturing)</div>
                            <div class="header">Media & Internet</div>
                            <div class="item" data-value="50">Broadcasting (Media & Internet)</div>
                            <div class="item" data-value="49">Media & Internet (Media & Internet)</div>
                            <div class="item" data-value="52">Motion Picture and Sound Recording (Media & Internet)</div>
                            <div class="item" data-value="51">Promotional Products (Media & Internet)</div>
                            <div class="item" data-value="53">Publishing (Media & Internet)</div>
                            <div class="header">Minerals & Mining</div>
                            <div class="item" data-value="54">Minerals & Mining General (Minerals & Mining)</div>
                            <div class="header">Organizations</div>
                            <div class="item" data-value="116">Community Development Financial Institutions (Organizations)</div>
                            <div class="item" data-value="118">Cultural & Performing Arts Organizations (Organizations)</div>
                            <div class="item" data-value="56">Donation Centers (Foodbanks/Goodwills) (Organizations)</div>
                            <div class="item" data-value="117">Membership Organizations (Organizations)</div>
                            <div class="item" data-value="57">Non-Profit & Charitable Foundations (Organizations)</div>
                            <div class="item" data-value="119">Non-Profit Education (Organizations)</div>
                            <div class="item" data-value="58">Religious Organizations (Organizations)</div>
                            <div class="header">Real Estate</div>
                            <div class="item" data-value="121">Property Management (Real Estate)</div>
                            <div class="item" data-value="59">Real Estate General (Real Estate)</div>
                            <div class="header">Retail</div>
                            <div class="item" data-value="61">Apparel & Accessories Retail (Retail)</div>
                            <div class="item" data-value="62">Automobile Deals (Retail)</div>
                            <div class="item" data-value="63">Automobile Part Stores (Retail)</div>
                            <div class="item" data-value="64">Convenience Stores, Gas Stations & Liquor Stores (Retail)</div>
                            <div class="item" data-value="65">Drug Stores & Pharmacies (Retail)</div>
                            <div class="item" data-value="66">Franchise (Retail) (Retail)</div>
                            <div class="item" data-value="67">Grocery Retail (Retail)</div>
                            <div class="item" data-value="68">Home Improvement & Hardware Retail (Retail)</div>
                            <div class="item" data-value="69">Vitamins, Supplements & Health Stores (Retail)</div>
                            <div class="item" data-value="70">Wholesale (Retail) (Retail)</div>
                            <div class="header">Software</div>
                            <div class="item" data-value="72">Cryptocurrency (Software) (Software)</div>
                            <div class="item" data-value="77">Platform (Software)</div>
                            <div class="item" data-value="71">Software General (Software)</div>
                            <div class="item" data-value="73">Software with Inventory, Usage, Subscriptions (Software)</div>
                            <div class="header">Telecommunications</div>
                            <div class="item" data-value="74">Telecommunications General (Telecommunications)</div>
                            <div class="header">Transportation</div>
                            <div class="item" data-value="122">Airlines, Airports, and Air Services (Transportation)</div>
                            <div class="item" data-value="76">Freight & Logistics Services (Transportation)</div>
                            <div class="item" data-value="75">Transportation General (Transportation)</div>
                        </div>
                    </div>
                </div>
                `;
		}

		/**
		 *
		 * ##     ##  #######  ########     ###    ##          ########  #######  ########  ##     ##
		 * ###   ### ##     ## ##     ##   ## ##   ##          ##       ##     ## ##     ## ###   ###
		 * #### #### ##     ## ##     ##  ##   ##  ##          ##       ##     ## ##     ## #### ####
		 * ## ### ## ##     ## ##     ## ##     ## ##          ######   ##     ## ########  ## ### ##
		 * ##     ## ##     ## ##     ## ######### ##          ##       ##     ## ##   ##   ##     ##
		 * ##     ## ##     ## ##     ## ##     ## ##          ##       ##     ## ##    ##  ##     ##
		 * ##     ##  #######  ########  ##     ## ########    ##        #######  ##     ## ##     ##
		 *
		 */

		var modalContentRequestForm = /* syntax: html */ `
            <!-- Staff My Team Modal and Form -->
            <form class="ui form overlay fullscreen modal" id="scr-modal-request-form">
                <i class="close icon"></i>
                <div style="padding-top: 8px;background-image: url('/assets/@uif-js/component/6.0.38/resources/img/systemheader/color-strip-netsuite.png');background-repeat: repeat-x;background-position: left top;"></div>
                <div class="header">SC Request Quick Assign Form</div>
                <div class="scrolling content">

                    <!-- Start Grid -->
                    <div class="ui two column grid">

                        <!-- Column One -->
                        <div class="eleven wide column">

                            <!-- SC Assign -->
                            <div class="fields">
                                <div class="nine wide required field">
                                    <label>Assign To (Employee)</label>
                                    <div class="ui fluid search selection dropdown" id="solutionconsultant">
                                        <input type="hidden" name="solutionconsultant">
                                        <div class="text">Choose an SC</div>
                                        <i class="dropdown icon"></i>
                                    </div>
                                </div>

                                <!-- Assign As Lead -->
                                <div class="three wide field">
                                    <div class="ui toggle checkbox">
                                        <input type="checkbox" name="islead" id="islead" tabindex="0" class="hidden" checked>
                                        <label>Lead SC</label>
                                    </div>
                                </div>

                                <div class="four wide required field">
                                    <label>Date SC Needed</label>
                                    <div class="ui calendar" id="dateneeded">
                                        <div class="ui fluid input left icon" >
                                            <i class="calendar icon"></i>
                                            <input type="text" placeholder="Date SC Needed" name="dateneeded">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Outlook Availability Prompt -->
                            <div class="fields">
                                <div class="sixteen wide field">
                                    <button type="button" class="ui tiny blue labeled icon button" id="copycalendarprompt">
                                        <i class="calendar alternate outline icon"></i>
                                        Copy Outlook Availability Prompt
                                    </button>
                                    <button type="button" class="ui tiny teal labeled icon button" id="opencalendardashboard">
                                        <i class="calendar check outline icon"></i>
                                        Open Calendar Dashboard
                                    </button>
                                    <span id="calendarpromptstatus" style="margin-left:8px;color:#666;"></span>
                                </div>
                            </div>

                            <!-- Request Details Addendum -->
                            <div class="field">
                                <label>SC Request Details Addendum</label>
                                <textarea rows="3" name="screquestdetailsadd" id="screquestdetailsadd" placeholder="Text to prepend to the beginning of the SC Request Details on Save..."></textarea>
                            </div>

                            <div class="fields">
                                ${fldIndustryHTml("scmindustry", "twelve")}

                                <div class="four wide required field">
                                    <label>Proposed SKU</label>
                                    <div class="ui fluid search selection clearable dropdown" id="scmsku">
                                        <input type="hidden" name="scmsku">
                                        <i class="dropdown icon"></i>
                                        <div class="default text">Choose a SKU</div>
                                        <div class="menu">
                                            <div class="header">General Business</div>
                                            <div class="item" data-value="Finance">Finance</div>
                                            <div class="item" data-value="Healthcare">Healthcare</div>
                                            <div class="item" data-value="Non-Profit">Non-Profit</div>
                                            <div class="header">Products</div>
                                            <div class="item" data-value="WD">WD</div>
                                            <div class="item" data-value="MFG">MFG</div>
                                            <div class="item" data-value="F&B">F&B</div>
                                            <div class="item" data-value="H&B">H&B</div>
                                            <div class="item" data-value="Retail">Retail</div>
                                            <div class="header">High Tech</div>
                                            <div class="item" data-value="Project Based">Project Based</div>
                                            <div class="item" data-value="Services">Services</div>
                                            <div class="item" data-value="XaaS">XaaS</div>
                                            <div class="item" data-value="Software">Software</div>
                                            <div class="item" data-value="Agency">Agency</div>
                                            <div class="item" data-value="Media">Media</div>
                                            <div class="item" data-value="Telco">Telco</div>
                                            <div class="header">Other</div>
                                            <div class="item" data-value="Starter">Starter</div>
                                            <div class="item" data-value="SuiteProjects Pro">SuiteProjects Pro</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="three fields">
                                <div class="field">
                                    <label>Potential Integrations</label>
                                    <input type="text" name="scmaddons" placeholder="List systems">
                                </div>
                                <div class="field">
                                    <label>Partners</label>
                                    <input type="text" name="scmpartners" placeholder="Required or known partner(s)">
                                </div>
                                <div class="field">
                                    <label>Competitors</label>
                                    <input type="text" name="scmcompetitors" placeholder="Incumbent or competitor(s)">
                                </div>
                            </div>

                            <div class="fields">
                                <!-- Hashtags -->
                                <div class="six wide field">
                                    <label>Add #hashtags</label>
                                    <div class="ui fluid multiple search selection dropdown" id="hashtags">
                                        <input type="hidden" name="hashtags">
                                        <i class="dropdown icon"></i>
                                        <div class="default text">Add hashtags</div>
                                        <div class="menu">
                                            ${createHashtags()}
                                        </div>
                                    </div>
                                </div>

                                <!-- Products -->
                                <div class="ten wide field">
                                    <label>Products</label>
                                    <div class="ui fluid multiple three column search selection dropdown" id="products">
                                        <input type="hidden" name="products">
                                        <i class="dropdown icon"></i>
                                        <div class="default text">Add product(s)</div>
                                        <div class="menu">
                                            <div class="item" data-value="1">ACS</div>
                                            <div class="item" data-value="2">Advanced Electronic Bank Payments</div>
                                            <div class="item" data-value="3">Advanced Manufacturing</div>
                                            <div class="item" data-value="4">Advanced Order Management</div>
                                            <div class="item" data-value="5">AP Automation</div>
                                            <div class="item" data-value="6">Bill Capture</div>
                                            <div class="item" data-value="55">Compliance 360</div>
                                            <div class="item" data-value="7">CPQ</div>
                                            <div class="item" data-value="8">Demand Planning</div>
                                            <div class="item" data-value="9">Disaster Recovery</div>
                                            <div class="item" data-value="10">Dunning</div>
                                            <div class="item" data-value="53">E-Invoicing</div>
                                            <div class="item" data-value="11">Edition</div>
                                            <div class="item" data-value="12">EPM FCC</div>
                                            <div class="item" data-value="13">EPM FF</div>
                                            <div class="item" data-value="14">EPM NR</div>
                                            <div class="item" data-value="15">EPM NSAR</div>
                                            <div class="item" data-value="16">EPM NSPB</div>
                                            <div class="item" data-value="17">EPM PCM</div>
                                            <div class="item" data-value="18">EPM Tax</div>
                                            <div class="item" data-value="19">Field Service Management</div>
                                            <div class="item" data-value="20">Financial Management</div>
                                            <div class="item" data-value="21">Fixed Asset Management</div>
                                            <div class="item" data-value="22">Incentive Compensation</div>
                                            <div class="item" data-value="23">Inventory Management</div>
                                            <div class="item" data-value="24">LCS</div>
                                            <div class="item" data-value="25">NS Connector</div>
                                            <div class="item" data-value="54">NS Pay</div>
                                            <div class="item" data-value="26">NS POS</div>
                                            <div class="item" data-value="27">NSAW</div>
                                            <div class="item" data-value="57">NSIP</div>
                                            <div class="item" data-value="28">OneWorld</div>
                                            <div class="item" data-value="30">Other</div>
                                            <div class="item" data-value="31">Payroll</div>
                                            <div class="item" data-value="32">Procurement</div>
                                            <div class="item" data-value="33">Quality Management</div>
                                            <div class="item" data-value="34">Rebate Management</div>
                                            <div class="item" data-value="35">Revenue Management</div>
                                            <div class="item" data-value="36">Sandbox</div>
                                            <div class="item" data-value="37">Smart Count</div>
                                            <div class="item" data-value="52">Subsidiaries</div>
                                            <div class="item" data-value="38">SuiteAnalytics Connect</div>
                                            <div class="item" data-value="39">SuiteBilling</div>
                                            <div class="item" data-value="40">SuiteCloud Plus</div>
                                            <div class="item" data-value="41">SuiteCommerce</div>
                                            <div class="item" data-value="42">SuiteCommerce Instore</div>
                                            <div class="item" data-value="43">SuiteCommerce MyAccount</div>
                                            <div class="item" data-value="44">SuitePeople</div>
                                            <div class="item" data-value="56">SuiteProcurement</div>
                                            <div class="item" data-value="45">SuiteProjects</div>
                                            <div class="item" data-value="29">SuiteProjects Pro (OpenAir)</div>
                                            <div class="item" data-value="46">Tier</div>
                                            <div class="item" data-value="47">Users</div>
                                            <div class="item" data-value="48">WFM</div>
                                            <div class="item" data-value="49">WIP and Routings</div>
                                            <div class="item" data-value="50">WMS</div>
                                            <div class="item" data-value="51">Work Orders and Assemblies</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="fields">
                                <div class="sixteen wide field">
                                    <label>Red Flags</label>
                                    <input type="text" name="scmredflags" placeholder="Red flags or cautions">
                                </div>
                            </div>

                            ${
															settings.includeBodyOfWork
																? `
                            <h4 class="ui horizontal left aligned divider header">
                                <i class="tools icon"></i>
                                Product Skills Search Ranking
                            </h4>

                            <div class="ui basic segment">
                                <!-- Dimmer and Loader -->
                                <div class="ui dimmer" id="tableSkillsLoader">
                                    <div class="ui indeterminate blue elastic text loader">Gathering and Ranking Skills</div>
                                </div>

                                <!-- TOP Help text -->
                                <div class="ui top attached secondary segment" style="border-top: 2px solid var(--btn-color-blue)">
                                    <p><i class="question circle icon"></i> Need help narrowing down an SC? Select at least one (1) Product above, and optionally set an SC Industry, to search and rank Body of Work data below. Use the filters to control which SCs should be considered.</p>
                                </div>

                                <!-- MIDDLE Filters and buttons -->
                                <div class="ui attached segment">
                                    <div class="fields">
                                        <div class="field">
                                            <label>My Team</label>
                                            <select class="ui fluid clearable dropdown" name="skillfilter-myteam" id="skillfilter-myteam">
                                                <option value="">Limit to my team</option>
                                                <option value="T">Yes</option>
                                                <option value="F">No</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>SC Vertical</label>
                                            <select class="ui fluid clearable dropdown" multiple="" name="skillfilter-scvertical" id="skillfilter-scvertical">
                                                <option value="">Filter SC vertical</option>
                                                <option value="5">General Business</option>
                                                <option value="58">Products</option>
                                                <option value="57">High Tech</option>
                                                <option value="45">Tiger</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>SC Director</label>
                                            <select class="ui fluid clearable dropdown" name="skillfilter-scdirector" id="skillfilter-scdirector">
                                                <option value="">Filter SC director</option>
                                                <option value="karl">Karl</option>
                                                <option value="rebecca">Rebecca</option>
                                                <option value="lauren">Lauren</option>
                                                <option value="robyn">Robyn</option>
                                                <option value="jeff">Jeff</option>
                                                <option value="rob">Rob</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>SC Tier</label>
                                            <select class="ui fluid clearable dropdown" multiple="" name="skillfilter-sctier" id="skillfilter-sctier">
                                                <option value="">Filter SC tier</option>
                                                <option value="29">LMM</option>
                                                <option value="28">MM/Corp</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>SC Region</label>
                                            <select class="ui fluid clearable dropdown" multiple="" name="skillfilter-scregion" id="skillfilter-scregion">
                                                <option value="">Filter SC region</option>
                                                <option value="48">East</option>
                                                <option value="49">Central</option>
                                                <option value="50">West</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>Results Sorting</label>
                                            <select class="ui fluid dropdown" name="skillfilter-sorting" id="skillfilter-sorting">
                                                <option value="ias">Industry > Availability > Skills</option>
                                                <option value="ais">Availability > Industry > Skills</option>
                                                <option value="sia">Skills > Industry > Availability</option>
                                            </select>
                                        </div>

                                        <div class="field">
                                            <label>Skills Operator</label>
                                            <select class="ui fluid dropdown" name="skillfilter-operator" id="skillfilter-operator">
                                                <option value="any">Has ANY skills</option>
                                                <option value="all">Has ALL skills</option>
                                            </select>
                                        </div>

                                    </div>

                                        <div class="ui blue button" id="productskillsearch"><i class="icon search"></i>Search Skills</div>
                                        <div class="ui teal disabled button" id="openselectedskillcalendars"><i class="calendar check outline icon"></i>Open Selected Calendars</div>

                                </div>

                                <!-- BOTTOM Main table -->
                                <div class="ui bottom attached segment">

                                    <table id="bodyofwork" class="ui compact small selectable sortable celled table"></table>

                                </div>

                            </div>
                            `
																: ""
														}


                        </div>

                        <!-- Column Two -->
                        <div class="five wide column">

                            <!-- Opp Details -->
                            ${getRequestMetadataHtml()}

                            ${
															settings.aiStaffing === true
																? `
                            <div id="ai-request-summary-btn" class="ui top attached button" tabindex="0"><i class="brain icon"></i> AI Staffing Suggestion</div>
                            <div id="ai-request-summary-output" class="ui attached segment">
                                <p>Ensure LM Studio model is loaded and available...</p>
                            </div>
                                `
																: ""
														}

                            <!-- Request Details -->
                            <div class="field">
                                <label>SC Request Details</label>
                                <textarea rows="20" name="screquestdetails" id="screquestdetails" readonly="" style="background-color:lightgray;"></textarea>
                            </div>

                            <!-- FLM Notes -->
                            <div class="field">
                                <label>Sales Manager Notes</label>
                                <textarea rows="5" name="salesmanagernotes" id="salesmanagernotes" readonly="" style="background-color:lightgray;"></textarea>
                            </div>

                            <!-- LAUNCHPAD -->
                            <div class="ui accordion field">
                                <div class="title">
                                    <i class="icon dropdown"></i>
                                    Toggle Launchpad Information
                                </div>
                                <div class="content">
                                    <div class="field">
                                        <label>Qualifying Questions</label>
                                        <textarea rows="20" name="launchpadqual" id="launchpadqual" readonly="" style="background-color:lightgray;"></textarea>
                                    </div>
                                    <div class="field">
                                        <label>Launchpad Notes</label>
                                        <textarea rows="5" name="launchpadnotes" id="launchpadnotes" readonly="" style="background-color:lightgray;"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- End Grid -->

                </div>
                <div class="actions">
                    <button type="submit" class="ui green approve button" id="submitform">Apply Changes</button>
                    <div class="ui reset button">Reset</div>
                    <div class="ui black deny button">Dismiss</div>
                </div>
            </form>
            `;
		/**
		 *
		 * ##     ##  #######  ########     ###    ##          ########   #######  ########  ##     ## ########
		 * ###   ### ##     ## ##     ##   ## ##   ##          ##     ## ##     ## ##     ## ##     ## ##     ##
		 * #### #### ##     ## ##     ##  ##   ##  ##          ##     ## ##     ## ##     ## ##     ## ##     ##
		 * ## ### ## ##     ## ##     ## ##     ## ##          ########  ##     ## ########  ##     ## ########
		 * ##     ## ##     ## ##     ## ######### ##          ##        ##     ## ##        ##     ## ##
		 * ##     ## ##     ## ##     ## ##     ## ##          ##        ##     ## ##        ##     ## ##
		 * ##     ##  #######  ########  ##     ## ########    ##         #######  ##         #######  ##
		 *
		 */
		var modalContentNotesForm = /* syntax: html */ `
            <!-- SC Mgr Notes Modal -->
            <form class="ui small form modal" id="scr-modal-notes-form">
                <i class="close icon"></i>
                <div class="content">

                    <!-- Request Details Addendum -->
                    <div class="required field">
                        <label>SCM Staffing Notes</label>
                        <textarea rows="3" name="scmstaffingnotes" id="scmstaffingnotes" placeholder="Why are you sending this cross-vertical?"></textarea>
                    </div>

                    <!-- Industry -->
                    ${fldIndustryHTml("scmindustry-popup")}

                    <!-- Emerging -->
                    <div class="field">
                        <div class="ui toggle checkbox">
                            <input type="checkbox" name="needsemg" id="needsemg" tabindex="0" class="hidden">
                            <label>Needs EMG support or review</label>
                        </div>
                    </div>
                </div>
                <div class="actions">
                    <button type="submit" class="ui green approve button" id="submitform">Apply Changes</button>
                    <div class="ui black deny button">Dismiss</div>
                </div>
            </form>
            `;
		var modalContentCalendarDashboard = /* syntax: html */ `
            <!-- Embedded Calendar Dashboard Modal -->
            <div class="ui fullscreen modal" id="scr-modal-calendar-dashboard">
                <i class="close icon"></i>
                <div class="header">SC Calendar Dashboard</div>
                <div class="content">
                    <div class="ui warning message" id="scr-calendar-dashboard-fallback"></div>
                    <iframe
                        id="scr-calendar-dashboard-frame"
                        title="SC Calendar Dashboard"
                        sandbox="allow-scripts allow-forms allow-popups allow-modals"
                    ></iframe>
                </div>
                <div class="actions">
                    <div class="ui teal button" id="scr-calendar-dashboard-back">Back to Quick Assign</div>
                    <a class="ui blue button" id="scr-calendar-dashboard-open-tab" href="#" target="_blank" rel="noopener noreferrer">Open in New Tab</a>
                    <div class="ui black deny button">Dismiss</div>
                </div>
            </div>
            `;
		var fomanticCss = /* syntax: html */ `
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fomantic-ui@2.9.3/dist/semantic.css" integrity="sha256-lT1UJMnT8Tu/iZ/FT7mJlzcRoe3yhl3K8oyCebjP8qw=" crossorigin="anonymous" referrerpolicy="no-referrer">
            `;
		$("head").append(fomanticCss);
		$("body").append(modalContentRequestForm);
		$("body").append(modalContentNotesForm);
		$("body").append(modalContentCalendarDashboard);

		// SC Request Form Button Bar
		// var nsBtnBar = $('#main_form table table').children('tbody').children('tr').eq(1);
		// var nsBtnBarCnt = $('#main_form table table').children('tbody').children('tr').eq(1).children('td').length;
		// nsBtnBar.children('td').append('<td></td>');
		// $('#main_form table table').children('tbody').eq(1).append(btnMenu);
		// $('#sc-mgr-assistant-col').attr('colspan', nsBtnBarCnt);

		function createHashtags() {
			let hashtags = settings.hashtags;
			if (!hashtags || hashtags.length == 0) {
				return "";
			}

			let hashtagsArray = hashtags.replace("#", "").split(",").sort();
			let hashtagsHtmlArray = [];
			for (var h in hashtagsArray) {
				hashtagsHtmlArray.push(
					`<div class="item" data-value="#${hashtagsArray[h].trim()}">${hashtagsArray[h].trim()}</div>`,
				);
			}
			return hashtagsHtmlArray.join("");
		}

		let pageTitle = $(".uir-page-title-secondline");
		let pageTitleNew = $(".uir-page-title");
		let pageTitleBig = $(".uir-page-title-record");
		// (pageTitle.length !== 0) ? pageTitle.append(btnMenu) : pageTitleNew.append(btnMenu);
		pageTitleBig.after(btnMenu);

		/**
		 * +===================================================================================================+
		 * |                                                                                                   |
		 * |    ######  ##     ## #### ######## ########  ######   ######  ########  #### ########  ########   |
		 * |   ##    ## ##     ##  ##     ##    ##       ##    ## ##    ## ##     ##  ##  ##     ##    ##      |
		 * |   ##       ##     ##  ##     ##    ##       ##       ##       ##     ##  ##  ##     ##    ##      |
		 * |    ######  ##     ##  ##     ##    ######    ######  ##       ########   ##  ########     ##      |
		 * |         ## ##     ##  ##     ##    ##             ## ##       ##   ##    ##  ##           ##      |
		 * |   ##    ## ##     ##  ##     ##    ##       ##    ## ##    ## ##    ##   ##  ##           ##      |
		 * |    ######   #######  ####    ##    ########  ######   ######  ##     ## #### ##           ##      |
		 * |                                                                                                   |
		 * +===================================================================================================+
		 */

		function getCurrentEmp() {
			var curUser = nlapiGetUser();
			var filters = [];
			filters.push(new nlobjSearchFilter("custrecord_emproster_emp", null, "is", curUser));

			var columns = [];
			columns.push(new nlobjSearchColumn("custrecord_emproster_vertical_amo"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_salesteam"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_salesregion"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_sales_tier"));
			columns.push(new nlobjSearchColumn("name"));

			var results = nlapiSearchRecord("customrecord_emproster", null, filters, columns);
			return results[0];
		}

		const empRec = getCurrentEmp();
		const empName = empRec.getValue("name");

		const _ids = {
			me: empRec.getId(),
			rob: 71312,
			jeff: 727821,
			karl: 106513,
			rebecca: 344520,
			robyn: 758520,
			lauren: 169117,
			mikec: 239718,
		};

		function getWorkloadData() {
			var workload = {};

			const vertId = empRec.getValue("custrecord_emproster_vertical_amo");
			const teamId = empRec.getValue("custrecord_emproster_salesteam");
			const regId = empRec.getValue("custrecord_emproster_salesregion");
			const tierId = empRec.getValue("custrecord_emproster_sales_tier"); // 10, 28, 29 are all valid SC Tier IDs

			// Date helpers
			const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

			const addMonths = (input, months) => {
				const date = new Date(input);
				date.setDate(1);
				date.setMonth(date.getMonth() + months);
				date.setDate(Math.min(input.getDate(), getDaysInMonth(date.getFullYear(), date.getMonth() + 1)));
				return date;
			};

			const _today = new Date();
			const sixMonthsAgo = addMonths(_today, -6);
			const sixMonthsAgoFormatted = nlapiDateToString(sixMonthsAgo, "date");

			// filter on current, active team
			var filters = [];

			filters.push(new nlobjSearchFilter("custrecord_screq_status", null, "is", 2)); // Request Status = Staffed
			filters.push(new nlobjSearchFilter("created", null, "onorafter", sixMonthsAgoFormatted));

			filters.push(new nlobjSearchFilter("custrecord_emproster_rosterstatus", "custrecord_screq_assignee", "is", 1));
			filters.push(new nlobjSearchFilter("custrecord_emproster_eminactive", "custrecord_screq_assignee", "is", "F"));
			filters.push(new nlobjSearchFilter("custrecord_emproster_salesteam", "custrecord_screq_assignee", "is", teamId));
			filters.push(new nlobjSearchFilter("custrecord_emproster_salesregion", "custrecord_screq_assignee", "is", regId));
			filters.push(new nlobjSearchFilter("custrecord_emproster_sales_qb", "custrecord_screq_assignee", "is", 25)); // this should filter to QB = Solution Consultant

			if (settings.filterMe === true) {
				filters.push(
					new nlobjSearchFilter("custrecord_emproster_mgrroster", "custrecord_screq_assignee", "is", _ids.me),
				);
			}

			if (settings.filterVertical === true) {
				filters.push(
					new nlobjSearchFilter("custrecord_emproster_vertical_amo", "custrecord_screq_assignee", "is", vertId),
				);
			}

			if (settings.filterTier === true) {
				filters.push(
					new nlobjSearchFilter("custrecord_emproster_sales_tier", "custrecord_screq_assignee", "is", tierId),
				);
			}

			// TODO: fix this as needed for OML6 and OML7 based on hierarchy changes
			if (settings.filterDirector) {
				const dirName = settings.filterDirector;
				switch (dirName) {
					case "jeff":
					case "karl":
					case "rebecca":
					case "lauren":
					case "robyn":
					case "rob":
						filters.push(
							// Need to address org change which puts Dir at oml7
							new nlobjSearchFilter("custrecord_emproster_oml7", "custrecord_screq_assignee", "is", _ids[dirName]),
						);
						break;
					default:
						shout(`Invalid director name provided: ${dirName}.`);
				}
			}

			// return id, name, location, and availability data
			var columns = [];
			columns.push(new nlobjSearchColumn("internalid", "custrecord_screq_assignee", "group"));
			// columns.push(new nlobjSearchColumn('custrecord_screq_assignee', null, 'group'));
			// columns.push(new nlobjSearchColumn('internalid', null, 'count'));

			var columnLoad = new nlobjSearchColumn("formulanumeric", null, "sum");
			columnLoad.setFormula("CASE WHEN {custrecord_screq_date_sc_needed} >= ({today}-30) THEN 1 ELSE 0 END");
			columnLoad.setFunction("percentOfTotal");
			columnLoad.setLabel("Load");
			columns.push(columnLoad);

			var columnInplay = new nlobjSearchColumn("formulanumeric", null, "sum");
			columnInplay.setFormula(
				"CASE WHEN {custrecord_screq_engmnt_status} IN ('Not Started', 'In Progress') THEN 1 ELSE 0 END",
			);
			columnInplay.setLabel("Inplay");
			columns.push(columnInplay);

			var results = nlapiSearchRecord("customrecord_sc_request", null, filters, columns);

			if (!results || results.length < 1) {
				shout("Error getting team workload!");
				return;
			}

			for (var _i = results.length - 1; _i >= 0; _i--) {
				var result = results[_i];
				var scName = result.getValue("internalid", "custrecord_screq_assignee", "group");
				var tmpArray = [0, 0];

				var allColumns = result.getAllColumns();

				for (var j = 0; j < allColumns.length; j++) {
					var column = allColumns[j];
					var columnLabel = column.getLabel();
					var columnValue = result.getValue(column);

					switch (columnLabel) {
						case "Load":
							tmpArray[0] = columnValue;
							break;
						case "Inplay":
							tmpArray[1] = columnValue;
							break;
					}
				}

				workload[scName] = tmpArray;
			}

			// shout(workload);
			return workload;
		}

		function getPeopleData() {
			var workloadData = settings.includeAvailability ? getWorkloadData() : {};
			var people = [];

			const vertId = empRec.getValue("custrecord_emproster_vertical_amo");
			const teamId = empRec.getValue("custrecord_emproster_salesteam");
			const regId = empRec.getValue("custrecord_emproster_salesregion");
			const tierId = empRec.getValue("custrecord_emproster_sales_tier"); // 10, 28, 29 are all valid SC Tier IDs

			// filter on current, active team
			var filters = [];

			filters.push(new nlobjSearchFilter("custrecord_emproster_rosterstatus", null, "is", 1));
			filters.push(new nlobjSearchFilter("custrecord_emproster_eminactive", null, "is", "F"));
			filters.push(new nlobjSearchFilter("custrecord_emproster_salesteam", null, "is", teamId));
			filters.push(new nlobjSearchFilter("custrecord_emproster_salesregion", null, "is", regId));
			filters.push(new nlobjSearchFilter("custrecord_emproster_sales_qb", null, "is", 25)); // this should filter to QB = Solution Consultant
			filters.push(new nlobjSearchFilter("custrecord_emproster_rdept", null, "is", 482)); // Sales & Marketing : HQ - (n) : Solution Consultant - (n)

			if (settings.filterMe === true) {
				filters.push(new nlobjSearchFilter("custrecord_emproster_mgrroster", null, "is", _ids.me));
			}

			if (settings.filterVertical === true) {
				filters.push(new nlobjSearchFilter("custrecord_emproster_vertical_amo", null, "is", vertId));
			}

			if (settings.filterTier === true) {
				filters.push(new nlobjSearchFilter("custrecord_emproster_sales_tier", null, "is", tierId));
			}

			// TODO: fix this as needed for OML6 and OML7 based on hierarchy changes
			if (settings.filterDirector) {
				const dirName = settings.filterDirector;
				switch (dirName) {
					case "jeff":
					case "karl":
					case "rebecca":
					case "lauren":
					case "robyn":
						filters.push(new nlobjSearchFilter("custrecord_emproster_oml7", null, "is", _ids[dirName]));
						break;
					default:
						shout(`Invalid director name provided: ${dirName}.`);
				}
			}

			// return id, name, location, and availability data
			var columns = [];
			columns.push(new nlobjSearchColumn("internalid"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_firstname"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_lastname"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_olocation"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail_notes"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail_notes_res"));
			columns.push(new nlobjSearchColumn("email", "custrecord_emproster_emp"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_mgrroster"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_salesteam"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_vertical_amo"));

			var results = nlapiSearchRecord("customrecord_emproster", null, filters, columns);

			if (!results || results.length < 1) {
				shout("Error getting team availability!");
				return;
			}

			for (var _i = results.length - 1; _i >= 0; _i--) {
				var _id = results[_i].getId();
				var _workload = Object.keys(workloadData).length !== 0 ? workloadData[_id.toString()] : null;

				var newPerson = new Person(
					_id,
					results[_i].getValue("custrecord_emproster_firstname"),
					results[_i].getValue("custrecord_emproster_lastname"),
					results[_i].getText("custrecord_emproster_olocation"),
					results[_i].getText("custrecord_emproster_avail"),
					results[_i].getValue("custrecord_emproster_avail_notes"),
					results[_i].getValue("custrecord_emproster_avail_notes_res"),
					results[_i].getValue("email", "custrecord_emproster_emp"),
					results[_i].getText("custrecord_emproster_mgrroster"),
					results[_i].getText("custrecord_emproster_salesteam"),
					results[_i].getText("custrecord_emproster_vertical_amo"),
					_workload && _workload.length > 0 ? _workload[0] : 0,
					_workload && _workload.length > 0 ? _workload[1] : 0,
				);

				people.push(newPerson);
			}

			function sortPeopleData(people, key, ascending) {
				people.sort((a, b) => {
					let valueA, valueB;

					// Get the appropriate values based on the key
					if (key === "30 day load") {
						// these values look like "9.999%"
						valueA = parseFloat(a.weight);
						valueB = parseFloat(b.weight);
					} else if (key === "In Play") {
						// these values look like "9"
						valueA = parseInt(a.inplay);
						valueB = parseInt(b.inplay);
					} else if (key === "SC Name") {
						// these values look like "First Last"
						valueA = a.fullname.toLowerCase(); // case-insensitive sorting
						valueB = b.fullname.toLowerCase();
					} else {
						shout("Invalid sort key; check settings.");
						return 0;
					}

					// Compare the values
					if (valueA < valueB) return ascending ? -1 : 1;
					if (valueA > valueB) return ascending ? 1 : -1;
					return 0; // If values are equal
				});
			}

			const sortBy = settings.sortAvailabilityBy || "SC Name";
			const sortAsc = settings.sortAvailabilityDirection === "Desc" ? false : true;

			sortPeopleData(people, sortBy, sortAsc);
			return people;
		}

		/**
		 * Get custom skills filters from form
		 * @return {obj} Filter obj which contains two keys.
		 */
		function getTableFilters() {
			var filters = {};
			var fIndustry = [];
			var fSkills = [];

			// my team
			const filterMyTeam = $("#skillfilter-myteam").dropdown("get value") || null;
			if (filterMyTeam && filterMyTeam === "T") {
				fSkills.push(
					new nlobjSearchFilter("custrecord_emproster_mgrroster", "custrecord_ssm_skill_employee", "is", _ids.me),
				);
				fIndustry.push(
					new nlobjSearchFilter("custrecord_emproster_mgrroster", "custrecord_sr_ind_rating_employee", "is", _ids.me),
				);
				// shout('Table filter: My Team');
			}

			// sc vertical
			const filterVertical = $("#skillfilter-scvertical").dropdown("get values") || null;
			if (filterVertical && filterVertical.length > 0) {
				fSkills.push(
					new nlobjSearchFilter(
						"custrecord_emproster_vertical_amo",
						"custrecord_ssm_skill_employee",
						"anyof",
						filterVertical,
					),
				);
				fIndustry.push(
					new nlobjSearchFilter(
						"custrecord_emproster_vertical_amo",
						"custrecord_sr_ind_rating_employee",
						"anyof",
						filterVertical,
					),
				);
				// shout('Table filter: SC Vertical');
			}

			// sc director
			// // TODO: fix this as needed for OML6 and OML7 based on hierarchy changes
			const filterDirector = $("#skillfilter-scdirector").dropdown("get value") || null;

			switch (filterDirector) {
				case "jeff":
				case "karl":
				case "rebecca":
				case "lauren":
				case "robyn":
				case "rob":
					fSkills.push(
						new nlobjSearchFilter(
							"custrecord_emproster_oml6",
							"custrecord_ssm_skill_employee",
							"is",
							_ids[filterDirector],
						),
					);
					fIndustry.push(
						new nlobjSearchFilter(
							"custrecord_emproster_oml6",
							"custrecord_sr_ind_rating_employee",
							"is",
							_ids[filterDirector],
						),
					);
					// shout('Table filter: SC Director');
					break;
				default:
					shout(`Invalid director name provided: ${filterDirector}.`);
			}

			// sc tier
			const filterTier = $("#skillfilter-sctier").dropdown("get values") || null;
			if (filterTier && filterTier.length > 0) {
				fSkills.push(
					new nlobjSearchFilter(
						"custrecord_emproster_sales_tier",
						"custrecord_ssm_skill_employee",
						"anyof",
						filterTier,
					),
				);
				fIndustry.push(
					new nlobjSearchFilter(
						"custrecord_emproster_sales_tier",
						"custrecord_sr_ind_rating_employee",
						"anyof",
						filterTier,
					),
				);
				// shout('Table filter: SC Tier');
			}

			// sc region
			const filterRegion = $("#skillfilter-scregion").dropdown("get values") || null;
			if (filterRegion && filterRegion.length > 0) {
				fSkills.push(
					new nlobjSearchFilter(
						"custrecord_emproster_salessubregion",
						"custrecord_ssm_skill_employee",
						"anyof",
						filterRegion,
					),
				);
				fIndustry.push(
					new nlobjSearchFilter(
						"custrecord_emproster_salessubregion",
						"custrecord_sr_ind_rating_employee",
						"anyof",
						filterRegion,
					),
				);
				// shout('Table filter: SC Region');
			}

			// sorting
			const filterSorting = $("#skillfilter-sorting").dropdown("get value") || "ias";
			const filterOperator = $("#skillfilter-operator").dropdown("get value") || "any";

			filters.industry = fIndustry;
			filters.skills = fSkills;
			filters.sorting = filterSorting;
			filters.operator = filterOperator;

			shout("Table filters: " + JSON.stringify(filters));

			return filters;
		}

		function getBodyOfWorkIndustryData(industryId, tableFilters) {
			if (!industryId) {
				return null;
			}

			var industryData = [];

			const vertId = empRec.getValue("custrecord_emproster_vertical_amo");
			const teamId = empRec.getValue("custrecord_emproster_salesteam");
			const regId = empRec.getValue("custrecord_emproster_salesregion");
			const tierId = empRec.getValue("custrecord_emproster_sales_tier"); // 10, 28, 29 are all valid SC Tier IDs

			// filter on current, active team
			var filters = [];

			filters.push(new nlobjSearchFilter("custrecord_sr_ind_rating_subindustry", null, "is", industryId));

			filters.push(
				new nlobjSearchFilter("custrecord_emproster_rosterstatus", "custrecord_sr_ind_rating_employee", "is", 1),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_eminactive", "custrecord_sr_ind_rating_employee", "is", "F"),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_salesteam", "custrecord_sr_ind_rating_employee", "is", teamId),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_salesregion", "custrecord_sr_ind_rating_employee", "is", regId),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_sales_qb", "custrecord_sr_ind_rating_employee", "is", 25),
			); // this should filter to QB = Solution Consultant

			if (tableFilters && tableFilters.length > 0) {
				filters = filters.concat(tableFilters);
			} else {
				if (settings.filterMe === true) {
					filters.push(
						new nlobjSearchFilter("custrecord_emproster_mgrroster", "custrecord_sr_ind_rating_employee", "is", _ids.me),
					);
				}

				if (settings.filterVertical === true) {
					filters.push(
						new nlobjSearchFilter(
							"custrecord_emproster_vertical_amo",
							"custrecord_sr_ind_rating_employee",
							"is",
							vertId,
						),
					);
				}

				if (settings.filterTier === true) {
					filters.push(
						new nlobjSearchFilter("custrecord_emproster_sales_tier", "custrecord_sr_ind_rating_employee", "is", tierId),
					);
				}

				if (settings.filterDirector) {
					const dirName = settings.filterDirector;
					switch (dirName) {
						case "jeff":
						case "karl":
						case "rebecca":
						case "lauren":
						case "robyn":
						case "rob":
							filters.push(
								new nlobjSearchFilter(
									"custrecord_emproster_oml6",
									"custrecord_sr_ind_rating_employee",
									"is",
									_ids[dirName],
								),
							);
							break;
						default:
							shout(`Invalid director name provided: ${dirName}.`);
					}
				}
			}

			var columns = [];
			columns.push(new nlobjSearchColumn("internalid"));
			columns.push(new nlobjSearchColumn("custrecord_sr_ind_rating_employee"));
			columns.push(new nlobjSearchColumn("internalid", "custrecord_sr_ind_rating_employee"));
			columns.push(new nlobjSearchColumn("custrecord_sr_ind_rating_industry"));
			columns.push(new nlobjSearchColumn("custrecord_sr_ind_rating_subindustry"));
			columns.push(new nlobjSearchColumn("custrecord_sr_ind_rating"));

			// var nRating = new nlobjSearchColumn('formulanumeric', null, 'sum');
			// nRating.setFormula("TO_NUMBER(SUBSTR({custrecord_sr_ind_rating}, 1, 1))");
			// nRating.setLabel('nRating');
			// columns.push(nRating);

			var results = nlapiSearchRecord("customrecord_sr_industry_rating_entry", null, filters, columns);

			if (!results || results.length < 1) {
				shout("Error getting team workload!");
				return;
			}

			for (var _i = results.length - 1; _i >= 0; _i--) {
				var result = results[_i];
				var id = result.getId();
				var employee = result.getText("custrecord_sr_ind_rating_employee");
				var employeeId = result.getValue("internalid", "custrecord_sr_ind_rating_employee");
				var industry = result.getText("custrecord_sr_ind_rating_industry");
				var subindustry = result.getText("custrecord_sr_ind_rating_subindustry");
				var rating = Array.from(result.getText("custrecord_sr_ind_rating"))[0]; // only pull in the numeric rating, not the text

				var data = [employeeId, employee, industry, subindustry, rating];

				industryData.push(data);
			}

			shout("Industry data:", industryData);
			return industryData;
		}

		function getBodyOfWorkSkillData(skillIds, tableFilters) {
			if (!skillIds) {
				return null;
			}

			shout("skillIds: ", skillIds);

			var skills = [];

			const vertId = empRec.getValue("custrecord_emproster_vertical_amo");
			const teamId = empRec.getValue("custrecord_emproster_salesteam");
			const regId = empRec.getValue("custrecord_emproster_salesregion");
			const tierId = empRec.getValue("custrecord_emproster_sales_tier"); // 10, 28, 29 are all valid SC Tier IDs

			// filter on current, active team
			var filters = [];

			filters.push(new nlobjSearchFilter("custrecord_ssm_skill_entry", null, "anyof", skillIds));

			filters.push(
				new nlobjSearchFilter("custrecord_emproster_rosterstatus", "custrecord_ssm_skill_employee", "is", 1),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_eminactive", "custrecord_ssm_skill_employee", "is", "F"),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_salesteam", "custrecord_ssm_skill_employee", "is", teamId),
			);
			filters.push(
				new nlobjSearchFilter("custrecord_emproster_salesregion", "custrecord_ssm_skill_employee", "is", regId),
			);
			filters.push(new nlobjSearchFilter("custrecord_emproster_sales_qb", "custrecord_ssm_skill_employee", "is", 25)); // this should filter to QB = Solution Consultant

			if (tableFilters && tableFilters.length > 0) {
				filters = filters.concat(tableFilters);
			} else {
				if (settings.filterMe === true) {
					filters.push(
						new nlobjSearchFilter("custrecord_emproster_mgrroster", "custrecord_ssm_skill_employee", "is", _ids.me),
					);
				}

				if (settings.filterVertical === true) {
					filters.push(
						new nlobjSearchFilter("custrecord_emproster_vertical_amo", "custrecord_ssm_skill_employee", "is", vertId),
					);
				}

				if (settings.filterTier === true) {
					filters.push(
						new nlobjSearchFilter("custrecord_emproster_sales_tier", "custrecord_ssm_skill_employee", "is", tierId),
					);
				}

				if (settings.filterDirector) {
					const dirName = settings.filterDirector;
					switch (dirName) {
						case "jeff":
						case "karl":
						case "rebecca":
						case "lauren":
						case "robyn":
						case "rob":
							filters.push(
								new nlobjSearchFilter(
									"custrecord_emproster_oml6",
									"custrecord_ssm_skill_employee",
									"is",
									_ids[dirName],
								),
							);
							break;
						default:
							shout(`Invalid director name provided: ${dirName}.`);
					}
				}
			}

			var columns = [];
			columns.push(new nlobjSearchColumn("internalid"));
			columns.push(new nlobjSearchColumn("custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("internalid", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail_notes", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_avail_notes_res", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_mgrroster", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_ssm_skill_subsection"));
			columns.push(new nlobjSearchColumn("custrecord_ssm_skill_entry"));
			columns.push(new nlobjSearchColumn("custrecord_ssm_skill_rating"));
			// columns.push(new nlobjSearchColumn('custrecord_last_updated'));
			columns.push(new nlobjSearchColumn("custrecord_emproster_olocation", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_salessubregion", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_vertical_amo", "custrecord_ssm_skill_employee"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_sales_tier", "custrecord_ssm_skill_employee"));

			// var nRating = new nlobjSearchColumn('formulanumeric', null, 'sum');
			// nRating.setFormula("TO_NUMBER(SUBSTR({custrecord_sr_ind_rating}, 1, 1))");
			// nRating.setLabel('nRating');
			// columns.push(nRating);

			var results = nlapiSearchRecord("customrecord_ssm_entry", null, filters, columns);

			if (!results || results.length < 1) {
				shout("Error getting team workload!");
				return;
			}

			for (var _i = results.length - 1; _i >= 0; _i--) {
				var result = results[_i];
				var id = result.getId();
				var employee = result.getText("custrecord_ssm_skill_employee");
				var employeeId = result.getValue("internalid", "custrecord_ssm_skill_employee");
				var manager = result.getText("custrecord_emproster_mgrroster", "custrecord_ssm_skill_employee");
				var availability = result.getText("custrecord_emproster_avail", "custrecord_ssm_skill_employee");
				var avail_notes = result.getValue("custrecord_emproster_avail_notes", "custrecord_ssm_skill_employee");
				var avail_res = result.getValue("custrecord_emproster_avail_notes_res", "custrecord_ssm_skill_employee");
				var location = result.getText("custrecord_emproster_olocation", "custrecord_ssm_skill_employee");
				var region = result.getText("custrecord_emproster_salessubregion", "custrecord_ssm_skill_employee");
				var vertical = result.getText("custrecord_emproster_vertical_amo", "custrecord_ssm_skill_employee");
				var tier = result.getText("custrecord_emproster_sales_tier", "custrecord_ssm_skill_employee");
				var subsection = result.getText("custrecord_ssm_skill_subsection");
				var skill = result.getText("custrecord_ssm_skill_entry");
				var rating = Array.from(result.getText("custrecord_ssm_skill_rating"))[0]; // only pull in the numeric rating, not the text
				var ratingWeighted = generateWeightedRating(rating);
				// var lastupdate     = result.getValue('custrecord_last_updated');

				var data = [
					employeeId,
					employee,
					manager,
					subsection,
					skill,
					rating,
					ratingWeighted,
					availability,
					avail_notes,
					avail_res,
					location,
					region,
					vertical,
					tier,
				];

				skills.push(data);
			}

			shout("All skills:", skills);
			return skills;
		}

		function consolidateSkillsData(data, sortKey, sortOperator) {
			// now passing array of 2 results...
			const skillsData = data[0];
			const industryData = data[1];
			if (!skillsData || skillsData.length === 0) {
				return null;
			}

			let aggregatedScores = skillsData.reduce(
				(
					acc,
					[
						employeeId,
						employee,
						manager,
						subsection,
						skill,
						rating,
						ratingWeighted,
						availability,
						avail_notes,
						avail_res,
						location,
						region,
						vertical,
						tier,
					],
				) => {
					// If the employee ID is not yet in the accumulator, initialize it with a rating of 0 and an empty skills string
					if (!acc[employee]) {
						acc[employee] = {
							employeeId: employeeId,
							manager: manager,
							location: extractLocationString(location),
							region: region,
							vertical: vertical,
							tier: tier.replace("Solution Consultant - ", ""),
							availability: availability.toLowerCase(),
							avail_notes: avail_notes,
							avail_res: avail_res,
							weightedRating: 0,
							skillsList: "",
						};
					}

					// Sum the rating for the current employee
					acc[employee].weightedRating += ratingWeighted;

					// Append the skill and rating to the skills string
					acc[employee].skillsList += `${skill}-${rating}, `;

					return acc;
				},
				{},
			);

			if (sortOperator === "all") {
				// remove employees who have a 0 in any skill here...
			}

			// Clean up the trailing comma and space from the skills string
			Object.keys(aggregatedScores).forEach((employee) => {
				aggregatedScores[employee].skillsList = aggregatedScores[employee].skillsList.replace(/,\s*$/, "");
			});

			// Find the maximum rating among all employees
			const maxRating = Math.max(...Object.values(aggregatedScores).map((employee) => employee.weightedRating));

			function createSkillsHtmlTable(skillsString) {
				// Split the string into individual skill-rating pairs
				const skillsArray = skillsString.split(", ");

				// Start creating the table structure
				let tableHTML = '<table class="ui basic collapsing table">';

				// Loop through each skill-rating pair
				skillsArray.forEach((skillRating) => {
					// Split each pair into skill and rating
					let [skill, rating] = skillRating.split("-");

					// Add a row for each skill and rating
					tableHTML += `
                        <tr>
                            <td>${skill}</td>
                            <td>${rating}</td>
                        </tr>
                    `;
				});

				// Close the table tag
				tableHTML += "</table>";

				// Return the generated table HTML
				return tableHTML;
			}

			function availabilityRanking(text) {
				text = text || null;
				let rank = 0;
				switch (text) {
					case "green":
						rank = 3;
						break;
					case "yellow":
						rank = 2;
						break;
					case "red":
						rank = 1;
						break;
					default:
						rank = 0;
				}
				return rank;
			}

			/**
			 *
			 * @param {array} employees -> this should be an array of employee objects
			 * @param {array} sortingCriteria - this should be an array of array sorting criteria in the format [param, asc/desc]
			 * @returns {array}
			 *
			 * const sortingCriteria = [
			 *   ['industryRating', 'desc'],
			 *   ['availabilityRanking', 'desc'],
			 *   ['stackRank', 'desc']
			 * ];
			 */
			function customSortEmployees(employees, sortingCriteria) {
				return employees.sort((a, b) => {
					for (const criteria of sortingCriteria) {
						const [field, order] = criteria;
						if (a[field] === b[field]) {
							continue;
						}
						if (order === "desc") {
							return b[field] - a[field];
						} else {
							return a[field] - b[field];
						}
					}
					return 0; // All criteria are equal, keep original order
				});
			}

			// Calculate the stack rank percentage for each employee
			let rankedEmployees = Object.entries(aggregatedScores).map(([employee, data]) => {
				const percentage = (data.weightedRating / maxRating) * 100;
				const cachedSc = getCachedScById(data.employeeId);
				const cachedScByName = !cachedSc.email ? getCachedScByName(employee) : {};
				const location = normalizeCalendarRosterState(data.location || cachedSc.location || cachedScByName.location || "");
				const manager = data.manager || cachedSc.manager || cachedScByName.manager || "";

				return {
					employee: employee,
					employeeId: data.employeeId,
					email: cachedSc.email || cachedScByName.email || "",
					manager: manager,
					team: getCalendarManagerTeamName(manager) || cachedSc.team || cachedScByName.team || "Skills Matrix",
					legacyOrg: data.vertical || cachedSc.legacyOrg || cachedScByName.legacyOrg || "Selected",
					availability: data.availability,
					availabilityRanking: availabilityRanking(data.availability),
					avail_notes: data.avail_notes,
					avail_res: data.avail_res,
					location: location,
					region: data.region,
					vertical: data.vertical,
					tier: data.tier,
					weightedRating: data.weightedRating,
					skillsList: createSkillsHtmlTable(data.skillsList),
					stackRank: percentage.toFixed(1), // Format to 1 decimal place
				};
			});

			var sortingCriteria = [
				["availabilityRanking", "desc"],
				["stackRank", "desc"],
			];

			if (sortKey && sortKey === "sia") {
				sortingCriteria = [
					["stackRank", "desc"],
					["availabilityRanking", "desc"],
				];
			}

			// move sorting into statemnent below...
			// const sortedRankedEmployees = rankedEmployees.sort((a, b) => b.weightedRating - a.weightedRating);

			if (industryData && industryData.length > 0) {
				const aggregatedIndustries = industryData.reduce(
					(acc, [employeeId, employee, industry, subindustry, rating]) => {
						if (!acc[employee]) {
							acc[employee] = {
								employeeId: employeeId,
								industryRating: rating,
							};
						}
						return acc;
					},
					{},
				);

				const cleanedIndustries = Object.entries(aggregatedIndustries).map(([employee, data]) => {
					return {
						employee: employee,
						employeeId: data.employeeId,
						industryRating: parseInt(data.industryRating),
					};
				});

				const cleanedIndustriesMap = cleanedIndustries.reduce((acc, obj) => {
					acc[obj.employeeId] = obj;
					return acc;
				}, {});

				rankedEmployees = rankedEmployees.map((objA) => {
					const match = cleanedIndustriesMap[objA.employeeId];
					return match ? { ...objA, industryRating: match.industryRating } : objA;
				});

				sortingCriteria = [
					["industryRating", "desc"],
					["availabilityRanking", "desc"],
					["stackRank", "desc"],
				];

				if (sortKey && sortKey === "ais") {
					sortingCriteria = [
						["availabilityRanking", "desc"],
						["industryRating", "desc"],
						["stackRank", "desc"],
					];
				} else if (sortKey && sortKey === "sia") {
					sortingCriteria = [
						["stackRank", "desc"],
						["industryRating", "desc"],
						["availabilityRanking", "desc"],
					];
				}

				rankedEmployees = rankedEmployees.map((employee) => {
					if (employee.industryRating === undefined) {
						employee.industryRating = 0;
					}
					return employee;
				});

				if (settings.removeIndustry === true) {
					// Filter out employees with empty or 0 industry ratings
					rankedEmployees = rankedEmployees.filter((employee) => {
						return employee.industryRating !== undefined && employee.industryRating !== 0;
					});
				}
			}

			const sortedFiltereEmployees = customSortEmployees(rankedEmployees, sortingCriteria);
			return sortedFiltereEmployees;
		}

		function extractLocationString(str) {
			// Define the regular expression
			const regex = /^\w{2}-\w+/i;

			// Use match() to extract the substring that matches the regex
			const match = str.match(regex);

			// If a match is found, return the first match (or the original location if no match)
			return match ? match[0] : str;
		}

		function generateWeightedRating(rating) {
			const weights = {
				4: 8,
				3: 5,
				2: 2,
				1: 1,
				0: 0, // Assuming 0 maps to 0 as there's no weight provided
			};

			return weights[rating] || 0; // Default to 0 if the rating is not in the dictionary
		}

		function calculateRatingAverage(...numbers) {
			if (numbers.length === 0) return 0; // Return 0 if no numbers are provided

			const sum = numbers.reduce((acc, num) => acc + num, 0);
			const average = sum / numbers.length;

			return Math.round(average * 10) / 10; // Round to 1 decimal place
		}

		function calculateRatingStackRank(numbers) {
			const max = Math.max(...numbers);
			const min = Math.min(...numbers);

			return numbers.map((num) => {
				const percentage = ((num - min) / (max - min)) * 100;
				return parseFloat(percentage.toFixed(1)); // Round to 1 decimal place and convert back to a number
			});
		}

		function generateRating(rating) {
			if (!rating) {
				rating = 0;
			}
			var maxRemain = 4 - rating;
			var ratings = [];

			for (var i = 0; i < rating; i++) {
				ratings.push(`<i class="star icon active"></i>`);
			}

			for (var j = 0; j < maxRemain; j++) {
				ratings.push(`<i class="star icon"></i>`);
			}

			var ratingsHtml = ratings.join("");
			shout("Ratings HTML:", ratingsHtml);
			return `<div class="ui yellow rating disabled">${ratingsHtml}</div>`;
		}

		function escapeHtmlAttribute(value) {
			return String(value || "").replace(/[&<>"']/g, (character) => ({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[character]);
		}

		function generateBodtOfWorkHtml(data, industryId) {
			if (!data || data.length === 0) {
				return "";
			}

			shout("Data for HTML table:", data);

			var html = [];

			var tableHead = /* syntax: html */ `
                    <thead>
                        <tr>
                            <th class="center aligned">
                                <input type="checkbox" id="tableSkillsCalendarSelectAll" aria-label="Select all skill result calendars">
                            </th>
                            <th class="single line">SC Name & Mgr</th>
                            <th>Attributes</th>
                            <th class="sorted descending">Availability Notes</th>
                            ${industryId ? `<th class="single line sorted descending">Industry Fit</th>` : ``}
                            <th>Skills Detail</th>
                            <th class="single line sorted descending">Stack Rank</th>
                        </tr>
                    </thead>
                    `;
			// removed empty <tbody></tbody> tag at top
			var tableFoot = /* syntax: html */ `
                    <tfoot class="full-width">
                        <tr class="right aligned">
                            <th colspan="${industryId ? 8 : 7}" id="bodyofwork-footer">0 rows</th>
                        </tr>
                    </tfoot>
                    `;
			html.push(tableHead);

			var len = data.length;
			var i = 0;

			for (i; i < len; i++) {
				/**
				 * {
				 *   "employee"
				 *   "employeeId"
				 *   "availability"
				 *   "avail_notes"
				 *   "avail_res"
				 *   "weightedRating"
				 *   "skillsList"
				 *   "stackRank"
				 *   "industryRating"
				 * }
				 */
				const rowEmail = escapeHtmlAttribute(data[i]["email"] || "");
				const rowLocation = escapeHtmlAttribute(data[i]["location"] || "");
				const rowTimeZone = escapeHtmlAttribute(data[i]["timeZone"] || guessCalendarTimeZone(data[i]["location"]));
				const rowManager = escapeHtmlAttribute(data[i]["manager"] || "");
				const rowTeam = escapeHtmlAttribute(data[i]["team"] || "");
				const rowLegacyOrg = escapeHtmlAttribute(data[i]["legacyOrg"] || "");

				const row = /* syntax: html */ `
                    <tr>
                        <td class="center aligned tableSkillsAssign">
                            <input type="checkbox" class="tableSkillsCalendarSelect" data-eid="${
															data[i]["employeeId"]
														}" data-ename="${
															data[i]["employee"]
														}" data-email="${rowEmail}" data-location="${rowLocation}" data-timezone="${rowTimeZone}" data-manager="${rowManager}" data-team="${rowTeam}" data-legacyorg="${rowLegacyOrg}" aria-label="Select ${data[i]["employee"]} calendar">
                            <button type="button" class="ui mini primary icon button tableSkillsAssignButton" data-eid="${
															data[i]["employeeId"]
														}" data-ename="${
															data[i]["employee"]
														}" data-email="${rowEmail}" data-location="${rowLocation}" data-timezone="${rowTimeZone}" data-manager="${rowManager}" data-team="${rowTeam}" data-legacyorg="${rowLegacyOrg}" data-tooltip="Assign user to request" data-position="right center">
                                <i class="plus icon"></i>
                            </button>
                            <button type="button" class="ui mini teal icon button tableSkillsCalendarButton" data-eid="${
															data[i]["employeeId"]
														}" data-ename="${
															data[i]["employee"]
														}" data-email="${rowEmail}" data-location="${rowLocation}" data-timezone="${rowTimeZone}" data-manager="${rowManager}" data-team="${rowTeam}" data-legacyorg="${rowLegacyOrg}" data-tooltip="Open calendar dashboard" data-position="right center">
                                <i class="calendar check outline icon"></i>
                            </button>
                        </td>
                        <td>
                            <a href="/app/common/custom/custrecordentry.nl?rectype=1572&id=${
															data[i]["employeeId"]
														}" target="_blank">${data[i]["employee"]}</a>
                            <br/>
                            <span style="font-style:italic;">${data[i]["manager"]}</span>
                        <td>
                            <div class="ui tiny basic labels">
                                ${data[i]["vertical"] ? `<div class="ui label">${data[i]["vertical"]}</div>` : ""}
                                ${data[i]["tier"] ? `<div class="ui label">${data[i]["tier"]}</div>` : ""}
                                ${data[i]["location"] ? `<div class="ui label">${data[i]["location"]}</div>` : ""}
                                ${data[i]["region"] ? `<div class="ui label">${data[i]["region"]}</div>` : ""}
                            </div>
                        </td>
                        <td class="${data[i]["availability"] ? ` left ${data[i]["availability"]} marked` : ""}">
                            ${data[i]["avail_notes"]}
                            ${
															data[i]["avail_res"]
																? `
                                <div class="ui fitted divider"></div>
                                <span class="ui red text">${data[i]["avail_res"]}</span>
                                `
																: ""
														}
                            </h5>
                        </td>
                        ${
													industryId
														? `<td>
                            <div class="ui yellow disabled rating" data-icon="star" data-rating="${data[i]["industryRating"]}" data-max-rating="4"></div>
                        </td>`
														: ``
												}
                        <td>
                            ${data[i]["skillsList"]}
                        </td>
                        <td class="center aligned">
                            <div class="ui statistic">
                                <div class="value">
                                    ${data[i]["weightedRating"]}
                                </div>
                                <div class="label">
                                    Point${data[i]["weightedRating"] == 1 ? "" : "s"}
                                </div>
                            </div>
                            <div class="ui tiny indicating progress" data-percent="${
															data[i]["stackRank"]
														}" id="progress-${data[i]["employeeId"]}">
                                <div class="bar"></div>
                            </div>
                        </td>
                    </tr>
                `;
				html.push(row);
			}

			html.push(tableFoot);
			return html.join("");
		}

		async function getIndustryRating(industryId) {
			try {
				const payload = await new Promise((resolve, reject) => {
					try {
						const result = getBodyOfWorkIndustryData(industryId);
						resolve(result);
					} catch (error) {
						reject(error);
					}
				});

				shout("Payload received!");

				shout("Industry data:", payload);
			} catch (error) {
				shout("Payload error:", error);
			}
		}

		/**
		 * Utility wrapper around setTimeout
		 * @param  {int}   ms       Sleep time in milliseconds
		 * @param  {func}  callback Callback function
		 */
		function sleep(ms, callback) {
			setTimeout(callback, ms);
		}

		function convertNameFormat(name) {
			if (!name || !String(name).includes(",")) {
				return String(name || "").trim();
			}

			// Split the string by the comma and trim any extra spaces
			let [lastname, firstname] = name.split(",").map((part) => part.trim());

			// Return the concatenated result in "Firstname Lastname" format
			return [firstname, lastname].filter(Boolean).join(" ");
		}

		function updateBodyOfWorkTable(skills, industryId, tableFilters) {
			// Add dimmer and loader
			var dimmer = $("#tableSkillsLoader");
			dimmer.addClass("active");

			shout(`Table data raw >>>\nSkills: ${skills}\nIndustry: ${industryId}\nFilters: ${JSON.stringify(tableFilters)}`);

			sleep(2000, function () {
				var results = [];
				const resultA = getBodyOfWorkSkillData(skills, tableFilters.skills);
				const resultB = industryId ? getBodyOfWorkIndustryData(industryId, tableFilters.industry) : [];
				results.push(resultA, resultB);

				const skillsClean = consolidateSkillsData(results, tableFilters.sorting, tableFilters.operator);
				var html = generateBodtOfWorkHtml(skillsClean, industryId);
				var rowTotals = skillsClean.length || 0;

				// Add table styling
				// $('#bodyofwork').css('min-height', '600px');

				// Update table with row data
				$("#bodyofwork").html(`${html}`);

				// Update table footer
				$("#bodyofwork-footer").html(`${rowTotals} row${rowTotals == 1 ? "" : "s"}`);

				// Update progress bars
				$(".ui.progress").progress();

				// Update ratings
				$(".ui.rating").rating();

				updateSelectedSkillCalendarsButton();
				$("#tableSkillsCalendarSelectAll").change(function () {
					$(".tableSkillsCalendarSelect").prop("checked", this.checked);
					updateSelectedSkillCalendarsButton();
				});
				$(".tableSkillsCalendarSelect").change(function () {
					const allCount = $(".tableSkillsCalendarSelect").length;
					const checkedCount = $(".tableSkillsCalendarSelect:checked").length;
					$("#tableSkillsCalendarSelectAll").prop("checked", allCount > 0 && allCount === checkedCount);
					updateSelectedSkillCalendarsButton();
				});

				// Update link events
				$(".tableSkillsAssignButton").click(function (event) {
					event.preventDefault();

					var eid = $(this).data("eid");
					var ename = convertNameFormat($(this).data("ename"));
					var email = $(this).data("email") || "";
					var location = $(this).data("location") || "";
					var timeZone = $(this).data("timezone") || guessCalendarTimeZone(location);
					var manager = $(this).data("manager") || "";
					var team = $(this).data("team") || getCalendarManagerTeamName(manager) || "";
					var legacyOrg = $(this).data("legacyorg") || "";
					var cachedSc = getCachedScById(eid);
					var cachedScByName = !email && !cachedSc.email ? getCachedScByName(ename) : {};
					var resolvedEmail = email || cachedSc.email || cachedScByName.email || inferCalendarEmailFromName(ename);
					var resolvedLocation = normalizeCalendarRosterState(location || cachedSc.location || cachedScByName.location || "");
					var resolvedManager = manager || cachedSc.manager || cachedScByName.manager || "";
					var resolvedTeam = team || cachedSc.team || cachedScByName.team || getCalendarManagerTeamName(resolvedManager) || "";

					calendarSelectionOverrides[String(eid)] = {
						name: ename,
						email: resolvedEmail,
						manager: resolvedManager,
						team: resolvedTeam,
						legacyOrg: legacyOrg || cachedSc.legacyOrg || cachedScByName.legacyOrg || "Selected",
						location: resolvedLocation,
						timeZone: timeZone || cachedSc.timeZone || cachedScByName.timeZone || guessCalendarTimeZone(resolvedLocation),
					};

					const newValues = [
						{
							name: ename,
							value: parseInt(eid),
							description: "Override: Added from skills search results table",
							descriptionVertical: true,
							email: resolvedEmail,
							manager: resolvedManager,
							team: resolvedTeam,
							legacyOrg: legacyOrg || cachedSc.legacyOrg || cachedScByName.legacyOrg || "Selected",
							location: resolvedLocation,
							timeZone: timeZone || cachedSc.timeZone || cachedScByName.timeZone || guessCalendarTimeZone(resolvedLocation),
						},
					];

					const scValues = getPeopleCache();

					$("#solutionconsultant").dropdown("change values", newValues);
					$("#solutionconsultant").dropdown("set selected", eid);

					shout("Add employee to dropdown:", `${ename} (${eid})`, resolvedEmail);
				});

				$(".tableSkillsCalendarButton").click(function (event) {
					event.preventDefault();

					var eid = $(this).data("eid");
					var ename = convertNameFormat($(this).data("ename"));
					var email = $(this).data("email") || "";
					var location = $(this).data("location") || "";
					var timeZone = $(this).data("timezone") || guessCalendarTimeZone(location);
					var manager = $(this).data("manager") || "";
					var team = $(this).data("team") || getCalendarManagerTeamName(manager) || "";
					var legacyOrg = $(this).data("legacyorg") || "";
					var cachedSc = getCachedScById(eid);
					var cachedScByName = !email && !cachedSc.email ? getCachedScByName(ename) : {};
					var resolvedLocation = location || cachedSc.location || cachedScByName.location || "";
					var resolvedManager = manager || cachedSc.manager || cachedScByName.manager || "";
					var resolvedTeam = team || cachedSc.team || cachedScByName.team || getCalendarManagerTeamName(resolvedManager) || "";
					var resolvedTimeZone = timeZone || cachedSc.timeZone || cachedScByName.timeZone || guessCalendarTimeZone(resolvedLocation);

					openCalendarDashboard({
						id: eid,
						name: ename,
						email: email || cachedSc.email || cachedScByName.email || "",
						manager: resolvedManager,
						team: resolvedTeam,
						legacyOrg: legacyOrg || cachedSc.legacyOrg || cachedScByName.legacyOrg || "Selected",
						location: normalizeCalendarRosterState(resolvedLocation),
						timeZone: resolvedTimeZone,
					}).catch((error) => {
						shout("Calendar dashboard button error:", error);
					});
				});

				sleep(1000, function () {
					// Remove dimmer and loader
					dimmer.removeClass("active");
				});
			});
		}

		async function callLMStudio(url, preamble, prompt) {
			const response = await fetch(url + "/v1/chat/completions", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "llama-3.2-3b-instruct",
					messages: [
						{
							role: "system",
							content: preamble,
						},
						{
							role: "user",
							content: prompt,
						},
					],
					temperature: 0.7,
					max_tokens: -1,
					stream: false,
				}),
			});
			const data = await response.json();
			return data;
		}

		async function ifUrlExist(url) {
			return new Promise((resolve, reject) => {
				fetch(url, {
					method: "HEAD",
				})
					.then((response) => {
						resolve(response.status.toString()[0] === "2");
					})
					.catch((error) => {
						reject(false);
					});
			});
		}

		/**
		 * +====================================================+
		 * |                                                    |
		 * |    ######     ###     ######  ##     ## ########   |
		 * |   ##    ##   ## ##   ##    ## ##     ## ##         |
		 * |   ##        ##   ##  ##       ##     ## ##         |
		 * |   ##       ##     ## ##       ######### ######     |
		 * |   ##       ######### ##       ##     ## ##         |
		 * |   ##    ## ##     ## ##    ## ##     ## ##         |
		 * |    ######  ##     ##  ######  ##     ## ########   |
		 * |                                                    |
		 * +====================================================+
		 */

		function checkCache() {
			var getCacheArray = GM_SuperValue.get(`${SCRIPT_CACHE_ID}`);

			if (getCacheArray && getCacheArray.length > 0) {
				if (getCacheArray.some((record) => !Object.prototype.hasOwnProperty.call(record, "email"))) {
					refreshCache();
					return;
				}

				// cache found, check for timestamp
				var getCacheTs = GM_SuperValue.get(`${SCRIPT_CACHE_ID}_ts`);

				if (getCacheTs) {
					// timestamp found, move to compare
					var _currentTs = new Date().valueOf();
					var _diffTs = _currentTs - getCacheTs;

					/**
					 * Cache is used to help increase performance by limiting
					 * API calls for data that doens't change all that often.
					 * We store the full HTML formatted dropdown values in the
					 * cache and only refresh that data after a duration specified
					 * in settings. For maths purposes, 3600000 ms = 1 hr.
					 */

					const cacheDurationHrs = parseInt(settings.cacheRefreshDelay) || 6;
					const cacheDurationMs = cacheDurationHrs * 3600000;

					if (_diffTs >= cacheDurationMs) {
						// cache is older than threshold, refresh cache
						refreshCache();
					}
				} else {
					// no timestamp found, refresh cache
					refreshCache();
				}
			} else {
				// no cache currently set, create one
				refreshCache();
			}
		}

		function refreshCache() {
			var scValues = [];
			var people = getPeopleData();

			people.forEach(async (person) => {
				const calendarPerson = normalizeCalendarRosterPerson({
					manager: person.manager,
					team: person.team,
					legacyOrg: person.legacyOrg,
					location: person.shortLocation,
				});

				scValues.push({
					name: person.name,
					value: person.value,
					email: person.email,
					manager: calendarPerson.manager,
					team: calendarPerson.team,
					legacyOrg: calendarPerson.legacyOrg,
					location: calendarPerson.location,
					timeZone: calendarPerson.timeZone,
					description: `${person.description}`,
					descriptionVertical: true,
				});
			});

			var _peopleCache = scValues;
			var _peopleCacheTs = new Date().valueOf();

			GM_SuperValue.set(`${SCRIPT_CACHE_ID}`, _peopleCache);
			GM_SuperValue.set(`${SCRIPT_CACHE_ID}_ts`, _peopleCacheTs);
			GM_SuperValue.set(`${SCRIPT_CACHE_ID}_raw`, people);

			shout("People cache refreshed");
		}

		/**
		 * +========================================================+
		 * |                                                        |
		 * |   ######## #### ######## ##       ########   ######    |
		 * |   ##        ##  ##       ##       ##     ## ##    ##   |
		 * |   ##        ##  ##       ##       ##     ## ##         |
		 * |   ######    ##  ######   ##       ##     ##  ######    |
		 * |   ##        ##  ##       ##       ##     ##       ##   |
		 * |   ##        ##  ##       ##       ##     ## ##    ##   |
		 * |   ##       #### ######## ######## ########   ######    |
		 * |                                                        |
		 * +========================================================+
		 */

		function getPeopleCache() {
			checkCache();
			var _peopleCache = GM_SuperValue.get(`${SCRIPT_CACHE_ID}`);
			return _peopleCache;
		}

		function getSalesManagerNotes() {
			var text = nlapiGetFieldValue("custrecord_screq_sales_manager_notes");
			return text;
		}

		function getRequestDetails() {
			var text = nlapiGetFieldValue("custrecord_screq_details");
			return text;
		}

		function setRequestDetails(text) {
			// prepend text to SC Request Details
			nlapiSetFieldValue("custrecord_screq_details", text + getRequestDetails());
		}

		function getLaunchpadQual() {
			var text = nlapiGetFieldValue("custrecord_bdr_scr_qualifying_questions");
			return text;
		}

		function getLaunchpadNotes() {
			var text = nlapiGetFieldValue("custrecord_bdr_scr_sales_compass_notes");
			return text;
		}

		function getStaffingNotes() {
			var text = nlapiGetFieldValue("custrecord_screq_scmanager_notes_2");
			return text;
		}

		function setStaffingNotes(text) {
			// prepend text to SCM Staffing Notes
			nlapiSetFieldValue("custrecord_screq_scmanager_notes_2", text + getStaffingNotes());
		}

		function getDateNeeded() {
			var text = nlapiGetFieldValue("custrecord_screq_date_sc_needed");
			return text;
		}

		function setDateNeeded(text) {
			// var d = nlapiStringToDate(text, 'MM/DD/YYYY'); // apparently NSCORP wants a date string in M/D/YYYY
			nlapiSetFieldValue("custrecord_screq_date_sc_needed", text);
		}

		function getProducts() {
			var idArray = nlapiGetFieldValues("custrecord_sc_req_products");
			return idArray;
		}

		function setProducts(str) {
			var strArray = str.split(",");
			nlapiSetFieldValues("custrecord_sc_req_products", strArray);
		}

		/**
		 * Convert SC Product selections to corresponding Skills Matrix entries.
		 * @param  {...[int]} idsArray   One or more SC Product internal IDs
		 * @return {[array]}             Array of Skills Matrix internal IDs
		 */
		function getProductSkills(idsArray) {
			var legend = {
				2: "591", // Advanced Electronic Bank Payments
				3: "827", // Advanced Manufacturing
				4: "529", // Advanced Order Management
				5: "957", // AP Automation
				6: "957", // Bill Capture
				7: "956", // CPQ
				8: "834", // Demand Planning
				9: "962", // Disaster Recovery
				10: "985", // Dunning
				53: "988", // E-Invoicing
				12: "982", // EPM FCC
				13: "993", // EPM FF
				14: "990", // EPM NR
				15: "983", // EPM NSAR
				16: "984", // EPM NSPB
				17: "991", // EPM PCM
				18: "992", // EPM Tax
				19: "964", // Field Service Management
				20: "825", // Financial Management
				21: "600", // Fixed Asset Management
				22: "572", // Incentive Compensation
				23: "826", // Inventory Management
				25: "934", // NS Connector
				26: "715", // NS POS
				27: "968", // NSAW
				28: "839", // OneWorld
				29: "840", // OpenAir
				31: "652", // Payroll
				32: "844", // Procurement
				33: "846", // Quality Management
				34: "929", // Rebate Management
				35: "979", // Revenue Management
				38: "708", // SuiteAnalytics Connect
				39: "710", // SuiteBilling
				40: "712", // SuiteCloud Plus
				41: "714", // SuiteCommerce
				42: "657", // SuiteCommerce Instore
				43: "716", // SuiteCommerce MyAccount
				44: "604", // SuitePeople
				45: "845", // SuiteProjects
				46: "974", // Tier
				48: "958", // WFM
				49: "738", // WIP and Routings
				50: "850", // WMS
				51: "739", // Work Orders and Assemblies
			};
			return idsArray.map((id) => {
				if (legend.hasOwnProperty(id)) {
					return legend[id];
				} else {
					shout("getProductSkills: ID not found -> ", id);
				}
			});
		}

		function getRegion(state) {
			if (state === "-N/A-") {
				return "-Review-";
			}

			const eastStates = [
				"ME",
				"NH",
				"VT",
				"MA",
				"CT",
				"RI",
				"NY",
				"PA",
				"NJ",
				"DE",
				"MD",
				"DC",
				"WV",
				"VA",
				"NC",
				"SC",
				"GA",
				"FL",
			];
			const centralStates = [
				"ND",
				"SD",
				"NE",
				"KS",
				"OK",
				"TX",
				"MN",
				"IA",
				"MO",
				"AR",
				"LA",
				"WI",
				"IL",
				"MI",
				"IN",
				"OH",
				"KY",
				"TN",
				"MS",
				"AL",
			];
			const westStates = ["AK", "WA", "OR", "CA", "HI", "MT", "ID", "NV", "WY", "UT", "AZ", "CO", "NM"];
			const canWestStates = ["YT", "BC", "NT", "AB", "SK"];
			const canEastStates = ["NU", "MB", "ON", "QC", "NB", "PE", "NL", "NS"];

			if (eastStates.includes(state)) {
				return "East";
			} else if (centralStates.includes(state)) {
				return "Central";
			} else if (westStates.includes(state)) {
				return "West";
			} else if (canWestStates.includes(state)) {
				return "CAN-West";
			} else if (canEastStates.includes(state)) {
				return "CAN-East";
			} else {
				return "-Review-";
			}
		}

		function getRequestMetadata() {
			var scr = {};

			scr.company = nlapiGetFieldText("custrecord_screq_opp_company") || "-N/A-";
			scr.companyid = nlapiGetFieldValue("custrecord_screq_opp_company") || null;

			// move away from lookupfield and load directly from customer
			let cRec = nlapiLoadRecord("customer", scr.companyid);

			scr.city = cRec.getFieldValue("billcity") || "-N/A-";
			scr.state = cRec.getFieldValue("billstate") || "-N/A-";
			scr.region = getRegion(scr.state);

			scr.opportunity = nlapiGetFieldText("custrecord_screq_opportunity") || "-N/A-";
			scr.opportunityid = nlapiGetFieldValue("custrecord_screq_opportunity") || null;

			scr.salesrep = nlapiGetFieldText("custrecord_screq_opp_salesreproster") || "-N/A-";
			scr.salesmgr = nlapiGetFieldText("custrecord_sales_rep_manager") || "-N/A-";

			scr.industry = nlapiGetFieldValue("custrecord_screq_zoominfo_industry") || "-N/A-";
			scr.subindustry = nlapiGetFieldValue("custrecord_screq_zoominfo_sub_industry") || "-N/A-";

			scr.url = nlapiGetFieldValue("custrecord_screq_customer_web_address") || "-N/A-";
			scr.linkedin = nlapiGetFieldValue("custrecord_screq_linkedin_url") || "-N/A-";

			return scr;
		}

		function getRequestMetadataHtml() {
			var data = getRequestMetadata() || null;

			if (!data) {
				return "";
			}

			var html = /* syntax: html */ `
            <div class="ui segment">
                <div class="ui list">
                    <div class="item">
                        <div class="header">Opportunity</div>
                        <a href="/app/accounting/transactions/opprtnty.nl?id=${data.opportunityid}" target="_blank">${data.opportunity}</a>
                    </div>
                    <div class="item">
                        <div class="header">Company</div>
                        <a href="/app/common/entity/custjob.nl?id=${data.companyid}" target="_blank">${data.company}</a>
                    </div>
                    <div class="item">
                        <div class="header">Company Region</div>
                        ${data.region}: ${data.city}, ${data.state}
                    </div>
                    <div class="item">
                        <div class="header">Industry</div>
                        ${data.industry}
                    </div>
                    <div class="item">
                        <div class="header">Sub-Industry</div>
                        ${data.subindustry}
                    </div>
                    <div class="item">
                        <div class="header">Website</div>
                        <a href="${data.url}" target="_blank">${data.url}</a>
                    </div>
                    <div class="item">
                        <div class="header">LinkedIn</div>
                        <a href="${data.linkedin}" target="_blank">${data.linkedin}</a>
                    </div>
                </div>
            </div>
            `;

			return html;
		}

		function getRequestDataForAI() {
			var data = getRequestMetadata() || null;

			if (!data) {
				return "";
			}

			var scrData = getRequestDetails() || "";
			var lpQual = getLaunchpadQual() || "";

			var textStr = `
            Customer Location: ${data.region}: ${data.city}, ${data.state}.
            Customer Industry & Sub-Industry: ${data.industry} & ${data.subindustry}.
            Request Details: ${scrData}.
            Other Details: ${lpQual}.
            `;
			return textStr;
		}

		function getRequestType() {
			var id = nlapiGetFieldValue("custrecord_screq_type");
			return id;
		}

		function setRequestType() {
			nlapiSetFieldValue("custrecord_screq_type", 19, true);
		}

		function getIndustry() {
			var id = nlapiGetFieldValue("custrecord_screq_industry");
			return id;
		}

		function setIndustry(id) {
			// utility func: set industry to ID
			if (id) {
				nlapiSetFieldValue("custrecord_screq_industry", id, true);
			} else {
				return null;
			}
		}

		function setAssignee(id) {
			// utility func: set assignee to ID
			nlapiSetFieldValue("custrecord_screq_assignee", id, true);
		}

		function setAssigneeJeff() {
			// assignee = Jeff
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.jeff, true);
		}

		function setAssigneeKarl() {
			// assignee = Karl
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.karl, true);
		}

		function setAssigneeRebecca() {
			// assignee = Rebecca
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.rebecca, true);
		}

		function setAssigneeRobyn() {
			// assignee = Robyn
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.robyn, true);
		}

		function setAssigneeMikec() {
			// assignee = Mikec
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.mikec, true);
		}

		function setAssigneeLauren() {
			// assignee = Lauren
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.lauren, true);
		}

		function setAssigneeJason() {
			// assignee = Jason (EPM)
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.jason, true);
		}

		function setAssigneeMe() {
			// assignee = current user roster
			nlapiSetFieldValue("custrecord_screq_assignee", _ids.me, true);
		}

		function setRequesterMe() {
			// requestor = current user roster
			nlapiSetFieldValue("custrecord_screq_requestor", _ids.me, true);
		}

		function setLeadStatus(status) {
			// lead SC = true, T
			var bool = "T";
			if (status !== "on") {
				bool = "F";
			}
			nlapiSetFieldValue("custrecord_screq_assigned_lead", bool);
		}

		function setDeliverable() {
			// Deliverable = Business Discussion
			nlapiSetFieldValue("custrecord_screq_engmnt_deliverable", 53);
		}

		function setTierStatus() {
			// Service Tier Assessment Flag = No
			nlapiSetFieldValue("custrecord_sc_complex_flag", 2);
		}

		function getHashtags() {
			// Get hashtags string
			return nlapiGetFieldValue("custrecord_screq_hashtags") || "";
		}

		function setHashtags(hashtags) {
			// Set hashtags to string
			nlapiSetFieldValue("custrecord_screq_hashtags", hashtags);
		}

		function setSCManagerNotes(scmanagernotes) {
			// set SC Manager Notes 1 to string
			nlapiSetFieldValue("custrecord_screq_scmanager_notes", scmanagernotes);
		}

		function setStatusRequested() {
			// Request Status = Requested
			nlapiSetFieldValue("custrecord_screq_status", 1, true);
		}

		function setStatusStaffed() {
			// Request Status = Staffed
			nlapiSetFieldValue("custrecord_screq_status", 2, true);
		}

		function setStatusHold() {
			// Request status = On Hold
			nlapiSetFieldValue("custrecord_screq_status", 3, true);
		}

		function setStatusCancelled() {
			// Request Status = Cancelled
			// Eng Status = Cancelled
			// prepend text to SC Request Details
			// Lead SC = False, F
			var comment = `SC Request cancelled by SC Manager (${empName}). \nPlease create a new request if needed.\n---\n\n`;
			var request = nlapiGetFieldValue("custrecord_screq_details");
			nlapiSetFieldValue("custrecord_screq_details", comment + request, true);
			nlapiSetFieldValue("custrecord_screq_status", 4, true);
			nlapiSetFieldValue("custrecord_screq_engmnt_status", 5, true);
			nlapiSetFieldValue("custrecord_screq_assigned_lead", "F", true);
		}

		function setXvert() {
			// add hashtag string
			// Xvert = True, T
			var tag = "#xvr,";
			var hashtagFld = nlapiGetFieldValue("custrecord_screq_hashtags");

			// test for value first
			const regex = new RegExp("(#xvr[|,]?)", "gi");
			if (!regex.test(hashtagFld)) {
				nlapiSetFieldValue("custrecord_screq_hashtags", tag + hashtagFld, true);
			}
			nlapiSetFieldValue("custrecord_screq_cross_vertical", "T", true);
		}

		function setEmg() {
			// add hashtag string
			// Xvert = True, T
			var tag = "#emg,";
			var hashtagFld = nlapiGetFieldValue("custrecord_screq_hashtags");

			// test for value first
			const regex = new RegExp("(#emg[|,]?)", "gi");
			if (!regex.test(hashtagFld)) {
				nlapiSetFieldValue("custrecord_screq_hashtags", tag + hashtagFld, true);
			}
		}

		function setRecordCancelled() {
			// button action - cancelled
			setStatusCancelled();
			// shout('Set status to Cancelled, and Assigned To to myself.')
		}

		function setRecordHold() {
			// button action - on hold
			setStatusHold();
			setAssigneeMe();
			// shout('Set status to On Hold, and Assigned To to myself.')
		}

		function setRecordProductsEast() {
			// button action - move to Products East
			setStatusRequested();
			setAssigneeLauren();
			setXvert();
			// shout('Set to xvr, and Assigned To Lauren.')
		}

		function setRecordProductsWest() {
			// button action - move to Products West
			setStatusRequested();
			setAssigneeMikec();
			setXvert();
			// shout('Set to xvr, and Assigned To Mikec.')
		}

		function setRecordGBEast() {
			// button action - move to GB East
			setStatusRequested();
			setAssigneeKarl();
			setXvert();
			// shout('Set to xvr, and Assigned To Karl.')
		}

		function setRecordGBWest() {
			// button action - move to GB West
			setStatusRequested();
			setAssigneeRebecca();
			setXvert();
			// shout('Set to xvr, and Assigned To Rebecca.')
		}

		function setRecordHT() {
			// button action - move to HT
			setStatusRequested();
			setAssigneeJeff();
			setXvert();
			// shout('Set to xvr, and Assigned to Jeff.');
		}

		function setRecordEPM() {
			// button action - move to EPM
			setStatusRequested();
			setAssigneeJason();
			setXvert();
			// shout('Set to xvr, and Assigned to Jason.');
		}

		function openRequestModal() {
			// opens staffing modal form
			$("#scr-modal-request-form").modal("show");
		}

		let calendarDashboardReturnToQuickAssign = false;
		let calendarDashboardLastAssetErrors = [];
		const calendarSelectionOverrides = {};

		function normalizeCalendarRosterState(location) {
			const text = String(location || "").trim();
			const tokens = text.toUpperCase().match(/[A-Z]{2,3}/g) || [];
			const state = tokens.reverse().find((token) => token.length === 2 && token !== "US");
			return state || text || "Unknown";
		}

		function getCalendarManagerTeamName(manager) {
			const text = String(manager || "").trim();
			if (!text) {
				return "";
			}

			if (text.includes(",")) {
				return text.split(",")[0].trim();
			}

			const parts = text.split(/\s+/).filter(Boolean);
			return parts.length > 1 ? parts[parts.length - 1] : text;
		}

		function normalizeCalendarRosterPerson(person = {}) {
			const manager = person.manager || "";
			const location = normalizeCalendarRosterState(person.location || person.state || "");

			return {
				...person,
				manager: manager,
				team: getCalendarManagerTeamName(manager) || person.team || "NetSuite SCs",
				legacyOrg: person.legacyOrg || "NetSuite",
				location: location,
				timeZone: person.timeZone || guessCalendarTimeZone(location),
			};
		}

		function canonicalCalendarName(name) {
			return String(name || "")
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "");
		}

		function inferCalendarEmailFromName(name) {
			const cleanName = getCleanCalendarRosterName(name);
			const knownEmails = {
				ericbaghdasarian: "eric.baghdasarian@oracle.com",
				ericbaghdasrian: "eric.baghdasarian@oracle.com",
			};
			const knownEmail = knownEmails[canonicalCalendarName(cleanName)];

			if (knownEmail) {
				return knownEmail;
			}

			const parts = cleanName
				.toLowerCase()
				.replace(/[^a-z\s-]/g, "")
				.split(/[\s-]+/)
				.filter(Boolean);

			if (parts.length >= 2) {
				return `${parts[0]}.${parts[parts.length - 1]}@oracle.com`;
			}

			return "";
		}

		function getCachedScById(id) {
			const cache = getPeopleCache() || [];
			return cache.find((sc) => String(sc.value) === String(id)) || {};
		}

		function getCachedScByName(name) {
			const cache = getPeopleCache() || [];
			const cleanName = String(name || "").toLowerCase();

			return (
				cache.find((sc) => {
					const candidateName = $("<div>")
						.html(String(sc.name || ""))
						.text()
						.replace(/\s*\(based in .*?\)\s*$/i, "")
						.trim()
						.toLowerCase();
					return candidateName === cleanName;
				}) || {}
			);
		}

		function getSelectedScForCalendar() {
			const value = $("#solutionconsultant").dropdown("get value");

			if (!value) {
				return {
					id: "",
					name: "",
					email: "",
				};
			}

			const match = getCachedScById(value);
			const override = calendarSelectionOverrides[String(value)] || {};
			const displayText = override.name || match.name || $("#solutionconsultant").dropdown("get text") || "";
			const cleanName = $("<div>")
				.html(String(displayText))
				.text()
				.replace(/\s*\(based in .*?\)\s*$/i, "")
				.trim();
			const matchByName = !match.email && !override.email ? getCachedScByName(cleanName) : {};
			const location = override.location || match.location || matchByName.location || getCalendarRosterLocation(displayText);
			const manager = override.manager || match.manager || matchByName.manager || "";
			const team = override.team || match.team || matchByName.team || getCalendarManagerTeamName(manager) || "";
			const legacyOrg = override.legacyOrg || match.legacyOrg || matchByName.legacyOrg || "";

			return {
				id: value,
				name: cleanName,
				email: override.email || match.email || matchByName.email || inferCalendarEmailFromName(cleanName),
				manager: manager,
				team: team,
				legacyOrg: legacyOrg,
				location: normalizeCalendarRosterState(location),
				timeZone: override.timeZone || match.timeZone || matchByName.timeZone || guessCalendarTimeZone(location),
			};
		}

		function dateToDashboardIso(dateObj) {
			if (!(dateObj instanceof Date) || isNaN(dateObj.valueOf())) {
				return "";
			}

			return [
				dateObj.getFullYear(),
				("0" + (dateObj.getMonth() + 1)).slice(-2),
				("0" + dateObj.getDate()).slice(-2),
			].join("-");
		}

		function getDateNeededIsoForDashboard() {
			const dateObj = $("#dateneeded").calendar("get date");
			const calendarDate = dateToDashboardIso(dateObj);

			if (calendarDate) {
				return calendarDate;
			}

			const dateText = $("#dateneeded input").val() || getDateNeeded() || "";
			const match = String(dateText).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

			if (!match) {
				return "";
			}

			return [match[3], ("0" + match[1]).slice(-2), ("0" + match[2]).slice(-2)].join("-");
		}

		function getDateNeededForPrompt() {
			const dateObj = $("#dateneeded").calendar("get date");

			if (dateObj instanceof Date && !isNaN(dateObj.valueOf())) {
				return dateObj.toLocaleDateString("en-US", {
					weekday: "long",
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}

			return $("#dateneeded input").val() || getDateNeeded() || "the selected Date SC Needed";
		}

		function buildOutlookAvailabilityPrompt() {
			const sc = getSelectedScForCalendar();

			if (!sc.id) {
				return null;
			}

			const requestMetadata = getRequestMetadata() || {};

			return [
				"Use the Microsoft Outlook Calendar connector to review calendar availability.",
				"",
				`Employee: ${sc.name || "Selected SC"}`,
				`Email / schedule ID: ${sc.email || "[email not found in NetSuite cache; ask me for it before searching]"}`,
				`Date: ${getDateNeededForPrompt()}`,
				"Window: 8:00 AM to 6:00 PM in the employee mailbox timezone if available; otherwise use Eastern Time.",
				"Meeting lengths to check: 30 minutes and 60 minutes.",
				"",
				`Opportunity: ${requestMetadata.opportunity || "-N/A-"}`,
				`Company: ${requestMetadata.company || "-N/A-"}`,
				`Company region: ${requestMetadata.region || "-N/A-"}`,
				"",
				"Do not create, update, or cancel calendar events.",
				"Return busy blocks, best open windows, and a brief availability recommendation.",
			].join("\n");
		}

		function getSkillCalendarPersonFromElement(element) {
			const $element = $(element);
			const eid = $element.data("eid");
			const name = convertNameFormat($element.data("ename"));
			const email = $element.data("email") || "";
			const location = $element.data("location") || "";
			const timeZone = $element.data("timezone") || guessCalendarTimeZone(location);
			const manager = $element.data("manager") || "";
			const team = $element.data("team") || getCalendarManagerTeamName(manager) || "";
			const legacyOrg = $element.data("legacyorg") || "";
			const cachedSc = getCachedScById(eid);
			const cachedScByName = !email && !cachedSc.email ? getCachedScByName(name) : {};
			const resolvedLocation = location || cachedSc.location || cachedScByName.location || "";
			const resolvedManager = manager || cachedSc.manager || cachedScByName.manager || "";
			const resolvedTeam = team || cachedSc.team || cachedScByName.team || getCalendarManagerTeamName(resolvedManager) || "";

			return {
				id: eid,
				name: name,
				email: email || cachedSc.email || cachedScByName.email || inferCalendarEmailFromName(name),
				manager: resolvedManager,
				team: resolvedTeam,
				legacyOrg: legacyOrg || cachedSc.legacyOrg || cachedScByName.legacyOrg || "Selected",
				location: normalizeCalendarRosterState(resolvedLocation),
				timeZone: timeZone || cachedSc.timeZone || cachedScByName.timeZone || guessCalendarTimeZone(resolvedLocation),
				source: "Skills matrix selection",
			};
		}

		function getSelectedSkillCalendarPeople() {
			const people = [];
			const seen = new Set();

			$(".tableSkillsCalendarSelect:checked").each(function () {
				const person = getSkillCalendarPersonFromElement(this);
				const key = person.email || String(person.id || "");

				if (!key || seen.has(key)) {
					return;
				}

				seen.add(key);
				people.push(person);
			});

			return people;
		}

		function updateSelectedSkillCalendarsButton() {
			const count = $(".tableSkillsCalendarSelect:checked").length;
			const $button = $("#openselectedskillcalendars");

			if (!$button.length) {
				return;
			}

			$button.toggleClass("disabled", count === 0);
			$button.html(`<i class="calendar check outline icon"></i>${count ? `Open ${count} Selected Calendar${count === 1 ? "" : "s"}` : "Open Selected Calendars"}`);
		}

		function copyTextToClipboard(text) {
			if (typeof GM_setClipboard === "function") {
				try {
					GM_setClipboard(text, "text");
					return Promise.resolve();
				} catch (error) {
					return Promise.reject(error);
				}
			}

			if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
				return Promise.reject(new Error("Clipboard API is unavailable."));
			}

			return navigator.clipboard.writeText(text);
		}

		function normalizeCalendarDashboardFileUrl(rawUrl) {
			let value = String(rawUrl || CALENDAR_DASHBOARD_DEFAULT_URL || "").trim();

			if (!value) {
				value = CALENDAR_DASHBOARD_DEFAULT_URL;
			}

			value = value.replace(/^file:\/\/~(?=\/|$)/i, `file://${CALENDAR_DASHBOARD_MAC_HOME_PATH}`);

			if (value === "~") {
				value = CALENDAR_DASHBOARD_MAC_HOME_PATH;
			} else if (value.indexOf("~/") === 0) {
				value = `${CALENDAR_DASHBOARD_MAC_HOME_PATH}/${value.slice(2)}`;
			}

			if (/^[a-z]:[\\/]/i.test(value)) {
				return `file:///${value.replace(/\\/g, "/")}`;
			}

			if (value.indexOf("/") === 0) {
				return `file://${value}`;
			}

			if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
				return value;
			}

			return `file://${value}`;
		}

		function buildCalendarDashboardUrl(context) {
			const baseUrl = settings.calendarDashboardUrl || CALENDAR_DASHBOARD_DEFAULT_URL;
			const normalizedBaseUrl = normalizeCalendarDashboardFileUrl(baseUrl);
			let url;

			try {
				url = new URL(normalizedBaseUrl, window.location.href);
				if (url.protocol !== "file:") {
					shout("Calendar dashboard URL must point to a local file. Falling back to the local default.", baseUrl);
					url = new URL(normalizeCalendarDashboardFileUrl(CALENDAR_DASHBOARD_DEFAULT_URL));
				}
			} catch (error) {
				shout("Invalid calendar dashboard URL configured:", baseUrl);
				url = new URL(normalizeCalendarDashboardFileUrl(CALENDAR_DASHBOARD_DEFAULT_URL));
			}

			const date = context.date || getDateNeededIsoForDashboard();
			const people = Array.isArray(context.people) ? context.people.filter((person) => person && person.email) : [];
			const peopleEmails = people.map((person) => String(person.email || "").trim().toLowerCase()).filter(Boolean);
			const rosterPeople = people.length ? people : context.email ? [context] : [];
			const rosterPayload = rosterPeople
				.map((person) => normalizeCalendarRosterPerson(person))
				.filter((person) => person.email);

			if (peopleEmails.length > 0) {
				url.searchParams.set("consultants", peopleEmails.join(","));
			} else if (context.email) {
				url.searchParams.set("consultant", context.email);
			}
			if (rosterPayload.length > 0) {
				url.searchParams.set("roster", JSON.stringify(rosterPayload));
			}
			if (context.name && peopleEmails.length <= 1) {
				url.searchParams.set("consultantName", context.name);
			}
			if (date) {
				url.searchParams.set("date", date);
			}
			if (context.skill) {
				url.searchParams.set("skill", context.skill);
			}
			if (context.timeZone) {
				url.searchParams.set("zone", context.timeZone);
			}
			url.searchParams.set("duration", context.duration || "60");
			url.searchParams.set("source", "scr-assistant");

			return url.toString();
		}

		function getCleanCalendarRosterName(name) {
			return $("<div>")
				.html(String(name || ""))
				.text()
				.replace(/\s*\(based in .*?\)\s*$/i, "")
				.trim();
		}

		function getCalendarRosterLocation(name) {
			const match = String(name || "").match(/\(based in ([^)]+)\)/i);
			return match ? match[1] : "";
		}

		function guessCalendarTimeZone(location) {
			const text = String(location || "").toUpperCase();

			if (/(^|[-\s])(CA|WA|OR|NV|AK|HI)(\b|[-\s])/.test(text)) {
				return "America/Los_Angeles";
			}
			if (/(^|[-\s])(TX|IL|WI|MN|IA|MO|KS|NE|ND|SD|OK|AR|LA|MS|AL|TN)(\b|[-\s])/.test(text)) {
				return "America/Chicago";
			}
			if (/(^|[-\s])(AZ|CO|ID|MT|NM|UT|WY)(\b|[-\s])/.test(text)) {
				return "America/Denver";
			}

			return "America/New_York";
		}

		function getCalendarDashboardPeopleData() {
			var people = [];
			var filters = [];

			filters.push(new nlobjSearchFilter("custrecord_emproster_rosterstatus", null, "is", 1));
			filters.push(new nlobjSearchFilter("custrecord_emproster_eminactive", null, "is", "F"));
			filters.push(new nlobjSearchFilter("custrecord_emproster_sales_qb", null, "is", 25));
			filters.push(new nlobjSearchFilter("custrecord_emproster_rdept", null, "is", 482));

			var columns = [];
			columns.push(new nlobjSearchColumn("custrecord_emproster_firstname"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_lastname"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_olocation"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_mgrroster"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_salesteam"));
			columns.push(new nlobjSearchColumn("custrecord_emproster_vertical_amo"));
			columns.push(new nlobjSearchColumn("email", "custrecord_emproster_emp"));

			try {
				var results = nlapiSearchRecord("customrecord_emproster", null, filters, columns);

				if (!results || results.length < 1) {
					return people;
				}

				for (var i = 0; i < results.length; i++) {
					const first = results[i].getValue("custrecord_emproster_firstname") || "";
					const last = results[i].getValue("custrecord_emproster_lastname") || "";
					const location = normalizeCalendarRosterState(extractLocationString(results[i].getText("custrecord_emproster_olocation") || ""));
					const manager = results[i].getText("custrecord_emproster_mgrroster") || "";

					people.push({
						name: `${first} ${last}`.trim(),
						email: results[i].getValue("email", "custrecord_emproster_emp"),
						manager: manager,
						location: location,
						team: getCalendarManagerTeamName(manager) || results[i].getText("custrecord_emproster_salesteam") || "NetSuite SCs",
						legacyOrg: results[i].getText("custrecord_emproster_vertical_amo") || "NetSuite",
						timeZone: guessCalendarTimeZone(location),
					});
				}
			} catch (error) {
				shout("Unable to build full calendar dashboard roster:", error);
			}

			return people;
		}

		function buildCalendarDashboardRoster(context = {}) {
			const roster = [];
			const indexByEmail = {};

			function addPerson(person) {
				const email = String(person.email || "").trim().toLowerCase();

				if (!email) {
					return;
				}

				const normalized = normalizeCalendarRosterPerson({
					name: person.name || email,
					email: email,
					manager: person.manager || "",
					team: person.team || "",
					legacyOrg: person.legacyOrg || "",
					location: person.location || person.state || "",
					timeZone: person.timeZone || "",
					source: person.source || "",
				});

				if (Object.prototype.hasOwnProperty.call(indexByEmail, email)) {
					roster[indexByEmail[email]] = {
						...roster[indexByEmail[email]],
						...normalized,
					};
					return;
				}

				indexByEmail[email] = roster.length;
				roster.push(normalized);
			}

			const contextPeople = Array.isArray(context.people) ? context.people : [];
			const isFocusedLaunch = Boolean(context.email || contextPeople.length);
			const dashboardPeople = isFocusedLaunch ? [] : getCalendarDashboardPeopleData();

			contextPeople.forEach((person) => {
				addPerson(person);
			});

			dashboardPeople.forEach((person) => {
				addPerson(person);
			});

			if (!isFocusedLaunch && !dashboardPeople.length) {
				shout("Falling back to filtered SC cache for calendar dashboard roster.");
			}

			if (!isFocusedLaunch && !dashboardPeople.length) {
				(getPeopleCache() || []).forEach((person) => {
					const cleanName = getCleanCalendarRosterName(person.name);
					const location = getCalendarRosterLocation(person.name);

					addPerson({
						name: cleanName,
						email: person.email,
						manager: person.manager || "",
						team: person.team || "",
						legacyOrg: person.legacyOrg || "",
						location: person.location || location,
						timeZone: person.timeZone || "",
					});
				});
			}

			if (context.email) {
				addPerson({
					name: context.name || context.email,
					email: context.email,
					manager: context.manager || "",
					team: context.team || "",
					legacyOrg: context.legacyOrg || "",
					location: context.location || context.state || "",
					timeZone: context.timeZone || "",
					source: context.source || "Focused consultant",
				});
			}

			return roster;
		}

		function resolveCalendarDashboardAssetUrl(dashboardUrl, assetName) {
			try {
				const configuredScriptUrl = String(settings.calendarLocalScriptUrl || "").trim();
				const baseUrl = assetName === "direct-connector-events.js" && configuredScriptUrl
					? configuredScriptUrl
					: String(dashboardUrl || settings.calendarDashboardUrl || CALENDAR_DASHBOARD_DEFAULT_URL || "").trim();
				const normalizedBaseUrl = normalizeCalendarDashboardFileUrl(baseUrl);
				const assetUrl = new URL(normalizedBaseUrl, window.location.href);
				if (assetUrl.protocol !== "file:") {
					shout("Calendar dashboard assets must be local files:", assetUrl.href);
					return "";
				}

				if (assetName === "direct-connector-events.js" && configuredScriptUrl) {
					assetUrl.search = "";
					assetUrl.hash = "";
					return assetUrl.href;
				}

				const pathParts = assetUrl.pathname.split("/");
				pathParts[pathParts.length - 1] = assetName;
				assetUrl.pathname = pathParts.join("/");
				assetUrl.search = "";
				assetUrl.hash = "";
				return assetUrl.href;
			} catch (error) {
				shout("Unable to resolve calendar dashboard asset URL:", assetName, error);
				return "";
			}
		}

		function loadDashboardAssetViaRequest(assetUrl) {
			return new Promise((resolve, reject) => {
				if (!assetUrl) {
					reject(new Error("No asset URL provided."));
					return;
				}

				if (typeof GM_xmlhttpRequest === "function") {
					GM_xmlhttpRequest({
						method: "GET",
						url: assetUrl,
						timeout: 10000,
						onload: function (response) {
							const status = Number(response.status || 0);
							if ((status >= 200 && status < 300) || status === 0) {
								resolve(response.responseText || "");
								return;
							}
							reject(new Error(`Request failed with HTTP ${status}`));
						},
						onerror: function (error) {
							reject(error instanceof Error ? error : new Error("Request failed."));
						},
						ontimeout: function () {
							reject(new Error("Request timed out."));
						},
					});
					return;
				}

				if (typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function") {
					GM.xmlHttpRequest({
						method: "GET",
						url: assetUrl,
						timeout: 10000,
					})
						.then((response) => {
							const status = Number(response.status || 0);
							if ((status >= 200 && status < 300) || status === 0) {
								resolve(response.responseText || "");
								return;
							}
							reject(new Error(`Request failed with HTTP ${status}`));
						})
						.catch(reject);
					return;
				}

				reject(new Error("GM_xmlhttpRequest is unavailable."));
			});
		}

		async function getCalendarDashboardAssetText(assetName, dashboardUrl) {
			const assetUrl = resolveCalendarDashboardAssetUrl(dashboardUrl, assetName);

			if (assetUrl) {
				try {
					const text = await loadDashboardAssetViaRequest(assetUrl);
					if (text && text.trim().length > 0) {
						shout(`Loaded ${assetName} from configured dashboard folder:`, assetUrl);
						return {
							text,
							source: assetUrl,
							};
						}
					} catch (error) {
					shout(`Unable to load ${assetName} from configured dashboard folder. Local dashboard files are required.`, {
						assetUrl,
						error: error && error.message ? error.message : String(error),
					});
					calendarDashboardLastAssetErrors.push({
						assetName,
						assetUrl,
						error: error && error.message ? error.message : String(error),
					});
				}
			}

			return {
				text: "",
				source: assetUrl || "not resolved",
			};
		}

		async function buildEmbeddedCalendarDashboardHtml(url, context = {}) {
			calendarDashboardLastAssetErrors = [];

			const htmlAsset = await getCalendarDashboardAssetText("staffing-dashboard.html", url);
			const eventsAsset = await getCalendarDashboardAssetText("direct-connector-events.js", url);
			let html = htmlAsset.text;
			let eventsScript = eventsAsset.text;

			if (!html || !eventsScript) {
				shout("Calendar dashboard local files could not be loaded for embedded launch.", {
					htmlSource: htmlAsset.source,
					eventsSource: eventsAsset.source,
					hasHtml: Boolean(html),
					hasEvents: Boolean(eventsScript),
				});
				return "";
			}

			const focusEmail = context.email ? String(context.email).trim().toLowerCase() : "";
			const focusedAvailabilityOverride = CALENDAR_FOCUSED_AVAILABILITY_OVERRIDES[focusEmail] || null;

			if (focusedAvailabilityOverride) {
				eventsScript += `
window.DIRECT_CONNECTOR_LOADED_EMAILS = Array.isArray(window.DIRECT_CONNECTOR_LOADED_EMAILS) ? window.DIRECT_CONNECTOR_LOADED_EMAILS : [];
if (!window.DIRECT_CONNECTOR_LOADED_EMAILS.includes(${JSON.stringify(focusEmail)})) {
  window.DIRECT_CONNECTOR_LOADED_EMAILS.push(${JSON.stringify(focusEmail)});
}
window.DIRECT_CONNECTOR_AVAILABILITY = Array.isArray(window.DIRECT_CONNECTOR_AVAILABILITY) ? window.DIRECT_CONNECTOR_AVAILABILITY : [];
window.DIRECT_CONNECTOR_AVAILABILITY.push(${JSON.stringify({ email: focusEmail, ...focusedAvailabilityOverride })});
`;
			}

			eventsScript += `
window.SCR_ASSISTANT_DASHBOARD_ASSET_SOURCE = ${JSON.stringify({
				html: htmlAsset.source,
				events: eventsAsset.source,
			})};
`;

			html = html.replace(
				/<script\s+src=["']direct-connector-events\.js["']>\s*<\/script>/i,
				`<script>\n${eventsScript}\n</script>`,
			);

			if (!html.includes("SCR_ASSISTANT_LAUNCH_SEARCH || window.location.search")) {
				html = html.replace(
					"new URLSearchParams(window.location.search)",
					"new URLSearchParams(window.SCR_ASSISTANT_LAUNCH_SEARCH || window.location.search)",
				);
			}
			html = html.replace('<label for="planningZone">Planning Zone</label>', '<label for="planningZone">Time Zone</label>');
			if (!html.includes('value="America/Denver"')) {
				html = html.replace(
					'<option value="America/New_York">Eastern (ET)</option>',
					`<option value="America/New_York">Eastern (ET)</option>
          <option value="America/Denver">Mountain (MT)</option>
          <option value="America/Los_Angeles">Pacific (PT)</option>`,
				);
			}
			html = html.replace(
				`function getZoneLabel(zone) {
      return zone === "America/New_York" ? "Eastern (ET)" : "Central (CT)";
    }`,
				`function getZoneLabel(zone) {
      const zoneLabels = {
        "America/New_York": "Eastern (ET)",
        "America/Chicago": "Central (CT)",
        "America/Denver": "Mountain (MT)",
        "America/Los_Angeles": "Pacific (PT)"
      };
      return zoneLabels[zone] || zone;
    }`,
			);
			html = html
				.replace(
					/\s*<div class="control">\s*<label for="skillFilter">Product Skill<\/label>[\s\S]*?<datalist id="skillOptions"><\/datalist>\s*<\/div>/,
					"",
				)
				.replace(
					/\s*<div class="control">\s*<label for="skillsFileInput">Skills CSV<\/label>[\s\S]*?<input id="skillsFileInput" type="file" accept="\.csv,text\/csv" hidden \/>\s*<\/div>/,
					"",
				)
				.replace(/\s*<div class="subtle" id="skillStatusLabel">[\s\S]*?<\/div>/, "")
				.replace(/\s*<th>Skill Match<\/th>/, "")
				.replace(/\s*<td>\$\{skillMatchHtml\(row\)\}<\/td>/, "")
				.replace('body.innerHTML = `<tr><td colspan="8" class="subtle">No consultants match the current filters.</td></tr>`;', 'body.innerHTML = `<tr><td colspan="7" class="subtle">No consultants match the current filters.</td></tr>`;')
				.replace('const skillQuery = document.getElementById("skillFilter").value.trim();', 'const skillQuery = "";')
				.replace('${row.team} - ${getZoneLabel(row.timeZone)}${row.skillRating ? ` - skill ${row.skillRating}` : ""}', '${row.team} - ${getZoneLabel(row.timeZone)}')
				.replace(
					`      const skill = params.get("skill");
      if (skill) document.getElementById("skillFilter").value = skill;

`,
					"",
				)
				.replace(
					`      document.getElementById("loadSkillsButton").addEventListener("click", () => {
        document.getElementById("skillsFileInput").click();
      });
`,
					"",
					)
						.replace('      document.getElementById("skillsFileInput").addEventListener("change", handleSkillFileSelected);\n', "")
						.replace('        "skillFilter",\n', "")
						.replace('      document.getElementById("skillFilter").addEventListener("input", renderAll);\n', "")
						.replace("    loadSkillCache();\n", "");
			if (!html.includes(".pill.ot-warning")) {
				html = html.replace(
					".pill.unknown { color: #485564; background: #edf1f5; border-color: #cfd8e1; }",
					`.pill.unknown { color: #485564; background: #edf1f5; border-color: #cfd8e1; }
    .pill.ot-warning { color: #fff; background: #c74734; border-color: #a52f24; }`,
				);
			}
			if (!html.includes("function hasOvertimeWarning")) {
				html = html.replace(
					`function addMinutes(date, minutes) {`,
					`function getLocalMinutesOfDay(date, timeZone) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      }).formatToParts(date).reduce((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});
      const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
      return hour * 60 + Number(parts.minute || 0);
    }

    function hasOvertimeWarning(person, windowConfig) {
      const zone = person?.timeZone || windowConfig.timeZone;
      const localStart = getLocalMinutesOfDay(windowConfig.meetingStart, zone);
      const localEnd = getLocalMinutesOfDay(windowConfig.meetingEnd, zone);
      return localStart < 7 * 60 + 45 || localEnd > 17 * 60 + 30;
    }

    function addMinutes(date, minutes) {`,
				);
			}
			html = html
				.replace(
					`other,
        rank,`,
					`other,
        otWarning: hasOvertimeWarning(person, windowConfig),
        rank,`,
				)
				.replace(
					`<td><span class="pill \${row.pill}">\${row.label}</span></td>`,
					`<td>
              <span class="pill \${row.pill}">\${row.label}</span>
              \${row.otWarning ? \`<span class="pill ot-warning">OT WARNING</span>\` : ""}
            </td>`,
				);
				if (!html.includes("function inferTimeZoneFromAvailabilityStart")) {
					html = html.replace(
					"function addCalendarDataRosterEntries() {",
					`function inferTimeZoneFromAvailabilityStart(email) {
      const normalized = normalizeEmail(email);
      const snapshot = DIRECT_CONNECTOR_AVAILABILITY.find(item => normalizeEmail(item.email) === normalized);
      if (!snapshot?.start) return "";

      const date = new Date(snapshot.start);
      if (Number.isNaN(date.valueOf())) return "";

      const zones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles"
      ];

      return zones.find(zone => {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        }).formatToParts(date).reduce((acc, part) => {
          if (part.type !== "literal") acc[part.type] = part.value;
          return acc;
        }, {});

        return (parts.hour === "00" || parts.hour === "24") && parts.minute === "00";
      }) || "";
    }

    function setPlanningZoneForPerson(person) {
      if (!person?.timeZone) return false;
      return setSelectValue("planningZone", person.timeZone);
    }

    function syncPlanningZoneToSelectedConsultant() {
      const email = getSelectedConsultantEmail();
      const person = email ? rosterByEmail[email] : null;
      return setPlanningZoneForPerson(person);
    }

    function addCalendarDataRosterEntries() {`,
				);
			}
			html = html
				.replace(
					'timeZone: person.timeZone || "America/New_York",',
					'timeZone: person.timeZone || inferTimeZoneFromAvailabilityStart(email) || "America/New_York",',
				)
				.replace(
					`legacyOrg: "Direct",
          source: "Calendar data"`,
					`legacyOrg: "Direct",
          timeZone: inferTimeZoneFromAvailabilityStart(email),
          source: "Calendar data"`,
				)
				.replace(
					`legacyOrg: options.legacyOrg || "Direct",
          source: options.source || "Focused consultant"`,
					`legacyOrg: options.legacyOrg || "Direct",
          timeZone: options.timeZone || inferTimeZoneFromAvailabilityStart(focusEmail),
          source: options.source || "Focused consultant"`,
				)
				.replace(
					'document.getElementById("planningZone").value = launchedPerson.timeZone;',
					"setPlanningZoneForPerson(launchedPerson);",
				)
				.replace(
					`setSelectValue("personFilter", params.get("consultant") || params.get("person") || params.get("email"));
      }`,
					`setSelectValue("personFilter", params.get("consultant") || params.get("person") || params.get("email"));
        syncPlanningZoneToSelectedConsultant();
      }`,
				);
			if (!html.includes('personFilter").addEventListener("change", () => {\n        syncPlanningZoneToSelectedConsultant();')) {
				html = html.replace(
					'document.getElementById("copyDebugButton")?.addEventListener("click", copyDebugConsole);',
					`document.getElementById("copyDebugButton")?.addEventListener("click", copyDebugConsole);
      document.getElementById("personFilter").addEventListener("change", () => {
        syncPlanningZoneToSelectedConsultant();
        renderAll();
      });`,
				);
			}
			html = html.replace('        "personFilter",\n', "");
			html = html.replace(
				/function renderAlternateSlots\(\) \{[\s\S]*?\n    function getDayWindow\(\) \{/,
				`function renderAlternateSlots() {
      const selectedStart = Number(document.getElementById("meetingStart").value);
      const selectedDuration = Number(document.getElementById("meetingDuration").value);
      const container = document.getElementById("alternateSlots");
      const candidates = [];
      const workdayStart = 8 * 60;
      const workdayEnd = 17 * 60;
      const lastStart = Math.max(workdayStart, workdayEnd - selectedDuration);

      for (let start = workdayStart; start <= lastStart; start += 30) {
        const windowConfig = getWindow(start);
        const rows = getAvailabilityRows(windowConfig);
        const clean = rows.filter(row => row.rank === 0);
        if (!clean.length) continue;
        const noHardMeeting = rows.filter(row => row.calendarLoaded && row.hardMeeting === 0);
        const bufferRisk = rows.filter(row => row.rank === 3);
        const soft = rows.filter(row => row.rank === 1);
        const partial = rows.filter(row => !row.calendarLoaded);
        candidates.push({ start, windowConfig, rows, clean, noHardMeeting, bufferRisk, soft, partial });
      }

      candidates.sort((a, b) => a.start - b.start);

      if (!candidates.length) {
        container.innerHTML = '<div class="subtle">No open ' + selectedDuration + '-minute slots match the current consultant, date, and buffer.</div>';
        return;
      }

      container.innerHTML = candidates.map(candidate => {
        const names = candidate.clean.slice(0, 3).map(row => row.name).join(", ");
        const selectedClass = candidate.start === selectedStart ? " selected" : "";
        return [
          '<button class="alt-slot' + selectedClass + '" type="button" data-start="' + candidate.start + '">',
          '<div class="alt-top">',
          '<strong>' + formatTimeRange(candidate.windowConfig.meetingStart, candidate.windowConfig.meetingEnd, candidate.windowConfig.timeZone) + '</strong>',
          '<span class="pill available">' + candidate.clean.length + ' open</span>',
          '</div>',
          '<div class="subtle">' + candidate.noHardMeeting.length + ' loaded without hard meeting conflict; ' + candidate.bufferRisk.length + ' buffer risks; ' + candidate.soft.length + ' soft; ' + candidate.partial.length + ' snapshot gaps</div>',
          '<div class="subtle">' + names + '</div>',
          '</button>'
        ].join("");
      }).join("");

      container.querySelectorAll("button[data-start]").forEach(button => {
        button.addEventListener("click", () => {
          document.getElementById("meetingStart").value = button.dataset.start;
          renderAll();
        });
      });
    }

    function getDayWindow() {`,
			);
			if (!html.includes("DIRECT_CONNECTOR_AVAILABILITY.filter(snapshot => String(snapshot.email")) {
				html = html.replace(
					"DIRECT_CONNECTOR_AVAILABILITY.forEach(snapshot => {",
					`(window.SCR_ASSISTANT_FOCUS_EMAIL
        ? DIRECT_CONNECTOR_AVAILABILITY.filter(snapshot => String(snapshot.email || "").toLowerCase() === window.SCR_ASSISTANT_FOCUS_EMAIL)
        : DIRECT_CONNECTOR_AVAILABILITY
      ).forEach(snapshot => {`,
				);
			}
			if (!html.includes(".filter(event => !focusEmail || String(event.email")) {
				html = html.replace(
					"return [...embeddedEvents, ...DIRECT_CONNECTOR_EVENTS, ...expandConnectorAvailability()]",
					`const focusEmail = window.SCR_ASSISTANT_FOCUS_EMAIL || "";
      return [...embeddedEvents, ...DIRECT_CONNECTOR_EVENTS, ...expandConnectorAvailability()]
        .filter(event => !focusEmail || String(event.email || "").toLowerCase() === focusEmail)`,
				);
			}
			if (!html.includes("cached.events.filter(event => String(event.email")) {
				html = html.replace(
					"rawEvents = cached.events;",
					`const focusEmail = window.SCR_ASSISTANT_FOCUS_EMAIL || "";
        rawEvents = focusEmail
          ? cached.events.filter(event => String(event.email || "").toLowerCase() === focusEmail)
          : cached.events;`,
				);
			}
			if (!html.includes("if (!window.SCR_ASSISTANT_FOCUS_EMAIL)") && !html.includes("if (!focusEmail)")) {
				html = html.replace(
					"writeCalendarCache(rawEvents, lastRefreshAt.toISOString());",
					`if (!window.SCR_ASSISTANT_FOCUS_EMAIL) {
          writeCalendarCache(rawEvents, lastRefreshAt.toISOString());
        }`,
				);
			}
			if (html.includes("populatePersonFilter();\n    refreshCalendarData();\n    loadSkillCache();\n    applyLaunchParams();")) {
				html = html.replace(
					"populatePersonFilter();\n    refreshCalendarData();\n    loadSkillCache();\n    applyLaunchParams();",
					"populatePersonFilter();\n    loadSkillCache();\n    applyLaunchParams();\n    refreshCalendarData();",
				);
			}
			if (!html.includes("function normalizeEmail(value)")) {
				html = html.replace(
					"function refreshCalendarData(options = {}) {",
					`function normalizeEmail(value) {
      return String(value || "").trim().toLowerCase();
    }

    function getSelectedConsultantEmail() {
      const selected = normalizeEmail(document.getElementById("personFilter")?.value);
      return selected && selected !== "all" ? selected : "";
    }

    function getCalendarFocusEmail(options = {}) {
      return normalizeEmail(
        options.focusEmail ||
        window.SCR_ASSISTANT_FOCUS_EMAIL ||
        (options.includeSelected ? getSelectedConsultantEmail() : "")
      );
    }

    function getCalendarFocusPerson(options = {}) {
      const email = getCalendarFocusEmail(options);
      return email ? rosterByEmail[email] || { name: email, email } : null;
    }

    function isFocusedConsultant(person) {
      const focusEmail = getCalendarFocusEmail({ includeSelected: true });
      return Boolean(person && focusEmail && normalizeEmail(person.email) === focusEmail);
    }

    function missingCalendarLabel(person) {
      return isFocusedConsultant(person) ? "Needs connector import" : "Snapshot gap";
    }

    function missingCalendarSentence(person) {
      if (isFocusedConsultant(person)) {
        return \`No Outlook connector data has been imported for \${person.name || person.email}. Import this consultant's calendar data before treating this as open time.\`;
      }

      return "This consultant still needs 3-week Outlook snapshot data before treating this as open time.";
    }

    function missingCalendarSubtle(person) {
      return isFocusedConsultant(person) ? "connector import needed" : "calendar not loaded";
    }

    function refreshCalendarData(options = {}) {`,
				);
			}
			if (html.includes("function expandConnectorAvailability() {")) {
				html = html.replace(
					"function expandConnectorAvailability() {",
					"function expandConnectorAvailability(focusEmail = getCalendarFocusEmail({ includeSelected: false })) {",
				);
			}
			html = html.replace(
				`(window.SCR_ASSISTANT_FOCUS_EMAIL
        ? DIRECT_CONNECTOR_AVAILABILITY.filter(snapshot => String(snapshot.email || "").toLowerCase() === window.SCR_ASSISTANT_FOCUS_EMAIL)
        : DIRECT_CONNECTOR_AVAILABILITY
      ).forEach(snapshot => {`,
				`(focusEmail
        ? DIRECT_CONNECTOR_AVAILABILITY.filter(snapshot => String(snapshot.email || "").toLowerCase() === focusEmail)
        : DIRECT_CONNECTOR_AVAILABILITY
      ).forEach(snapshot => {`,
			);
			html = html.replace(
				`function cloneEmbeddedEvents() {
      const seen = new Set();
      const focusEmail = window.SCR_ASSISTANT_FOCUS_EMAIL || "";
      return [...embeddedEvents, ...DIRECT_CONNECTOR_EVENTS, ...expandConnectorAvailability()]`,
				`function cloneEmbeddedEvents(focusEmail = getCalendarFocusEmail({ includeSelected: false })) {
      const seen = new Set();
      return [...embeddedEvents, ...DIRECT_CONNECTOR_EVENTS, ...expandConnectorAvailability(focusEmail)]`,
			);
			html = html.replace(
				`const force = Boolean(options.force);
      const cached = readCalendarCache();`,
				`const force = Boolean(options.force);
      const focusEmail = getCalendarFocusEmail({ focusEmail: options.focusEmail, includeSelected: false });
      const cached = readCalendarCache();`,
			);
			if (!html.includes("let lastDebugText")) {
				html = html.replace("let skillsByEmail = new Map();", `let skillsByEmail = new Map();
    let lastDebugText = "";`);
			}
			if (!html.includes("calendarActivityLog")) {
				html = html.replace(
					`let lastDebugText = "";`,
					`let lastDebugText = "";
    let calendarActivityLog = [];

    function logCalendarActivity(step, details = {}) {
      calendarActivityLog.unshift({
        at: new Date().toISOString(),
        step,
        ...details
      });
      calendarActivityLog = calendarActivityLog.slice(0, 25);
    }`,
				);
				html = html.replace(
					`function getSelectedConsultantEmail() {`,
					`function getScopedRecordCounts(email, selectedEmails = getLaunchSelectedEmailSet()) {
      const normalized = normalizeEmail(email);
      const selected = selectedEmails instanceof Set ? selectedEmails : new Set(selectedEmails || []);
      const inScope = record => {
        const recordEmail = normalizeEmail(record.email);
        if (normalized) return recordEmail === normalized;
        if (selected.size) return selected.has(recordEmail);
        return true;
      };

      return {
        scope: normalized || (selected.size ? [...selected] : "all"),
        embeddedEvents: embeddedEvents.filter(inScope).length,
        directConnectorEvents: DIRECT_CONNECTOR_EVENTS.filter(inScope).length,
        directConnectorAvailabilitySnapshots: DIRECT_CONNECTOR_AVAILABILITY.filter(inScope).length,
        cacheEvents: (() => {
          const cached = readCalendarCache();
          return cached ? cached.events.filter(inScope).length : 0;
        })()
      };
    }

    function getSelectedConsultantEmail() {`,
				);
				html = html.replace(
					`const cacheIsFresh = cached && Date.now() - Number(cached.cachedAt || cached.refreshedAt) < CACHE_TTL_MS;`,
					`const cacheIsFresh = cached && Date.now() - Number(cached.cachedAt || cached.refreshedAt) < CACHE_TTL_MS;
      const selectedEmailList = [...selectedEmails];

      logCalendarActivity("refresh-start", {
        force,
        focusEmail: focusEmail || "",
        selectedEmails: selectedEmailList,
        cacheAvailable: Boolean(cached),
        cacheIsFresh: Boolean(cacheIsFresh),
        scopedRecordCountsBeforeRefresh: getScopedRecordCounts(focusEmail, selectedEmails)
      });`,
				);
				html = html.replace(
					`refreshSource = "cache";`,
					`refreshSource = "cache";
        logCalendarActivity("cache-hit", {
          refreshSource,
          rawEvents: rawEvents.length,
          cachedAt: cached.cachedAt ? new Date(cached.cachedAt).toISOString() : null,
          refreshedAt: cached.refreshedAt || null
        });`,
				);
				html = html.replace(
					`: (force ? "manual refresh" : "snapshot refresh");
        if (!focusEmail && !selectedEmails.size) {`,
					`: (force ? "manual refresh" : "snapshot refresh");
        logCalendarActivity("snapshot-refresh", {
          refreshSource,
          rawEvents: rawEvents.length,
          focusedRefresh: Boolean(focusEmail),
          selectedRefresh: Boolean(selectedEmails.size)
        });
        if (!focusEmail && !selectedEmails.size) {`,
				);
				html = html.replace(
					`writeCalendarCache(rawEvents, lastRefreshAt.toISOString());`,
					`writeCalendarCache(rawEvents, lastRefreshAt.toISOString());
          logCalendarActivity("cache-write", {
            eventsCached: rawEvents.length,
            refreshedAt: lastRefreshAt.toISOString()
          });`,
				);
				html = html.replace(
					`normalizedEvents = normalizeEvents(rawEvents);
      renderRefreshState();`,
					`normalizedEvents = normalizeEvents(rawEvents);
      logCalendarActivity("normalize-complete", {
        rawEvents: rawEvents.length,
        normalizedEvents: normalizedEvents.length,
        scopedRecordCountsAfterRefresh: getScopedRecordCounts(focusEmail, selectedEmails)
      });
      if ((focusEmail || selectedEmails.size) && rawEvents.length === 0) {
        logCalendarActivity("no-calendar-records-found", {
          focusEmail: focusEmail || "",
          selectedEmails: selectedEmailList,
          note: "No local snapshot, imported Outlook connector event, free/busy availability snapshot, or cache records were found for this refresh scope."
        });
      }
      renderRefreshState();`,
				);
			html = html.replace(
				`likelyIssue = "The consultant is in the roster, but no calendar snapshot, direct connector events, free/busy availability, or cache records exist for this email.";`,
				`likelyIssue = "The consultant is in the roster, but no local snapshot, imported Outlook connector events, free/busy availability snapshot, or cache records exist for this email yet. Import this consultant's Outlook calendar data and reload the dashboard.";`,
			);
			html = html.replace(
				`const debugEmail = focusEmail || selectedEmail;`,
				`const launchSelectedEmails = getLaunchSelectedEmails();
      const debugEmail = focusEmail || selectedEmail || (launchSelectedEmails.length === 1 ? launchSelectedEmails[0] : "");`,
			);
			html = html.replace(
				`lastRefreshAt: lastRefreshAt ? lastRefreshAt.toISOString() : null
        },
        likelyIssue`,
					`lastRefreshAt: lastRefreshAt ? lastRefreshAt.toISOString() : null
        },
        activityLog: calendarActivityLog,
        likelyIssue`,
				);
			}
			if (!html.includes("missing-selected-consultants")) {
				html = html.replace(
					"</body>",
					`<script>
(function () {
  if (typeof normalizeEmail !== "function" || typeof getLaunchSelectedEmails !== "function") return;

  function runtimeSelectedEmails() {
    return getLaunchSelectedEmails().filter(Boolean);
  }

  function runtimeRecordCount(records, email) {
    return typeof countCalendarRecordsForEmail === "function"
      ? countCalendarRecordsForEmail(records, email)
      : 0;
  }

  const originalHasLoadedCalendar = hasLoadedCalendar;
  hasLoadedCalendar = function (person) {
    const email = normalizeEmail(person && person.email);
    return Boolean(email) && (
      originalHasLoadedCalendar(person)
      || runtimeRecordCount(embeddedEvents, email) > 0
      || runtimeRecordCount(DIRECT_CONNECTOR_EVENTS, email) > 0
      || runtimeRecordCount(DIRECT_CONNECTOR_AVAILABILITY, email) > 0
      || runtimeRecordCount(rawEvents, email) > 0
    );
  };

  function runtimeIsSelectedLaunchConsultant(person) {
    const email = normalizeEmail(person && person.email);
    return Boolean(email && runtimeSelectedEmails().includes(email));
  }

  function runtimeIsPendingSelected(person) {
    return Boolean(person && !hasLoadedCalendar(person) && (isFocusedConsultant(person) || runtimeIsSelectedLaunchConsultant(person)));
  }

  const originalMissingCalendarLabel = missingCalendarLabel;
  missingCalendarLabel = function (person) {
    return runtimeIsPendingSelected(person) ? "Needs connector import" : originalMissingCalendarLabel(person);
  };

  const originalMissingCalendarSentence = missingCalendarSentence;
  missingCalendarSentence = function (person) {
    return runtimeIsPendingSelected(person)
      ? \`No Outlook connector data has been imported for \${person.name || person.email}. Import this consultant's calendar data before treating this as open time.\`
      : originalMissingCalendarSentence(person);
  };

  const originalMissingCalendarSubtle = missingCalendarSubtle;
  missingCalendarSubtle = function (person) {
    return runtimeIsPendingSelected(person) ? "connector import needed" : originalMissingCalendarSubtle(person);
  };

  function runtimeSelectedConsultants() {
    const cached = readCalendarCache();
    return runtimeSelectedEmails().map(email => {
      const person = rosterByEmail[email] || { name: email, email };
      return {
        name: person.name || email,
        email,
        manager: person.manager || "",
        team: person.team || "",
        legacyOrg: person.legacyOrg || "",
        location: person.location || "",
        timeZone: person.timeZone || "",
        source: typeof getConsultantSource === "function" ? getConsultantSource(person) : "",
        calendarLoaded: hasLoadedCalendar(person),
        snapshotLoadedFlag: SNAPSHOT_LOADED_EMAILS.has(email),
        directConnectorLoadedFlag: DIRECT_CONNECTOR_LOADED_EMAILS.has(email),
        calendarData: {
          embeddedEvents: runtimeRecordCount(embeddedEvents, email),
          directConnectorEvents: runtimeRecordCount(DIRECT_CONNECTOR_EVENTS, email),
          directConnectorAvailabilitySnapshots: runtimeRecordCount(DIRECT_CONNECTOR_AVAILABILITY, email),
          cacheEvents: cached ? runtimeRecordCount(cached.events, email) : 0,
          rawEventsAfterRefresh: runtimeRecordCount(rawEvents, email),
          normalizedEventsAfterRefresh: runtimeRecordCount(normalizedEvents, email)
        }
      };
    });
  }

  const originalRefreshCalendarData = refreshCalendarData;
  refreshCalendarData = function (options = {}) {
    originalRefreshCalendarData(options);
    const missing = runtimeSelectedConsultants().filter(item => !item.calendarLoaded);
    if (missing.length && typeof logCalendarActivity === "function") {
      logCalendarActivity("missing-selected-consultants", {
        missingConsultants: missing,
        note: "One or more selected consultants still have no calendar data even though other selected consultants may have returned records."
      });
    }
  };

  const originalGetCalendarDebugData = getCalendarDebugData;
  getCalendarDebugData = function () {
    const debug = originalGetCalendarDebugData();
    const selectedConsultants = runtimeSelectedConsultants();
    const missingSelectedConsultants = selectedConsultants.filter(item => !item.calendarLoaded);
    debug.selectedConsultants = selectedConsultants;
    debug.missingSelectedConsultants = missingSelectedConsultants;
    if (!debug.effectiveDebugEmail && selectedConsultants.length) {
      debug.likelyIssue = missingSelectedConsultants.length
        ? \`\${missingSelectedConsultants.length} of \${selectedConsultants.length} selected consultants still need calendar data: \${missingSelectedConsultants.map(item => item.name || item.email).join(", ")}. See activityLog for the refresh steps.\`
        : "Calendar data is present for all selected consultants.";
    }
    return debug;
  };

  refreshCalendarData();
  renderAll();
})();
</script>
</body>`,
				);
			}
			html = html.replace("Object.assign(existing, person, { email });", `Object.assign(existing, person, { email, source: person.source || existing.source || "Launch parameters" });`);
			html = html.replace(
				`timeZone: person.timeZone || "America/New_York"
      };`,
				`timeZone: person.timeZone || "America/New_York",
        source: person.source || "Launch parameters"
      };`,
			);
			if (!html.includes("calendarDebugOutput")) {
				html = html.replace(
					"</style>",
					`
    .debug-console {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      padding: 14px 16px;
      box-shadow: var(--shadow);
      margin-bottom: 16px;
    }
    .debug-console summary {
      cursor: pointer;
      font-weight: 900;
      color: var(--ink);
    }
    .debug-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    .debug-output {
      margin: 0;
      max-height: 260px;
      overflow: auto;
      border-radius: 6px;
      border: 1px solid #243142;
      background: #101820;
      color: #dfe7ee;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>`,
				);
				html = html.replace(
					`\n    <section class="layout">`,
					`\n    <section class="debug-console" aria-label="Calendar debug console">
      <details>
        <summary>Calendar Debug Console</summary>
        <div class="debug-toolbar">
          <div class="subtle" id="calendarDebugSummary">Runtime roster and calendar source details.</div>
          <button class="secondary-button" id="copyDebugButton" type="button">Copy debug</button>
        </div>
        <pre class="debug-output" id="calendarDebugOutput">Debug data will appear after the dashboard renders.</pre>
      </details>
    </section>

    <section class="layout">`,
				);
			}
			if (!html.includes("function countCalendarRecordsForEmail")) {
				html = html.replace(
					`function missingCalendarSubtle(person) {
      return isFocusedConsultant(person) ? "getting calendar information" : "calendar not loaded";
	    }`,
						`function missingCalendarSubtle(person) {
	      return isFocusedConsultant(person) ? "connector import needed" : "calendar not loaded";
	    }

    function countCalendarRecordsForEmail(records, email) {
      const normalized = normalizeEmail(email);
      if (!normalized || !Array.isArray(records)) return 0;
      return records.filter(record => normalizeEmail(record.email) === normalized).length;
    }

    function getConsultantSource(person) {
      if (!person) return "none";
      if (person.source) return person.source;

      const email = normalizeEmail(person.email);
      const injected = Array.isArray(window.SCR_ASSISTANT_ROSTER)
        && window.SCR_ASSISTANT_ROSTER.some(item => normalizeEmail(item.email) === email);

      return injected ? "Tampermonkey injected roster" : "Built-in dashboard roster";
    }

    function getCalendarDebugData() {
      const selectedEmail = getSelectedConsultantEmail();
      const focusEmail = getCalendarFocusEmail({ includeSelected: true });
      const debugEmail = focusEmail || selectedEmail;
      const person = debugEmail ? rosterByEmail[debugEmail] || { name: debugEmail, email: debugEmail } : null;
      const cached = readCalendarCache();
      const rawCount = countCalendarRecordsForEmail(rawEvents, debugEmail);
      const normalizedCount = countCalendarRecordsForEmail(normalizedEvents, debugEmail);
      const embeddedCount = countCalendarRecordsForEmail(embeddedEvents, debugEmail);
      const directEventCount = countCalendarRecordsForEmail(DIRECT_CONNECTOR_EVENTS, debugEmail);
      const availabilityCount = countCalendarRecordsForEmail(DIRECT_CONNECTOR_AVAILABILITY, debugEmail);
      const cacheCount = cached ? countCalendarRecordsForEmail(cached.events, debugEmail) : 0;
      const snapshotLoaded = SNAPSHOT_LOADED_EMAILS.has(debugEmail);
      const directLoaded = DIRECT_CONNECTOR_LOADED_EMAILS.has(debugEmail);

      let likelyIssue = "No consultant selected.";
      if (person && debugEmail) {
        if (!rosterByEmail[debugEmail]) {
          likelyIssue = "The consultant email is not in the dashboard roster.";
        } else if (!snapshotLoaded && !directLoaded && embeddedCount === 0 && directEventCount === 0 && availabilityCount === 0 && cacheCount === 0) {
	          likelyIssue = "The consultant is in the roster, but no local snapshot, imported Outlook connector events, free/busy availability snapshot, or cache records exist for this email yet. Import this consultant's Outlook calendar data and reload the dashboard.";
	        } else if (!snapshotLoaded && !directLoaded && rawCount === 0) {
	          likelyIssue = "Calendar data exists elsewhere, but the current local refresh scope did not load records for this email.";
        } else {
          likelyIssue = "Calendar data is present for this consultant.";
        }
      }

      return {
        generatedAt: new Date().toISOString(),
        launchSearch: window.SCR_ASSISTANT_LAUNCH_SEARCH || window.location.search || "",
        selectedFilterValue: document.getElementById("personFilter")?.value || "",
        focusEmail: window.SCR_ASSISTANT_FOCUS_EMAIL || "",
        effectiveDebugEmail: debugEmail || "",
        consultant: person ? {
          name: person.name || "",
          email: person.email || "",
          team: person.team || "",
          legacyOrg: person.legacyOrg || "",
          location: person.location || "",
          timeZone: person.timeZone || "",
          source: getConsultantSource(person)
        } : null,
        roster: {
          totalAfterRuntimeMerge: roster.length,
          selectedRosterCount: selectedRoster().length,
          injectedRosterCount: Array.isArray(window.SCR_ASSISTANT_ROSTER) ? window.SCR_ASSISTANT_ROSTER.length : 0
        },
        calendarDataForEmail: {
          snapshotLoadedFlag: snapshotLoaded,
          directConnectorLoadedFlag: directLoaded,
          embeddedEvents: embeddedCount,
          directConnectorEvents: directEventCount,
          directConnectorAvailabilitySnapshots: availabilityCount,
          cacheEvents: cacheCount,
          rawEventsAfterRefresh: rawCount,
          normalizedEventsAfterRefresh: normalizedCount,
          refreshSource,
          lastRefreshAt: lastRefreshAt ? lastRefreshAt.toISOString() : null
        },
        likelyIssue
      };
    }

    function renderDebugConsole() {
      const output = document.getElementById("calendarDebugOutput");
      const summary = document.getElementById("calendarDebugSummary");
      if (!output) return;

      const debug = getCalendarDebugData();
      lastDebugText = JSON.stringify(debug, null, 2);
      output.textContent = lastDebugText;

      if (summary) {
        summary.textContent = debug.effectiveDebugEmail
          ? \`\${debug.consultant?.name || debug.effectiveDebugEmail}: \${debug.likelyIssue}\`
          : debug.likelyIssue;
      }
    }

    function copyDebugConsole() {
      const text = lastDebugText || document.getElementById("calendarDebugOutput")?.textContent || "";
      const button = document.getElementById("copyDebugButton");

      const setCopied = () => {
        if (!button) return;
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy debug";
        }, 1200);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(setCopied).catch(() => {});
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      setCopied();
    }`,
				);
			}
			html = html.replace(
				`const focusEmail = window.SCR_ASSISTANT_FOCUS_EMAIL || "";
        rawEvents = focusEmail`,
				`rawEvents = focusEmail`,
			);
			html = html.replace("rawEvents = cloneEmbeddedEvents();", "rawEvents = cloneEmbeddedEvents(focusEmail);");
			html = html.replace(
				`refreshSource = force ? "manual refresh" : "snapshot refresh";`,
				`refreshSource = focusEmail ? (force ? "focused manual refresh" : "focused snapshot refresh") : (force ? "manual refresh" : "snapshot refresh");`,
			);
			html = html.replace("if (!window.SCR_ASSISTANT_FOCUS_EMAIL) {", "if (!focusEmail) {");
			if (!html.includes("focused consultant refresh")) {
				html = html.replace(
					/function renderRefreshState\(\) \{[\s\S]*?\n    function classifyEvent/,
					`function renderRefreshState() {
      const label = document.getElementById("lastRefreshLabel");
      const status = document.getElementById("cacheStatusLabel");
      if (!label || !status) return;

      const cacheMinutes = Math.round(CACHE_TTL_MS / 60000);
      const launchSelectedEmails = getLaunchSelectedEmails();
      const focusPerson = getCalendarFocusPerson({ includeSelected: true })
        || (launchSelectedEmails.length === 1 ? rosterByEmail[launchSelectedEmails[0]] : null);
      const visibleRoster = selectedRoster();
      const pendingSelected = visibleRoster.filter(person => !hasLoadedCalendar(person) && (isFocusedConsultant(person) || launchSelectedEmails.includes(normalizeEmail(person.email))));
      const focusMissing = focusPerson && !hasLoadedCalendar(focusPerson);
      const importNeededNames = (focusMissing ? [focusPerson] : pendingSelected)
        .map(person => person.name || person.email)
        .filter(Boolean);
      const importNeededText = importNeededNames.join(", ");
      const importNeeded = importNeededNames.length > 0;
      const sourceLabel = focusPerson
        ? (importNeeded ? "local calendar sources checked; connector import missing" : refreshSource === "cache" ? "using cached data for selected consultant" : "focused consultant refresh")
        : refreshSource === "cache"
        ? "using cached calendar data"
        : "calendar data refreshed";
      label.textContent = importNeeded
        ? \`Calendar import needed for \${importNeededText}\`
        : lastRefreshAt
        ? \`Last refreshed: \${formatRefreshTimestamp(lastRefreshAt)} \${getZoneLabel(document.getElementById("planningZone").value)}\`
        : "Last refresh pending";
      const loadedCount = visibleRoster.filter(person => hasLoadedCalendar(person)).length;
      const partialCount = visibleRoster.length - loadedCount;
      if (focusPerson) {
        const focusState = focusMissing
          ? \`connector import needed for \${focusPerson.name || focusPerson.email}\`
          : \`calendar loaded for \${focusPerson.name || focusPerson.email}\`;
        status.textContent = \`Time zone: \${getZoneLabel(document.getElementById("planningZone").value)}; 3-week staffing snapshot: \${formatStaffingWindow()}; \${focusState}; \${sourceLabel}; cache \${cacheMinutes} min\`;
        return;
      }
      if (pendingSelected.length) {
        status.textContent = \`Time zone: \${getZoneLabel(document.getElementById("planningZone").value)}; 3-week staffing snapshot: \${formatStaffingWindow()}; connector import needed for \${importNeededText}; \${loadedCount} loaded calendars in current filter; \${partialCount} gaps; local calendar sources checked; cache \${cacheMinutes} min\`;
        return;
      }
      status.textContent = \`Time zone: \${getZoneLabel(document.getElementById("planningZone").value)}; 3-week staffing snapshot: \${formatStaffingWindow()}; \${loadedCount} loaded calendars in current filter; \${partialCount} snapshot gaps; \${sourceLabel}; cache \${cacheMinutes} min\`;
    }

    function classifyEvent`,
				);
			}
			html = html.replace(
				`function coverageBadge(row) {
      return row.calendarLoaded
        ? \`<span class="pill available">3-week snapshot loaded</span>\`
        : \`<span class="pill unknown">Snapshot gap</span>\`;
    }`,
				`function coverageBadge(row) {
      return row.calendarLoaded
        ? \`<span class="pill available">3-week snapshot loaded</span>\`
        : \`<span class="pill unknown">\${missingCalendarLabel(row)}</span>\`;
    }`,
			);
			html = html.replace(
				`if (!calendarLoaded && !conflicts.length) {
        rank = 5;
        label = "Snapshot gap";
        pill = "unknown";
      }`,
				`if (!calendarLoaded && !conflicts.length) {
        rank = 5;
        label = missingCalendarLabel(person);
        pill = "unknown";
      }`,
			);
			html = html.replace(
				`const coverageDetail = partialCount
        ? \` \${partialCount} consultants still need 3-week Outlook snapshot data; \${unknownCount} are not counted as open for this window.\`
        : "";`,
				`const focusedMissing = rows.find(row => !row.calendarLoaded && isFocusedConsultant(row));
      const coverageDetail = focusedMissing
        ? \` \${missingCalendarSentence(focusedMissing)}\`
        : partialCount
        ? \` \${partialCount} consultants still need 3-week Outlook snapshot data; \${unknownCount} are not counted as open for this window.\`
        : "";`,
			);
			html = html.replace(
				'${row.calendarLoaded ? "" : " - snapshot gap"}',
				'${row.calendarLoaded ? "" : ` - ${missingCalendarLabel(row).toLowerCase()}`}',
			);
			html = html.replace(
				`<span class="subtle">This consultant still needs 3-week Outlook snapshot data before treating this as open time.</span>`,
				`<span class="subtle">\${missingCalendarSentence(row)}</span>`,
			);
			html = html.replace(
				'${item.calendarLoaded ? `${(item.open / 60).toFixed(1)}h open` : "not loaded"}',
				'${item.calendarLoaded ? `${(item.open / 60).toFixed(1)}h open` : missingCalendarLabel(item)}',
			);
			html = html.replace(
				'${item.calendarLoaded ? `${(item.open / 60).toFixed(1)} open` : "calendar not loaded"}',
				'${item.calendarLoaded ? `${(item.open / 60).toFixed(1)} open` : missingCalendarSubtle(item)}',
			);
			html = html.replace(
				`function handleManualRefresh() {
      const button = document.getElementById("refreshButton");
      button.disabled = true;
      button.textContent = "Refreshing...";
      refreshCalendarData({ force: true });
      renderAll();
      button.textContent = "Refresh now";
      button.disabled = false;
    }`,
				`function handleManualRefresh() {
      const button = document.getElementById("refreshButton");
      const focusEmail = getSelectedConsultantEmail() || getCalendarFocusEmail({ includeSelected: false });
      button.disabled = true;
      button.textContent = focusEmail ? "Refreshing consultant..." : "Refreshing...";
      refreshCalendarData({ force: true, focusEmail });
      renderAll();
      button.textContent = focusEmail ? "Refresh consultant" : "Refresh now";
      button.disabled = false;
    }`,
			);
			html = html.replace("renderEvents();\n    }", "renderEvents();\n      renderDebugConsole();\n    }");
			if (!html.includes('copyDebugButton")?.addEventListener')) {
				html = html.replace(
					'document.getElementById("refreshButton").addEventListener("click", handleManualRefresh);',
					`document.getElementById("refreshButton").addEventListener("click", handleManualRefresh);
      document.getElementById("copyDebugButton")?.addEventListener("click", copyDebugConsole);`,
				);
			}
			if (!html.includes("function addCalendarDataRosterEntries")) {
				html = html.replace(
					"function parseLaunchStart(value) {",
					`function inferRosterNameFromEmail(email) {
      const knownNames = {
        "eric.baghdasarian@oracle.com": "Eric Baghdasarian"
      };
      const normalized = String(email || "").trim().toLowerCase();
      if (knownNames[normalized]) return knownNames[normalized];

      const localPart = normalized.split("@")[0] || normalized;
      return localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || normalized;
    }

    function addCalendarDataRosterEntries() {
      const emails = new Set();

      DIRECT_CONNECTOR_LOADED_EMAILS.forEach(email => emails.add(String(email || "").trim().toLowerCase()));
      DIRECT_CONNECTOR_AVAILABILITY.forEach(snapshot => emails.add(String(snapshot.email || "").trim().toLowerCase()));
      DIRECT_CONNECTOR_EVENTS.forEach(event => emails.add(String(event.email || "").trim().toLowerCase()));
      embeddedEvents.forEach(event => emails.add(String(event.email || "").trim().toLowerCase()));

      emails.forEach(email => {
        if (!email || rosterByEmail[email]) return;

        addRuntimeRosterPerson({
          name: inferRosterNameFromEmail(email),
          email,
          team: "Calendar Data",
          legacyOrg: "Direct",
          source: "Calendar data"
        });
      });
    }

    function parseLaunchStart(value) {`,
				);
			}
			if (!html.includes("function ensureFocusedConsultantInFilter")) {
				html = html.replace(
					"function parseLaunchStart(value) {",
					`function getLaunchParams() {
      return new URLSearchParams(window.SCR_ASSISTANT_LAUNCH_SEARCH || window.location.search || "");
    }

    function getFocusedConsultantName(email) {
      const params = getLaunchParams();
      return (params.get("consultantName") || params.get("name") || "").trim() || inferRosterNameFromEmail(email);
    }

    function ensureFocusedConsultantInFilter(options = {}) {
      const focusEmail = getCalendarFocusEmail({
        focusEmail: options.focusEmail,
        includeSelected: true
      });
      if (!focusEmail) return null;

      let person = rosterByEmail[focusEmail];
      if (!person) {
        person = addRuntimeRosterPerson({
          name: options.name || getFocusedConsultantName(focusEmail),
          email: focusEmail,
          team: options.team || "Calendar Data",
          legacyOrg: options.legacyOrg || "Direct",
          source: options.source || "Focused consultant"
        });
      }

      if (!person) return null;

      ensureSelectValue("teamFilter", person.team, person.team.startsWith("Team ") ? person.team : \`Team \${person.team}\`);
      ensureSelectValue("legacyOrgFilter", person.legacyOrg, person.legacyOrg);
      populatePersonFilter();
      ensureSelectValue("personFilter", person.email, person.name);

      return person;
    }

    function parseLaunchStart(value) {`,
				);
			}
			if (!html.includes("addCalendarDataRosterEntries();")) {
				html = html.replace(
					"populateTimeOptions();\n    configureDateWindow();\n    populatePersonFilter();",
					"addCalendarDataRosterEntries();\n    populateTimeOptions();\n    configureDateWindow();\n    populatePersonFilter();",
				);
			}
			if (!html.includes("ensureFocusedConsultantInFilter();")) {
				html = html.replace(
					"applyLaunchParams();\n    refreshCalendarData();",
					"applyLaunchParams();\n    ensureFocusedConsultantInFilter();\n    refreshCalendarData();\n    ensureFocusedConsultantInFilter();",
				);
			}

			const launchSearch = new URL(url).search;
			const dashboardRoster = buildCalendarDashboardRoster(context);
			const selectedEmails = Array.isArray(context.people)
				? context.people.map((person) => String(person.email || "").trim().toLowerCase()).filter(Boolean)
				: [];
			const launchScript = `<script>
window.SCR_ASSISTANT_LAUNCH_SEARCH = ${JSON.stringify(launchSearch)};
window.SCR_ASSISTANT_ROSTER = ${JSON.stringify(dashboardRoster)};
window.SCR_ASSISTANT_FOCUS_EMAIL = ${JSON.stringify(focusEmail)};
window.SCR_ASSISTANT_SELECTED_EMAILS = ${JSON.stringify(selectedEmails)};
</script>`;
			const rosterMergeScript = `
    if (Array.isArray(window.SCR_ASSISTANT_ROSTER)) {
      const rosterIndexByEmail = new Map(roster.map((person, index) => [String(person.email || "").toLowerCase(), index]));
      window.SCR_ASSISTANT_ROSTER.forEach(person => {
        const email = String(person.email || "").trim().toLowerCase();
        if (!email) return;

        const normalized = {
          name: person.name || email,
          email,
          manager: person.manager || "",
          team: person.team || "NetSuite SCs",
          legacyOrg: person.legacyOrg || "NetSuite",
          location: person.location || "Unknown",
          timeZone: person.timeZone || "America/New_York",
          source: person.source || "Tampermonkey injected roster"
        };
        const existingIndex = rosterIndexByEmail.get(email);

        if (existingIndex === undefined) {
          rosterIndexByEmail.set(email, roster.length);
          roster.push(normalized);
        } else {
          roster[existingIndex] = { ...roster[existingIndex], ...normalized };
        }
      });

      const addFilterOption = (id, value, label) => {
        const select = document.getElementById(id);
        if (!select || !value || Array.from(select.options).some(option => option.value === value)) return;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label || value;
        select.appendChild(option);
      };
      [...new Set(roster.map(person => person.team).filter(Boolean))].forEach(team => {
        addFilterOption("teamFilter", team, team.startsWith("Team ") ? team : "Team " + team);
      });
      [...new Set(roster.map(person => person.legacyOrg).filter(Boolean))].forEach(org => {
        addFilterOption("legacyOrgFilter", org, org);
      });
    }
`;

			html = html.replace(/\n\s*const rosterByEmail =/, `\n${rosterMergeScript}\n    const rosterByEmail =`);

			if (html.includes("</head>")) {
				return html.replace("</head>", `${launchScript}\n</head>`);
			}

			return `${launchScript}\n${html}`;
		}

		function openCalendarDashboardModal({ url, srcdoc = "", src = "", fallbackMessage = "", returnToQuickAssign = false }) {
			calendarDashboardReturnToQuickAssign = Boolean(returnToQuickAssign);
			const $frame = $("#scr-calendar-dashboard-frame");
			const $fallback = $("#scr-calendar-dashboard-fallback");

			$frame.removeAttr("src").removeAttr("srcdoc");

			if (srcdoc) {
				$frame.attr("srcdoc", srcdoc);
			} else if (src) {
				$frame.attr("src", src);
			}

			if (fallbackMessage) {
				$fallback
					.empty()
					.append($("<div>").addClass("header").text("Calendar dashboard opened in fallback mode"))
					.append($("<p>").text(fallbackMessage))
					.append($("<p>").text("The dashboard URL has been copied. If the frame below stays blank, click Open in New Tab or paste the copied URL into the address bar."))
					.show();
			} else {
				$fallback.hide().empty();
			}

			$("#scr-calendar-dashboard-open-tab").attr("href", url);
			$("#scr-modal-calendar-dashboard")
				.modal({
					inverted: true,
					closable: true,
					allowMultiple: true,
					onHidden: function () {
						$("#scr-calendar-dashboard-frame").removeAttr("src").removeAttr("srcdoc");
						$("#scr-calendar-dashboard-fallback").hide().empty();

						if (calendarDashboardReturnToQuickAssign) {
							calendarDashboardReturnToQuickAssign = false;
							setTimeout(() => {
								openRequestModal();
							}, 150);
						}
					},
				})
				.modal("setting", "transition", "scale")
				.modal("show");

			return true;
		}

		async function openEmbeddedCalendarDashboard(url, options = {}) {
			const html = await buildEmbeddedCalendarDashboardHtml(url, options.context || {});

			if (!html) {
				return false;
			}

			return openCalendarDashboardModal({
				url,
				srcdoc: html,
				returnToQuickAssign: Boolean(options.returnToQuickAssign),
			});
		}

		function getCalendarDashboardFallbackReason() {
			if (!calendarDashboardLastAssetErrors.length) {
				return "The embedded dashboard could not be built from the configured local files.";
			}

			return calendarDashboardLastAssetErrors
				.map((item) => `${item.assetName}: ${item.error} (${item.assetUrl || "unresolved path"})`)
				.join(" | ");
		}

		function openCalendarDashboardFallback(url, options = {}) {
			return openCalendarDashboardModal({
				url,
				src: url,
				returnToQuickAssign: Boolean(options.returnToQuickAssign),
				fallbackMessage: getCalendarDashboardFallbackReason(),
			});
		}

		function copyDashboardUrlFallback(url) {
			return copyTextToClipboard(url).catch((error) => {
				shout("Unable to copy calendar dashboard URL:", error);
			});
		}

		async function openUrlInNewTab(url) {
			const errors = [];

			if (typeof GM !== "undefined" && GM && typeof GM.openInTab === "function") {
				try {
					await GM.openInTab(url, {
						active: true,
						insert: true,
						setParent: true,
					});
					return {
						opened: true,
						method: "GM.openInTab",
					};
				} catch (error) {
					errors.push(`GM.openInTab: ${error.message || error}`);
				}
			}

			if (typeof GM_openInTab === "function") {
				try {
					GM_openInTab(url, {
						active: true,
						insert: true,
						setParent: true,
					});
					return {
						opened: true,
						method: "GM_openInTab",
					};
				} catch (error) {
					errors.push(`GM_openInTab: ${error.message || error}`);
				}
			}

			try {
				const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
				if (openedWindow) {
					return {
						opened: true,
						method: "window.open",
					};
				}
				errors.push("window.open: popup was blocked");
			} catch (error) {
				errors.push(`window.open: ${error.message || error}`);
			}

			return {
				opened: false,
				method: "",
				error: errors.join(" | "),
			};
		}

		async function openCalendarDashboard(context, statusSelector) {
			const normalizedContext = { ...(context || {}) };

			if (Array.isArray(normalizedContext.people) && normalizedContext.people.length > 0 && !normalizedContext.timeZone) {
				normalizedContext.timeZone = normalizedContext.people[0].timeZone || "";
			}

			if (!normalizedContext.email && normalizedContext.name) {
				normalizedContext.email = inferCalendarEmailFromName(normalizedContext.name);
			}

			const url = buildCalendarDashboardUrl(normalizedContext);
			await copyDashboardUrlFallback(url);
			const returnToQuickAssign = Boolean(
				normalizedContext?.returnToQuickAssign ||
					$("#scr-modal-request-form").hasClass("active") ||
					$("#scr-modal-request-form").is(":visible"),
			);
			const embeddedOpened = await openEmbeddedCalendarDashboard(url, {
				returnToQuickAssign: returnToQuickAssign,
				context: normalizedContext,
			});

			if (embeddedOpened) {
				if (statusSelector) {
					$(statusSelector).text("Opened embedded calendar dashboard. Launch URL copied as fallback.");
				}
				shout("Open embedded calendar dashboard:", url);
				return;
			}

			openCalendarDashboardFallback(url, {
				returnToQuickAssign: returnToQuickAssign,
			});

			if (statusSelector) {
				$(statusSelector).text("Opened calendar dashboard fallback. URL copied; use Open in New Tab if the frame is blank.");
			}
			shout("Open calendar dashboard fallback:", {
				url,
				assetErrors: calendarDashboardLastAssetErrors,
			});
			return;

			const result = await openUrlInNewTab(url);

			if (statusSelector) {
				let msg;

					if (result.opened && url.startsWith("file:")) {
					msg = "Dashboard URL copied. If no tab opened, enable Tampermonkey file URL access and confirm the local dashboard path.";
				} else if (result.opened) {
					msg = normalizedContext && (normalizedContext.email || normalizedContext.name)
						? "Opened calendar dashboard. URL copied as fallback."
						: "Opened dashboard without consultant filter. URL copied as fallback.";
				} else {
					msg = "Open blocked; dashboard URL copied.";
				}

				$(statusSelector).text(msg);
			}

			if (!result.opened) {
				shout("Calendar dashboard launch failed:", result.error);
			}
			shout("Open calendar dashboard:", url);
		}

		/**
		 * +=============================================================================================+
		 * |                                                                                             |
		 * |   ########   #######  ##     ##    ######## ##     ## ######## ##    ## ########  ######    |
		 * |   ##     ## ##     ## ###   ###    ##       ##     ## ##       ###   ##    ##    ##    ##   |
		 * |   ##     ## ##     ## #### ####    ##       ##     ## ##       ####  ##    ##    ##         |
		 * |   ##     ## ##     ## ## ### ##    ######   ##     ## ######   ## ## ##    ##     ######    |
		 * |   ##     ## ##     ## ##     ##    ##        ##   ##  ##       ##  ####    ##          ##   |
		 * |   ##     ## ##     ## ##     ##    ##         ## ##   ##       ##   ###    ##    ##    ##   |
		 * |   ########   #######  ##     ##    ########    ###    ######## ##    ##    ##     ######    |
		 * |                                                                                             |
		 * +=============================================================================================+
		 */

		$("#_legend").click(function (event) {
			event.preventDefault();
		});
		$("#_debug").click(function (event) {
			event.preventDefault();
			window.open("https://vscode.dev/?connectTo=tampermonkey", "_blank");
		});
		$("#_settings").click(function (event) {
			event.preventDefault();
			openConfig();
		});
		$("#_cancelled").click(function (event) {
			event.preventDefault();
			setRecordCancelled();
		});
		$("#_onhold").click(function (event) {
			event.preventDefault();
			setRecordHold();
		});
		$("#_xvertprodwest").click(function (event) {
			event.preventDefault();
			setRecordProductsWest();
		});
		$("#_xvertprodeast").click(function (event) {
			event.preventDefault();
			setRecordProductsEast();
		});
		$("#_xvertgbwest").click(function (event) {
			event.preventDefault();
			setRecordGBWest();
		});
		$("#_xvertgbeast").click(function (event) {
			event.preventDefault();
			setRecordGBEast();
		});
		$("#_xvertht").click(function (event) {
			event.preventDefault();
			setRecordHT();
		});
		$("#_xvertepm").click(function (event) {
			event.preventDefault();
			setRecordEPM();
		});
		$("#_staffmyteam").click(function (event) {
			event.preventDefault();
			openRequestModal();
		});
		$("#scr-calendar-dashboard-back").click(function (event) {
			event.preventDefault();
			calendarDashboardReturnToQuickAssign = true;
			$("#scr-modal-calendar-dashboard").modal("hide");
		});
		$("#copycalendarprompt").click(function (event) {
			event.preventDefault();

			const prompt = buildOutlookAvailabilityPrompt();

			if (!prompt) {
				$("#calendarpromptstatus").text("Choose an SC first.");
				return;
			}

			copyTextToClipboard(prompt)
				.then(() => {
					$("#calendarpromptstatus").text("Copied. Paste into ChatGPT to check Outlook availability.");
				})
				.catch(() => {
					$("#calendarpromptstatus").text("Copy failed; prompt logged to console.");
					shout("Outlook availability prompt:", prompt);
				});
		});
		$("#opencalendardashboard").click(function (event) {
			event.preventDefault();

			const sc = getSelectedScForCalendar();

			if (!sc.id) {
				$("#calendarpromptstatus").text("Choose an SC first.");
				return;
			}

			openCalendarDashboard(sc, "#calendarpromptstatus").catch((error) => {
				$("#calendarpromptstatus").text("Open failed; check console for details.");
				shout("Calendar dashboard button error:", error);
			});
		});
		$("#_searchindustrylink").click(function (event) {
			event.preventDefault();
			//
		});

		$("#productskillsearch").click(function (event) {
			event.preventDefault();

			// only allow the first 4 products to be used for searching for peformance reasons
			const products = $("#products").dropdown("get values").slice(0, 4);
			if (!products || products.length === 0) {
				return false;
			}

			const industryId = $("#scmindustry").dropdown("get value") || null;
			const skills = getProductSkills(products);
			const tableFilters = getTableFilters();
			shout("Table filters:", tableFilters);
			updateBodyOfWorkTable(skills, industryId, tableFilters);
		});
		$("#openselectedskillcalendars").click(function (event) {
			event.preventDefault();

			if ($(this).hasClass("disabled")) {
				return;
			}

			const people = getSelectedSkillCalendarPeople();

			if (!people.length) {
				updateSelectedSkillCalendarsButton();
				return;
			}

			openCalendarDashboard({
				people: people,
				timeZone: people[0].timeZone || "",
			}).catch((error) => {
				shout("Selected calendar dashboard button error:", error);
			});
		});

		$("#ai-request-summary-btn").click(function (event) {
			event.preventDefault();

			shout("AI button clicked.");

			const url = "http://localhost:1234";
			ifUrlExist(url).then((result) => {
				shout("Localhost unreachable...");
				return;
			});

			const aiPayloadData = getRequestDataForAI();

			const aiPreamble =
				"You are a pre-sales staffing assistant at a software company. Be professional and be specific.";
			let aiPrompt = [
				"Given the following data, make a recommendation on the best profile of sales consultant to present to this customer.",
				"Keep your response to two sentences, and highlight desired skills or qualifications that led to your suggestion.",
				"Industry, Current Systems, Competitors/Competition, and known Expertise should all weigh on your recommendation.",
				"Do not repeat yourself.",
				aiPayloadData,
			].join(" ");

			shout("Prompt: " + aiPrompt);

			callLMStudio(url, aiPreamble, aiPrompt).then((result) => {
				shout(result);
				const msg = result.choices[0].message.content || "There was an issue...";
				shout("AI Msg: " + msg);
				$("#ai-request-summary-output").html("<p>" + msg + "</p>");
			});
		});

		// This doesn't appear to do anything different...
		// $('#productskillsearch').click(
		//     async function(event) {
		//         event.preventDefault();

		//         var dimmer = $('#tableSkillsLoader');
		//         dimmer.removeClass('active'); // start with a fresh dimmer

		//         const products = $('#products').dropdown('get values');
		//         if (!products || products.length === 0) { return false; }

		//         dimmer.addClass('active'); // add in a dimmer

		//         const industryId = $('#scmindustry').dropdown('get value') || null;
		//         const skills = getProductSkills(products);

		//         try {
		//             // Step 2: Call the async function
		//             const result = await updateBodyOfWorkTable(skills, industryId);
		//             dimmer.removeClass('active');
		//         } catch (error) {
		//             // Handle any errors and update the DOM accordingly
		//             console.error('Error occurred:', error);
		//         }
		//     }
		// );

		$("#scr-modal-request-form")
			.modal({
				inverted: true,
				allowMultiple: true,
			})
			.modal("setting", "transition", "scale")
			.modal("attach events", "#_staffmyteam", "show");

		$("#scr-modal-notes-form")
			.modal({
				inverted: true,
			})
			.modal("setting", "transition", "scale")
			.modal("attach events", "[id^=_xvert]", "show");

		$(".ui.checkbox").checkbox();

		$(".ui.accordion").accordion();

		$("#bodyofwork").tablesort();

		$("#_legend").popup();

		$(".ui.selection.dropdown").dropdown({
			clearable: true,
		});

		$(".ui.search.selection.dropdown [id^=skillfilter]").dropdown({
			keepSearchTerm: true,
		});

		var industryFld = $("#scmindustry").dropdown({
			hideDividers: "empty",
			clearable: true,
		});
		var industryFld = $("#scmindustry-popup").dropdown({
			hideDividers: "empty",
			clearable: true,
		});
		$("#scmsku").dropdown({
			allowAdditions: true,
			hideAdditions: false,
			className: {
				addition: "stuck addition",
			},
			name: "scmsku",
		});

		const products = getProducts();

		$("#products").dropdown({
			clearable: true,
			showOnFocus: true,
			placeholder: "Select up to 4 products",
			fullTextSearch: true,
			name: "products",
			match: "text",
			maxSelections: 4,
		});

		const initials = settings.initials ? settings.initials : "";

		var scValues = getPeopleCache();

		$("#solutionconsultant").dropdown({
			clearable: false,
			showOnFocus: false,
			placeholder: "Choose an SC",
			fullTextSearch: "exact",
			name: "solutionconsultant",
			values: scValues,
			match: "text",
			onChange: function (value, text, $selectedItem) {
				$("#calendarpromptstatus").text("");

				var d = new Date();
				var today = [("0" + (d.getMonth() + 1)).slice(-2), ("0" + d.getDate()).slice(-2), d.getFullYear()].join("/");
				var scName = $("<div>")
					.html(String(text || ""))
					.text()
					.replace(/\s*\(based in .*?\)\s*$/i, "")
					.trim();
				var msg = `${today} - Please work with ${scName} on next steps to KT ${initials}\n\n`;

				$("#screquestdetailsadd").val(msg);
			},
		});

		$("#hashtags").dropdown({
			allowAdditions: true,
			hideAdditions: false,
			className: {
				addition: "stuck addition",
			},
			hideDividers: "empty",
		});

		$("#dateneeded").calendar({
			type: "date",
			today: true,
			firstDayOfWeek: 1,
			disabledDaysOfWeek: [0, 6],
			formatter: {
				date: "MM/DD/YYYY",
			},
		});

		/**
		 * +=====================================================+
		 * |                                                     |
		 * |   ########  #######  ########  ##     ##  ######    |
		 * |   ##       ##     ## ##     ## ###   ### ##    ##   |
		 * |   ##       ##     ## ##     ## #### #### ##         |
		 * |   ######   ##     ## ########  ## ### ##  ######    |
		 * |   ##       ##     ## ##   ##   ##     ##       ##   |
		 * |   ##       ##     ## ##    ##  ##     ## ##    ##   |
		 * |   ##        #######  ##     ## ##     ##  ######    |
		 * |                                                     |
		 * +=====================================================+
		 */

		// SCR Request Form
		var $scrRequestForm = $("#scr-modal-request-form")
			.form("set value", "screquestdetails", getRequestDetails())
			.form("set value", "salesmanagernotes", getSalesManagerNotes())
			.form("set value", "launchpadqual", getLaunchpadQual())
			.form("set value", "launchpadnotes", getLaunchpadNotes())
			.form("set value", "dateneeded", getDateNeeded())
			.form("set value", "products", getProducts())
			.form("set value", "scmindustry", getIndustry())
			.form("set value", "hashtags", getHashtags())
			.form({
				onSuccess: function (event, fields) {
					event.preventDefault();
					var allFields = $scrRequestForm.form("get values");
					// shout("Form data: " + JSON.stringify(allFields));

					// var dateNeeded = allfields.dateneeded;
					var dateNeeded = $("#dateneeded").calendar("get date");
					var dateNeededStr = dateNeeded.getMonth() + 1 + "/" + dateNeeded.getDate() + "/" + dateNeeded.getFullYear();

					setStatusStaffed();
					setDateNeeded(dateNeededStr);
					setAssignee(allFields.solutionconsultant);
					setLeadStatus(allFields.islead);
					setDeliverable();
					setTierStatus();
					setHashtags(allFields.hashtags);
					setRequestDetails(allFields.screquestdetailsadd);
					setIndustry(allFields.scmindustry);
					setProducts(allFields.products);

					var myDate = new Date();
					var myDateString =
						("0" + (myDate.getMonth() + 1)).slice(-2) +
						"/" +
						("0" + myDate.getDate()).slice(-2) +
						"/" +
						myDate.getFullYear();

					var industryName = "";
					var industryFormFld = allFields.scmindustry;

					if (industryFormFld && industryFormFld.length > 0) {
						var industryFld = $(`#scmindustry div[data-value=${industryFormFld}]`);
						industryName = industryFld[0].innerText;
					}

					var scmNotes =
						`Industry: ${industryName}\n` +
						`SKU: ${allFields.scmsku}\n` +
						`Integrations: ${allFields.scmaddons}\n` +
						`Partners: ${allFields.scmpartners}\n` +
						`Competitors: ${allFields.scmcompetitors}\n` +
						`---\n` +
						`Why We Win: \n` +
						`Red Flags: ${allFields.scmredflags}\n` +
						`---\n\n` +
						`${myDateString} - Staffed deal ${initials}`;
					setSCManagerNotes(scmNotes);
				},
			});
		// SCR Notes Form
		var $scrNotesForm = $("#scr-modal-notes-form").form({
			onSuccess: function (event, fields) {
				event.preventDefault();
				var allFields = $scrNotesForm.form("get values");
				var staffingNotes = allFields["scmstaffingnotes"];
				var needsEmerging = allFields["needsemg"];
				var scIndustry = allFields["scmindustry-popup"];

				var myDate = new Date();
				var myDateString =
					("0" + (myDate.getMonth() + 1)).slice(-2) +
					"/" +
					("0" + myDate.getDate()).slice(-2) +
					"/" +
					myDate.getFullYear();

				var scmStaffingNotesPretty = `${myDateString} - ${staffingNotes} ${initials}\n\n`;

				setStaffingNotes(scmStaffingNotesPretty);

				if (needsEmerging === "on") {
					setEmg();
				}
				if (scIndustry) {
					setIndustry(scIndustry);
				}
			},
		});
	}
})();
