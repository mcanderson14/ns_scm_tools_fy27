// ==UserScript==
// @name         IQUEUE
// @namespace    ns-scm-tools-fy27
// @version      27.0.24
// @description  Adds the IQUEUE SCR portlet to NetSuite SCR queue saved searches with spreadsheet-based SC staffing region overrides.
// @author       Michael Anderson
// @match        https://nlcorp.app.netsuite.com/app/common/search/searchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/searchresults.nl*
// @match        https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://nlcorp-sb2.app.netsuite.com/app/common/search/savedsearchresults.nl*
// @match        https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        unsafeWindow
// @connect      github.com
// @connect      raw.githubusercontent.com
// @connect      graph.microsoft.com
// @run-at       document-end
// @downloadURL  https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/IQUEUE/netsuite-scr-search-helper.user.js
// @updateURL    https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/IQUEUE/netsuite-scr-search-helper.user.js
// ==/UserScript==

(function () {
  "use strict";

  const ACTIVE_SEARCH_ID = "1303392";
  const ON_HOLD_SEARCH_ID = "1317304";
  const ACTIVE_SEARCH_URL = "https://nlcorp.app.netsuite.com/app/common/search/searchresults.nl?searchid=1303392";
  const ON_HOLD_SEARCH_URL = "https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?searchid=1317304";
  const SCR_RECORD_TYPE = "2840";
  const SCR_RECORD_SCRIPT_ID = "customrecord_sc_request";
  const STAFFING_NOTES_FIELD_ID = "custrecord_screq_scmanager_notes_2";
  const HASHTAGS_FIELD_ID = "custrecord_screq_hashtags";
  const CROSS_VERTICAL_FIELD_ID = "custrecord_screq_cross_vertical";
  const ASSIGNEE_FIELD_ID = "custrecord_screq_assignee";
  const ROSTER_RECORD_TYPE = "customrecord_emproster";
  const ROSTER_COST_CENTER_ID = "M5M1";
  const ROSTER_SALES_REGION_ID = "4";
  const HELPER_ID = "scr-search-helper-portlet";
  const HELPER_STYLE_ID = "scr-search-helper-portlet-styles";
  const HELPER_VERSION = "27.0.24";
  const SCRIPT_UPDATE_URL = "https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/IQUEUE/netsuite-scr-search-helper.user.js";
  const SCRIPT_UPDATE_CHECK_CACHE_KEY = "iqueue-script-update-check-v1";
  const SCRIPT_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const GRAPH_TOKEN_REFRESH_URL = "https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html";
  const GRAPH_TOKEN_REFRESH_RELAY_URL = `${GRAPH_TOKEN_REFRESH_URL}?iqueueRelay=1`;
  const GRAPH_TOKEN_STATUS_KEY = "iqueue-graph-token-status-v1";
  const GRAPH_ACCESS_TOKEN_KEY = "iqueue-graph-access-token-v1";
  const GRAPH_TOKEN_RELAY_KIND = "iqueue-graph-token-relay-v1";
  const CALENDAR_GRAPH_TOKEN_VAULT_KEY = "sc-staffing-dashboard-graph-explorer-token-vault-v2";
  const CALENDAR_GRAPH_TOKEN_LOCAL_KEY = "sc-staffing-dashboard-graph-explorer-local-key-v1";
  const GRAPH_TOKEN_STATUS_STALE_MS = 26 * 60 * 60 * 1000;
  const GRAPH_TOKEN_EXPIRING_SOON_MS = 2 * 60 * 60 * 1000;
  const HELPER_STATE_STORAGE_KEY = "fy27-unified-sc-staffing-queue-assistant-state-v1";
  const GITHUB_MAPPING_BASE_URL = "https://raw.githubusercontent.com/mcanderson14/ns_scm_tools_fy27/main/IQUEUE/mappings";
  const EXTERNAL_MAPPING_FILE_NAME = "SC_Industry_State_Region_Mapping.json";
  const EXTERNAL_MAPPING_FILE_ID = "482253421";
  const EXTERNAL_MAPPING_FILE_URL = "https://nlcorp.app.netsuite.com/app/common/media/482253421?folder=482253421";
  const EXTERNAL_MAPPING_CACHE_KEY = "fy27-unified-sc-staffing-queue-assistant-region-mapping-v3";
  const EXTERNAL_MAPPING_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const GTM_SC_INDUSTRY_MAPPING_FILE_NAME = "GTM_to_SC_Industry_Mapping.json";
  const GTM_SC_INDUSTRY_MAPPING_GITHUB_URL = "https://raw.githubusercontent.com/mcanderson14/ns_scm_tools_fy27/refs/heads/main/IQUEUE/mappings/GTM_to_SC_Industry_Mapping.json";
  const GTM_SC_INDUSTRY_MAPPING_FILE_ID = "483377127";
  const GTM_SC_INDUSTRY_MAPPING_FOLDER_URL = "https://nlcorp.app.netsuite.com/app/common/media/483377127?folder=483377127&ifrmcntnr=T";
  const GTM_SC_INDUSTRY_MAPPING_CACHE_KEY = "iqueue-gtm-sc-industry-mapping-v3";
  const GTM_SC_INDUSTRY_MAPPING_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const PRODUCTS_SCM_MAPPING_FILE_NAME = "Products_SCM_Relationship_Mapping.json";
  const PRODUCTS_SCM_MAPPING_FILE_ID = "482833928";
  const PRODUCTS_SCM_MAPPING_FILE_URL = "https://nlcorp.app.netsuite.com/app/common/media/482833928?folder=482833928&ifrmcntnr=T";
  const PRODUCTS_SCM_MAPPING_CACHE_KEY = "iqueue-products-scm-relationship-mapping-v3";
  const PRODUCTS_SCM_MAPPING_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const PRODUCTS_SCM_OWNER_TAG_PREFIX = "#scm-owner-";
  const AUTHORIZED_MANAGERS_FILE_NAME = "Authorized_Managers.json";
  const AUTHORIZED_MANAGERS_FILE_NAMES = [AUTHORIZED_MANAGERS_FILE_NAME, "Authorized Managers.json", "Authorized_Users.json", "Authorized Users.json"];
  const AUTHORIZED_MANAGERS_FILE_ID = "";
  const AUTHORIZED_MANAGERS_FOLDER_URL = "https://nlcorp.app.netsuite.com/app/common/media/482833928?folder=482833928&ifrmcntnr=T";
  const AUTHORIZED_MANAGERS_SEARCH_ID = "1319617";
  const AUTHORIZED_MANAGERS_SEARCH_URL = "https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?searchid=1319617";
  const AUTHORIZED_MANAGERS_SEARCH_URLS = [
    AUTHORIZED_MANAGERS_SEARCH_URL,
    "https://nlcorp.app.netsuite.com/app/common/search/searchresults.nl?searchid=1319617"
  ];
  const AUTHORIZED_MANAGERS_CACHE_KEY = "iqueue-authorized-managers-v3";
  const AUTHORIZED_MANAGERS_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
  const LOGO_LARGE_URL = "https://raw.githubusercontent.com/mcanderson14/ns_scm_logos/main/IQ_large_logo.png";
  const LOGO_SMALL_URL = "https://raw.githubusercontent.com/mcanderson14/ns_scm_logos/main/IQ_small_logo.png";
  const UNMAPPED_FILTER_LABEL = "Other/Unmapped";
  const EPM_INDUSTRY_GROUP = "EPM";
  const EPM_REQUESTED_TAG = "#epm-requested-sc";
  const NSPB_REQUEST_TYPE = "NSPB";
  const TECH_COE_INDUSTRY_GROUP = "Tech COE";
  const TECH_COE_REQUEST_TYPE = "Technology COE";
  const TECH_COE_REQUESTED_TAG = "#tcoe-requested-sc";
  const ADDITIONAL_INDUSTRY_GROUPS = [EPM_INDUSTRY_GROUP, TECH_COE_INDUSTRY_GROUP];
  const REDWOOD_COLORS = {
    oracleRed: "#C74634",
    netsuiteOcean: "#36677D",
    slate150: "#3C4545",
    slate100: "#697778",
    slate50: "#C2D4D4",
    neutral30: "#F1EFED",
    brandYellow: "#F1B13F",
    netsuiteBrandYellow: "#E2C06B",
    pine100: "#4C825C",
    pine90: "#5C926D",
    ocean30: "#E7F2F5",
    ocean60: "#94BFCE",
    plum100: "#846A92",
    sienna60: "#DEB068",
    sky120: "#00688C",
    sky30: "#E4F1F7",
    teal100: "#4F7D7B",
    tigerPurple: "#5F3DC4",
    tigerPurpleSoft: "#F0ECFF"
  };
  const QUEUE_CONFIGS = {
    [ACTIVE_SEARCH_ID]: {
      key: "active",
      searchId: ACTIVE_SEARCH_ID,
      label: "Active Queue",
      loadingLabel: "active staffing queue",
      headerClass: "scr-helper-queue-active",
      primaryColor: REDWOOD_COLORS.netsuiteOcean,
      primarySoft: REDWOOD_COLORS.ocean30,
      primaryMid: REDWOOD_COLORS.ocean60,
      headerAccent: REDWOOD_COLORS.ocean60
    },
    [ON_HOLD_SEARCH_ID]: {
      key: "onHold",
      searchId: ON_HOLD_SEARCH_ID,
      label: "On Hold Queue",
      loadingLabel: "on hold queue",
      headerClass: "scr-helper-queue-on-hold",
      primaryColor: REDWOOD_COLORS.sky120,
      primarySoft: REDWOOD_COLORS.sky30,
      primaryMid: REDWOOD_COLORS.ocean60,
      headerAccent: REDWOOD_COLORS.sky30
    }
  };
  const INDUSTRY_GROUP_BRANDING = {
    "Business Services": { emoji: "💼", color: REDWOOD_COLORS.netsuiteOcean, soft: REDWOOD_COLORS.ocean30 },
    "Construction": { emoji: "🚧", color: REDWOOD_COLORS.sienna60, soft: REDWOOD_COLORS.neutral30 },
    "Construction & Energy": { emoji: "🚧", color: REDWOOD_COLORS.sienna60, soft: REDWOOD_COLORS.neutral30 },
    "Consumer Services": { emoji: "🛍️", color: REDWOOD_COLORS.plum100, soft: REDWOOD_COLORS.neutral30 },
    "EPM": { emoji: "📈", color: REDWOOD_COLORS.tigerPurple, soft: REDWOOD_COLORS.tigerPurpleSoft },
    "Enterprise Performance Management": { emoji: "📈", color: REDWOOD_COLORS.tigerPurple, soft: REDWOOD_COLORS.tigerPurpleSoft },
    "Tech COE": { emoji: "☁️", color: REDWOOD_COLORS.sky120, soft: REDWOOD_COLORS.sky30 },
    "Technology COE": { emoji: "☁️", color: REDWOOD_COLORS.sky120, soft: REDWOOD_COLORS.sky30 },
    "TCOE": { emoji: "☁️", color: REDWOOD_COLORS.sky120, soft: REDWOOD_COLORS.sky30 },
    "Life Science": { emoji: "🧬", color: REDWOOD_COLORS.pine90, soft: REDWOOD_COLORS.neutral30 },
    "Life Sciences": { emoji: "🧬", color: REDWOOD_COLORS.pine90, soft: REDWOOD_COLORS.neutral30 },
    "Products": { emoji: "📦", color: REDWOOD_COLORS.teal100, soft: REDWOOD_COLORS.ocean30 },
    "Software": { emoji: "💻", color: REDWOOD_COLORS.sky120, soft: REDWOOD_COLORS.sky30 },
    "Health & Hospitality": { emoji: "🏨", color: REDWOOD_COLORS.pine90, soft: REDWOOD_COLORS.neutral30 }
  };
  const GTM_SUBGROUP_EMOJIS = {
    "Agencies": "📣",
    "Advisory Services": "🧭",
    "Facilities Management": "🏢",
    "Operational Support Services": "⚙️",
    "Custom Software & IT Services": "🧩",
    "Management Consulting": "📊",
    "Public Sector": "🏛️",
    "State & Local Governments": "🏙️",
    "Construction & Engineering": "🏗️",
    "Energy & Natural Resource": "⚡",
    "Infrastructure & Utilities": "🔌",
    "Personal Care Services": "💇",
    "Real Estate": "🏘️",
    "Specialty Services & Repair": "🧰",
    "Consumer & Commercial Financial Services": "🏦",
    "Investment Banks & Private Equity": "💹",
    "Charity Foundations": "🤝",
    "Cultural & Arts": "🎭",
    "Educational Institutions": "🎓",
    "Membership Organizations": "👥",
    "Freight & Logistics": "🚚",
    "Passenger Transportation": "🚌",
    "CG - Manufacturing - Discrete": "🔩",
    "CG - Manufacturing - Process": "⚗️",
    "CG - Retail": "🛒",
    "CG - Wholesale & Distribution": "🏷️",
    "Agriculture, Livestock, Crops": "🌾",
    "Food Manufacturing & Processing": "🥫",
    "Packaged Food & Beverage": "🥤",
    "Industrial & Equipment Discrete Manufacturing": "🏭",
    "Industrial & Equipment Process Manufacturing": "🛢️",
    "Enterprise Business Applications": "🧮",
    "Infrastructure & Technical Software": "🖥️",
    "Multimedia & Internet Software": "🌐",
    "Hospitals": "🏥",
    "Other Health Services": "🩺",
    "Outpatient Clinics": "🩹",
    "Food Service & Accommodation": "🍽️",
    "Sports Teams & Entertainment": "🏟️",
    "Life Science": "🧬",
    "Life Sciences": "🧬",
    "MedTech": "🦾",
    "Research & Pharma": "🧪"
  };
  const GTM_INDUSTRY_MAPPING_DATA = JSON.parse(`{"groups":["Business Services","Construction & Energy","Products","Consumer Services","Health & Hospitality","Software"],"industries":["Agencies","Business Services","Construction & Energy","Consulting & IT Services","Consumer Goods","Consumer Services","Financial Services","Food & Beverage","Government","Health","Hospitality","Industrial & Equipment","Life Sciences","Nonprofits & Organizations","Software","Transportation"],"subgroups":["Agencies","Advisory Services","Facilities Management","Operational Support Services","Energy & Natural Resource","Infrastructure & Utilities","Construction & Engineering","Management Consulting","Custom Software & IT Services","CG - Manufacturing - Discrete","CG - Wholesale & Distribution","CG - Retail","CG - Manufacturing - Process","Personal Care Services","Real Estate","Specialty Services & Repair","Investment Banks & Private Equity","Consumer & Commercial Financial Services","Agriculture, Livestock, Crops","Packaged Food & Beverage","Food Manufacturing & Processing","Public Sector","State & Local Governments","Other Health Services","Hospitals","Outpatient Clinics","Sports Teams & Entertainment","Food Service & Accommodation","Industrial & Equipment Process Manufacturing","Industrial & Equipment Discrete Manufacturing","Research & Pharma","MedTech","Charity Foundations","Cultural & Arts","Educational Institutions","Membership Organizations","Multimedia & Internet Software","Infrastructure & Technical Software","Enterprise Business Applications","Freight & Logistics","Passenger Transportation"],"rows":[[0,0,0],[0,1,1],[0,1,2],[0,1,3],[1,2,4],[1,2,5],[1,2,6],[0,3,7],[0,3,8],[2,4,9],[2,4,10],[2,4,11],[2,4,12],[3,5,13],[3,5,14],[3,5,15],[3,6,16],[3,6,17],[2,7,18],[2,7,19],[2,7,20],[0,8,21],[0,8,22],[4,9,23],[4,9,24],[4,9,25],[4,10,26],[4,10,27],[2,11,28],[2,11,29],[4,12,30],[4,12,31],[3,13,32],[3,13,33],[3,13,34],[3,13,35],[5,14,36],[5,14,37],[5,14,38],[0,15,39],[0,15,40]]}`);
  const INDUSTRY_GROUP_BRANDING_BY_KEY = new Map(
    Object.entries(INDUSTRY_GROUP_BRANDING).map(([name, branding]) => [normalizeKey(name), { name, ...branding }])
  );
  const GTM_SUBGROUP_EMOJI_BY_KEY = new Map(
    Object.entries(GTM_SUBGROUP_EMOJIS).map(([name, emoji]) => [normalizeKey(name), emoji])
  );
  const GTM_INDUSTRY_GROUP_FALLBACKS = new Map([
    ["advertisingmediaandpublishing|mediaandpublishing", "Business Services"],
    ["mediaandpublishing", "Business Services"],
    ["advertisingmediaandpublishing", "Business Services"]
  ]);
  const SC_INDUSTRY_GROUP_ALIASES = new Map(Object.entries({
    "Business Service": "Business Services",
    "Business Services": "Business Services",
    "Construction": "Construction & Energy",
    "Construction and Energy": "Construction & Energy",
    "Construction & Energy": "Construction & Energy",
    "Consumer Service": "Consumer Services",
    "Consumer Services": "Consumer Services",
    "Enterprise Performance Management": "EPM",
    "EPM": "EPM",
    "PBCS": "EPM",
    "Tech COE": "Tech COE",
    "Technology COE": "Tech COE",
    "TCOE": "Tech COE",
    "Health and Hospitality": "Health & Hospitality",
    "Health & Hospitality": "Health & Hospitality",
    "Life Science": "Life Science",
    "Life Sciences": "Life Science",
    "Products": "Products",
    "Software": "Software"
  }).map(([alias, canonical]) => [normalizeKey(alias), canonical]));
  const CROSS_INDUSTRY_TARGETS = [
    { family: "Business Services", tag: "#xvr-bizsvcs" },
    { family: "Construction & Energy", label: "Construction", tag: "#xvr-conenergy" },
    { family: "Consumer Services", tag: "#xvr-consumersvcs" },
    { family: "EPM", tag: "#xvr-epm", markerTag: EPM_REQUESTED_TAG, title: "Mark this SCR as EPM Requested SC" },
    { family: "Tech COE", label: "Tech COE", tag: "#xvr-techcoe", markerTag: TECH_COE_REQUESTED_TAG, title: "Mark this SCR as Technology COE" },
    { family: "Products", tag: "#xvr-products" },
    { family: "Software", tag: "#xvr-software" },
    { family: "Health & Hospitality", tag: "#xvr-healthhosp" }
  ];
  const CROSS_INDUSTRY_GLOBAL_TAGS = ["#xvr-other", "#xvr-unmapped", "#xvr-otherunmapped"];
  const PEOPLE_FILTERS = [
    { key: "salesDirector", label: "Regional Director", placeholder: "Type director, press Enter" },
    { key: "regionalVp", label: "Regional VP", placeholder: "Type RVP, press Enter" },
    { key: "industryLeader", label: "Industry Leader/AVP", placeholder: "Type leader, press Enter" }
  ];

  const params = new URLSearchParams(window.location.search);
  const IS_GRAPH_TOKEN_REFRESH_PAGE = window.location.hostname === "mcanderson14.github.io"
    && /\/ns_scm_tools_fy27\/calendar-refresh\.html$/i.test(window.location.pathname);
  const CURRENT_SEARCH_ID = params.get("searchid") || "";
  const CURRENT_QUEUE = QUEUE_CONFIGS[CURRENT_SEARCH_ID];
  if (!CURRENT_QUEUE && !IS_GRAPH_TOKEN_REFRESH_PAGE) return;
  const SAVED_SEARCH_ID = CURRENT_QUEUE ? CURRENT_QUEUE.searchId : "";

  const MAPPING_TSV = `
Industry Family	Direct/AMO	State	Sales Region	SC_Staffing_Region
Business Services	AMO	CA	West	West
Business Services	AMO	TX	Central	Central
Business Services	AMO	NY	East	East
Business Services	AMO	FL	East	East
Business Services	AMO	IL	Central	Central
Business Services	AMO	MA	East	East
Business Services	AMO	GA	East	East
Business Services	AMO	ON	Central	Central
Business Services	AMO	NJ	East	East
Business Services	AMO	VA	East	East
Business Services	AMO	NC	East	East
Business Services	AMO	PA	East	East
Business Services	AMO	CO	West	West
Business Services	AMO	OH	Central	Central
Business Services	AMO	MN	Central	Central
Business Services	AMO	MI	Central	Central
Business Services	AMO	TN	Central	Central
Business Services	AMO	WA	West	West
Business Services	AMO	UT	West	West
Business Services	AMO	MO	Central	Central
Business Services	AMO	MD	East	East
Business Services	AMO	AZ	West	West
Business Services	AMO	WI	Central	Central
Business Services	AMO	QC	East	East
Business Services	AMO	IN	Central	Central
Business Services	AMO	DC	East	East
Business Services	AMO	CT	East	East
Business Services	AMO	OR	West	West
Business Services	AMO	KS	Central	Central
Business Services	AMO	NV	West	West
Business Services	AMO	BC	West	West
Business Services	AMO	IA	Central	Central
Business Services	AMO	NH	East	East
Business Services	AMO	AL	Central	Central
Business Services	AMO	DE	East	East
Business Services	AMO	SC	East	East
Business Services	AMO	NE	Central	Central
Business Services	AMO	KY	Central	Central
Business Services	AMO	LA	Central	Central
Business Services	AMO	AB	West	West
Business Services	AMO	ID	West	West
Business Services	AMO	OK	Central	Central
Business Services	AMO	AR	Central	Central
Business Services	AMO	NM	West	West
Business Services	AMO	ME	East	East
Business Services	AMO	RI	East	East
Business Services	AMO	AK	West	West
Business Services	AMO	ND	Central	Central
Business Services	AMO	HI	West	West
Business Services	AMO	MS	Central	Central
Business Services	AMO	MT	West	West
Business Services	AMO	SD	Central	Central
Business Services	AMO	WY	West	West
Business Services	AMO	VT	East	East
Business Services	AMO	NB	East	East
Business Services	AMO	MB	Central	Central
Business Services	AMO	NL	East	East
Business Services	AMO	WV	East	East
Business Services	AMO	NS	East	East
Business Services	AMO	NT	West	West
Construction & Energy	AMO	TX	West	West
Construction & Energy	AMO	CA	Central	Central
Construction & Energy	AMO	FL	East	East
Construction & Energy	AMO	NY	East	East
Construction & Energy	AMO	CO	Central	Central
Construction & Energy	AMO	ON	East	East
Construction & Energy	AMO	NC	East	East
Construction & Energy	AMO	MA	Central	Central
Construction & Energy	AMO	GA	East	East
Construction & Energy	AMO	IL	East	East
Construction & Energy	AMO	UT	East	East
Construction & Energy	AMO	AZ	East	East
Construction & Energy	AMO	VA	West	West
Construction & Energy	AMO	OH	Central	Central
Construction & Energy	AMO	NJ	Central	Central
Construction & Energy	AMO	BC	Central	Central
Construction & Energy	AMO	AB	Central	Central
Construction & Energy	AMO	PA	West	West
Construction & Energy	AMO	MI	West	West
Construction & Energy	AMO	MO	Central	Central
Construction & Energy	AMO	WA	East	East
Construction & Energy	AMO	IN	West	West
Construction & Energy	AMO	LA	Central	Central
Construction & Energy	AMO	MN	East	East
Construction & Energy	AMO	MD	Central	Central
Construction & Energy	AMO	TN	East	East
Construction & Energy	AMO	OR	East	East
Construction & Energy	AMO	QC	West	West
Construction & Energy	AMO	WI	Central	Central
Construction & Energy	AMO	SC	West	West
Construction & Energy	AMO	NV	West	West
Construction & Energy	AMO	OK	Central	Central
Construction & Energy	AMO	CT	East	East
Construction & Energy	AMO	NM	Central	Central
Construction & Energy	AMO	KY	East	East
Construction & Energy	AMO	AR	East	East
Construction & Energy	AMO	NE	Central	Central
Construction & Energy	AMO	ID	Central	Central
Construction & Energy	AMO	KS	Central	Central
Construction & Energy	AMO	DC	West	West
Construction & Energy	AMO	NH	West	West
Construction & Energy	AMO	AL	Central	Central
Construction & Energy	AMO	ME	Central	Central
Construction & Energy	AMO	IA	West	West
Construction & Energy	AMO	DE	East	East
Construction & Energy	AMO	MS	East	East
Construction & Energy	AMO	VT	West	West
Construction & Energy	AMO	AK	Central	Central
Construction & Energy	AMO	SD	West	West
Construction & Energy	AMO	ND	Central	Central
Construction & Energy	AMO	MB	West	West
Construction & Energy	AMO	WV	Central	Central
Construction & Energy	AMO	MT	West	West
Construction & Energy	AMO	RI	East	East
Construction & Energy	AMO	WY	East	East
Construction & Energy	AMO	NS	Central	Central
Construction & Energy	AMO	NT	East	East
Construction & Energy	AMO	NL	East	East
Construction & Energy	AMO	HI	East	East
Construction & Energy	AMO	NB	West	West
Consumer Services	AMO	CA	West	West
Consumer Services	AMO	NY	Central	Central
Consumer Services	AMO	TX	East	East
Consumer Services	AMO	FL	East	East
Consumer Services	AMO	IL	Central	Central
Consumer Services	AMO	MA	East	East
Consumer Services	AMO	ON	East	East
Consumer Services	AMO	GA	Central	Central
Consumer Services	AMO	PA	East	East
Consumer Services	AMO	OH	East	East
Consumer Services	AMO	CO	East	East
Consumer Services	AMO	MN	East	East
Consumer Services	AMO	NJ	West	West
Consumer Services	AMO	NC	Central	Central
Consumer Services	AMO	VA	Central	Central
Consumer Services	AMO	DC	Central	Central
Consumer Services	AMO	WA	Central	Central
Consumer Services	AMO	UT	West	West
Consumer Services	AMO	AZ	West	West
Consumer Services	AMO	MI	Central	Central
Consumer Services	AMO	TN	East	East
Consumer Services	AMO	MD	West	West
Consumer Services	AMO	MO	Central	Central
Consumer Services	AMO	CT	East	East
Consumer Services	AMO	WI	Central	Central
Consumer Services	AMO	IN	East	East
Consumer Services	AMO	OR	East	East
Consumer Services	AMO	NV	West	West
Consumer Services	AMO	KY	Central	Central
Consumer Services	AMO	BC	West	West
Consumer Services	AMO	QC	West	West
Consumer Services	AMO	SC	Central	Central
Consumer Services	AMO	DE	East	East
Consumer Services	AMO	KS	Central	Central
Consumer Services	AMO	NE	East	East
Consumer Services	AMO	AL	East	East
Consumer Services	AMO	LA	Central	Central
Consumer Services	AMO	NH	Central	Central
Consumer Services	AMO	OK	Central	Central
Consumer Services	AMO	AB	West	West
Consumer Services	AMO	IA	West	West
Consumer Services	AMO	AR	Central	Central
Consumer Services	AMO	MT	Central	Central
Consumer Services	AMO	ID	West	West
Consumer Services	AMO	ME	East	East
Consumer Services	AMO	ND	East	East
Consumer Services	AMO	NM	West	West
Consumer Services	AMO	HI	Central	Central
Consumer Services	AMO	RI	West	West
Consumer Services	AMO	MS	Central	Central
Consumer Services	AMO	SD	West	West
Consumer Services	AMO	VT	Central	Central
Consumer Services	AMO	NS	West	West
Consumer Services	AMO	WY	East	East
Consumer Services	AMO	MB	East	East
Consumer Services	AMO	AK	Central	Central
Consumer Services	AMO	WV	East	East
Consumer Services	AMO	NT	East	East
Consumer Services	AMO	NL	East	East
Consumer Services	AMO	NU	West	West
Products	AMO	CA	West	West
Products	AMO	TX	Central	Central
Products	AMO	FL	East	South
Products	AMO	NY	East	East
Products	AMO	IL	Central	Central
Products	AMO	NJ	East	East
Products	AMO	ON	East	East
Products	AMO	OH	Central	South
Products	AMO	PA	East	East
Products	AMO	CO	East	East
Products	AMO	GA	East	South
Products	AMO	NC	East	South
Products	AMO	MN	West	West
Products	AMO	MA	Central	Central
Products	AMO	MI	Central	Central
Products	AMO	WA	Central	Central
Products	AMO	WI	Central	Central
Products	AMO	TN	West	South
Products	AMO	MO	West	South
Products	AMO	UT	Central	Central
Products	AMO	IN	East	East
Products	AMO	BC	West	West
Products	AMO	CT	Central	Central
Products	AMO	QC	East	East
Products	AMO	OR	Central	Central
Products	AMO	VA	East	East
Products	AMO	SC	East	South
Products	AMO	AZ	West	West
Products	AMO	MD	Central	Central
Products	AMO	NV	West	West
Products	AMO	AL	West	South
Products	AMO	KY	Central	South
Products	AMO	KS	East	South
Products	AMO	IA	Central	Central
Products	AMO	AB	East	East
Products	AMO	LA	East	South
Products	AMO	ID	Central	Central
Products	AMO	OK	Central	South
Products	AMO	AR	Central	South
Products	AMO	NH	West	West
Products	AMO	NE	West	West
Products	AMO	MT	Central	Central
Products	AMO	MS	Central	South
Products	AMO	RI	West	West
Products	AMO	VT	East	East
Products	AMO	DE	East	East
Products	AMO	SD	West	West
Products	AMO	NM	Central	Central
Products	AMO	WY	West	West
Products	AMO	ME	Central	Central
Products	AMO	HI	West	West
Products	AMO	MB	Central	Central
Products	AMO	ND	West	West
Products	AMO	NS	East	East
Products	AMO	WV	East	East
Products	AMO	DC	Central	Central
Products	AMO	AK	East	East
Products	AMO	NL	East	East
Products	AMO	VI	East	East
Products	AMO	NB	West	West
Software	AMO	CA	West	West
Software	AMO	NY	Central	Central
Software	AMO	TX	East	East
Software	AMO	MA	East	East
Software	AMO	FL	Central	Central
Software	AMO	ON	East	East
Software	AMO	GA	East	East
Software	AMO	IL	Central	Central
Software	AMO	CO	East	East
Software	AMO	PA	East	East
Software	AMO	UT	East	East
Software	AMO	NC	East	East
Software	AMO	VA	West	West
Software	AMO	WA	Central	Central
Software	AMO	NJ	Central	Central
Software	AMO	QC	Central	Central
Software	AMO	BC	Central	Central
Software	AMO	OH	West	West
Software	AMO	DE	West	West
Software	AMO	MN	Central	Central
Software	AMO	OR	East	East
Software	AMO	MD	West	West
Software	AMO	AZ	Central	Central
Software	AMO	NV	East	East
Software	AMO	TN	Central	Central
Software	AMO	MO	East	East
Software	AMO	WI	East	East
Software	AMO	IN	West	West
Software	AMO	AB	Central	Central
Software	AMO	MI	West	West
Software	AMO	DC	West	West
Software	AMO	CT	Central	Central
Software	AMO	IA	East	East
Software	AMO	ID	Central	Central
Software	AMO	MT	East	East
Software	AMO	NH	East	East
Software	AMO	NE	Central	Central
Software	AMO	AL	Central	Central
Software	AMO	OK	Central	Central
Software	AMO	SC	West	West
Software	AMO	AR	West	West
Software	AMO	LA	Central	Central
Software	AMO	KS	Central	Central
Software	AMO	KY	West	West
Software	AMO	RI	East	East
Software	AMO	WY	East	East
Software	AMO	ME	West	West
Software	AMO	NS	Central	Central
Software	AMO	MB	West	West
Software	AMO	VT	Central	Central
Software	AMO	ND	West	West
Software	AMO	MS	Central	Central
Software	AMO	SD	West	West
Software	AMO	WV	East	East
Software	AMO	NB	East	East
Software	AMO	NM	Central	Central
Health & Hospitality	AMO	CA	West	West
Health & Hospitality	AMO	MA	Central	Central
Health & Hospitality	AMO	TX	East	East
Health & Hospitality	AMO	NY	East	East
Health & Hospitality	AMO	FL	Central	Central
Health & Hospitality	AMO	IL	East	East
Health & Hospitality	AMO	NJ	East	East
Health & Hospitality	AMO	NC	Central	Central
Health & Hospitality	AMO	CO	East	East
Health & Hospitality	AMO	PA	East	East
Health & Hospitality	AMO	ON	East	East
Health & Hospitality	AMO	GA	East	East
Health & Hospitality	AMO	OH	West	West
Health & Hospitality	AMO	WA	Central	Central
Health & Hospitality	AMO	MN	Central	Central
Health & Hospitality	AMO	AZ	Central	Central
Health & Hospitality	AMO	VA	Central	Central
Health & Hospitality	AMO	TN	West	West
Health & Hospitality	AMO	MD	West	West
Health & Hospitality	AMO	MI	Central	Central
Health & Hospitality	AMO	UT	East	East
Health & Hospitality	AMO	WI	West	West
Health & Hospitality	AMO	OR	Central	Central
Health & Hospitality	AMO	IN	East	East
Health & Hospitality	AMO	NV	Central	Central
Health & Hospitality	AMO	BC	East	East
Health & Hospitality	AMO	CT	East	East
Health & Hospitality	AMO	MO	West	West
Health & Hospitality	AMO	IA	Central	Central
Health & Hospitality	AMO	KY	West	West
Health & Hospitality	AMO	SC	West	West
Health & Hospitality	AMO	LA	Central	Central
Health & Hospitality	AMO	AL	East	East
Health & Hospitality	AMO	AB	Central	Central
Health & Hospitality	AMO	QC	East	East
Health & Hospitality	AMO	OK	East	East
Health & Hospitality	AMO	NE	Central	Central
Health & Hospitality	AMO	DE	Central	Central
Health & Hospitality	AMO	AR	Central	Central
Health & Hospitality	AMO	KS	West	West
Health & Hospitality	AMO	ID	West	West
Health & Hospitality	AMO	DC	Central	Central
Health & Hospitality	AMO	MT	Central	Central
Health & Hospitality	AMO	NM	West	West
Health & Hospitality	AMO	ND	East	East
Health & Hospitality	AMO	MS	East	East
Health & Hospitality	AMO	NH	West	West
Health & Hospitality	AMO	VT	Central	Central
Health & Hospitality	AMO	SD	West	West
Health & Hospitality	AMO	RI	Central	Central
Health & Hospitality	AMO	ME	West	West
Health & Hospitality	AMO	WY	Central	Central
Health & Hospitality	AMO	WV	West	West
Health & Hospitality	AMO	AK	East	East
Health & Hospitality	AMO	MB	East	East
Health & Hospitality	AMO	HI	Central	Central
Health & Hospitality	AMO	Singapore	East	East
Health & Hospitality	AMO	YT	East	East
Health & Hospitality	AMO	NS	East	East
Health & Hospitality	AMO	NL	West	West
Business Services	DIRECT	CA	West	West
Business Services	DIRECT	TX	Central	Central
Business Services	DIRECT	NY	East	East
Business Services	DIRECT	FL	East	East
Business Services	DIRECT	IL	Central	Central
Business Services	DIRECT	MA	East	East
Business Services	DIRECT	GA	East	East
Business Services	DIRECT	ON	Central	Central
Business Services	DIRECT	NJ	East	East
Business Services	DIRECT	VA	East	East
Business Services	DIRECT	NC	East	East
Business Services	DIRECT	PA	East	East
Business Services	DIRECT	CO	West	West
Business Services	DIRECT	OH	Central	Central
Business Services	DIRECT	MN	Central	Central
Business Services	DIRECT	MI	Central	Central
Business Services	DIRECT	TN	Central	Central
Business Services	DIRECT	WA	West	West
Business Services	DIRECT	UT	West	West
Business Services	DIRECT	MO	Central	Central
Business Services	DIRECT	MD	East	East
Business Services	DIRECT	AZ	West	West
Business Services	DIRECT	WI	Central	Central
Business Services	DIRECT	QC	East	East
Business Services	DIRECT	IN	Central	Central
Business Services	DIRECT	DC	East	East
Business Services	DIRECT	CT	East	East
Business Services	DIRECT	OR	West	West
Business Services	DIRECT	KS	Central	Central
Business Services	DIRECT	NV	West	West
Business Services	DIRECT	BC	West	West
Business Services	DIRECT	IA	Central	Central
Business Services	DIRECT	NH	East	East
Business Services	DIRECT	AL	Central	Central
Business Services	DIRECT	DE	East	East
Business Services	DIRECT	SC	East	East
Business Services	DIRECT	NE	Central	Central
Business Services	DIRECT	KY	Central	Central
Business Services	DIRECT	LA	Central	Central
Business Services	DIRECT	AB	West	West
Business Services	DIRECT	ID	West	West
Business Services	DIRECT	OK	Central	Central
Business Services	DIRECT	AR	Central	Central
Business Services	DIRECT	NM	West	West
Business Services	DIRECT	ME	East	East
Business Services	DIRECT	RI	East	East
Business Services	DIRECT	AK	West	West
Business Services	DIRECT	ND	Central	Central
Business Services	DIRECT	HI	West	West
Business Services	DIRECT	MS	Central	Central
Business Services	DIRECT	MT	West	West
Business Services	DIRECT	SD	Central	Central
Business Services	DIRECT	WY	West	West
Business Services	DIRECT	VT	East	East
Business Services	DIRECT	NB	East	East
Business Services	DIRECT	MB	Central	Central
Business Services	DIRECT	NL	East	East
Business Services	DIRECT	WV	East	East
Business Services	DIRECT	NS	East	East
Business Services	DIRECT	NT	West	West
Construction & Energy	DIRECT	TX	West	West
Construction & Energy	DIRECT	CA	Central	Central
Construction & Energy	DIRECT	FL	East	East
Construction & Energy	DIRECT	NY	East	East
Construction & Energy	DIRECT	CO	Central	Central
Construction & Energy	DIRECT	ON	East	East
Construction & Energy	DIRECT	NC	East	East
Construction & Energy	DIRECT	MA	Central	Central
Construction & Energy	DIRECT	GA	East	East
Construction & Energy	DIRECT	IL	East	East
Construction & Energy	DIRECT	UT	East	East
Construction & Energy	DIRECT	AZ	East	East
Construction & Energy	DIRECT	VA	West	West
Construction & Energy	DIRECT	OH	Central	Central
Construction & Energy	DIRECT	NJ	Central	Central
Construction & Energy	DIRECT	BC	Central	Central
Construction & Energy	DIRECT	AB	Central	Central
Construction & Energy	DIRECT	PA	West	West
Construction & Energy	DIRECT	MI	West	West
Construction & Energy	DIRECT	MO	Central	Central
Construction & Energy	DIRECT	WA	East	East
Construction & Energy	DIRECT	IN	West	West
Construction & Energy	DIRECT	LA	Central	Central
Construction & Energy	DIRECT	MN	East	East
Construction & Energy	DIRECT	MD	Central	Central
Construction & Energy	DIRECT	TN	East	East
Construction & Energy	DIRECT	OR	East	East
Construction & Energy	DIRECT	QC	West	West
Construction & Energy	DIRECT	WI	Central	Central
Construction & Energy	DIRECT	SC	West	West
Construction & Energy	DIRECT	NV	West	West
Construction & Energy	DIRECT	OK	Central	Central
Construction & Energy	DIRECT	CT	East	East
Construction & Energy	DIRECT	NM	Central	Central
Construction & Energy	DIRECT	KY	East	East
Construction & Energy	DIRECT	AR	East	East
Construction & Energy	DIRECT	NE	Central	Central
Construction & Energy	DIRECT	ID	Central	Central
Construction & Energy	DIRECT	KS	Central	Central
Construction & Energy	DIRECT	DC	West	West
Construction & Energy	DIRECT	NH	West	West
Construction & Energy	DIRECT	AL	Central	Central
Construction & Energy	DIRECT	ME	Central	Central
Construction & Energy	DIRECT	IA	West	West
Construction & Energy	DIRECT	DE	East	East
Construction & Energy	DIRECT	MS	East	East
Construction & Energy	DIRECT	VT	West	West
Construction & Energy	DIRECT	AK	Central	Central
Construction & Energy	DIRECT	SD	West	West
Construction & Energy	DIRECT	ND	Central	Central
Construction & Energy	DIRECT	MB	West	West
Construction & Energy	DIRECT	WV	Central	Central
Construction & Energy	DIRECT	MT	West	West
Construction & Energy	DIRECT	RI	East	East
Construction & Energy	DIRECT	WY	East	East
Construction & Energy	DIRECT	NS	Central	Central
Construction & Energy	DIRECT	NT	East	East
Construction & Energy	DIRECT	NL	East	East
Construction & Energy	DIRECT	HI	East	East
Construction & Energy	DIRECT	NB	West	West
Consumer Services	DIRECT	CA	West	West
Consumer Services	DIRECT	NY	Central	Central
Consumer Services	DIRECT	TX	East	East
Consumer Services	DIRECT	FL	East	East
Consumer Services	DIRECT	IL	Central	Central
Consumer Services	DIRECT	MA	East	East
Consumer Services	DIRECT	ON	East	East
Consumer Services	DIRECT	GA	Central	Central
Consumer Services	DIRECT	PA	East	East
Consumer Services	DIRECT	OH	East	East
Consumer Services	DIRECT	CO	East	East
Consumer Services	DIRECT	MN	East	East
Consumer Services	DIRECT	NJ	West	West
Consumer Services	DIRECT	NC	Central	Central
Consumer Services	DIRECT	VA	Central	Central
Consumer Services	DIRECT	DC	Central	Central
Consumer Services	DIRECT	WA	Central	Central
Consumer Services	DIRECT	UT	West	West
Consumer Services	DIRECT	AZ	West	West
Consumer Services	DIRECT	MI	Central	Central
Consumer Services	DIRECT	TN	East	East
Consumer Services	DIRECT	MD	West	West
Consumer Services	DIRECT	MO	Central	Central
Consumer Services	DIRECT	CT	East	East
Consumer Services	DIRECT	WI	Central	Central
Consumer Services	DIRECT	IN	East	East
Consumer Services	DIRECT	OR	East	East
Consumer Services	DIRECT	NV	West	West
Consumer Services	DIRECT	KY	Central	Central
Consumer Services	DIRECT	BC	West	West
Consumer Services	DIRECT	QC	West	West
Consumer Services	DIRECT	SC	Central	Central
Consumer Services	DIRECT	DE	East	East
Consumer Services	DIRECT	KS	Central	Central
Consumer Services	DIRECT	NE	East	East
Consumer Services	DIRECT	AL	East	East
Consumer Services	DIRECT	LA	Central	Central
Consumer Services	DIRECT	NH	Central	Central
Consumer Services	DIRECT	OK	Central	Central
Consumer Services	DIRECT	AB	West	West
Consumer Services	DIRECT	IA	West	West
Consumer Services	DIRECT	AR	Central	Central
Consumer Services	DIRECT	MT	Central	Central
Consumer Services	DIRECT	ID	West	West
Consumer Services	DIRECT	ME	East	East
Consumer Services	DIRECT	ND	East	East
Consumer Services	DIRECT	NM	West	West
Consumer Services	DIRECT	HI	Central	Central
Consumer Services	DIRECT	RI	West	West
Consumer Services	DIRECT	MS	Central	Central
Consumer Services	DIRECT	SD	West	West
Consumer Services	DIRECT	VT	Central	Central
Consumer Services	DIRECT	NS	West	West
Consumer Services	DIRECT	WY	East	East
Consumer Services	DIRECT	MB	East	East
Consumer Services	DIRECT	AK	Central	Central
Consumer Services	DIRECT	WV	East	East
Consumer Services	DIRECT	NT	East	East
Consumer Services	DIRECT	NL	East	East
Consumer Services	DIRECT	NU	West	West
Products	DIRECT	CA	West	West
Products	DIRECT	TX	Central	Central
Products	DIRECT	FL	East	South
Products	DIRECT	NY	East	East
Products	DIRECT	IL	Central	Central
Products	DIRECT	NJ	East	East
Products	DIRECT	ON	East	East
Products	DIRECT	OH	Central	South
Products	DIRECT	PA	East	East
Products	DIRECT	CO	East	East
Products	DIRECT	GA	East	South
Products	DIRECT	NC	East	South
Products	DIRECT	MN	West	West
Products	DIRECT	MA	Central	Central
Products	DIRECT	MI	Central	Central
Products	DIRECT	WA	Central	Central
Products	DIRECT	WI	Central	Central
Products	DIRECT	TN	West	South
Products	DIRECT	MO	West	South
Products	DIRECT	UT	Central	Central
Products	DIRECT	IN	East	East
Products	DIRECT	BC	West	West
Products	DIRECT	CT	Central	Central
Products	DIRECT	QC	East	East
Products	DIRECT	OR	Central	Central
Products	DIRECT	VA	East	East
Products	DIRECT	SC	East	South
Products	DIRECT	AZ	West	West
Products	DIRECT	MD	Central	Central
Products	DIRECT	NV	West	West
Products	DIRECT	AL	West	South
Products	DIRECT	KY	Central	South
Products	DIRECT	KS	East	South
Products	DIRECT	IA	Central	Central
Products	DIRECT	AB	East	East
Products	DIRECT	LA	East	South
Products	DIRECT	ID	Central	Central
Products	DIRECT	OK	Central	South
Products	DIRECT	AR	Central	South
Products	DIRECT	NH	West	West
Products	DIRECT	NE	West	West
Products	DIRECT	MT	Central	Central
Products	DIRECT	MS	Central	South
Products	DIRECT	RI	West	West
Products	DIRECT	VT	East	East
Products	DIRECT	DE	East	East
Products	DIRECT	SD	West	West
Products	DIRECT	NM	Central	Central
Products	DIRECT	WY	West	West
Products	DIRECT	ME	Central	Central
Products	DIRECT	HI	West	West
Products	DIRECT	MB	Central	Central
Products	DIRECT	ND	West	West
Products	DIRECT	NS	East	East
Products	DIRECT	WV	East	East
Products	DIRECT	DC	Central	Central
Products	DIRECT	AK	East	East
Products	DIRECT	NL	East	East
Products	DIRECT	VI	East	East
Products	DIRECT	NB	West	West
Software	DIRECT	CA	West	West
Software	DIRECT	NY	Central	Central
Software	DIRECT	TX	East	East
Software	DIRECT	MA	East	East
Software	DIRECT	FL	Central	Central
Software	DIRECT	ON	East	East
Software	DIRECT	GA	East	East
Software	DIRECT	IL	Central	Central
Software	DIRECT	CO	East	East
Software	DIRECT	PA	East	East
Software	DIRECT	UT	East	East
Software	DIRECT	NC	East	East
Software	DIRECT	VA	West	West
Software	DIRECT	WA	Central	Central
Software	DIRECT	NJ	Central	Central
Software	DIRECT	QC	Central	Central
Software	DIRECT	BC	Central	Central
Software	DIRECT	OH	West	West
Software	DIRECT	DE	West	West
Software	DIRECT	MN	Central	Central
Software	DIRECT	OR	East	East
Software	DIRECT	MD	West	West
Software	DIRECT	AZ	Central	Central
Software	DIRECT	NV	East	East
Software	DIRECT	TN	Central	Central
Software	DIRECT	MO	East	East
Software	DIRECT	WI	East	East
Software	DIRECT	IN	West	West
Software	DIRECT	AB	Central	Central
Software	DIRECT	MI	West	West
Software	DIRECT	DC	West	West
Software	DIRECT	CT	Central	Central
Software	DIRECT	IA	East	East
Software	DIRECT	ID	Central	Central
Software	DIRECT	MT	East	East
Software	DIRECT	NH	East	East
Software	DIRECT	NE	Central	Central
Software	DIRECT	AL	Central	Central
Software	DIRECT	OK	Central	Central
Software	DIRECT	SC	West	West
Software	DIRECT	AR	West	West
Software	DIRECT	LA	Central	Central
Software	DIRECT	KS	Central	Central
Software	DIRECT	KY	West	West
Software	DIRECT	RI	East	East
Software	DIRECT	WY	East	East
Software	DIRECT	ME	West	West
Software	DIRECT	NS	Central	Central
Software	DIRECT	MB	West	West
Software	DIRECT	VT	Central	Central
Software	DIRECT	ND	West	West
Software	DIRECT	MS	Central	Central
Software	DIRECT	SD	West	West
Software	DIRECT	WV	East	East
Software	DIRECT	NB	East	East
Software	DIRECT	NM	Central	Central
Health & Hospitality	DIRECT	CA	West	West
Health & Hospitality	DIRECT	MA	Central	Central
Health & Hospitality	DIRECT	TX	East	East
Health & Hospitality	DIRECT	NY	East	East
Health & Hospitality	DIRECT	FL	Central	Central
Health & Hospitality	DIRECT	IL	East	East
Health & Hospitality	DIRECT	NJ	East	East
Health & Hospitality	DIRECT	NC	Central	Central
Health & Hospitality	DIRECT	CO	East	East
Health & Hospitality	DIRECT	PA	East	East
Health & Hospitality	DIRECT	ON	East	East
Health & Hospitality	DIRECT	GA	East	East
Health & Hospitality	DIRECT	OH	West	West
Health & Hospitality	DIRECT	WA	Central	Central
Health & Hospitality	DIRECT	MN	Central	Central
Health & Hospitality	DIRECT	AZ	Central	Central
Health & Hospitality	DIRECT	VA	Central	Central
Health & Hospitality	DIRECT	TN	West	West
Health & Hospitality	DIRECT	MD	West	West
Health & Hospitality	DIRECT	MI	Central	Central
Health & Hospitality	DIRECT	UT	East	East
Health & Hospitality	DIRECT	WI	West	West
Health & Hospitality	DIRECT	OR	Central	Central
Health & Hospitality	DIRECT	IN	East	East
Health & Hospitality	DIRECT	NV	Central	Central
Health & Hospitality	DIRECT	BC	East	East
Health & Hospitality	DIRECT	CT	East	East
Health & Hospitality	DIRECT	MO	West	West
Health & Hospitality	DIRECT	IA	Central	Central
Health & Hospitality	DIRECT	KY	West	West
Health & Hospitality	DIRECT	SC	West	West
Health & Hospitality	DIRECT	LA	Central	Central
Health & Hospitality	DIRECT	AL	East	East
Health & Hospitality	DIRECT	AB	Central	Central
Health & Hospitality	DIRECT	QC	East	East
Health & Hospitality	DIRECT	OK	East	East
Health & Hospitality	DIRECT	NE	Central	Central
Health & Hospitality	DIRECT	DE	Central	Central
Health & Hospitality	DIRECT	AR	Central	Central
Health & Hospitality	DIRECT	KS	West	West
Health & Hospitality	DIRECT	ID	West	West
Health & Hospitality	DIRECT	DC	Central	Central
Health & Hospitality	DIRECT	MT	Central	Central
Health & Hospitality	DIRECT	NM	West	West
Health & Hospitality	DIRECT	ND	East	East
Health & Hospitality	DIRECT	MS	East	East
Health & Hospitality	DIRECT	NH	West	West
Health & Hospitality	DIRECT	VT	Central	Central
Health & Hospitality	DIRECT	SD	West	West
Health & Hospitality	DIRECT	RI	Central	Central
Health & Hospitality	DIRECT	ME	West	West
Health & Hospitality	DIRECT	WY	Central	Central
Health & Hospitality	DIRECT	WV	West	West
Health & Hospitality	DIRECT	AK	East	East
Health & Hospitality	DIRECT	MB	East	East
Health & Hospitality	DIRECT	HI	Central	Central
Health & Hospitality	DIRECT	Singapore	East	East
Health & Hospitality	DIRECT	YT	East	East
Health & Hospitality	DIRECT	NS	East	East
Health & Hospitality	DIRECT	NL	West	West
`.trim();

  const MAPPING_DATA = JSON.parse(`{"states":["Singapore","AB","AK","AL","AR","AZ","BC","CA","CO","CT","DC","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA","MA","MB","MD","ME","MI","MN","MO","MS","MT","NB","NC","ND","NE","NH","NJ","NL","NM","NS","NT","NU","NV","NY","OH","OK","ON","OR","PA","QC","RI","SC","SD","TN","TX","UT","VA","VI","VT","WA","WI","WV","WY","YT"],"sales":["Central","East","West"],"staffing":["Central","East","Midwest","Southeast","West"],"families":["Business Services","Construction & Energy","Consumer Services","Health & Hospitality","Products","Software"],"modes":["AMO","DIRECT"],"rows":[[0,0,7,2,4],[0,0,54,0,0],[0,0,43,1,1],[0,0,12,1,1],[0,0,17,0,0],[0,0,22,1,1],[0,0,13,1,1],[0,0,46,0,0],[0,0,36,1,1],[0,0,56,1,1],[0,0,32,1,1],[0,0,48,1,1],[0,0,8,2,4],[0,0,44,0,0],[0,0,27,0,0],[0,0,26,0,0],[0,0,53,0,0],[0,0,59,2,4],[0,0,55,2,4],[0,0,28,0,0],[0,0,24,1,1],[0,0,5,2,4],[0,0,60,0,0],[0,0,49,1,1],[0,0,18,0,0],[0,0,10,1,1],[0,0,9,1,1],[0,0,47,2,4],[0,0,19,0,0],[0,0,42,2,4],[0,0,6,2,4],[0,0,15,0,0],[0,0,35,1,1],[0,0,3,0,0],[0,0,11,1,1],[0,0,51,1,1],[0,0,34,0,0],[0,0,20,0,0],[0,0,21,0,0],[0,0,1,2,4],[0,0,16,2,4],[0,0,45,0,0],[0,0,4,0,0],[0,0,38,2,4],[0,0,25,1,1],[0,0,50,1,1],[0,0,2,2,4],[0,0,33,0,0],[0,0,14,2,4],[0,0,29,0,0],[0,0,30,2,4],[0,0,52,0,0],[0,0,62,2,4],[0,0,58,1,1],[0,0,31,1,1],[0,0,23,0,0],[0,0,37,1,1],[0,0,61,1,1],[0,0,39,1,1],[0,0,40,2,4],[1,0,54,2,4],[1,0,7,0,4],[1,0,12,1,1],[1,0,43,1,1],[1,0,8,0,4],[1,0,46,1,1],[1,0,32,1,1],[1,0,22,0,1],[1,0,13,1,1],[1,0,17,1,1],[1,0,55,1,4],[1,0,5,1,4],[1,0,56,2,1],[1,0,44,0,1],[1,0,36,0,1],[1,0,6,0,4],[1,0,1,0,4],[1,0,48,2,1],[1,0,26,2,1],[1,0,28,0,4],[1,0,59,1,4],[1,0,18,2,1],[1,0,21,0,1],[1,0,27,1,1],[1,0,24,0,1],[1,0,53,1,1],[1,0,47,1,4],[1,0,49,2,1],[1,0,60,0,1],[1,0,51,2,1],[1,0,42,2,4],[1,0,45,0,4],[1,0,9,1,1],[1,0,38,0,4],[1,0,20,1,1],[1,0,4,1,4],[1,0,34,0,4],[1,0,16,0,4],[1,0,19,0,4],[1,0,10,2,1],[1,0,35,2,1],[1,0,3,0,1],[1,0,25,0,1],[1,0,15,2,4],[1,0,11,1,1],[1,0,29,1,1],[1,0,58,2,1],[1,0,2,0,4],[1,0,52,2,4],[1,0,33,0,4],[1,0,23,2,4],[1,0,61,0,1],[1,0,30,2,4],[1,0,50,1,1],[1,0,62,1,4],[1,0,39,0,1],[1,0,40,1,4],[1,0,37,1,1],[1,0,14,1,4],[1,0,31,2,1],[2,0,7,2,4],[2,0,43,0,1],[2,0,54,1,4],[2,0,12,1,1],[2,0,17,0,4],[2,0,22,1,1],[2,0,46,1,4],[2,0,13,0,1],[2,0,48,1,1],[2,0,44,1,1],[2,0,8,1,4],[2,0,27,1,4],[2,0,36,2,1],[2,0,32,0,1],[2,0,56,0,1],[2,0,10,0,1],[2,0,59,0,4],[2,0,55,2,4],[2,0,5,2,4],[2,0,26,0,1],[2,0,53,1,1],[2,0,24,2,1],[2,0,28,0,4],[2,0,9,1,1],[2,0,60,0,4],[2,0,18,1,1],[2,0,47,1,4],[2,0,42,2,4],[2,0,20,0,1],[2,0,6,2,4],[2,0,49,2,1],[2,0,51,0,1],[2,0,11,1,1],[2,0,19,0,4],[2,0,34,1,4],[2,0,3,1,1],[2,0,21,0,4],[2,0,35,0,1],[2,0,45,0,4],[2,0,1,2,4],[2,0,15,2,4],[2,0,4,0,4],[2,0,30,0,4],[2,0,16,2,4],[2,0,25,1,1],[2,0,33,1,4],[2,0,38,2,4],[2,0,14,0,4],[2,0,50,2,1],[2,0,29,0,1],[2,0,52,2,4],[2,0,58,0,1],[2,0,39,2,1],[2,0,62,1,4],[2,0,23,1,4],[2,0,2,0,4],[2,0,61,1,1],[2,0,40,1,4],[2,0,37,1,1],[2,0,41,2,4],[4,0,7,2,4],[4,0,54,0,2],[4,0,12,1,3],[4,0,43,1,1],[4,0,17,0,1],[4,0,36,1,1],[4,0,46,1,2],[4,0,44,0,3],[4,0,48,1,1],[4,0,8,1,2],[4,0,13,1,3],[4,0,32,1,3],[4,0,27,2,2],[4,0,22,0,1],[4,0,26,0,1],[4,0,59,0,4],[4,0,60,0,2],[4,0,53,2,3],[4,0,28,2,3],[4,0,55,0,4],[4,0,18,1,1],[4,0,6,2,4],[4,0,9,0,1],[4,0,49,1,2],[4,0,47,0,4],[4,0,56,1,1],[4,0,51,1,3],[4,0,5,2,2],[4,0,24,0,1],[4,0,42,2,4],[4,0,3,2,3],[4,0,20,0,3],[4,0,19,1,3],[4,0,15,0,2],[4,0,1,1,2],[4,0,21,1,3],[4,0,16,0,4],[4,0,45,0,3],[4,0,4,0,3],[4,0,35,2,1],[4,0,34,2,2],[4,0,30,0,2],[4,0,29,0,3],[4,0,50,2,1],[4,0,58,1,1],[4,0,11,1,1],[4,0,52,2,2],[4,0,38,0,2],[4,0,62,2,2],[4,0,25,0,1],[4,0,14,2,4],[4,0,23,0,2],[4,0,33,2,2],[4,0,39,1,2],[4,0,61,1,1],[4,0,10,0,1],[4,0,2,1,4],[4,0,37,1,1],[4,0,57,1,1],[4,0,31,2,2],[5,0,7,2,4],[5,0,43,0,1],[5,0,54,1,4],[5,0,22,1,1],[5,0,12,0,1],[5,0,46,1,1],[5,0,13,1,1],[5,0,17,0,1],[5,0,8,1,4],[5,0,48,1,1],[5,0,55,1,4],[5,0,32,1,1],[5,0,56,2,1],[5,0,59,0,4],[5,0,36,0,1],[5,0,49,0,1],[5,0,6,0,4],[5,0,44,2,1],[5,0,11,2,1],[5,0,27,0,1],[5,0,47,1,4],[5,0,24,2,1],[5,0,5,0,4],[5,0,42,1,4],[5,0,53,0,1],[5,0,28,1,1],[5,0,60,1,1],[5,0,18,2,1],[5,0,1,0,4],[5,0,26,2,1],[5,0,10,2,1],[5,0,9,0,1],[5,0,15,1,1],[5,0,16,0,4],[5,0,30,1,4],[5,0,35,1,1],[5,0,34,0,4],[5,0,3,0,1],[5,0,45,0,4],[5,0,51,2,1],[5,0,4,2,1],[5,0,21,0,1],[5,0,19,0,4],[5,0,20,2,1],[5,0,50,1,1],[5,0,62,1,4],[5,0,25,2,1],[5,0,39,0,1],[5,0,23,2,4],[5,0,58,0,1],[5,0,33,2,4],[5,0,29,0,1],[5,0,52,2,4],[5,0,61,1,1],[5,0,31,1,1],[5,0,38,0,4],[3,0,7,2,4],[3,0,22,0,1],[3,0,54,1,0],[3,0,43,1,1],[3,0,12,0,1],[3,0,17,1,0],[3,0,36,1,1],[3,0,32,0,1],[3,0,8,1,4],[3,0,48,1,1],[3,0,46,1,0],[3,0,13,1,1],[3,0,44,2,0],[3,0,59,0,4],[3,0,27,0,0],[3,0,5,0,4],[3,0,56,0,1],[3,0,53,2,0],[3,0,24,2,1],[3,0,26,0,0],[3,0,55,1,4],[3,0,60,2,0],[3,0,47,0,4],[3,0,18,1,0],[3,0,42,0,4],[3,0,6,1,4],[3,0,9,1,1],[3,0,28,2,0],[3,0,15,0,0],[3,0,20,2,0],[3,0,51,2,1],[3,0,21,0,0],[3,0,3,1,0],[3,0,1,0,4],[3,0,49,1,1],[3,0,45,1,0],[3,0,34,0,0],[3,0,11,0,1],[3,0,4,0,0],[3,0,19,2,0],[3,0,16,2,4],[3,0,10,0,1],[3,0,30,0,4],[3,0,38,2,4],[3,0,33,1,0],[3,0,29,1,0],[3,0,35,2,1],[3,0,58,0,1],[3,0,52,2,0],[3,0,50,0,1],[3,0,25,2,1],[3,0,62,0,4],[3,0,61,2,1],[3,0,2,1,4],[3,0,23,1,0],[3,0,14,0,4],[3,0,0,1,1],[3,0,63,1,1],[3,0,39,1,1],[3,0,37,2,1],[0,1,7,2,4],[0,1,54,0,4],[0,1,43,1,1],[0,1,12,1,1],[0,1,17,0,4],[0,1,22,1,1],[0,1,13,1,1],[0,1,46,0,1],[0,1,36,1,1],[0,1,56,1,1],[0,1,32,1,1],[0,1,48,1,1],[0,1,8,2,4],[0,1,44,0,1],[0,1,27,0,4],[0,1,26,0,1],[0,1,53,0,1],[0,1,59,2,4],[0,1,55,2,4],[0,1,28,0,4],[0,1,24,1,1],[0,1,5,2,4],[0,1,60,0,4],[0,1,49,1,1],[0,1,18,0,1],[0,1,10,1,1],[0,1,9,1,1],[0,1,47,2,4],[0,1,19,0,4],[0,1,42,2,4],[0,1,6,2,4],[0,1,15,0,4],[0,1,35,1,1],[0,1,3,0,1],[0,1,11,1,1],[0,1,51,1,1],[0,1,34,0,4],[0,1,20,0,1],[0,1,21,0,1],[0,1,1,2,4],[0,1,16,2,4],[0,1,45,0,4],[0,1,4,0,4],[0,1,38,2,4],[0,1,25,1,1],[0,1,50,1,1],[0,1,2,2,4],[0,1,33,0,4],[0,1,14,2,4],[0,1,29,0,1],[0,1,30,2,4],[0,1,52,0,4],[0,1,62,2,4],[0,1,58,1,1],[0,1,31,1,1],[0,1,23,0,4],[0,1,37,1,1],[0,1,61,1,1],[0,1,39,1,1],[0,1,40,2,4],[1,1,54,2,4],[1,1,7,0,4],[1,1,12,1,1],[1,1,43,1,1],[1,1,8,0,4],[1,1,46,1,1],[1,1,32,1,1],[1,1,22,0,1],[1,1,13,1,1],[1,1,17,1,1],[1,1,55,1,4],[1,1,5,1,4],[1,1,56,2,1],[1,1,44,0,1],[1,1,36,0,1],[1,1,6,0,4],[1,1,1,0,4],[1,1,48,2,1],[1,1,26,2,1],[1,1,28,0,4],[1,1,59,1,4],[1,1,18,2,1],[1,1,21,0,1],[1,1,27,1,4],[1,1,24,0,1],[1,1,53,1,1],[1,1,47,1,4],[1,1,49,2,1],[1,1,60,0,4],[1,1,51,2,1],[1,1,42,2,4],[1,1,45,0,4],[1,1,9,1,1],[1,1,38,0,4],[1,1,20,1,1],[1,1,4,1,4],[1,1,34,0,4],[1,1,16,0,4],[1,1,19,0,4],[1,1,10,2,1],[1,1,35,2,1],[1,1,3,0,1],[1,1,25,0,1],[1,1,15,2,4],[1,1,11,1,1],[1,1,29,1,1],[1,1,58,2,1],[1,1,2,0,4],[1,1,52,2,4],[1,1,33,0,4],[1,1,23,2,4],[1,1,61,0,1],[1,1,30,2,4],[1,1,50,1,1],[1,1,62,1,4],[1,1,39,0,1],[1,1,40,1,4],[1,1,37,1,1],[1,1,14,1,4],[1,1,31,2,1],[2,1,7,2,4],[2,1,43,0,1],[2,1,54,1,4],[2,1,12,1,1],[2,1,17,0,4],[2,1,22,1,1],[2,1,46,1,4],[2,1,13,0,1],[2,1,48,1,1],[2,1,44,1,1],[2,1,8,1,4],[2,1,27,1,4],[2,1,36,2,1],[2,1,32,0,1],[2,1,56,0,1],[2,1,10,0,1],[2,1,59,0,4],[2,1,55,2,4],[2,1,5,2,4],[2,1,26,0,1],[2,1,53,1,1],[2,1,24,2,1],[2,1,28,0,4],[2,1,9,1,1],[2,1,60,0,4],[2,1,18,1,1],[2,1,47,1,4],[2,1,42,2,4],[2,1,20,0,1],[2,1,6,2,4],[2,1,49,2,1],[2,1,51,0,1],[2,1,11,1,1],[2,1,19,0,4],[2,1,34,1,4],[2,1,3,1,1],[2,1,21,0,4],[2,1,35,0,1],[2,1,45,0,4],[2,1,1,2,4],[2,1,15,2,4],[2,1,4,0,4],[2,1,30,0,4],[2,1,16,2,4],[2,1,25,1,1],[2,1,33,1,4],[2,1,38,2,4],[2,1,14,0,4],[2,1,50,2,1],[2,1,29,0,1],[2,1,52,2,4],[2,1,58,0,1],[2,1,39,2,1],[2,1,62,1,4],[2,1,23,1,4],[2,1,2,0,4],[2,1,61,1,1],[2,1,40,1,4],[2,1,37,1,1],[2,1,41,2,4],[4,1,7,2,4],[4,1,54,0,2],[4,1,12,1,3],[4,1,43,1,1],[4,1,17,0,1],[4,1,36,1,1],[4,1,46,1,2],[4,1,44,0,3],[4,1,48,1,1],[4,1,8,1,2],[4,1,13,1,3],[4,1,32,1,3],[4,1,27,2,2],[4,1,22,0,1],[4,1,26,0,1],[4,1,59,0,4],[4,1,60,0,2],[4,1,53,2,3],[4,1,28,2,3],[4,1,55,0,4],[4,1,18,1,1],[4,1,6,2,4],[4,1,9,0,1],[4,1,49,1,2],[4,1,47,0,4],[4,1,56,1,1],[4,1,51,1,3],[4,1,5,2,2],[4,1,24,0,1],[4,1,42,2,4],[4,1,3,2,3],[4,1,20,0,3],[4,1,19,1,3],[4,1,15,0,2],[4,1,1,1,2],[4,1,21,1,3],[4,1,16,0,4],[4,1,45,0,3],[4,1,4,0,3],[4,1,35,2,1],[4,1,34,2,2],[4,1,30,0,2],[4,1,29,0,3],[4,1,50,2,1],[4,1,58,1,1],[4,1,11,1,1],[4,1,52,2,2],[4,1,38,0,2],[4,1,62,2,2],[4,1,25,0,1],[4,1,14,2,4],[4,1,23,0,2],[4,1,33,2,2],[4,1,39,1,2],[4,1,61,1,1],[4,1,10,0,1],[4,1,2,1,4],[4,1,37,1,1],[4,1,57,1,1],[4,1,31,2,2],[5,1,7,2,4],[5,1,43,0,1],[5,1,54,1,1],[5,1,22,1,1],[5,1,12,0,1],[5,1,46,1,1],[5,1,13,1,1],[5,1,17,0,1],[5,1,8,1,4],[5,1,48,1,1],[5,1,55,1,4],[5,1,32,1,1],[5,1,56,2,1],[5,1,59,0,4],[5,1,36,0,1],[5,1,49,0,1],[5,1,6,0,4],[5,1,44,2,1],[5,1,11,2,1],[5,1,27,0,1],[5,1,47,1,4],[5,1,24,2,1],[5,1,5,0,4],[5,1,42,1,4],[5,1,53,0,1],[5,1,28,1,1],[5,1,60,1,1],[5,1,18,2,1],[5,1,1,0,4],[5,1,26,2,1],[5,1,10,2,1],[5,1,9,0,1],[5,1,15,1,1],[5,1,16,0,4],[5,1,30,1,4],[5,1,35,1,1],[5,1,34,0,4],[5,1,3,0,1],[5,1,45,0,4],[5,1,51,2,1],[5,1,4,2,1],[5,1,21,0,1],[5,1,19,0,4],[5,1,20,2,1],[5,1,50,1,1],[5,1,62,1,4],[5,1,25,2,1],[5,1,39,0,1],[5,1,23,2,4],[5,1,58,0,1],[5,1,33,2,4],[5,1,29,0,1],[5,1,52,2,4],[5,1,61,1,1],[5,1,31,1,1],[5,1,38,0,4],[3,1,7,2,4],[3,1,22,0,1],[3,1,54,1,0],[3,1,43,1,1],[3,1,12,0,1],[3,1,17,1,0],[3,1,36,1,1],[3,1,32,0,1],[3,1,8,1,4],[3,1,48,1,1],[3,1,46,1,0],[3,1,13,1,1],[3,1,44,2,0],[3,1,59,0,4],[3,1,27,0,0],[3,1,5,0,4],[3,1,56,0,1],[3,1,53,2,0],[3,1,24,2,1],[3,1,26,0,0],[3,1,55,1,4],[3,1,60,2,0],[3,1,47,0,4],[3,1,18,1,0],[3,1,42,0,4],[3,1,6,1,4],[3,1,9,1,1],[3,1,28,2,0],[3,1,15,0,0],[3,1,20,2,0],[3,1,51,2,1],[3,1,21,0,0],[3,1,3,1,0],[3,1,1,0,4],[3,1,49,1,1],[3,1,45,1,0],[3,1,34,0,0],[3,1,11,0,1],[3,1,4,0,0],[3,1,19,2,0],[3,1,16,2,4],[3,1,10,0,1],[3,1,30,0,4],[3,1,38,2,4],[3,1,33,1,0],[3,1,29,1,0],[3,1,35,2,1],[3,1,58,0,1],[3,1,52,2,0],[3,1,50,0,1],[3,1,25,2,1],[3,1,62,0,4],[3,1,61,2,1],[3,1,2,1,4],[3,1,23,1,0],[3,1,14,0,4],[3,1,0,1,1],[3,1,63,1,1],[3,1,39,1,1],[3,1,37,2,1]]}`);

  const STATE_NAME_TO_CODE = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district of columbia": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
    "alberta": "AB",
    "british columbia": "BC",
    "manitoba": "MB",
    "new brunswick": "NB",
    "newfoundland and labrador": "NL",
    "newfoundland": "NL",
    "nova scotia": "NS",
    "northwest territories": "NT",
    "nunavut": "NU",
    "ontario": "ON",
    "prince edward island": "PE",
    "quebec": "QC",
    "saskatchewan": "SK",
    "yukon": "YT",
    "singapore": "Singapore"
  };

  const headerAliases = {
    state: [
      "oppcompanystateprovince",
      "oppcompanystate",
      "company-stateprovince",
      "companystateprovince",
      "customerstateprovince",
      "stateprovince",
      "state"
    ],
    industryFamily: [
      "fy27industryfamily",
      "fy27scindustrygroup",
      "industryfamily",
      "scindustrygroup",
      "scindustryfamily",
      "oppindustryfamily",
      "opportunityindustryfamily",
      "customerindustryfamily",
      "industry"
    ],
    gtmIndustry: [
      "fy27gtmindustry",
      "fy27industry",
      "gtmindustry"
    ],
    gtmIndustrySubgroup: [
      "fy27gtmindustrysubgroup",
      "fy27gtmindusrysubgroup",
      "fy27industrysubgroup",
      "gtmindustrysubgroup",
      "gtmindusrysubgroup"
    ],
    industrySubgroup: [
      "industrysubgroup",
      "industryandsubgroup",
      "industrysubindustry",
      "subindustry",
      "subgroup"
    ],
    salesRegion: [
      "salesregion",
      "oppsalesregion",
      "opportunitysalesregion",
      "oppregion",
      "region"
    ],
    salesDirector: [
      "regionaldirector",
      "regionaldirectors",
      "regionaldir",
      "salesdirector",
      "salesdirectors",
      "salesdir",
      "salesrepmanager",
      "salesmgr",
      "salesmanager"
    ],
    regionalVp: [
      "regionalvp",
      "rvp",
      "regionalvicepresident"
    ],
    industryLeader: [
      "industryleader",
      "industryleaderavp",
      "industryavp",
      "avp"
    ],
    scrAge: [
      "scrage",
      "screquestage",
      "requestage",
      "age"
    ],
    amoDirect: [
      "amovsdirect",
      "amodirect",
      "directamo",
      "directvsamo",
      "requesttype",
      "screquesttype",
      "salesmotion",
      "saleschannel",
      "requestsource"
    ],
    name: [
      "name",
      "scr",
      "screquest",
      "screquest",
      "documentnumber",
      "number"
    ],
    scrDisplayId: [
      "scrid",
      "screquestid",
      "screqid",
      "requestid"
    ],
    internalId: [
      "id",
      "internalid",
      "internalidnumber",
      "recordid"
    ],
    staffingNotes: [
      "scmstaffingnotes",
      "staffingnotes",
      "scmanagernotes",
      "scmanagernotes2",
      "custrecordscreqscmanagernotes2"
    ],
    hashtags: [
      "hashtags",
      "scrhashtags",
      "screquesthashtags",
      "custrecordscreqhashtags"
    ],
    requestDetailsRaw: [
      "requestdetailsraw",
      "screquestdetailsraw"
    ],
    deliverableRaw: [
      "scdeliverableraw",
      "deliverableraw",
      "screqdeliverableraw",
      "screquestdeliverableraw",
      "custrecordscreqengmntdeliverableraw"
    ],
    dateNeededRaw: [
      "datescneededraw",
      "datescneeded",
      "scneededraw",
      "scneededdateraw",
      "dateneededraw",
      "dateneededdate",
      "dateneededdateraw",
      "anticipatedcustomermeetingdateraw",
      "customermeetingdateraw"
    ]
  };

  let mappingRows = [];
  let industryOptions = [];
  let industryFilterOptions = [];
  let amoDirectOptions = [];
  let salesRegionOptions = [];
  let staffingRegionOptions = [];
  let knownStateCodes = new Set();
  let industryByKey = new Map();
  let mappingByIndustryModeState = new Map();
  let mappingByIndustryState = new Map();
  let mappingMetadata = {
    source: "embedded",
    label: "Embedded fallback",
    rowCount: 0,
    loadedAt: 0,
    schema: "embedded"
  };
  let productsScmRelationships = [];
  let productsScmAuthorizedScms = [];
  let productsScmAuthorizedDirectors = [];
  let productsScmAuthorizedViewers = [];
  let productsScmByExactKey = new Map();
  let productsScmByDirectorKey = new Map();
  let productsScmMetadata = {
    source: "not-loaded",
    label: "Not loaded",
    rowCount: 0,
    loadedAt: 0,
    schema: "",
    authorizedDirectorCount: 0,
    authorizedViewerCount: 0,
    stale: false,
    error: ""
  };
  let authorizedManagerRecords = [];
  let authorizedManagerCanOwnNames = [];
  let authorizedManagerCanViewNames = [];
  let authorizedManagerGroupLookup = new Map();
  let authorizedManagersMetadata = {
    source: "not-loaded",
    label: "Not loaded",
    rowCount: 0,
    loadedAt: 0,
    schema: "",
    canOwnCount: 0,
    canViewCount: 0,
    stale: false,
    error: ""
  };
  let gtmIndustryMappingRows = [];
  let gtmIndustryGroupByIndustrySubgroup = new Map();
  let gtmIndustryGroupBySubgroup = new Map();
  let gtmIndustryGroupByIndustry = new Map();
  let gtmScIndustryMappingMetadata = {
    source: "embedded",
    label: "Embedded fallback",
    rowCount: 0,
    loadedAt: 0,
    schema: "embedded",
    stale: false,
    error: ""
  };
  let gtmScIndustryEmojiMappings = null;
  initializeGtmIndustryMappingState(parseGtmIndustryMappingRows(GTM_INDUSTRY_MAPPING_DATA), {
    source: "embedded",
    label: "Embedded fallback",
    schema: "embedded",
    loadedAt: 0
  });
  initializeMappingState(parseCompactMappingRows(MAPPING_DATA), {
    source: "embedded",
    label: "Embedded fallback",
    schema: "embedded",
    loadedAt: 0
  });

  let searchRows = [];
  let searchResultTotal = 0;
  let currentUserNameCache;
  let currentUserRosterCache;
  const rosterAssigneeLookupCache = new Map();
  const salesRepEmailLookupCache = new Map();
  let refreshSequence = 0;
  let helperState = readHelperState();
  if (!Object.prototype.hasOwnProperty.call(helperState, "maximized")) helperState.maximized = true;
  let filtersCollapsed = Boolean(helperState.filtersCollapsed);

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  }

  function canonicalScIndustryGroupAlias(value) {
    return SC_INDUSTRY_GROUP_ALIASES.get(normalizeKey(value)) || "";
  }

  function scIndustryGroupKeyVariants(value) {
    const raw = normalizeSpaces(value);
    const rawKey = normalizeKey(raw);
    const alias = canonicalScIndustryGroupAlias(raw);
    const aliasKey = normalizeKey(alias);
    const canonical = findCanonicalIndustry(raw || alias);
    return uniqueSorted([rawKey, aliasKey, normalizeKey(canonical)].filter(Boolean));
  }

  function normalizeMappingState(value) {
    const raw = String(value || "").trim();
    return raw.toLowerCase() === "singapore" ? "Singapore" : raw.toUpperCase();
  }

  function normalizeHeader(value) {
    return normalizeKey(value);
  }

  function normalizeSpaces(value) {
    return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function resetEmojiMappings() {
    INDUSTRY_GROUP_BRANDING_BY_KEY.clear();
    Object.entries(INDUSTRY_GROUP_BRANDING).forEach(([name, branding]) => {
      INDUSTRY_GROUP_BRANDING_BY_KEY.set(normalizeKey(name), { name, ...branding });
    });

    GTM_SUBGROUP_EMOJI_BY_KEY.clear();
    Object.entries(GTM_SUBGROUP_EMOJIS).forEach(([name, emoji]) => {
      GTM_SUBGROUP_EMOJI_BY_KEY.set(normalizeKey(name), emoji);
    });
  }

  function applyGtmEmojiOverrides(values) {
    if (!values || typeof values !== "object") return;
    Object.entries(values).forEach(([name, emoji]) => {
      const label = normalizeSpaces(name);
      const icon = normalizeSpaces(emoji);
      if (!label || !icon) return;
      GTM_SUBGROUP_EMOJI_BY_KEY.set(normalizeKey(label), icon);
    });
  }

  function applyIndustryGroupEmojiOverrides(values) {
    if (!values || typeof values !== "object") return;
    Object.entries(values).forEach(([name, emoji]) => {
      const label = normalizeSpaces(name);
      const icon = normalizeSpaces(emoji);
      if (!label || !icon) return;
      const key = normalizeKey(label);
      const existing = INDUSTRY_GROUP_BRANDING_BY_KEY.get(key) || {
        name: label,
        color: REDWOOD_COLORS.slate100,
        soft: REDWOOD_COLORS.neutral30
      };
      INDUSTRY_GROUP_BRANDING_BY_KEY.set(key, {
        ...existing,
        name: existing.name || label,
        emoji: icon
      });
    });
  }

  function applyExternalEmojiMappings(emojiMappings = {}) {
    resetEmojiMappings();
    if (!emojiMappings || typeof emojiMappings !== "object") return;

    applyIndustryGroupEmojiOverrides(emojiMappings.scIndustryGroups);
    applyGtmEmojiOverrides(emojiMappings.gtmIndustrySubgroups || emojiMappings.gtmSubgroups);
  }

  function isAllStaffingRegion(value) {
    const key = normalizeKey(value);
    return key === "all" || key === "allregions" || key === "any";
  }

  function initializeMappingState(rows, metadata = {}) {
    applyExternalEmojiMappings(metadata.emojiMappings);
    if (gtmScIndustryEmojiMappings) {
      applyIndustryGroupEmojiOverrides(gtmScIndustryEmojiMappings.scIndustryGroups);
      applyGtmEmojiOverrides(gtmScIndustryEmojiMappings.gtmIndustrySubgroups || gtmScIndustryEmojiMappings.gtmSubgroups);
    }
    mappingRows = rows || [];
    industryOptions = uniqueSorted(mappingRows.map(row => row.industryFamily).concat(ADDITIONAL_INDUSTRY_GROUPS));
    industryFilterOptions = uniqueSorted(industryOptions.concat([UNMAPPED_FILTER_LABEL]));
    amoDirectOptions = uniqueSorted(mappingRows.map(row => row.amoDirect).concat([NSPB_REQUEST_TYPE, TECH_COE_REQUEST_TYPE]));
    salesRegionOptions = uniqueSorted(mappingRows.map(row => row.salesRegion));
    staffingRegionOptions = uniqueSorted(
      mappingRows
        .map(row => row.staffingRegion)
        .filter(region => !isAllStaffingRegion(region))
    );
    knownStateCodes = new Set(mappingRows.map(row => row.stateKey));
    industryByKey = new Map(
      mappingRows
        .map(row => [row.industryKey, row.industryFamily])
        .concat(ADDITIONAL_INDUSTRY_GROUPS.map(group => [normalizeKey(group), group]))
    );
    mappingByIndustryModeState = new Map(
      mappingRows.map(row => [`${row.industryKey}|${row.amoDirectKey}|${row.stateKey}`, row])
    );
    mappingByIndustryState = buildMappingFallbackMap(mappingRows);
    mappingMetadata = {
      source: metadata.source || "embedded",
      label: metadata.label || "Embedded fallback",
      rowCount: mappingRows.length,
      loadedAt: metadata.loadedAt || Date.now(),
      schema: metadata.schema || "",
      generatedAt: metadata.generatedAt || "",
      stale: Boolean(metadata.stale),
      error: metadata.error || "",
      emojiSource: metadata.emojiMappings ? "mapping-json" : "embedded"
    };
  }

  function normalizeMultiline(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(line => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function canonicalSalesRegion(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";

    const key = normalizeKey(text);
    const direct = salesRegionOptions.find(region => normalizeKey(region) === key);
    if (direct) return direct;

    return salesRegionOptions.find(region => key.includes(normalizeKey(region))) || text;
  }

  function normalizeAmoDirect(value) {
    const text = normalizeSpaces(value);
    if (/\btechnology\s*coe\b|\btech\s*coe\b|\btcoe\b/i.test(text)) return TECH_COE_REQUEST_TYPE;
    if (/\bnspb\b|\bnet\s*suite\s*planning\s*(?:and|&)?\s*budgeting\b/i.test(text)) return NSPB_REQUEST_TYPE;
    if (/\bamo\b/i.test(text)) return "AMO";
    if (/\bdirect\b/i.test(text) || /\bdir\b/i.test(text) || /DIRDirect/i.test(text)) return "Direct";
    return text;
  }

  function isKnownRequestType(value) {
    const normalized = normalizeAmoDirect(value);
    return normalized === "AMO"
      || normalized === "Direct"
      || normalized === NSPB_REQUEST_TYPE
      || normalized === TECH_COE_REQUEST_TYPE;
  }

  function fieldValueLooksFalse(value) {
    const key = normalizeKey(value);
    return key === "f"
      || key === "false"
      || key === "no"
      || key === "n"
      || key === "unchecked"
      || key === "0"
      || key.includes("unchecked")
      || key.includes("checkboxoff");
  }

  function fieldValueLooksTrue(value) {
    const key = normalizeKey(value);
    if (!key || fieldValueLooksFalse(value)) return false;
    return key === "t"
      || key === "true"
      || key === "yes"
      || key === "y"
      || key === "checked"
      || key === "1"
      || key === "x"
      || /check|tick|selected|nspb|technologycoe|techcoe|tcoe/i.test(key);
  }

  function fieldHasAffirmativeRequestTypeValue(field) {
    const visibleText = [
      field && field.value,
      field && field.rawValue
    ].map(normalizeSpaces).filter(Boolean).join(" ");
    if (visibleText) {
      if (fieldValueLooksFalse(visibleText)) return false;
      if (fieldValueLooksTrue(visibleText)) return true;
      return !/^\s*[-–—]\s*$/.test(visibleText);
    }

    const rawHtml = normalizeSpaces(field && field.rawHtml);
    if (!rawHtml || fieldValueLooksFalse(rawHtml)) return false;
    return fieldValueLooksTrue(rawHtml);
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function crossIndustryTagKey(value) {
    return normalizeKey(value).replace(/^hash/, "");
  }

  function hasCrossIndustryTag(notes, tag) {
    if (!notes || !tag) return false;
    const text = String(notes);
    if (new RegExp(`(^|[^\\w-])${escapeRegExp(tag)}(?=$|[^\\w-])`, "i").test(text)) return true;

    const tagKey = crossIndustryTagKey(tag);
    const textKey = crossIndustryTagKey(text);
    return Boolean(tagKey && textKey.includes(tagKey));
  }

  function getCrossIndustryInfo(notes) {
    const targetTags = CROSS_INDUSTRY_TARGETS.filter(target => (
      hasCrossIndustryTag(notes, target.tag)
      || (target.markerTag && hasCrossIndustryTag(notes, target.markerTag))
    ));
    const includeAll = CROSS_INDUSTRY_GLOBAL_TAGS.some(tag => hasCrossIndustryTag(notes, tag));
    return {
      includeAll,
      targets: targetTags
    };
  }

  function crossIndustryTextForRow(row) {
    if (!row) return "";
    const returnedFieldsText = (row.allFields || row.fields || []).map(field => (
      [field.label, field.value, field.rawValue].filter(Boolean).join(" ")
    ));
    return [row.hashtags, row.staffingNotes].concat(returnedFieldsText).filter(Boolean).join("\n");
  }

  function getCrossIndustryInfoForRow(row) {
    return getCrossIndustryInfo(crossIndustryTextForRow(row));
  }

  function crossIndustryRoutingKey(row) {
    const info = getCrossIndustryInfoForRow(row);
    const targets = info.targets.map(target => target.tag).sort().join("|");
    return `${info.includeAll ? "all" : "target"}:${targets}`;
  }

  function crossIndustryFamilyKeysForRow(row) {
    const info = getCrossIndustryInfoForRow(row);
    if (info.includeAll) return industryOptions.map(normalizeKey);
    return info.targets.map(target => normalizeKey(findCanonicalIndustry(target.family) || target.family)).filter(Boolean);
  }

  function personMatchesNames(person, names) {
    const personKeys = personNameKeys(person);
    if (!personKeys.length) return false;
    return names.some(name => (
      personNameKeys(name).some(key => personKeys.includes(key))
    ));
  }

  function rowHasCrossVerticalFlag(row) {
    if (!row) return false;
    if (normalizeYesNo(row.crossVertical) === "Yes") return true;
    return (row.fields || []).some(field => (
      /cross[\s-]*vertical|cross[\s-]*vert/i.test(`${field.label} ${field.value}`)
      && normalizeYesNo(field.value) === "Yes"
    ));
  }

  function rowMatchesEpmQueue(row) {
    if (!row) return false;
    const epmKey = normalizeKey(EPM_INDUSTRY_GROUP);
    return crossIndustryFamilyKeysForRow(row).includes(epmKey)
      || row.industryKey === epmKey
      || normalizeKey(normalizeAmoDirect(row.amoDirect)) === normalizeKey(NSPB_REQUEST_TYPE);
  }

  function rowMatchesTechCoeQueue(row) {
    if (!row) return false;
    const techCoeKey = normalizeKey(TECH_COE_INDUSTRY_GROUP);
    return crossIndustryFamilyKeysForRow(row).includes(techCoeKey)
      || row.industryKey === techCoeKey
      || normalizeKey(normalizeAmoDirect(row.amoDirect)) === normalizeKey(TECH_COE_REQUEST_TYPE);
  }

  function isTechCoeTarget(target) {
    return normalizeKey(target && target.family) === normalizeKey(TECH_COE_INDUSTRY_GROUP);
  }

  function rowRequestTypeIsTechCoe(row) {
    return normalizeKey(normalizeAmoDirect(row && row.amoDirect)) === normalizeKey(TECH_COE_REQUEST_TYPE);
  }

  function isOtherUnmappedIndustry(value) {
    const key = normalizeKey(value);
    return key === "other" || key === "unmapped" || key === "otherunmapped";
  }

  function rowHasKnownIndustryGroup(row) {
    if (!row || !row.industryFamily || isOtherUnmappedIndustry(row.industryFamily)) return false;
    return Boolean(findCanonicalIndustry(row.industryFamily) || industryByKey.has(row.industryKey) || getIndustryGroupBranding(row.industryFamily));
  }

  function rowHasStateMappingGap(row) {
    if (!rowHasKnownIndustryGroup(row)) return false;
    return !row.mappingFound || !row.staffingRegion;
  }

  function isUnmappedReviewRow(row) {
    if (!row) return false;
    const crossIndustryInfo = getCrossIndustryInfoForRow(row);
    if (crossIndustryInfo.targets.length && !crossIndustryInfo.includeAll) return false;
    return !row.industryKey
      || !rowHasKnownIndustryGroup(row)
      || crossIndustryInfo.includeAll;
  }

  function effectiveIndustryFamilyKeys(row) {
    const overrideKeys = crossIndustryFamilyKeysForRow(row);
    if (overrideKeys.length) return overrideKeys;
    if (rowMatchesTechCoeQueue(row)) return [normalizeKey(TECH_COE_INDUSTRY_GROUP)];
    if (rowMatchesEpmQueue(row)) return [normalizeKey(EPM_INDUSTRY_GROUP)];
    if (isUnmappedReviewRow(row)) return industryOptions.map(normalizeKey);
    return [row.industryKey].filter(Boolean);
  }

  function rowMatchesIndustryFamily(row, industryKey) {
    if (!industryKey) return true;
    if (isOtherUnmappedIndustry(industryKey)) return isUnmappedReviewRow(row);
    if (industryKey === normalizeKey(EPM_INDUSTRY_GROUP)) return rowMatchesEpmQueue(row);
    if (industryKey === normalizeKey(TECH_COE_INDUSTRY_GROUP)) return rowMatchesTechCoeQueue(row);
    const familyKeys = effectiveIndustryFamilyKeys(row);
    if (familyKeys.includes(industryKey)) return true;
    return !crossIndustryFamilyKeysForRow(row).length && isUnmappedReviewRow(row);
  }

  function rowIsProductsScmCandidate(row) {
    return Boolean(row);
  }

  function personListHasName(values, name) {
    const userKeys = personNameKeys(name);
    if (!userKeys.length || !values.length) return false;
    return values.some(value => personNameKeys(value).some(key => userKeys.includes(key)));
  }

  function productsScmUserIsOwner(name = getCurrentUserName()) {
    return personListHasName(productsScmAuthorizedScms, name);
  }

  function productsScmUserIsDirector(name = getCurrentUserName()) {
    return personListHasName(productsScmAuthorizedDirectors, name);
  }

  function productsScmUserIsViewer(name = getCurrentUserName()) {
    return personListHasName(productsScmAuthorizedViewers, name);
  }

  function authorizedManagerUserCanView(name = getCurrentUserName()) {
    return personListHasName(authorizedManagerCanOwnNames, name) || personListHasName(authorizedManagerCanViewNames, name);
  }

  function productsScmUserCanView(name = getCurrentUserName()) {
    return productsScmUserIsOwner(name) || productsScmUserIsDirector(name) || productsScmUserIsViewer(name) || authorizedManagerUserCanView(name);
  }

  function productsScmUserIsAuthorized(name = getCurrentUserName()) {
    return productsScmUserCanView(name);
  }

  function currentProductsScmUserName() {
    const userKeys = personNameKeys(getCurrentUserName());
    if (!userKeys.length) return "";
    return allScmOwnerOptions().find(scm => personNameKeys(scm).some(key => userKeys.includes(key))) || "";
  }

  function currentProductsScmDirectorName() {
    const userKeys = personNameKeys(getCurrentUserName());
    if (!userKeys.length) return "";
    return productsScmAuthorizedDirectors.find(director => personNameKeys(director).some(key => userKeys.includes(key))) || "";
  }

  function currentProductsScmViewerName() {
    const userKeys = personNameKeys(getCurrentUserName());
    if (!userKeys.length) return "";
    return productsScmAuthorizedViewers.find(viewer => personNameKeys(viewer).some(key => userKeys.includes(key))) || "";
  }

  function scmOwnerNameFromTagKey(ownerKey) {
    const key = normalizeKey(ownerKey);
    if (!key) return "";

    const option = allScmOwnerOptions().find(scm => (
      normalizeKey(scm) === key || personNameKeys(scm).some(nameKey => personKeyMatches(nameKey, key))
    ));
    if (option) return option;

    const manager = authorizedManagerRecords.find(record => (
      normalizeKey(record.name) === key
        || normalizeKey(record.nameKey) === key
        || personNameKeys(record.name).some(nameKey => personKeyMatches(nameKey, key))
        || emailLocalPartKeys(record.email).some(nameKey => personKeyMatches(nameKey, key))
    ));
    if (manager && manager.name) return manager.name;

    const currentName = getCurrentUserName();
    return personNameKeys(currentName).some(nameKey => personKeyMatches(nameKey, key)) || normalizeKey(currentName) === key
      ? currentName
      : "";
  }

  function productsScmOwnerFromGroup(rows, source) {
    const group = (rows || []).filter(row => row && row.scm);
    if (!group.length) return null;
    const ownerKeys = [...new Set(group.map(row => row.scmKey).filter(Boolean))];
    if (ownerKeys.length !== 1) {
      return {
        scm: "",
        scmKey: "",
        source: "ambiguous",
        sourceLabel: "Ambiguous SCM owner"
      };
    }
    return {
      scm: group[0].scm,
      scmKey: group[0].scmKey,
      source,
      sourceLabel: source === "exact" ? "Mapped by RD and sales region" : "Mapped by RD"
    };
  }

  function productsScmExplicitOwner(row) {
    if (!row) return null;
    const fields = row.allFields || row.fields || [];
    const explicitField = findField(fields, [
      /products.*scm.*owner/, /products.*scm.*queue/, /scm.*queue.*owner/
    ]);
    const fieldValue = explicitField ? cleanPersonName(explicitField.value || explicitField.rawValue) : "";
    if (fieldValue) {
      return {
        scm: fieldValue,
        scmKey: normalizeKey(fieldValue),
        source: "explicit",
        sourceLabel: "Explicit SCM owner"
      };
    }

    const text = [row.hashtags, row.staffingNotes].concat(fields.map(field => `${field.label}: ${field.value}`)).join("\n");
    const match = text.match(/(?:#scm-owner|#products-scm-owner|#pscm-owner|(?:products\s+)?scm\s+(?:queue\s+)?owner)\s*[:=]\s*([^#\n;]+)/i);
    const owner = match ? cleanPersonName(match[1]) : "";
    if (owner) {
      return {
        scm: owner,
        scmKey: normalizeKey(owner),
        source: "explicit",
        sourceLabel: "Explicit SCM owner"
      };
    }

    const ownerTag = text.match(/#(?:scm-owner|pscm-owner)-([a-z0-9]+)/i);
    const ownerKey = ownerTag ? normalizeKey(ownerTag[1]) : "";
    const taggedOwner = ownerKey ? scmOwnerNameFromTagKey(ownerKey) : "";
    return ownerKey
      ? {
        scm: taggedOwner || ownerKey,
        scmKey: ownerKey,
        source: "explicit",
        sourceLabel: "Explicit SCM owner"
      }
      : null;
  }

  function productsScmSalesRegionKeysForRow(row) {
    return [
      row && row.mappedSalesRegion,
      row && canonicalSalesRegion(row.originalSalesRegion),
      row && row.originalSalesRegion
    ].map(normalizeKey).filter(Boolean);
  }

  function productsScmOwnerForRow(row) {
    if (!rowIsProductsScmCandidate(row)) return null;

    const explicitOwner = productsScmExplicitOwner(row);
    if (explicitOwner) return explicitOwner;
    if (!productsScmRelationships.length) {
      return {
        scm: "",
        scmKey: "",
        source: "not-loaded",
        sourceLabel: "SCM relationship mapping not loaded"
      };
    }

    const requestTypeKey = normalizeKey(normalizeAmoDirect(row.amoDirect));
    const directorKey = normalizeKey(row.salesDirector);
    if (!requestTypeKey || !directorKey) {
      return {
        scm: "",
        scmKey: "",
        source: "unmapped",
        sourceLabel: "Missing request type or Regional Director"
      };
    }

    for (const salesRegionKey of productsScmSalesRegionKeysForRow(row)) {
      const exactOwner = productsScmOwnerFromGroup(
        productsScmByExactKey.get(`${requestTypeKey}|${directorKey}|${salesRegionKey}`),
        "exact"
      );
      if (exactOwner) return exactOwner;
    }

    const directorOwner = productsScmOwnerFromGroup(
      productsScmByDirectorKey.get(`${requestTypeKey}|${directorKey}`),
      "director"
    );
    if (directorOwner) return directorOwner;

    return {
      scm: "",
      scmKey: "",
      source: "unmapped",
      sourceLabel: "No SCM relationship mapping"
    };
  }

  function productsScmOwnerMatchesName(row, ownerName) {
    const owner = productsScmOwnerForRow(row);
    if (!owner || !owner.scm) return false;
    const targetKeys = personNameKeys(ownerName);
    return personKeyListsOverlap(personNameKeys(owner.scm), targetKeys);
  }

  function rowMatchesProductsScmOwnerFilter(row, ownerNames, includeUnmappedOwnerRows) {
    const owner = productsScmOwnerForRow(row);
    if (!owner) return false;
    if (owner.scm) {
      const rowOwnerKeys = personNameKeys(owner.scm);
      return ownerNames.some(name => {
        const targetKeys = personNameKeys(name);
        return personKeyListsOverlap(rowOwnerKeys, targetKeys);
      });
    }
    return Boolean(includeUnmappedOwnerRows && owner.source === "unmapped");
  }

  function displayedIndustryFamiliesForRow(row) {
    const info = getCrossIndustryInfoForRow(row);
    if (info.targets.length) return info.targets.map(target => findCanonicalIndustry(target.family) || target.family);
    if (rowMatchesTechCoeQueue(row)) return [TECH_COE_INDUSTRY_GROUP];
    if (rowMatchesEpmQueue(row)) return [EPM_INDUSTRY_GROUP];
    return [row && row.industryFamily].filter(Boolean);
  }

  function renderDisplayedIndustryGroupBadges(row) {
    const families = displayedIndustryFamiliesForRow(row);
    return families.map(family => renderIndustryGroupBadge(family)).filter(Boolean).join("");
  }

  function primaryDisplayedIndustryFamily(row) {
    return displayedIndustryFamiliesForRow(row)[0] || row && row.industryFamily || "";
  }

  function displayQueueMappingForRow(row) {
    const families = displayedIndustryFamiliesForRow(row);
    const primaryFamily = families.length === 1 ? families[0] : row && row.industryFamily;
    const isCrossIndustryDisplay = primaryFamily && row && normalizeKey(primaryFamily) !== row.industryKey;
    const override = isCrossIndustryDisplay ? lookupOverride(primaryFamily, row.state, row.amoDirect) : null;

    if (override) {
      return {
        industryFamily: primaryFamily,
        salesRegion: override.salesRegion,
        staffingRegion: override.staffingRegion,
        mappingFound: true,
        crossIndustryDisplay: true
      };
    }

    return {
      industryFamily: primaryFamily || row && row.industryFamily || "",
      salesRegion: row && row.mappedSalesRegion || "",
      staffingRegion: row && row.staffingRegion || "",
      mappingFound: Boolean(row && row.mappingFound),
      crossIndustryDisplay: Boolean(isCrossIndustryDisplay),
      stateMappingGap: rowHasStateMappingGap(row)
    };
  }

  function effectiveStaffingRegionKeys(row, selectedIndustryKey = "") {
    const familyKeys = selectedIndustryKey && rowMatchesIndustryFamily(row, selectedIndustryKey)
      ? [selectedIndustryKey]
      : effectiveIndustryFamilyKeys(row);
    const regions = familyKeys.map(industryKey => {
      const industryFamily = industryByKey.get(industryKey) || row.industryFamily;
      const override = lookupOverride(industryFamily, row.state, row.amoDirect);
      if (override) return isAllStaffingRegion(override.staffingRegion) ? "__all__" : override.staffingRegion;
      if (industryKey === row.industryKey && row.staffingRegion) {
        return isAllStaffingRegion(row.staffingRegion) ? "__all__" : row.staffingRegion;
      }
      return "__all__";
    });
    if (regions.includes("__all__")) return staffingRegionOptions.map(normalizeKey);
    return uniqueSorted(regions.map(normalizeKey));
  }

  function stripCrossIndustryTags(value) {
    const tags = CROSS_INDUSTRY_TARGETS.flatMap(target => [target.tag, target.markerTag].filter(Boolean))
      .concat(CROSS_INDUSTRY_GLOBAL_TAGS)
      .concat(["#xvr", "xvr"]);
    return normalizeMultiline(value)
      .split(/[\n,;]+/)
      .map(normalizeSpaces)
      .filter(part => part && !tags.some(tag => hasCrossIndustryTag(part, tag)))
      .join(", ");
  }

  function stripScmOwnerTags(value) {
    return normalizeMultiline(value)
      .split(/[\n,;]+/)
      .map(normalizeSpaces)
      .filter(part => part && !/#(?:scm-owner|pscm-owner)-[a-z0-9]+/i.test(part))
      .join(", ");
  }

  function scmOwnerTag(ownerName) {
    const key = normalizeKey(ownerName);
    return key ? `${PRODUCTS_SCM_OWNER_TAG_PREFIX}${key}` : "";
  }

  function valueWithCrossIndustryTag(value, tag, markerTag = "", ownerName = null) {
    const cleaned = ownerName === null
      ? stripCrossIndustryTags(value)
      : stripScmOwnerTags(stripCrossIndustryTags(value));
    const tags = ["#xvr", tag, markerTag].map(normalizeSpaces).filter(Boolean);
    if (ownerName) tags.push(scmOwnerTag(ownerName));
    return [cleaned].concat(tags).filter(Boolean).join(", ");
  }

  function valueWithScmOwnerTag(value, ownerName) {
    const cleaned = stripScmOwnerTags(value);
    const tag = scmOwnerTag(ownerName);
    return [cleaned, tag].filter(Boolean).join(", ");
  }

  function cleanPersonName(value) {
    const text = normalizeSpaces(value)
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+\|\s+.*$/g, "")
      .replace(/\b(?:preferences|log\s*out|logout|help)\b.*$/i, "");
    return normalizeSpaces(text);
  }

  function cleanPersonList(value) {
    if (Array.isArray(value)) return uniqueSorted(value.map(cleanPersonName).filter(Boolean));
    const text = String(value || "").replace(/\u00a0/g, " ").trim();
    if (!text) return [];
    return uniqueSorted(
      text
        .split(/\s*(?:;|\||\n|\r|\t)\s*/g)
        .map(cleanPersonName)
        .filter(Boolean)
    );
  }

  function personNameKeys(value) {
    const text = cleanPersonName(value);
    if (!text) return [];

    const keys = new Set([normalizeKey(text)]);
    const commaName = text.match(/^([^,]+),\s*(.+)$/);
    if (commaName) {
      const last = normalizeSpaces(commaName[1]);
      const first = normalizeSpaces(commaName[2]).split(/\s+/)[0] || "";
      if (first && last) {
        keys.add(normalizeKey(`${first} ${last}`));
        keys.add(normalizeKey(`${last} ${first}`));
      }
    } else {
      const parts = text.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        keys.add(normalizeKey(`${last} ${first}`));
        keys.add(normalizeKey(`${last}, ${first}`));
      }
    }

    return [...keys].filter(Boolean);
  }

  function personKeyMatches(left, right) {
    const leftKey = normalizeKey(left);
    const rightKey = normalizeKey(right);
    if (!leftKey || !rightKey) return false;
    if (leftKey === rightKey) return true;
    return Math.min(leftKey.length, rightKey.length) >= 8
      && (leftKey.startsWith(rightKey) || rightKey.startsWith(leftKey));
  }

  function personKeyListsOverlap(leftKeys, rightKeys) {
    return Boolean((leftKeys || []).length && (rightKeys || []).length
      && leftKeys.some(left => rightKeys.some(right => personKeyMatches(left, right))));
  }

  function normalizeRosterName(value) {
    return normalizeSpaces(value)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function rosterNameVariants(value) {
    const raw = normalizeSpaces(value);
    if (!raw) return [];
    const variants = [raw];
    if (raw.includes(",")) {
      const parts = raw.split(",");
      const last = normalizeSpaces(parts[0]);
      const first = normalizeSpaces(parts.slice(1).join(","));
      if (first && last) variants.push(`${first} ${last}`);
    } else {
      const parts = raw.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        variants.push(`${last}, ${first}`);
        variants.push(`${last} ${first}`);
      }
    }
    return [...new Set(variants.map(normalizeRosterName).filter(Boolean))];
  }

  function rosterSearchTerms(names) {
    const terms = [];
    names.forEach(name => {
      const raw = normalizeSpaces(name);
      if (!raw) return;
      const last = raw.includes(",") ? raw.split(",")[0].trim() : raw.split(/\s+/).slice(-1)[0];
      if (last) terms.push(last);
      const compactLast = last.replace(/[^A-Za-z0-9]/g, "");
      if (compactLast && compactLast !== last) terms.push(compactLast);
    });
    return [...new Set(terms.filter(Boolean))];
  }

  function rosterLookupFilterSets() {
    return [
      [
        ["custrecord_emproster_rosterstatus", "is", "1"],
        ["custrecord_emproster_eminactive", "is", "F"],
        ["custrecord_emproster_ocostcenter", "is", ROSTER_COST_CENTER_ID],
        ["custrecord_emproster_salesregion", "is", ROSTER_SALES_REGION_ID]
      ],
      [
        ["custrecord_emproster_rosterstatus", "is", "1"],
        ["custrecord_emproster_eminactive", "is", "F"]
      ],
      []
    ];
  }

  function pickRosterMatch(rows, names) {
    const variants = [...new Set(names.flatMap(rosterNameVariants))];
    if (!rows.length || !variants.length) return null;

    const exact = rows.find(row => {
      const rowName = normalizeRosterName(row.name);
      return rowName && variants.some(variant => rowName === variant || rowName.includes(variant) || variant.includes(rowName));
    });
    return exact || (rows.length === 1 ? rows[0] : null);
  }

  function lookupRosterAssigneeWithNlapi(pageWindow, names) {
    const terms = rosterSearchTerms(names);
    for (const term of terms) {
      for (const filterSet of rosterLookupFilterSets()) {
        const filters = [new pageWindow.nlobjSearchFilter("name", null, "contains", term)]
          .concat(filterSet.map(([fieldId, operator, value]) => new pageWindow.nlobjSearchFilter(fieldId, null, operator, value)));
        const columns = [
          new pageWindow.nlobjSearchColumn("internalid"),
          new pageWindow.nlobjSearchColumn("name")
        ];
        const results = pageWindow.nlapiSearchRecord(ROSTER_RECORD_TYPE, null, filters, columns) || [];
        const rows = results.map(result => ({
          id: normalizeSpaces(result.getValue("internalid") || result.getId && result.getId()),
          name: normalizeSpaces(result.getValue("name") || result.getText("name"))
        })).filter(row => row.id && row.name);
        const match = pickRosterMatch(rows, names);
        if (match) return match;
      }
    }
    return null;
  }

  function nSearchFilterExpression(term, filterSet) {
    const filters = [["name", "contains", term]];
    filterSet.forEach(([fieldId, operator, value]) => {
      filters.push("AND", [fieldId, operator, value]);
    });
    return filters;
  }

  function lookupRosterAssigneeWithRequire(pageWindow, names) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(result);
      };
      timer = setTimeout(finish(reject), 10000, new Error("Timed out resolving roster assignee."));

      try {
        pageWindow.require(["N/search"], search => {
          try {
            for (const term of rosterSearchTerms(names)) {
              for (const filterSet of rosterLookupFilterSets()) {
                const results = search.create({
                  type: ROSTER_RECORD_TYPE,
                  filters: nSearchFilterExpression(term, filterSet),
                  columns: ["internalid", "name"]
                }).run().getRange({ start: 0, end: 25 }) || [];
                const rows = results.map(result => ({
                  id: normalizeSpaces(result.getValue({ name: "internalid" })),
                  name: normalizeSpaces(result.getValue({ name: "name" }))
                })).filter(row => row.id && row.name);
                const match = pickRosterMatch(rows, names);
                if (match) {
                  finish(resolve)(match);
                  return;
                }
              }
            }
            finish(resolve)(null);
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function lookupRosterAssignee(names) {
    const cleanNames = names.map(normalizeSpaces).filter(Boolean);
    const cacheKey = cleanNames.map(normalizeRosterName).sort().join("|");
    if (!cacheKey) return null;
    if (rosterAssigneeLookupCache.has(cacheKey)) return rosterAssigneeLookupCache.get(cacheKey);

    const pageWindow = getPageWindow();
    let match = null;
    if (pageWindow && typeof pageWindow.nlapiSearchRecord === "function" && typeof pageWindow.nlobjSearchFilter === "function") {
      try {
        match = lookupRosterAssigneeWithNlapi(pageWindow, cleanNames);
      } catch (error) {
        console.warn("SCR helper nlapi roster lookup failed", error);
      }
    }
    if (!match && pageWindow && typeof pageWindow.require === "function") {
      try {
        match = await lookupRosterAssigneeWithRequire(pageWindow, cleanNames);
      } catch (error) {
        console.warn("SCR helper N/search roster lookup failed", error);
      }
    }

    rosterAssigneeLookupCache.set(cacheKey, match);
    return match;
  }

  function currentUserRosterFilterExpression(employeeId, filterSet) {
    const filters = [["custrecord_emproster_emp", "is", String(employeeId)]];
    filterSet.forEach(([fieldId, operator, value]) => {
      filters.push("AND", [fieldId, operator, value]);
    });
    return filters;
  }

  function rosterRowsFromNlapiResults(results) {
    return (results || []).map(result => ({
      id: normalizeSpaces(result.getValue("internalid") || result.getId && result.getId()),
      name: normalizeSpaces(result.getValue("name") || result.getText("name"))
    })).filter(row => row.id && row.name);
  }

  function lookupCurrentUserRosterWithNlapi(pageWindow) {
    const employeeId = typeof pageWindow.nlapiGetUser === "function"
      ? normalizeSpaces(pageWindow.nlapiGetUser())
      : "";
    if (!employeeId) return null;

    const columns = [
      new pageWindow.nlobjSearchColumn("internalid"),
      new pageWindow.nlobjSearchColumn("name")
    ];

    for (const filterSet of rosterLookupFilterSets()) {
      const filters = [new pageWindow.nlobjSearchFilter("custrecord_emproster_emp", null, "is", employeeId)]
        .concat(filterSet.map(([fieldId, operator, value]) => new pageWindow.nlobjSearchFilter(fieldId, null, operator, value)));
      const rows = rosterRowsFromNlapiResults(pageWindow.nlapiSearchRecord(ROSTER_RECORD_TYPE, null, filters, columns));
      if (rows.length) return rows[0];
    }

    return null;
  }

  function lookupCurrentUserRosterWithRequire(pageWindow) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(result);
      };
      timer = setTimeout(finish(reject), 10000, new Error("Timed out resolving current user roster record."));

      try {
        pageWindow.require(["N/runtime", "N/search"], (runtime, search) => {
          try {
            const user = runtime && runtime.getCurrentUser && runtime.getCurrentUser();
            const employeeId = user && user.id;
            if (!employeeId) {
              finish(resolve)(null);
              return;
            }

            for (const filterSet of rosterLookupFilterSets()) {
              const results = search.create({
                type: ROSTER_RECORD_TYPE,
                filters: currentUserRosterFilterExpression(employeeId, filterSet),
                columns: ["internalid", "name"]
              }).run().getRange({ start: 0, end: 2 }) || [];
              const rows = results.map(result => ({
                id: normalizeSpaces(result.getValue({ name: "internalid" })),
                name: normalizeSpaces(result.getValue({ name: "name" }))
              })).filter(row => row.id && row.name);
              if (rows.length) {
                finish(resolve)(rows[0]);
                return;
              }
            }

            finish(resolve)(null);
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function lookupCurrentUserRoster() {
    if (currentUserRosterCache !== undefined) return currentUserRosterCache;

    const pageWindow = getPageWindow();
    let match = null;
    if (pageWindow && typeof pageWindow.nlapiSearchRecord === "function" && typeof pageWindow.nlobjSearchFilter === "function") {
      try {
        match = lookupCurrentUserRosterWithNlapi(pageWindow);
      } catch (error) {
        console.warn("SCR helper nlapi current user roster lookup failed", error);
      }
    }

    if (!match && pageWindow && typeof pageWindow.require === "function") {
      try {
        match = await lookupCurrentUserRosterWithRequire(pageWindow);
      } catch (error) {
        console.warn("SCR helper N/search current user roster lookup failed", error);
      }
    }

    if (!match) {
      const currentUserName = getCurrentUserName();
      if (currentUserName) match = await lookupRosterAssignee([currentUserName]);
    }

    if (match && match.name && !getCurrentUserName()) {
      currentUserNameCache = cleanPersonName(match.name);
      updateAssignedToMeControl();
    }

    currentUserRosterCache = match || null;
    return currentUserRosterCache;
  }

  function detectCurrentUserName() {
    const pageWindow = getPageWindow();
    const candidates = [];

    try {
      const context = pageWindow && typeof pageWindow.nlapiGetContext === "function"
        ? pageWindow.nlapiGetContext()
        : null;
      if (context && typeof context.getName === "function") candidates.push(context.getName());
    } catch (error) {
      console.warn("SCR helper could not read NetSuite context name", error);
    }

    ["NLUserName", "NS_CURRENT_USER_NAME", "CURRENT_USER_NAME"].forEach(key => {
      try {
        if (pageWindow && pageWindow[key]) candidates.push(pageWindow[key]);
      } catch (error) {
        // Ignore inaccessible globals.
      }
    });

    [
      "#ns-header-user-name",
      ".ns-header-user-name",
      "[data-automation-id='user-menu']",
      "[data-testid='user-menu']",
      ".uir-user-name"
    ].forEach(selector => {
      const node = document.querySelector(selector);
      if (node) candidates.push(node.textContent);
    });

    return candidates.map(cleanPersonName).find(Boolean) || "";
  }

  function getCurrentUserName() {
    if (currentUserNameCache !== undefined) return currentUserNameCache;
    currentUserNameCache = detectCurrentUserName();
    return currentUserNameCache;
  }

  function setCurrentUserName(value) {
    const name = cleanPersonName(value);
    if (!name) return;
    currentUserNameCache = name;
    currentUserRosterCache = undefined;
    updateAssignedToMeControl();
    updateProductsScmControls();
    renderResults();
  }

  function hydrateCurrentUserName() {
    const detected = getCurrentUserName();
    updateAssignedToMeControl();
    updateProductsScmControls();
    if (detected) return;

    const pageWindow = getPageWindow();
    if (!pageWindow || typeof pageWindow.require !== "function") return;
    try {
      pageWindow.require(["N/runtime"], runtime => {
        try {
          const user = runtime && runtime.getCurrentUser && runtime.getCurrentUser();
          setCurrentUserName(user && (user.name || user.email));
        } catch (error) {
          console.warn("SCR helper could not read N/runtime current user", error);
        }
      });
    } catch (error) {
      console.warn("SCR helper could not load N/runtime current user", error);
    }
  }

  function assignedToMatchesCurrentUser(assignedTo) {
    const userKeys = personNameKeys(getCurrentUserName());
    const assignedKeys = personNameKeys(assignedTo);
    return Boolean(userKeys.length && assignedKeys.some(key => userKeys.includes(key)));
  }

  function parseMappingRows(data) {
    const lines = String(data || "").trim().split(/\n+/).filter(Boolean);
    const headers = (lines.shift() || "").split("\t").map(normalizeHeader);
    const findColumn = aliases => headers.findIndex(header => aliases.includes(header));
    const indexes = {
      industryFamily: findColumn(["industryfamily", "industry"]),
      amoDirect: findColumn(["directamo", "amodirect"]),
      state: findColumn(["state", "stateprovince", "province"]),
      salesRegion: findColumn(["salesregion"]),
      staffingRegion: findColumn(["scstaffingregion", "staffingregion", "scregion"])
    };

    return lines.map(line => {
      const cells = line.split("\t");
      const get = key => indexes[key] >= 0 ? normalizeSpaces(cells[indexes[key]]) : "";
      const industryFamily = get("industryFamily");
      const amoDirect = normalizeAmoDirect(get("amoDirect"));
      const state = get("state");
      const salesRegion = get("salesRegion");
      const staffingRegion = get("staffingRegion");

      return {
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        amoDirect,
        amoDirectKey: normalizeKey(amoDirect),
        state,
        stateKey: normalizeMappingState(state),
        salesRegion,
        staffingRegion
      };
    }).filter(row => row.industryFamily && row.state && row.salesRegion && row.staffingRegion);
  }

  function parseCompactMappingRows(data) {
    return (data.rows || []).map(row => {
      const industryFamily = data.families[row[0]] || "";
      const amoDirect = normalizeAmoDirect(data.modes[row[1]] || "");
      const state = data.states[row[2]] || "";
      const salesRegion = data.sales[row[3]] || "";
      const staffingRegion = data.staffing[row[4]] || "";

      return {
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        amoDirect,
        amoDirectKey: normalizeKey(amoDirect),
        state,
        stateKey: normalizeMappingState(state),
        salesRegion,
        staffingRegion
      };
    }).filter(row => row.industryFamily && row.state && row.salesRegion && row.staffingRegion);
  }

  function parseExternalMappingRows(data) {
    if (!data || !Array.isArray(data.rows)) {
      throw new Error("External mapping JSON does not include a rows array.");
    }

    return data.rows.map(record => {
      const industryFamily = normalizeSpaces(record.industryFamily || record.scIndustryGroup || record.sourceIndustryFamily);
      const amoDirect = normalizeAmoDirect(record.amoDirect || record.mode || record.directAmo);
      const state = normalizeSpaces(record.stateKey || record.state);
      const salesRegion = normalizeSpaces(record.salesRegion || "");
      const staffingRegion = normalizeSpaces(record.staffingRegion || record.scStaffingRegion || record.region);

      return {
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        amoDirect,
        amoDirectKey: normalizeKey(amoDirect),
        state,
        stateKey: normalizeMappingState(state),
        salesRegion,
        staffingRegion
      };
    }).filter(row => row.industryFamily && row.amoDirect && row.state && row.staffingRegion);
  }

  function mappingObjectValue(record, aliases) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return "";
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(record, alias)) return record[alias];
    }

    const normalizedAliases = new Set(aliases.map(normalizeHeader));
    const matchedKey = Object.keys(record).find(key => normalizedAliases.has(normalizeHeader(key)));
    return matchedKey ? record[matchedKey] : "";
  }

  function arrayOrObjectValues(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return [];
  }

  function parseGtmIndustryMappingRows(data) {
    const sourceRows = Array.isArray(data)
      ? data
      : Array.isArray(data.rows)
        ? data.rows
        : arrayOrObjectValues(data.mappings).length
          ? arrayOrObjectValues(data.mappings)
          : arrayOrObjectValues(data.industryMappings).length
            ? arrayOrObjectValues(data.industryMappings)
            : [];

    return sourceRows.map(row => {
      const industryFamily = Array.isArray(row)
        ? data.groups[row[0]] || ""
        : mappingObjectValue(row, [
            "scIndustryGroup",
            "SC Industry Group",
            "SC Industry",
            "SC Group",
            "industryFamily",
            "Industry Family",
            "industryGroup",
            "Industry Group",
            "scGroup"
          ]);
      const gtmIndustry = Array.isArray(row)
        ? data.industries[row[1]] || ""
        : mappingObjectValue(row, [
            "gtmIndustry",
            "GTM Industry",
            "FY27 GTM Industry",
            "industry",
            "Industry"
          ]);
      const gtmIndustrySubgroup = Array.isArray(row)
        ? data.subgroups[row[2]] || ""
        : mappingObjectValue(row, [
            "gtmIndustrySubgroup",
            "GTM Industry Subgroup",
            "FY27 GTM Industry Subgroup",
            "industrySubgroup",
            "Industry Subgroup",
            "subgroup",
            "Subgroup"
          ]);

      return {
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        gtmIndustry,
        gtmIndustryKey: normalizeKey(gtmIndustry),
        gtmIndustrySubgroup,
        gtmIndustrySubgroupKey: normalizeKey(gtmIndustrySubgroup)
      };
    }).filter(row => row.industryFamily && row.gtmIndustry && row.gtmIndustrySubgroup);
  }

  function initializeGtmIndustryMappingState(rows, metadata = {}) {
    gtmScIndustryEmojiMappings = metadata.emojiMappings || null;
    if (metadata.emojiMappings) applyExternalEmojiMappings(metadata.emojiMappings);
    gtmIndustryMappingRows = rows || [];
    gtmIndustryGroupByIndustrySubgroup = new Map(
      gtmIndustryMappingRows.map(row => [`${row.gtmIndustryKey}|${row.gtmIndustrySubgroupKey}`, row.industryFamily])
    );
    gtmIndustryGroupBySubgroup = buildSingleValueMap(
      gtmIndustryMappingRows,
      row => row.gtmIndustrySubgroupKey,
      row => row.industryFamily
    );
    gtmIndustryGroupByIndustry = buildSingleValueMap(
      gtmIndustryMappingRows,
      row => row.gtmIndustryKey,
      row => row.industryFamily
    );
    gtmScIndustryMappingMetadata = {
      source: metadata.source || "embedded",
      label: metadata.label || "Embedded fallback",
      rowCount: gtmIndustryMappingRows.length,
      loadedAt: metadata.loadedAt || Date.now(),
      schema: metadata.schema || "",
      generatedAt: metadata.generatedAt || "",
      stale: Boolean(metadata.stale),
      error: metadata.error || "",
      emojiSource: metadata.emojiMappings ? "mapping-json" : "embedded"
    };
  }

  function buildMappingFallbackMap(rows) {
    const grouped = new Map();
    rows.forEach(row => {
      const key = `${row.industryKey}|${row.stateKey}`;
      const group = grouped.get(key) || [];
      group.push(row);
      grouped.set(key, group);
    });

    const fallback = new Map();
    grouped.forEach((group, key) => {
      const first = group[0];
      const sameRegion = group.every(row => (
        row.salesRegion === first.salesRegion && row.staffingRegion === first.staffingRegion
      ));
      if (sameRegion) fallback.set(key, first);
    });
    return fallback;
  }

  function buildSingleValueMap(rows, keyGetter, valueGetter) {
    const grouped = new Map();
    rows.forEach(row => {
      const key = keyGetter(row);
      const value = valueGetter(row);
      if (!key || !value) return;
      const group = grouped.get(key) || new Set();
      group.add(value);
      grouped.set(key, group);
    });

    const mapped = new Map();
    grouped.forEach((values, key) => {
      if (values.size === 1) mapped.set(key, [...values][0]);
    });
    return mapped;
  }

  function parseMappingJsonText(text) {
    const cleaned = String(text || "").replace(/^\uFEFF/, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (error) {
      const objectStart = cleaned.indexOf("{");
      const objectEnd = cleaned.lastIndexOf("}");
      const arrayStart = cleaned.indexOf("[");
      const arrayEnd = cleaned.lastIndexOf("]");
      const candidates = [];
      if (objectStart >= 0 && objectEnd > objectStart) candidates.push(cleaned.slice(objectStart, objectEnd + 1));
      if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
      for (const candidate of candidates) {
        try {
          return JSON.parse(candidate);
        } catch (candidateError) {
          // Try the next likely JSON boundary.
        }
      }
      throw error;
    }
  }

  function responseTextPreview(text) {
    const value = normalizeSpaces(String(text || "").replace(/<[^>]*>/g, " "));
    return value ? value.slice(0, 160) : "empty response";
  }

  function shouldUseGmMappingRequest(url) {
    return /(^|\/\/)(raw\.githubusercontent\.com|github\.com)\b/i.test(String(url || ""));
  }

  function fetchMappingTextWithGm(url) {
    const request = {
      method: "GET",
      url,
      headers: {
        "Cache-Control": "no-cache"
      },
      timeout: 20000
    };

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          ...request,
          onload(response) {
            if (response.status >= 200 && response.status < 300) {
              resolve(String(response.responseText || ""));
              return;
            }
            reject(new Error(`${url}: request failed ${response.status || "unknown status"}`));
          },
          onerror() {
            reject(new Error(`${url}: network error`));
          },
          ontimeout() {
            reject(new Error(`${url}: timed out`));
          }
        });
      });
    }

    if (typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function") {
      return Promise.resolve(GM.xmlHttpRequest(request)).then(response => {
        if (response.status >= 200 && response.status < 300) return String(response.responseText || "");
        throw new Error(`${url}: request failed ${response.status || "unknown status"}`);
      });
    }

    return null;
  }

  async function fetchMappingTextFromUrl(url) {
    if (shouldUseGmMappingRequest(url)) {
      const gmResult = fetchMappingTextWithGm(url);
      if (gmResult) return gmResult;
    }

    const response = await fetch(url, {
      credentials: "include",
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`${url}: request failed ${response.status}`);
    return response.text();
  }

  function orderedUnique(values) {
    const seen = new Set();
    return values.filter(value => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function githubMappingUrl(fileName) {
    return `${GITHUB_MAPPING_BASE_URL}/${encodeURIComponent(fileName)}`;
  }

  function mappingJsonSourceLabel(url, fileName) {
    const labelName = Array.isArray(fileName) ? fileName[0] : fileName;
    return String(url || "").includes("raw.githubusercontent.com")
      ? `GitHub ${labelName}`
      : `File Cabinet ${labelName}`;
  }

  function externalMappingUrlCandidates() {
    const origin = window.location.origin || "https://nlcorp.app.netsuite.com";
    return orderedUnique([
      githubMappingUrl(EXTERNAL_MAPPING_FILE_NAME),
      EXTERNAL_MAPPING_FILE_URL,
      `${origin}/core/media/media.nl?id=${encodeURIComponent(EXTERNAL_MAPPING_FILE_ID)}&c=NLCORP&_xt=.json`,
      `${origin}/core/media/media.nl?id=${encodeURIComponent(EXTERNAL_MAPPING_FILE_ID)}&_xt=.json`,
      `${origin}/app/common/media/mediaitem.nl?id=${encodeURIComponent(EXTERNAL_MAPPING_FILE_ID)}`
    ]);
  }

  function productsScmMappingUrlCandidates() {
    const origin = window.location.origin || "https://nlcorp.app.netsuite.com";
    return orderedUnique([
      githubMappingUrl(PRODUCTS_SCM_MAPPING_FILE_NAME),
      PRODUCTS_SCM_MAPPING_FILE_URL,
      `${origin}/core/media/media.nl?id=${encodeURIComponent(PRODUCTS_SCM_MAPPING_FILE_ID)}&c=NLCORP&_xt=.json`,
      `${origin}/core/media/media.nl?id=${encodeURIComponent(PRODUCTS_SCM_MAPPING_FILE_ID)}&_xt=.json`,
      `${origin}/app/common/media/mediaitem.nl?id=${encodeURIComponent(PRODUCTS_SCM_MAPPING_FILE_ID)}`
    ]);
  }

  function gtmScIndustryMappingUrlCandidates() {
    const origin = window.location.origin || "https://nlcorp.app.netsuite.com";
    const fileIdUrls = GTM_SC_INDUSTRY_MAPPING_FILE_ID
      ? [
          `${origin}/core/media/media.nl?id=${encodeURIComponent(GTM_SC_INDUSTRY_MAPPING_FILE_ID)}&c=NLCORP&_xt=.json`,
          `${origin}/core/media/media.nl?id=${encodeURIComponent(GTM_SC_INDUSTRY_MAPPING_FILE_ID)}&_xt=.json`,
          `${origin}/app/common/media/mediaitem.nl?id=${encodeURIComponent(GTM_SC_INDUSTRY_MAPPING_FILE_ID)}`
        ]
      : [];
    return orderedUnique([
      GTM_SC_INDUSTRY_MAPPING_GITHUB_URL,
      ...fileIdUrls,
      GTM_SC_INDUSTRY_MAPPING_FOLDER_URL
    ].filter(Boolean));
  }

  function authorizedManagersUrlCandidates() {
    const origin = window.location.origin || "https://nlcorp.app.netsuite.com";
    const fileIdUrls = AUTHORIZED_MANAGERS_FILE_ID
      ? [
          `${origin}/core/media/media.nl?id=${encodeURIComponent(AUTHORIZED_MANAGERS_FILE_ID)}&c=NLCORP&_xt=.json`,
          `${origin}/core/media/media.nl?id=${encodeURIComponent(AUTHORIZED_MANAGERS_FILE_ID)}&_xt=.json`,
          `${origin}/app/common/media/mediaitem.nl?id=${encodeURIComponent(AUTHORIZED_MANAGERS_FILE_ID)}`
        ]
      : [];
    return orderedUnique([
      ...AUTHORIZED_MANAGERS_FILE_NAMES.map(githubMappingUrl),
      AUTHORIZED_MANAGERS_FOLDER_URL,
      ...fileIdUrls
    ].filter(Boolean));
  }

  function extractMappingDownloadUrls(html, baseUrl, fileName = EXTERNAL_MAPPING_FILE_NAME, fileId = EXTERNAL_MAPPING_FILE_ID) {
    const urls = [];
    const text = String(html || "");
    const fileNames = (Array.isArray(fileName) ? fileName : [fileName])
      .map(name => String(name || ""))
      .filter(Boolean);
    const fileIds = [fileId]
      .map(id => String(id || ""))
      .filter(Boolean);
    try {
      const base = new URL(baseUrl || window.location.href, window.location.href);
      const idFromBase = base.searchParams.get("id");
      if (idFromBase) fileIds.push(idFromBase);
    } catch (error) {
      // Ignore malformed base URLs; normal URL candidates still apply.
    }

    try {
      const doc = new DOMParser().parseFromString(text, "text/html");
      Array.from(doc.querySelectorAll("a[href], link[href], script[src]")).forEach(node => {
        const href = node.getAttribute("href") || node.getAttribute("src");
        if (!href) return;
        const absolute = new URL(href, baseUrl || window.location.href).href;
        const linkText = normalizeSpaces(node.textContent || "");
        const matchesFileName = fileNames.some(name => absolute.includes(name) || linkText.includes(name));
        const matchesFileId = fileIds.some(id => (
          (absolute.includes("/core/media/media.nl") && absolute.includes(`id=${id}`))
          || (absolute.includes("/app/common/media/") && absolute.includes(id))
        ));
        if (matchesFileName || matchesFileId) {
          urls.push(absolute);
        }
      });
    } catch (error) {
      // Fall through to regex extraction.
    }

    const regex = /https?:\/\/[^"'<>\s]+(?:media\.nl|mediaitem\.nl)[^"'<>\s]*/gi;
    Array.from(text.matchAll(regex)).forEach(match => {
      const url = match[0].replace(/&amp;/g, "&");
      if (fileIds.some(id => url.includes(id)) || fileNames.some(name => url.includes(name))) urls.push(url);
    });

    return orderedUnique(urls).filter(url => url !== baseUrl);
  }

  async function fetchMappingJsonFromUrl(url, visited = new Set(), fileName = EXTERNAL_MAPPING_FILE_NAME, fileId = EXTERNAL_MAPPING_FILE_ID) {
    if (!url || visited.has(url)) throw new Error("No unused mapping URL candidate was available.");
    visited.add(url);

    const text = await fetchMappingTextFromUrl(url);
    try {
      return parseMappingJsonText(text);
    } catch (parseError) {
      const nestedUrls = extractMappingDownloadUrls(text, url, fileName, fileId);
      for (const nestedUrl of nestedUrls) {
        try {
          return await fetchMappingJsonFromUrl(nestedUrl, visited, fileName, fileId);
        } catch (nestedError) {
          console.warn("IQUEUE mapping nested URL failed", nestedError);
        }
      }
      throw new Error(`${url}: response was not JSON (${parseError.message}; preview: ${responseTextPreview(text)})`);
    }
  }

  function loadExternalMappingWithSuiteScript() {
    const pageWindow = getPageWindow();
    if (!pageWindow || typeof pageWindow.require !== "function") {
      return Promise.reject(new Error("NetSuite require was not available."));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      timer = setTimeout(finish(reject), 12000, new Error("Timed out loading mapping JSON with N/file."));

      try {
        pageWindow.require(["N/file"], file => {
          try {
            const mappingFile = file.load({ id: EXTERNAL_MAPPING_FILE_ID });
            finish(resolve)(parseMappingJsonText(mappingFile.getContents()));
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  function readCachedExternalMapping() {
    try {
      const cached = JSON.parse(localStorage.getItem(EXTERNAL_MAPPING_CACHE_KEY) || "null");
      if (!cached || !cached.data || !cached.loadedAt) return null;
      return cached;
    } catch (error) {
      console.warn("SCR helper could not read cached mapping JSON", error);
      return null;
    }
  }

  function writeCachedExternalMapping(data) {
    try {
      localStorage.setItem(EXTERNAL_MAPPING_CACHE_KEY, JSON.stringify({
        loadedAt: Date.now(),
        data
      }));
    } catch (error) {
      console.warn("SCR helper could not cache mapping JSON", error);
    }
  }

  function applyExternalMappingData(data, options = {}) {
    const rows = parseExternalMappingRows(data);
    if (!rows.length) throw new Error("External mapping JSON did not produce any usable mapping rows.");

    initializeMappingState(rows, {
      source: options.fromCache ? "cache" : "file-cabinet",
      label: options.label || (options.fromCache ? `Cached ${EXTERNAL_MAPPING_FILE_NAME}` : `File Cabinet ${EXTERNAL_MAPPING_FILE_NAME}`),
      schema: data.schema || "",
      generatedAt: data.generatedAt || "",
      loadedAt: options.loadedAt || Date.now(),
      stale: Boolean(options.stale),
      emojiMappings: data.emojiMappings
    });
  }

  function applyCachedExternalMapping() {
    const cached = readCachedExternalMapping();
    if (!cached) return false;
    const stale = Date.now() - cached.loadedAt > EXTERNAL_MAPPING_REFRESH_INTERVAL_MS;
    try {
      applyExternalMappingData(cached.data, {
        fromCache: true,
        loadedAt: cached.loadedAt,
        stale
      });
      return true;
    } catch (error) {
      console.warn("SCR helper ignored invalid cached mapping JSON", error);
      return false;
    }
  }

  function shouldFetchExternalMapping() {
    const cached = readCachedExternalMapping();
    if (!cached) return true;
    return Date.now() - cached.loadedAt > EXTERNAL_MAPPING_REFRESH_INTERVAL_MS;
  }

  async function fetchExternalMappingData() {
    const errors = [];

    for (const url of externalMappingUrlCandidates()) {
      try {
        const data = await fetchMappingJsonFromUrl(url);
        if (!parseExternalMappingRows(data).length) {
          throw new Error(`${url}: mapping JSON did not produce any usable rows.`);
        }
        return {
          data,
          label: mappingJsonSourceLabel(url, EXTERNAL_MAPPING_FILE_NAME)
        };
      } catch (error) {
        errors.push(error.message || String(error));
      }
    }

    try {
      const data = await loadExternalMappingWithSuiteScript();
      return {
        data,
        label: `N/file ${EXTERNAL_MAPPING_FILE_NAME}`
      };
    } catch (error) {
      errors.push(`N/file: ${error.message || error}`);
    }

    throw new Error(errors.join(" | "));
  }

  function shortMappingError(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  function mappingLoadErrorSummary(error, label = "Mapping") {
    const text = normalizeSpaces(error && error.message || error);
    if (!text) return `${label}: load failed`;
    const urlMatch = text.match(/^https?:\/\/\S+?:\s*(.+)$/);
    return urlMatch ? `${label}: ${urlMatch[1]}` : `${label}: ${text}`;
  }

  function mappingStatusText() {
    const parts = [`Mapping: ${mappingMetadata.label}`];
    if (mappingMetadata.rowCount) parts.push(`${mappingMetadata.rowCount.toLocaleString()} rows`);
    if (mappingMetadata.stale) parts.push("cached");
    if (mappingMetadata.error) parts.push(`fallback active: ${shortMappingError(mappingMetadata.error)}`);
    const productsParts = [`SCM relationships: ${productsScmMetadata.label}`];
    if (productsScmMetadata.rowCount) productsParts.push(`${productsScmMetadata.rowCount.toLocaleString()} rels`);
    if (productsScmMetadata.authorizedDirectorCount) productsParts.push(`${productsScmMetadata.authorizedDirectorCount.toLocaleString()} director viewers`);
    if (productsScmMetadata.authorizedViewerCount) productsParts.push(`${productsScmMetadata.authorizedViewerCount.toLocaleString()} extra viewers`);
    if (productsScmMetadata.stale) productsParts.push("cached");
    if (productsScmMetadata.error) productsParts.push(`not loaded: ${shortMappingError(productsScmMetadata.error)}`);
    const gtmParts = [`GTM Mapping: ${gtmScIndustryMappingMetadata.label}`];
    if (gtmScIndustryMappingMetadata.rowCount) gtmParts.push(`${gtmScIndustryMappingMetadata.rowCount.toLocaleString()} rows`);
    if (gtmScIndustryMappingMetadata.stale) gtmParts.push("cached");
    if (gtmScIndustryMappingMetadata.error) gtmParts.push(`fallback active: ${shortMappingError(gtmScIndustryMappingMetadata.error)}`);
    const managerParts = [`Authorized Managers: ${authorizedManagersMetadata.label}`];
    if (authorizedManagersMetadata.rowCount) managerParts.push(`${authorizedManagersMetadata.rowCount.toLocaleString()} managers`);
    if (authorizedManagersMetadata.canOwnCount) managerParts.push(`${authorizedManagersMetadata.canOwnCount.toLocaleString()} can own`);
    if (authorizedManagersMetadata.stale) managerParts.push("cached");
    if (authorizedManagersMetadata.error) managerParts.push(`not loaded: ${shortMappingError(authorizedManagersMetadata.error)}`);
    return `${parts.join(" · ")}. ${gtmParts.join(" · ")}. ${productsParts.join(" · ")}. ${managerParts.join(" · ")}`;
  }

  async function loadExternalMapping(options = {}) {
    const force = Boolean(options.force);
    if (!force && !shouldFetchExternalMapping()) return;

    const status = document.getElementById("scr-helper-status");
    if (status) status.textContent = `Loading ${EXTERNAL_MAPPING_FILE_NAME} from NetSuite File Cabinet.`;

    try {
      const result = await fetchExternalMappingData();
      const data = result.data || result;
      writeCachedExternalMapping(data);
      applyExternalMappingData(data, { fromCache: false, loadedAt: Date.now(), label: result.label });
      updateMappingFilterOptions();
      if (searchRows.length) await refreshRows();
      else renderResults();
    } catch (error) {
      console.warn("SCR helper could not load external mapping JSON", error);
      mappingMetadata = {
        ...mappingMetadata,
        error: error.message || "External mapping load failed"
      };
      renderResults();
    }
  }

  function parseProductsScmRelationships(data) {
    const rows = Array.isArray(data && data.relationships) ? data.relationships : [];
    return rows.map(record => {
      const salesRegion = normalizeSpaces(record.salesRegion || "");
      const requestType = normalizeAmoDirect(record.requestType || record.amoDirect || record.directAmo || "");
      const regionalDirector = cleanPersonName(record.regionalDirector || record.rd || record.rsm || record.salesDirector || "");
      const scm = cleanPersonName(record.scm || record.productsScmOwner || record.queueOwner || "");
      const directors = cleanPersonList(record.directors || record.authorizedDirectors || record.scmDirectors || record.scDirector || record.scmDirector || "");
      return {
        sourceRow: record.sourceRow || "",
        salesRegion,
        salesRegionKey: normalizeKey(salesRegion),
        requestType,
        requestTypeKey: normalizeKey(requestType),
        regionalDirector,
        regionalDirectorKey: normalizeKey(regionalDirector),
        scm,
        scmKey: normalizeKey(scm),
        directors,
        directorKeys: directors.map(normalizeKey)
      };
    }).filter(row => row.requestType && row.regionalDirector && row.scm);
  }

  function cleanAuthorizedPersonList(values) {
    if (!Array.isArray(values)) return [];
    return uniqueSorted(values.flatMap(value => {
      if (value && typeof value === "object") {
        return cleanPersonList(value.name || value.displayName || value.email || "");
      }
      return cleanPersonList(value);
    }));
  }

  function buildProductsScmRelationshipMap(rows, keyGetter) {
    const map = new Map();
    rows.forEach(row => {
      const key = keyGetter(row);
      if (!key) return;
      const group = map.get(key) || [];
      group.push(row);
      map.set(key, group);
    });
    return map;
  }

  function applyProductsScmMappingData(data, options = {}) {
    const rows = parseProductsScmRelationships(data);
    if (!rows.length) throw new Error("SCM relationship JSON did not produce any usable rows.");

    const authorized = Array.isArray(data.authorizedScms)
      ? data.authorizedScms.map(cleanPersonName).filter(Boolean)
      : uniqueSorted(rows.map(row => row.scm));
    const authorizedDirectors = cleanAuthorizedPersonList(data.authorizedDirectors)
      .concat(rows.flatMap(row => row.directors || []));
    const authorizedViewers = cleanAuthorizedPersonList(data.authorizedViewers);

    productsScmRelationships = rows;
    productsScmAuthorizedScms = uniqueSorted(authorized.concat(rows.map(row => row.scm)));
    productsScmAuthorizedDirectors = uniqueSorted(authorizedDirectors);
    productsScmAuthorizedViewers = uniqueSorted(authorizedViewers);
    productsScmByExactKey = buildProductsScmRelationshipMap(
      rows,
      row => `${row.requestTypeKey}|${row.regionalDirectorKey}|${row.salesRegionKey}`
    );
    productsScmByDirectorKey = buildProductsScmRelationshipMap(
      rows,
      row => `${row.requestTypeKey}|${row.regionalDirectorKey}`
    );
    productsScmMetadata = {
      source: options.fromCache ? "cache" : "file-cabinet",
      label: options.label || (options.fromCache ? `Cached ${PRODUCTS_SCM_MAPPING_FILE_NAME}` : `File Cabinet ${PRODUCTS_SCM_MAPPING_FILE_NAME}`),
      rowCount: rows.length,
      loadedAt: options.loadedAt || Date.now(),
      schema: data.schema || "",
      generatedAt: data.generatedAt || "",
      authorizedDirectorCount: productsScmAuthorizedDirectors.length,
      authorizedViewerCount: productsScmAuthorizedViewers.length,
      stale: Boolean(options.stale),
      error: ""
    };
  }

  function readCachedProductsScmMapping() {
    try {
      const cached = JSON.parse(localStorage.getItem(PRODUCTS_SCM_MAPPING_CACHE_KEY) || "null");
      if (!cached || !cached.data || !cached.loadedAt) return null;
      return cached;
    } catch (error) {
      console.warn("IQUEUE could not read cached SCM relationship JSON", error);
      return null;
    }
  }

  function writeCachedProductsScmMapping(data) {
    try {
      localStorage.setItem(PRODUCTS_SCM_MAPPING_CACHE_KEY, JSON.stringify({
        loadedAt: Date.now(),
        data
      }));
    } catch (error) {
      console.warn("IQUEUE could not cache SCM relationship JSON", error);
    }
  }

  function applyCachedProductsScmMapping() {
    const cached = readCachedProductsScmMapping();
    if (!cached) return false;
    const stale = Date.now() - cached.loadedAt > PRODUCTS_SCM_MAPPING_REFRESH_INTERVAL_MS;
    try {
      applyProductsScmMappingData(cached.data, {
        fromCache: true,
        loadedAt: cached.loadedAt,
        stale
      });
      return true;
    } catch (error) {
      console.warn("IQUEUE ignored invalid cached SCM relationship JSON", error);
      return false;
    }
  }

  function shouldFetchProductsScmMapping() {
    const cached = readCachedProductsScmMapping();
    if (!cached) return true;
    return Date.now() - cached.loadedAt > PRODUCTS_SCM_MAPPING_REFRESH_INTERVAL_MS;
  }

  function loadProductsScmMappingWithSuiteScript() {
    const pageWindow = getPageWindow();
    if (!pageWindow || typeof pageWindow.require !== "function") {
      return Promise.reject(new Error("NetSuite require was not available."));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      timer = setTimeout(finish(reject), 12000, new Error("Timed out loading SCM relationship JSON."));

      try {
        pageWindow.require(["N/file", "N/search"], (file, search) => {
          try {
            let fileId = PRODUCTS_SCM_MAPPING_FILE_ID;
            if (!fileId) {
              const results = search.create({
                type: "file",
                filters: [["name", "is", PRODUCTS_SCM_MAPPING_FILE_NAME]],
                columns: ["internalid", "name"]
              }).run().getRange({ start: 0, end: 1 }) || [];
              const result = results[0];
              fileId = result && (result.getValue({ name: "internalid" }) || result.id);
            }
            if (!fileId) throw new Error(`${PRODUCTS_SCM_MAPPING_FILE_NAME} was not found in the NetSuite File Cabinet.`);
            const mappingFile = file.load({ id: fileId });
            finish(resolve)(parseMappingJsonText(mappingFile.getContents()));
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function fetchProductsScmMappingData() {
    const errors = [];

    for (const url of productsScmMappingUrlCandidates()) {
      try {
        const data = await fetchMappingJsonFromUrl(url, new Set(), PRODUCTS_SCM_MAPPING_FILE_NAME, PRODUCTS_SCM_MAPPING_FILE_ID);
        if (!parseProductsScmRelationships(data).length) {
          throw new Error(`${url}: SCM relationship JSON did not produce any usable rows.`);
        }
        return {
          data,
          label: mappingJsonSourceLabel(url, PRODUCTS_SCM_MAPPING_FILE_NAME)
        };
      } catch (error) {
        errors.push(error.message || String(error));
      }
    }

    try {
      const data = await loadProductsScmMappingWithSuiteScript();
      return {
        data,
        label: `N/file ${PRODUCTS_SCM_MAPPING_FILE_NAME}`
      };
    } catch (error) {
      errors.push(`N/file: ${error.message || error}`);
    }

    throw new Error(errors.join(" | "));
  }

  async function loadProductsScmMapping(options = {}) {
    const force = Boolean(options.force);
    if (!force && !shouldFetchProductsScmMapping()) return;

    try {
      const result = await fetchProductsScmMappingData();
      const data = result.data || result;
      writeCachedProductsScmMapping(data);
      applyProductsScmMappingData(data, {
        fromCache: false,
        loadedAt: Date.now(),
        label: result.label
      });
      updateProductsScmControls();
      updateFilterSummary();
      renderResults();
    } catch (error) {
      console.warn("IQUEUE could not load SCM relationship JSON", error);
      productsScmMetadata = {
        ...productsScmMetadata,
        error: error.message || "SCM relationship load failed"
      };
      updateProductsScmControls();
      renderResults();
    }
  }

  function applyGtmScIndustryMappingData(data, options = {}) {
    const rows = parseGtmIndustryMappingRows(data);
    if (!rows.length) throw new Error("GTM mapping JSON did not produce any usable rows.");

    initializeGtmIndustryMappingState(rows, {
      source: options.fromCache ? "cache" : "file-cabinet",
      label: options.label || (options.fromCache ? `Cached ${GTM_SC_INDUSTRY_MAPPING_FILE_NAME}` : `File Cabinet ${GTM_SC_INDUSTRY_MAPPING_FILE_NAME}`),
      schema: data.schema || "",
      generatedAt: data.generatedAt || "",
      loadedAt: options.loadedAt || Date.now(),
      stale: Boolean(options.stale),
      emojiMappings: data.emojiMappings
    });
  }

  function readCachedGtmScIndustryMapping() {
    try {
      const cached = JSON.parse(localStorage.getItem(GTM_SC_INDUSTRY_MAPPING_CACHE_KEY) || "null");
      if (!cached || !cached.data || !cached.loadedAt) return null;
      return cached;
    } catch (error) {
      console.warn("IQUEUE could not read cached GTM mapping JSON", error);
      return null;
    }
  }

  function writeCachedGtmScIndustryMapping(data) {
    try {
      localStorage.setItem(GTM_SC_INDUSTRY_MAPPING_CACHE_KEY, JSON.stringify({
        loadedAt: Date.now(),
        data
      }));
    } catch (error) {
      console.warn("IQUEUE could not cache GTM mapping JSON", error);
    }
  }

  function applyCachedGtmScIndustryMapping() {
    const cached = readCachedGtmScIndustryMapping();
    if (!cached) return false;
    const stale = Date.now() - cached.loadedAt > GTM_SC_INDUSTRY_MAPPING_REFRESH_INTERVAL_MS;
    try {
      applyGtmScIndustryMappingData(cached.data, {
        fromCache: true,
        stale,
        loadedAt: cached.loadedAt
      });
      return true;
    } catch (error) {
      console.warn("IQUEUE cached GTM mapping JSON was not usable", error);
      return false;
    }
  }

  function shouldFetchGtmScIndustryMapping() {
    const cached = readCachedGtmScIndustryMapping();
    if (!cached) return true;
    return Date.now() - cached.loadedAt > GTM_SC_INDUSTRY_MAPPING_REFRESH_INTERVAL_MS;
  }

  function loadGtmScIndustryMappingWithSuiteScript() {
    const pageWindow = getPageWindow();
    if (!pageWindow || typeof pageWindow.require !== "function") {
      return Promise.reject(new Error("NetSuite require was not available."));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      timer = setTimeout(finish(reject), 12000, new Error("Timed out loading GTM mapping JSON."));

      try {
        pageWindow.require(["N/file", "N/search"], (file, search) => {
          try {
            let fileId = "";
            try {
              const baseName = GTM_SC_INDUSTRY_MAPPING_FILE_NAME.replace(/\.json$/i, "");
              const results = search.create({
                type: "file",
                filters: [["name", "contains", baseName]],
                columns: ["internalid", "name"]
              }).run().getRange({ start: 0, end: 20 }) || [];
              const exactName = normalizeSpaces(GTM_SC_INDUSTRY_MAPPING_FILE_NAME).toLowerCase();
              const result = results.find(item => normalizeSpaces(item.getValue({ name: "name" })).toLowerCase() === exactName) || results[0];
              fileId = result && (result.getValue({ name: "internalid" }) || result.id);
            } catch (searchError) {
              console.warn("IQUEUE could not search NetSuite File Cabinet for GTM mapping JSON", searchError);
            }
            if (!fileId) fileId = GTM_SC_INDUSTRY_MAPPING_FILE_ID;
            if (!fileId) throw new Error(`${GTM_SC_INDUSTRY_MAPPING_FILE_NAME} was not found in the NetSuite File Cabinet.`);
            const mappingFile = file.load({ id: fileId });
            finish(resolve)(parseMappingJsonText(mappingFile.getContents()));
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function fetchGtmScIndustryMappingData() {
    const errors = [];
    const githubUrl = GTM_SC_INDUSTRY_MAPPING_GITHUB_URL;

    try {
      const data = await fetchMappingJsonFromUrl(githubUrl, new Set(), GTM_SC_INDUSTRY_MAPPING_FILE_NAME, GTM_SC_INDUSTRY_MAPPING_FILE_ID);
      if (!parseGtmIndustryMappingRows(data).length) {
        throw new Error(`${githubUrl}: GTM mapping JSON did not produce any usable rows.`);
      }
      return {
        data,
        label: mappingJsonSourceLabel(githubUrl, GTM_SC_INDUSTRY_MAPPING_FILE_NAME)
      };
    } catch (error) {
      errors.push(mappingLoadErrorSummary(error, "GitHub raw GTM mapping"));
    }

    try {
      const data = await loadGtmScIndustryMappingWithSuiteScript();
      if (!parseGtmIndustryMappingRows(data).length) {
        throw new Error(`N/file ${GTM_SC_INDUSTRY_MAPPING_FILE_NAME}: GTM mapping JSON did not produce any usable rows.`);
      }
      return {
        data,
        label: `N/file ${GTM_SC_INDUSTRY_MAPPING_FILE_NAME}`
      };
    } catch (error) {
      errors.push(mappingLoadErrorSummary(error, "NetSuite N/file GTM mapping"));
    }

    for (const url of gtmScIndustryMappingUrlCandidates().filter(url => url !== githubUrl)) {
      try {
        const data = await fetchMappingJsonFromUrl(url, new Set(), GTM_SC_INDUSTRY_MAPPING_FILE_NAME, GTM_SC_INDUSTRY_MAPPING_FILE_ID);
        if (!parseGtmIndustryMappingRows(data).length) {
          throw new Error(`${url}: GTM mapping JSON did not produce any usable rows.`);
        }
        return {
          data,
          label: mappingJsonSourceLabel(url, GTM_SC_INDUSTRY_MAPPING_FILE_NAME)
        };
      } catch (error) {
        errors.push(mappingLoadErrorSummary(error, mappingJsonSourceLabel(url, GTM_SC_INDUSTRY_MAPPING_FILE_NAME)));
      }
    }

    throw new Error(errors.join(" | "));
  }

  async function loadGtmScIndustryMapping(options = {}) {
    const force = Boolean(options.force);
    if (!force && !shouldFetchGtmScIndustryMapping()) return;

    try {
      const result = await fetchGtmScIndustryMappingData();
      const data = result.data || result;
      writeCachedGtmScIndustryMapping(data);
      applyGtmScIndustryMappingData(data, {
        fromCache: false,
        loadedAt: Date.now(),
        label: result.label
      });
      if (searchRows.length) await refreshRows();
      else renderResults();
    } catch (error) {
      console.warn("IQUEUE could not load GTM to SC Industry JSON", error);
      gtmScIndustryMappingMetadata = {
        ...gtmScIndustryMappingMetadata,
        error: error.message || "GTM mapping load failed"
      };
      renderResults();
    }
  }

  const AUTHORIZED_MANAGER_HEADER_ALIASES = {
    name: ["manager", "name", "scm", "scmanager", "salesconsultantmanager", "authorizedmanager"],
    email: ["email", "emailaddress", "workemail", "oracleemailaddress", "oracleemail"],
    role: ["role", "title", "jobtitle"],
    groups: ["scindustry", "scindustries", "scindustrygroup", "scindustrygroups", "scstaffingindustry", "scstaffingindustries", "industrygroup", "industrygroups", "salesvertical", "salesverticals", "vertical", "verticals", "group", "groups"],
    canOwn: ["canown", "owner", "canownscr", "canbescmowner"],
    canView: ["canview", "viewer", "canviewqueue", "canviewscmqueue"],
    active: ["active", "inactive", "status", "enabled"]
  };

  function authorizedManagerHeaderMatches(header, key) {
    const normalized = normalizeHeader(header);
    const aliases = AUTHORIZED_MANAGER_HEADER_ALIASES[key] || [];
    if (aliases.includes(normalized)) return true;
    if (key === "name") return normalized.includes("manager") && !normalized.includes("email");
    if (key === "groups") return (normalized.includes("industry") && normalized.includes("group"))
      || normalized === "scindustry"
      || normalized === "scindustries"
      || (normalized.includes("staffing") && normalized.includes("industry"))
      || normalized.includes("salesvertical")
      || normalized === "vertical"
      || normalized === "verticals";
    if (key === "canOwn") return normalized.includes("can") && normalized.includes("own");
    if (key === "canView") return normalized.includes("can") && normalized.includes("view");
    return false;
  }

  function authorizedManagerHeaderIndex(headers, key) {
    if (key === "name") {
      const preferredAliases = ["name", "scm", "scmanager", "salesconsultantmanager", "authorizedmanager"];
      const preferredIndex = headers.findIndex(header => preferredAliases.includes(normalizeHeader(header)));
      if (preferredIndex >= 0) return preferredIndex;
    }
    return headers.findIndex(header => authorizedManagerHeaderMatches(header, key));
  }

  function authorizedManagerHeaderIndexes(headers, key) {
    return headers
      .map((header, index) => authorizedManagerHeaderMatches(header, key) ? index : -1)
      .filter(index => index >= 0);
  }

  function normalizeAuthorizedManagerGroup(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    return canonicalScIndustryGroupAlias(text) || text;
  }

  function cleanIndustryGroupList(value) {
    if (Array.isArray(value)) {
      return uniqueSorted(value.flatMap(cleanIndustryGroupList));
    }
    const text = normalizeMultiline(value);
    if (!text) return [];
    return uniqueSorted(text
      .split(/[\n,;|]+/)
      .map(normalizeSpaces)
      .map(normalizeAuthorizedManagerGroup)
      .filter(Boolean));
  }

  function parseBooleanValue(value, fallback = false, options = {}) {
    const text = normalizeSpaces(value);
    if (!text) return Boolean(fallback);
    if (/^(?:y|yes|true|t|1|active|enabled)$/i.test(text)) return true;
    if (/^(?:n|no|false|f|0|disabled)$/i.test(text)) return false;
    if (options.inactiveMeansFalse && /inactive|terminated|disabled/i.test(text)) return false;
    if (/active|enabled/i.test(text)) return true;
    return Boolean(fallback);
  }

  function defaultCanOwnForManagerRole(role) {
    return true;
  }

  function scoreAuthorizedManagerHeader(cells) {
    if (cells.length < 2) return 0;
    const headers = cells.map(normalizeHeader);
    let score = 0;
    if (headers.some(header => authorizedManagerHeaderMatches(header, "name"))) score += 6;
    if (headers.some(header => authorizedManagerHeaderMatches(header, "groups"))) score += 5;
    if (headers.some(header => authorizedManagerHeaderMatches(header, "email"))) score += 2;
    if (headers.some(header => authorizedManagerHeaderMatches(header, "canOwn"))) score += 2;
    if (headers.some(header => authorizedManagerHeaderMatches(header, "canView"))) score += 2;
    return score;
  }

  function findAuthorizedManagersTable(root) {
    const candidates = [];
    Array.from(root.querySelectorAll("table")).forEach(table => {
      const rows = Array.from(table.querySelectorAll("tr"));
      rows.forEach((row, rowIndex) => {
        const cells = rowCells(row);
        const score = scoreAuthorizedManagerHeader(cells);
        if (!score) return;
        candidates.push({
          table,
          headerIndex: rowIndex,
          score,
          columnCount: cells.length
        });
      });
    });
    candidates.sort((a, b) => b.score - a.score || b.columnCount - a.columnCount);
    return candidates[0] || null;
  }

  function authorizedManagersDataFromTable(root, source = {}) {
    const result = findAuthorizedManagersTable(root);
    if (!result) throw new Error("Could not find an Authorized Managers result table.");

    const rows = Array.from(result.table.querySelectorAll("tr"));
    const headers = makeUniqueHeaders(rowCells(rows[result.headerIndex] || { children: [] }));
    const indexes = {
      name: authorizedManagerHeaderIndex(headers, "name"),
      email: authorizedManagerHeaderIndex(headers, "email"),
      role: authorizedManagerHeaderIndex(headers, "role"),
      groups: authorizedManagerHeaderIndexes(headers, "groups"),
      canOwn: authorizedManagerHeaderIndex(headers, "canOwn"),
      canView: authorizedManagerHeaderIndex(headers, "canView"),
      active: authorizedManagerHeaderIndex(headers, "active")
    };
    if (indexes.name < 0) throw new Error("Authorized Managers search is missing a Manager/Name column.");

    const records = [];
    rows.slice(result.headerIndex + 1).forEach((row, offset) => {
      const cells = rowCellInfos(row);
      if (!cells.length) return;
      const get = key => {
        const index = indexes[key];
        if (index < 0 || index >= cells.length) return "";
        return normalizeSpaces(cells[index].rawText || cells[index].text);
      };
      const getAll = key => (Array.isArray(indexes[key]) ? indexes[key] : [indexes[key]])
        .filter(index => index >= 0 && index < cells.length)
        .map(index => normalizeSpaces(cells[index].rawText || cells[index].text))
        .filter(Boolean);
      const name = cleanPersonName(get("name"));
      if (!name || /^(?:name|manager)$/i.test(name)) return;
      const role = get("role");
      const groups = cleanIndustryGroupList(getAll("groups"));
      const active = parseBooleanValue(get("active"), true, { inactiveMeansFalse: true });
      const canOwn = parseBooleanValue(get("canOwn"), defaultCanOwnForManagerRole(role));
      const canView = parseBooleanValue(get("canView"), true);
      records.push({
        sourceRows: [result.headerIndex + offset + 2],
        name,
        nameKey: normalizeKey(name),
        email: get("email"),
        role,
        groups,
        groupKeys: groups.map(normalizeKey),
        canOwn,
        canView,
        active
      });
    });

    return {
      schema: "ns-scm-tools.authorized-managers.v1",
      generatedAt: new Date().toISOString(),
      source: {
        ...source,
        headerRow: result.headerIndex + 1,
        detectedHeaders: headers
      },
      authorizedManagers: records
    };
  }

  async function fetchAuthorizedManagersFromSavedSearch(searchUrl = AUTHORIZED_MANAGERS_SEARCH_URL) {
    const response = await fetch(searchUrl, {
      credentials: "include",
      cache: "no-cache"
    });
    if (!response.ok) throw new Error(`Saved search ${AUTHORIZED_MANAGERS_SEARCH_ID}: request failed ${response.status}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    return authorizedManagersDataFromTable(doc, {
      label: `Saved Search ${AUTHORIZED_MANAGERS_SEARCH_ID}`,
      searchId: AUTHORIZED_MANAGERS_SEARCH_ID,
      searchUrl
    });
  }

  function parseAuthorizedManagerRows(data) {
    const rows = Array.isArray(data && data.authorizedManagers) ? data.authorizedManagers : [];
    return rows.map(record => {
      const name = cleanPersonName(record.name || record.manager || record.displayName || "");
      const groups = cleanIndustryGroupList([
        record.groups,
        record.scIndustryGroups,
        record.scIndustry,
        record.scIndustries,
        record.scStaffingIndustry,
        record.industryGroups,
        record.salesVertical,
        record.salesVerticals,
        record.vertical,
        record.verticals
      ]);
      const groupKeys = Array.isArray(record.groupKeys)
        ? record.groupKeys.map(normalizeKey).filter(Boolean)
        : groups.map(normalizeKey);
      const expandedGroupKeys = uniqueSorted(
        groupKeys.concat(groups.flatMap(scIndustryGroupKeyVariants))
      );
      return {
        sourceRows: Array.isArray(record.sourceRows) ? record.sourceRows : [],
        name,
        nameKey: normalizeKey(record.nameKey || name),
        email: normalizeSpaces(record.email || ""),
        role: normalizeSpaces(record.role || ""),
        groups,
        groupKeys: expandedGroupKeys,
        canOwn: record.canOwn !== false,
        canView: record.canView !== false,
        active: record.active !== false
      };
    }).filter(record => record.name && record.active);
  }

  function applyAuthorizedManagersData(data, options = {}) {
    const rows = parseAuthorizedManagerRows(data);
    if (!rows.length) throw new Error("Authorized managers JSON did not produce any usable rows.");

    const canOwnRows = rows.filter(row => row.canOwn && row.groupKeys.length);
    const canViewRows = rows.filter(row => row.canView);
    const groupLookup = new Map();
    canOwnRows.forEach(row => {
      const keys = row.groupKeys.includes("all") || row.groups.includes("*")
        ? industryOptions.map(normalizeKey).filter(Boolean)
        : row.groupKeys;
      keys.forEach(key => {
        if (!key) return;
        const owners = groupLookup.get(key) || [];
        owners.push(row.name);
        groupLookup.set(key, owners);
      });
    });

    authorizedManagerRecords = rows;
    authorizedManagerCanOwnNames = uniqueSorted(canOwnRows.map(row => row.name));
    authorizedManagerCanViewNames = uniqueSorted(canViewRows.map(row => row.name));
    authorizedManagerGroupLookup = new Map(
      Array.from(groupLookup.entries()).map(([key, names]) => [key, uniqueSorted(names)])
    );
    authorizedManagersMetadata = {
      source: options.fromCache ? "cache" : "file-cabinet",
      label: options.label || (options.fromCache ? `Cached ${AUTHORIZED_MANAGERS_FILE_NAME}` : `File Cabinet ${AUTHORIZED_MANAGERS_FILE_NAME}`),
      rowCount: rows.length,
      loadedAt: options.loadedAt || Date.now(),
      schema: data.schema || "",
      generatedAt: data.generatedAt || "",
      canOwnCount: authorizedManagerCanOwnNames.length,
      canViewCount: authorizedManagerCanViewNames.length,
      stale: Boolean(options.stale),
      error: ""
    };
  }

  function emailLocalPartKeys(email) {
    const local = normalizeSpaces(email).split("@")[0] || "";
    if (!local) return [];
    const spaced = local.replace(/[._-]+/g, " ");
    const keys = new Set([normalizeKey(local), normalizeKey(spaced)]);
    const parts = spaced.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];
      keys.add(normalizeKey(`${first}${last}`));
      keys.add(normalizeKey(`${last}${first}`));
      keys.add(normalizeKey(`${first} ${last}`));
      keys.add(normalizeKey(`${last} ${first}`));
    }
    return [...keys].filter(Boolean);
  }

  function inferOracleEmailFromName(name) {
    const text = cleanPersonName(name);
    if (!text) return "";
    const commaName = text.match(/^([^,]+),\s*(.+)$/);
    let first = "";
    let middle = "";
    let last = "";
    if (commaName) {
      last = normalizeSpaces(commaName[1]).split(/\s+/)[0] || "";
      const givenParts = normalizeSpaces(commaName[2]).split(/\s+/).filter(Boolean);
      first = givenParts[0] || "";
      middle = givenParts.length === 2 && /^[A-Za-z]\.?$/.test(givenParts[1]) ? givenParts[1] : "";
    } else {
      const parts = text.split(/\s+/).filter(Boolean);
      first = parts[0] || "";
      last = parts.length > 1 ? parts[parts.length - 1] : "";
      middle = parts.length === 3 && /^[A-Za-z]\.?$/.test(parts[1]) ? parts[1] : "";
    }
    const cleanFirst = first.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanMiddle = middle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = last.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanFirst && cleanMiddle && cleanLast) return `${cleanFirst}.${cleanMiddle}.${cleanLast}@oracle.com`;
    return cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}@oracle.com` : "";
  }

  function authorizedManagerForName(name) {
    const targetKeys = personNameKeys(name);
    if (!targetKeys.length) return null;
    const targetKeySet = new Set(targetKeys);
    return authorizedManagerRecords.find(record => (
      personNameKeys(record.name)
        .concat(record.nameKey)
        .concat(emailLocalPartKeys(record.email))
        .filter(Boolean)
        .some(key => targetKeySet.has(key))
    )) || null;
  }

  function authorizedManagerEmailForName(name) {
    const manager = authorizedManagerForName(name);
    return normalizeSpaces(manager && manager.email || inferOracleEmailFromName(name) || cleanPersonName(name));
  }

  function readCachedAuthorizedManagers() {
    try {
      const cached = JSON.parse(localStorage.getItem(AUTHORIZED_MANAGERS_CACHE_KEY) || "null");
      if (!cached || !cached.data || !cached.loadedAt) return null;
      return cached;
    } catch (error) {
      console.warn("IQUEUE could not read cached authorized managers JSON", error);
      return null;
    }
  }

  function writeCachedAuthorizedManagers(data) {
    try {
      localStorage.setItem(AUTHORIZED_MANAGERS_CACHE_KEY, JSON.stringify({
        loadedAt: Date.now(),
        data
      }));
    } catch (error) {
      console.warn("IQUEUE could not cache authorized managers JSON", error);
    }
  }

  function applyCachedAuthorizedManagers() {
    const cached = readCachedAuthorizedManagers();
    if (!cached) return false;
    const stale = Date.now() - cached.loadedAt > AUTHORIZED_MANAGERS_REFRESH_INTERVAL_MS;
    try {
      applyAuthorizedManagersData(cached.data, {
        fromCache: true,
        loadedAt: cached.loadedAt,
        stale
      });
      return true;
    } catch (error) {
      console.warn("IQUEUE ignored invalid cached authorized managers JSON", error);
      return false;
    }
  }

  function shouldFetchAuthorizedManagers() {
    const cached = readCachedAuthorizedManagers();
    if (!cached) return true;
    return Date.now() - cached.loadedAt > AUTHORIZED_MANAGERS_REFRESH_INTERVAL_MS;
  }

  function loadAuthorizedManagersWithSuiteScript() {
    const pageWindow = getPageWindow();
    if (!pageWindow || typeof pageWindow.require !== "function") {
      return Promise.reject(new Error("NetSuite require was not available."));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => value => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      timer = setTimeout(finish(reject), 12000, new Error("Timed out loading authorized managers JSON."));

      try {
        pageWindow.require(["N/file", "N/search"], (file, search) => {
          try {
            let fileId = AUTHORIZED_MANAGERS_FILE_ID;
            if (!fileId) {
              for (const fileName of AUTHORIZED_MANAGERS_FILE_NAMES) {
                const results = search.create({
                  type: "file",
                  filters: [["name", "is", fileName]],
                  columns: ["internalid", "name"]
                }).run().getRange({ start: 0, end: 1 }) || [];
                const result = results[0];
                fileId = result && (result.getValue({ name: "internalid" }) || result.id);
                if (fileId) break;
              }
            }
            if (!fileId) throw new Error(`${AUTHORIZED_MANAGERS_FILE_NAMES.join(" or ")} was not found in the NetSuite File Cabinet.`);
            const mappingFile = file.load({ id: fileId });
            finish(resolve)(parseMappingJsonText(mappingFile.getContents()));
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function fetchAuthorizedManagersData() {
    const errors = [];

    for (const url of authorizedManagersUrlCandidates()) {
      try {
        const data = await fetchMappingJsonFromUrl(url, new Set(), AUTHORIZED_MANAGERS_FILE_NAMES, AUTHORIZED_MANAGERS_FILE_ID);
        if (!parseAuthorizedManagerRows(data).length) {
          throw new Error(`${url}: Authorized Managers JSON did not produce any usable rows.`);
        }
        return {
          data,
          label: mappingJsonSourceLabel(url, AUTHORIZED_MANAGERS_FILE_NAME)
        };
      } catch (error) {
        errors.push(error.message || String(error));
      }
    }

    for (const searchUrl of AUTHORIZED_MANAGERS_SEARCH_URLS) {
      try {
        const data = await fetchAuthorizedManagersFromSavedSearch(searchUrl);
        return {
          data,
          label: `Saved Search ${AUTHORIZED_MANAGERS_SEARCH_ID}`
        };
      } catch (error) {
        errors.push(`Saved Search ${AUTHORIZED_MANAGERS_SEARCH_ID}: ${error.message || error}`);
      }
    }

    try {
      const data = await loadAuthorizedManagersWithSuiteScript();
      return {
        data,
        label: `N/file ${AUTHORIZED_MANAGERS_FILE_NAME}`
      };
    } catch (error) {
      errors.push(`N/file: ${error.message || error}`);
    }

    throw new Error(errors.join(" | "));
  }

  async function loadAuthorizedManagers(options = {}) {
    const force = Boolean(options.force);
    if (!force && !shouldFetchAuthorizedManagers()) return;

    try {
      const result = await fetchAuthorizedManagersData();
      const data = result.data || result;
      writeCachedAuthorizedManagers(data);
      applyAuthorizedManagersData(data, {
        fromCache: false,
        loadedAt: Date.now(),
        label: result.label
      });
      updateProductsScmControls();
      updateFilterSummary();
      renderResults();
    } catch (error) {
      console.warn("IQUEUE could not load authorized managers JSON", error);
      authorizedManagersMetadata = {
        ...authorizedManagersMetadata,
        error: error.message || "Authorized managers load failed"
      };
      updateProductsScmControls();
      renderResults();
    }
  }

  function normalizeState(value) {
    const raw = normalizeSpaces(value);
    if (!raw) return "";

    const exact = raw.toUpperCase();
    if (knownStateCodes && knownStateCodes.has(exact)) return exact;
    if (exact === "SINGAPORE") return "Singapore";

    const lower = raw.toLowerCase();
    if (STATE_NAME_TO_CODE[lower]) return STATE_NAME_TO_CODE[lower];

    const locationCodeMatch = raw.match(/(?:^|[\s,|:])([A-Za-z]{2})(?=(?:\s+\d{5}(?:-\d{4})?)?\s*(?:$|[,|;)]))/);
    if (locationCodeMatch && knownStateCodes.has(locationCodeMatch[1].toUpperCase())) {
      return locationCodeMatch[1].toUpperCase();
    }

    const cleaned = lower.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (STATE_NAME_TO_CODE[cleaned]) return STATE_NAME_TO_CODE[cleaned];

    const nameMatch = Object.keys(STATE_NAME_TO_CODE)
      .sort((a, b) => b.length - a.length)
      .find(name => cleaned.includes(name));
    return nameMatch ? STATE_NAME_TO_CODE[nameMatch] : raw;
  }

  function headerMatches(header, key) {
    const normalized = normalizeHeader(header);
    const aliases = headerAliases[key] || [];
    if (aliases.includes(normalized)) return true;

    if (key === "state") {
      return normalized.includes("stateprovince")
        || normalized.includes("province")
        || (normalized.includes("state") && /opp|opportunity|company|customer|account/.test(normalized));
    }

    if (key === "industryFamily") {
      if (normalized.includes("gtm")) return false;
      return normalized.includes("industryfamily")
        || normalized.includes("fy27industryfamily")
        || normalized.includes("scindustrygroup")
        || normalized.includes("scindustryfamily")
        || normalized.includes("industryvertical")
        || normalized.includes("industrygroup")
        || normalized === "industry";
    }

    if (key === "gtmIndustry") {
      return (normalized.includes("gtm") && normalized.includes("industry") && !normalized.includes("subgroup") && !normalized.includes("subindustry"))
        || normalized === "fy27industry";
    }

    if (key === "gtmIndustrySubgroup") {
      return (normalized.includes("gtm") && normalized.includes("industry") && (normalized.includes("subgroup") || normalized.includes("subindustry") || normalized.includes("indusrysubgroup")))
        || normalized === "fy27industrysubgroup"
        || normalized === "fy27gtmindusrysubgroup";
    }

    if (key === "industrySubgroup") {
      return normalized.includes("industrysubgroup")
        || normalized.includes("industryandsubgroup")
        || normalized.includes("subindustry")
        || normalized === "subgroup";
    }

    if (key === "salesRegion") {
      return normalized.includes("salesregion")
        || normalized.includes("opportunityregion")
        || normalized === "region";
    }

    if (key === "salesDirector") {
      return normalized.includes("regionaldirector")
        || normalized.includes("regionaldir")
        || normalized.includes("salesdirector")
        || normalized.includes("salesdir")
        || normalized.includes("salesrepmanager")
        || normalized.includes("salesmanager");
    }

    if (key === "regionalVp") {
      return normalized.includes("regionalvp")
        || normalized === "rvp"
        || normalized.includes("regionalvicepresident");
    }

    if (key === "industryLeader") {
      return normalized.includes("industryleader")
        || normalized.includes("industryavp")
        || normalized === "avp";
    }

    if (key === "scrAge") {
      return normalized === "scrage"
        || normalized.includes("screquestage")
        || normalized.includes("requestage");
    }

    if (key === "amoDirect") {
      return normalized.includes("amodirect")
        || normalized.includes("directamo")
        || normalized.includes("salesmotion")
        || normalized.includes("requesttype")
        || normalized.includes("requestsource");
    }

    if (key === "name") {
      return normalized.includes("screquest")
        || normalized === "scr"
        || normalized === "name"
        || normalized === "number"
        || normalized === "documentnumber";
    }

    if (key === "scrDisplayId") {
      return normalized === "scrid"
        || normalized === "screquestid"
        || normalized === "screqid"
        || normalized === "requestid";
    }

    if (key === "internalId") {
      return normalized === "id"
        || normalized.includes("internalid")
        || normalized === "recordid";
    }

    if (key === "hashtags") {
      return normalized.includes("hashtag")
        || normalized === "tags";
    }

    if (key === "deliverableRaw") {
      return normalized.includes("deliverable") && normalized.includes("raw");
    }

    if (key === "requestDetailsRaw") {
      return normalized.includes("requestdetails") && normalized.includes("raw");
    }

    if (key === "dateNeededRaw") {
      return normalized.includes("raw")
        && (
          normalized.includes("dateneeded")
          || normalized.includes("datescneeded")
          || normalized.includes("customermeetingdate")
        );
    }

    return false;
  }

  function findHeaderIndex(headers, key) {
    return headers.findIndex(header => headerMatches(header, key));
  }

  function getByIndex(cells, indexes, key) {
    const index = indexes[key];
    return index >= 0 ? normalizeSpaces(cells[index]) : "";
  }

  function cellText(cell) {
    return normalizeSpaces(cell ? cell.textContent : "");
  }

  function stripNetSuiteMoreMarker(value) {
    return normalizeMultiline(value)
      .replace(/\s*\(\s*more\.{3}\s*\)\s*/gi, " ")
      .replace(/\s*\bmore\.{3}\s*$/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function stripNetSuiteMoreMarkerHtml(value) {
    return String(value || "")
      .replace(/\s*\(\s*more\.{3}\s*\)\s*/gi, " ")
      .replace(/\s*\bmore\.{3}\s*$/gi, "")
      .trim();
  }

  function sanitizeCellHtml(cell) {
    if (!cell || !cell.cloneNode) return "";

    const clone = cell.cloneNode(true);
    clone.querySelectorAll("script, style, iframe, object, embed, form, input, button, select, textarea").forEach(node => node.remove());
    clone.querySelectorAll("a").forEach(anchor => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
    clone.querySelectorAll("*").forEach(node => {
      Array.from(node.attributes).forEach(attribute => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || "";
        if (name.startsWith("on")) {
          node.removeAttribute(attribute.name);
        } else if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
          node.removeAttribute(attribute.name);
        } else if (name === "style" && /expression\s*\(|url\s*\(\s*javascript:/i.test(value)) {
          node.removeAttribute(attribute.name);
        }
      });
    });

    return stripNetSuiteMoreMarkerHtml(clone.innerHTML);
  }

  function cellTextCandidateScore(value) {
    const text = normalizeMultiline(value);
    if (!text) return -1;
    const cleaned = stripNetSuiteMoreMarker(text);
    let score = cleaned.length;
    if (/\(?\s*more\.{3}\s*\)?/i.test(text)) score -= 250;
    return score;
  }

  function cellTextCandidates(cell) {
    if (!cell) return [];

    const candidates = [
      typeof cell.innerText === "string" ? cell.innerText : "",
      cell.textContent || "",
      cell.getAttribute && cell.getAttribute("title"),
      cell.getAttribute && cell.getAttribute("aria-label")
    ];

    Array.from(cell.querySelectorAll("[title],[aria-label],[data-original-title],[data-tooltip],[data-ns-tooltip]")).forEach(node => {
      ["title", "aria-label", "data-original-title", "data-tooltip", "data-ns-tooltip"].forEach(attribute => {
        candidates.push(node.getAttribute(attribute));
      });
    });

    return candidates.map(stripNetSuiteMoreMarker).filter(Boolean);
  }

  function cellRawText(cell) {
    const candidates = cellTextCandidates(cell);
    candidates.sort((a, b) => cellTextCandidateScore(b) - cellTextCandidateScore(a));
    return candidates[0] || "";
  }

  function cellLinks(cell) {
    if (!cell || !cell.querySelectorAll) return [];

    return Array.from(cell.querySelectorAll("a[href]"))
      .map(anchor => ({
        href: anchor.getAttribute("href"),
        text: cellText(anchor)
      }))
      .filter(link => link.href && !/^javascript:/i.test(link.href))
      .map(link => ({
        href: new URL(link.href, window.location.origin).href,
        text: link.text
      }));
  }

  function rowCellInfos(row) {
    return Array.from(row.children)
      .filter(cell => /^(TD|TH)$/i.test(cell.tagName))
      .map(cell => ({
        text: cellText(cell),
        rawText: cellRawText(cell),
        rawHtml: sanitizeCellHtml(cell),
        links: cellLinks(cell)
      }));
  }

  function rowCells(row) {
    return rowCellInfos(row).map(cell => cell.text);
  }

  function scoreHeaderRow(cells) {
    if (cells.length < 3) return 0;

    const headers = cells.map(normalizeHeader);
    const hasAlias = key => headers.some(header => headerMatches(header, key));
    let score = 0;
    if (hasAlias("state")) score += 6;
    if (hasAlias("industryFamily")) score += 5;
    if (hasAlias("salesRegion")) score += 2;
    if (hasAlias("amoDirect")) score += 2;
    if (headers.some(header => /scr|screquest|request/.test(header))) score += 2;
    if (headers.some(header => /company|opportunity|opp/.test(header))) score += 1;
    if (cells.length >= 6) score += 1;
    return score;
  }

  function findResultTable(root = document) {
    const candidates = [];

    Array.from(root.querySelectorAll("table")).forEach(table => {
      const rows = Array.from(table.querySelectorAll("tr"));
      rows.forEach((row, rowIndex) => {
        const cells = rowCells(row);
        const score = scoreHeaderRow(cells);
        if (score) {
          const linkScore = rows.slice(rowIndex + 1, rowIndex + 12)
            .some(candidateRow => candidateRow.querySelector(`a[href*="custrecordentry.nl"][href*="rectype=${SCR_RECORD_TYPE}"]`))
            ? 3
            : 0;
          candidates.push({
            table,
            headerIndex: rowIndex,
            score: score + linkScore,
            columnCount: cells.length
          });
        }
      });
    });

    candidates.sort((a, b) => b.score - a.score || b.columnCount - a.columnCount);
    return candidates[0] || null;
  }

  function makeUniqueHeaders(headers) {
    const seen = new Map();
    return headers.map((header, index) => {
      const label = normalizeSpaces(header) || `Column ${index + 1}`;
      const count = seen.get(label) || 0;
      seen.set(label, count + 1);
      return count ? `${label} ${count + 1}` : label;
    });
  }

  function parsedUrl(value) {
    try {
      return new URL(value, window.location.origin);
    } catch (error) {
      return null;
    }
  }

  function isLaunchpadLink(link) {
    return /launchpad/i.test(`${link && link.href || ""} ${link && link.text || ""}`);
  }

  function isCustRecordEntryUrl(url) {
    return Boolean(url && /custrecordentry\.nl/i.test(url.pathname));
  }

  function isExactScrRecordLink(link) {
    const url = parsedUrl(link && link.href);
    return isCustRecordEntryUrl(url) && url.searchParams.get("rectype") === SCR_RECORD_TYPE && !isLaunchpadLink(link);
  }

  function isLikelyScrRecordLink(link) {
    const url = parsedUrl(link && link.href);
    if (!isCustRecordEntryUrl(url) || isLaunchpadLink(link)) return false;

    const rectype = url.searchParams.get("rectype");
    if (rectype && rectype !== SCR_RECORD_TYPE) return false;
    return /scr|sc\s*request|solution\s*consultant|direct|amo|#\d+/i.test(link.text || "");
  }

  function normalizeInternalIdValue(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    if (/^\d+$/.test(text)) return text;

    const labeled = text.match(/\b(?:id|internal\s*id|record\s*id)\s*:?\s*(\d+)\b/i);
    if (labeled) return labeled[1];

    return "";
  }

  function normalizeScrDisplayId(value) {
    let text = normalizeSpaces(value);
    if (!text) return "";

    const labeled = text.match(/\b(?:scr\s*)?(?:request\s*)?id\s*:?\s*#?\s*([a-z0-9][a-z0-9-]*)\b/i);
    if (labeled) return labeled[1];

    text = text
      .replace(/^scr\s*(?:request\s*)?(?:id)?\s*:?\s*/i, "")
      .replace(/^#\s*/, "")
      .trim();
    return text;
  }

  function formatScrTitlePrefix(value) {
    const id = normalizeScrDisplayId(value);
    return id ? `SCR # ${id}` : "";
  }

  function getInternalIdValue(cells, indexes, allFields) {
    const indexed = normalizeInternalIdValue(getByIndex(cells, indexes, "internalId"));
    if (indexed) return indexed;

    for (const field of allFields) {
      if (!headerMatches(field.label, "internalId")) continue;
      const value = normalizeInternalIdValue(field.rawValue || field.value);
      if (value) return value;
    }

    return "";
  }

  function getScrLink(row) {
    const anchors = Array.from(row.querySelectorAll("a[href]"))
      .map(anchor => ({
        href: anchor.getAttribute("href"),
        text: cellText(anchor)
      }))
      .filter(link => link.href && !/^javascript:/i.test(link.href));

    return anchors.find(isExactScrRecordLink) || anchors.find(isLikelyScrRecordLink) || null;
  }

  function makeEditUrl(baseUrl, internalId) {
    let url;
    const cleanInternalId = normalizeInternalIdValue(internalId);
    if (cleanInternalId) {
      url = new URL(`/app/common/custom/custrecordentry.nl?rectype=${SCR_RECORD_TYPE}&id=${encodeURIComponent(cleanInternalId)}`, window.location.origin);
    } else if (baseUrl) {
      url = new URL(baseUrl, window.location.origin);
      if (!isCustRecordEntryUrl(url) || url.searchParams.get("rectype") && url.searchParams.get("rectype") !== SCR_RECORD_TYPE) {
        return "";
      }
    } else {
      return "";
    }

    if (/custrecordentry\.nl/i.test(url.pathname)) {
      if (!url.searchParams.get("rectype")) url.searchParams.set("rectype", SCR_RECORD_TYPE);
      url.searchParams.set("e", "T");
    }
    return url.href;
  }

  function recordIdFromUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url, window.location.origin);
      if (!isCustRecordEntryUrl(parsed)) return "";
      const rectype = parsed.searchParams.get("rectype");
      if (rectype && rectype !== SCR_RECORD_TYPE) return "";
      return parsed.searchParams.get("id") || parsed.searchParams.get("recid") || "";
    } catch (error) {
      return "";
    }
  }

  function rowHasScrRecordIdentity(row, internalId, link, title, fields = []) {
    if (link && isExactScrRecordLink(link)) return true;
    if (internalId && normalizeInternalIdValue(internalId)) {
      const cleanTitle = normalizeSpaces(title);
      if (!cleanTitle || /^SCR\s+\d+$/i.test(cleanTitle)) return false;
      return fields.some(field => {
        const label = normalizeHeader(field.label);
        const value = normalizeSpaces(field.value || field.rawValue);
        if (!value) return false;
        return headerMatches(field.label, "amoDirect")
          || headerMatches(field.label, "requestDetailsRaw")
          || headerMatches(field.label, "dateNeededRaw")
          || /submitted|company|customer|opportunity|salesrep|assignedto|requestdetails|screquestdetails/i.test(label);
      });
    }
    return Boolean(link && isLikelyScrRecordLink(link) && normalizeSpaces(title));
  }

  function lookupOverride(industryFamily, state, amoDirect) {
    const industryKeys = mappingIndustryLookupKeys(industryFamily);
    const stateKey = normalizeState(state);
    const amoDirectKey = normalizeKey(normalizeAmoDirect(amoDirect));
    if (!industryKeys.length || !stateKey) return null;
    if (amoDirectKey) {
      for (const industryKey of industryKeys) {
        const mapped = mappingByIndustryModeState.get(`${industryKey}|${amoDirectKey}|${stateKey}`);
        if (mapped) return mapped;
      }
    }
    for (const industryKey of industryKeys) {
      const mapped = mappingByIndustryState.get(`${industryKey}|${stateKey}`);
      if (mapped) return mapped;
    }
    return null;
  }

  function mappingIndustryLookupKeys(industryFamily) {
    const keys = [normalizeKey(industryFamily)].filter(Boolean);
    const canonical = findCanonicalIndustry(industryFamily);
    if (canonical) keys.push(normalizeKey(canonical));
    return [...new Set(keys)];
  }

  function findCanonicalIndustry(value) {
    const key = normalizeKey(value);
    if (!key) return "";
    const alias = canonicalScIndustryGroupAlias(value);
    if (alias) return alias;
    if (industryByKey.has(key)) return industryByKey.get(key);

    const match = industryOptions.find(option => {
      const optionKey = normalizeKey(option);
      return key.includes(optionKey) || optionKey.includes(key);
    });
    return match || "";
  }

  function lookupGtmScIndustryGroup(gtmIndustry, gtmIndustrySubgroup) {
    const gtmIndustryKey = normalizeKey(gtmIndustry);
    const gtmIndustrySubgroupKey = normalizeKey(gtmIndustrySubgroup);
    const fallbackKey = `${gtmIndustryKey}|${gtmIndustrySubgroupKey}`;

    if (gtmIndustryKey && gtmIndustrySubgroupKey) {
      const exact = gtmIndustryGroupByIndustrySubgroup.get(`${gtmIndustryKey}|${gtmIndustrySubgroupKey}`);
      if (exact) return exact;
      if (GTM_INDUSTRY_GROUP_FALLBACKS.has(fallbackKey)) return GTM_INDUSTRY_GROUP_FALLBACKS.get(fallbackKey);
    }
    if (gtmIndustrySubgroupKey) {
      const subgroupMatch = gtmIndustryGroupBySubgroup.get(gtmIndustrySubgroupKey);
      if (subgroupMatch) return subgroupMatch;
      if (GTM_INDUSTRY_GROUP_FALLBACKS.has(gtmIndustrySubgroupKey)) return GTM_INDUSTRY_GROUP_FALLBACKS.get(gtmIndustrySubgroupKey);
    }
    if (gtmIndustryKey) {
      const industryMatch = gtmIndustryGroupByIndustry.get(gtmIndustryKey);
      if (industryMatch) return industryMatch;
      if (GTM_INDUSTRY_GROUP_FALLBACKS.has(gtmIndustryKey)) return GTM_INDUSTRY_GROUP_FALLBACKS.get(gtmIndustryKey);
    }
    return "";
  }

  function inferIndustryFamily(explicitValue, fields) {
    const explicit = findCanonicalIndustry(explicitValue);
    if (explicit) return explicit;

    const likelyFields = fields.filter(field => (
      /industry|vertical|family|group/i.test(field.label)
      && !/gtm|subgroup|sub\s*industry/i.test(field.label)
    ));
    const match = likelyFields.concat(fields).map(field => (
      findCanonicalIndustry(field.value) || findCanonicalIndustry(`${field.label} ${field.value}`)
    )).find(Boolean);

    return match || normalizeSpaces(explicitValue);
  }

  function inferStateProvince(explicitValue, fields) {
    const explicit = normalizeSpaces(explicitValue);
    const explicitState = normalizeState(explicit);
    if (explicitState && knownStateCodes.has(explicitState)) return explicitState;

    const labeledState = extractFromFields(fields, labeledValuePatterns.billingState);
    const labeledStateKey = normalizeState(labeledState);
    if (labeledStateKey && knownStateCodes.has(labeledStateKey)) return labeledStateKey;

    const labeledAddress = extractFromFields(fields, labeledValuePatterns.billingAddress);
    const labeledAddressStateKey = normalizeState(labeledAddress);
    if (labeledAddressStateKey && knownStateCodes.has(labeledAddressStateKey)) return labeledAddressStateKey;

    const likelyFields = fields.filter(field => /state|province|territory|billing.*city/i.test(field.label));
    const match = likelyFields.map(field => ({
      value: field.value,
      stateKey: normalizeState(field.value)
    })).find(item => item.stateKey && knownStateCodes.has(item.stateKey));

    return match ? match.stateKey : explicit;
  }

  function extractAmoDirectFromText(value, options = {}) {
    const text = normalizeSpaces(value);
    if (!text) return "";

    if (options.allowTechCoe !== false
      && (/\btechnology\s*coe\b|\btech\s*coe\b|\btcoe\b/i.test(text)
      || /\brequest\s*type\s*:\s*technology\s*coe\b/i.test(text))) {
      return TECH_COE_REQUEST_TYPE;
    }

    if (/\bnspb\b|\bnet\s*suite\s*planning\s*(?:and|&)?\s*budgeting\b/i.test(text)) {
      return NSPB_REQUEST_TYPE;
    }

    if (/\bsolution\s+consultant\s*-\s*amo\b/i.test(text)
      || /\btype\s*:\s*solution\s+consultant\s*-\s*amo\b/i.test(text)
      || /\bamo\s+sc\s+request\b/i.test(text)) {
      return "AMO";
    }

    if (/\bsolution\s+consultant\s*-\s*direct\b/i.test(text)
      || /\btype\s*:\s*solution\s+consultant\s*-\s*direct\b/i.test(text)
      || /\bdirect\s+sc\s+request\b/i.test(text)
      || /DIRDirect\s+SC\s+Request/i.test(text)) {
      return "Direct";
    }

    if (options.allowLoose) return normalizeAmoDirect(text);
    return "";
  }

  function inferAmoDirect(explicitValue, fields) {
    const explicit = extractAmoDirectFromText(explicitValue, { allowLoose: true });
    if (isKnownRequestType(explicit)) return explicit;

    const likelyFields = fields.filter(field => /amo|direct|nspb|technology\s*coe|tech\s*coe|\btcoe\b|request\s*type|sales motion|sales channel/i.test(field.label));
    for (const field of likelyFields) {
      if (fieldHasAffirmativeRequestTypeValue(field)) {
        const labelParsed = extractAmoDirectFromText(field.label, { allowLoose: true });
        if (isKnownRequestType(labelParsed)) return labelParsed;
      }

      const parsed = extractAmoDirectFromText(`${field.value} ${field.rawValue}`, { allowLoose: true });
      if (isKnownRequestType(parsed)) return parsed;
    }

    for (const field of fields) {
      const parsed = extractAmoDirectFromText(field.value, { allowTechCoe: false });
      if (isKnownRequestType(parsed)) return parsed;
    }

    return "";
  }

  function parseSearchResults(root = document, idPrefix = "scr-row") {
    const resultTable = findResultTable(root);
    if (!resultTable) return [];

    const rows = Array.from(resultTable.table.querySelectorAll("tr"));
    const headers = makeUniqueHeaders(rowCells(rows[resultTable.headerIndex]));
    const normalizedHeaders = headers.map(normalizeHeader);
    const indexes = Object.fromEntries(
      Object.keys(headerAliases).map(key => [key, findHeaderIndex(normalizedHeaders, key)])
    );

    return rows.slice(resultTable.headerIndex + 1).map((row, rowIndex) => {
      const cellInfos = rowCellInfos(row);
      const cells = cellInfos.map(cell => cell.text);
      if (cells.length < 2 || cells.every(cell => !cell)) return null;
      if (/no search results/i.test(cells.join(" "))) return null;

      const paddedCells = headers.map((_, index) => cells[index] || "");
      const allFields = headers.map((header, index) => ({
        label: header,
        value: normalizeSpaces(paddedCells[index]),
        rawValue: cellInfos[index] ? cellInfos[index].rawText : "",
        rawHtml: cellInfos[index] ? cellInfos[index].rawHtml : "",
        links: cellInfos[index] ? cellInfos[index].links : [],
        index
      }));
      const fields = allFields.filter(field => field.value);

      if (!fields.length) return null;

      const staffingNotesField = getStaffingNotesField(allFields);
      const staffingNotes = getStaffingNotesValue(staffingNotesField);
      const hashtagsField = getHashtagsField(allFields);
      const hashtags = getHashtagsValue(hashtagsField);
      const assignedTo = getAssignedToValue(fields);
      const state = inferStateProvince(getByIndex(paddedCells, indexes, "state"), fields);
      const fallbackIndustrySubgroup = getConciseFieldValue(fields, [
        /industry.*subgroup/, /industrysubgroup/, /industry.*sub\s*industry/, /industry.*vertical/
      ], [], labeledValuePatterns.subIndustry);
      const gtmIndustry = getByIndex(paddedCells, indexes, "gtmIndustry") || getConciseFieldValue(fields, [
        /fy27.*gtm.*industry$/, /fy27gtmindustry$/, /gtm.*industry$/
      ], [/subgroup/, /sub\s*industry/]);
      const gtmIndustrySubgroup = getByIndex(paddedCells, indexes, "gtmIndustrySubgroup") || getConciseFieldValue(fields, [
        /fy27.*gtm.*industry.*subgroup/, /fy27.*industry.*subgroup/, /gtm.*industry.*subgroup/
      ], [], labeledValuePatterns.subIndustry) || fallbackIndustrySubgroup;
      const industrySubgroup = gtmIndustrySubgroup;
      const gtmIndustryFamily = lookupGtmScIndustryGroup(gtmIndustry, gtmIndustrySubgroup);
      const industryFamily = findCanonicalIndustry(gtmIndustryFamily)
        || gtmIndustryFamily
        || inferIndustryFamily(getByIndex(paddedCells, indexes, "industryFamily"), fields);
      const originalSalesRegion = inferSalesRegion(getByIndex(paddedCells, indexes, "salesRegion"), fields);
      const salesTier = getConciseFieldValue(fields, [
        /sales.*tier/, /\btier\b/
      ], [], labeledValuePatterns.salesTier);
      const salesDirector = getByIndex(paddedCells, indexes, "salesDirector") || getConciseFieldValue(fields, [
        /regional.*director/, /regionaldirector/, /regional.*dir\b/, /regionaldir\b/, /sales.*director/, /salesdirector/, /sales.*dir\b/, /salesdir\b/, /sales.*rep.*manager/, /salesrepmanager/, /sales.*manager/
      ], [], labeledValuePatterns.salesDirector);
      const regionalVp = getByIndex(paddedCells, indexes, "regionalVp") || getConciseFieldValue(fields, [
        /regional.*vp/, /regionalvp/, /\brvp\b/, /regional.*vice.*president/
      ], [], labeledValuePatterns.regionalVp);
      const industryLeader = getByIndex(paddedCells, indexes, "industryLeader") || getConciseFieldValue(fields, [
        /industry.*leader/, /industryleader/, /industry.*avp/
      ], [], labeledValuePatterns.industryLeader);
      const crossVertical = getConciseFieldValue(fields, [
        /cross.*vertical/, /crossvertical/, /cross.*vert/
      ], [], labeledValuePatterns.crossVertical);
      const scrAge = getByIndex(paddedCells, indexes, "scrAge") || getConciseFieldValue(fields, [
        /scr.*age/, /request.*age/
      ], [], labeledValuePatterns.scrAge);
      const salesVertical = getConciseFieldValue(fields, [
        /sales.*vertical/, /\bvertical\b/
      ], [/cross/], labeledValuePatterns.salesVertical);
      const submittedDate = getSubmittedDateValue(fields);
      const amoDirect = inferAmoDirect(getByIndex(paddedCells, indexes, "amoDirect"), fields);
      const override = lookupOverride(industryFamily, state, amoDirect);
      const link = getScrLink(row);
      const scrDisplayId = normalizeScrDisplayId(getByIndex(paddedCells, indexes, "scrDisplayId"));
      const internalId = getInternalIdValue(paddedCells, indexes, allFields) || recordIdFromUrl(link && link.href);
      const editUrl = makeEditUrl(link && link.href, internalId);
      const title = getByIndex(paddedCells, indexes, "name") || (link && link.text) || `SCR ${rowIndex + 1}`;
      if (!rowHasScrRecordIdentity(row, internalId, link, title, fields)) return null;
      const allTextParts = fields.map(field => `${field.label} ${field.value}`)
        .concat([
          industryFamily,
          industrySubgroup,
          gtmIndustry,
          gtmIndustrySubgroup,
          state,
          originalSalesRegion,
          override ? override.salesRegion : "",
          override ? override.staffingRegion : "",
          salesTier,
          salesDirector,
          regionalVp,
          industryLeader,
          crossVertical,
          scrAge,
          submittedDate,
          salesVertical,
          amoDirect,
          scrDisplayId,
          hashtags,
          staffingNotes,
          assignedTo
        ]);
      const allText = allTextParts.join(" ").toLowerCase();
      const allKeyText = normalizeKey(allTextParts.join(" "));

      return {
        id: `${idPrefix}-${rowIndex}`,
        title,
        scrDisplayId,
        fields,
        allFields,
        state,
        stateKey: normalizeState(state),
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        industrySubgroup,
        industrySubgroupKey: normalizeKey(industrySubgroup),
        gtmIndustry,
        gtmIndustryKey: normalizeKey(gtmIndustry),
        gtmIndustrySubgroup,
        gtmIndustrySubgroupKey: normalizeKey(gtmIndustrySubgroup),
        originalSalesRegion,
        salesTier,
        salesDirector,
        regionalVp,
        industryLeader,
        crossVertical,
        scrAge,
        submittedDate,
        salesVertical,
        mappedSalesRegion: override ? override.salesRegion : "",
        staffingRegion: override ? override.staffingRegion : "",
        mappingFound: Boolean(override),
        amoDirect,
        hashtags,
        staffingNotes,
        assignedTo,
        assignedToKey: normalizeKey(assignedTo),
        internalId: internalId || recordIdFromUrl(editUrl),
        editUrl,
        allText,
        allKeyText
      };
    }).filter(Boolean);
  }

  function optionHtml(values, emptyLabel, labelFormatter = value => value) {
    return `<option value="">${escapeHtml(emptyLabel)}</option>${values.map(value => (
      `<option value="${escapeHtml(value)}">${escapeHtml(labelFormatter(value))}</option>`
    )).join("")}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function closestElement(target, selector) {
    const element = target && target.nodeType === 1 ? target : target && target.parentElement;
    return element && typeof element.closest === "function" ? element.closest(selector) : null;
  }

  function escapeMultiline(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function getIndustryGroupBranding(value) {
    const key = normalizeKey(value);
    if (!key) return null;
    if (key === normalizeKey(UNMAPPED_FILTER_LABEL)) {
      return {
        name: UNMAPPED_FILTER_LABEL,
        emoji: "❔",
        color: REDWOOD_COLORS.slate100,
        soft: REDWOOD_COLORS.neutral30
      };
    }
    return INDUSTRY_GROUP_BRANDING_BY_KEY.get(key) || null;
  }

  function getGtmSubgroupEmoji(value) {
    return GTM_SUBGROUP_EMOJI_BY_KEY.get(normalizeKey(value)) || "";
  }

  function industryOptionLabel(value) {
    const branding = getIndustryGroupBranding(value);
    return branding && branding.emoji ? `${branding.emoji} ${value}` : value;
  }

  function gtmSubgroupOptionLabel(value) {
    const emoji = getGtmSubgroupEmoji(value);
    return emoji ? `${emoji} ${value}` : value;
  }

  function renderBrandBadge(value, options = {}) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const emoji = options.emoji || "";
    const color = options.color || REDWOOD_COLORS.slate100;
    const soft = options.soft || "#ffffff";
    const className = options.className ? ` ${options.className}` : "";
    const style = `--badge-color: ${escapeHtml(color)}; --badge-bg: ${escapeHtml(soft)};`;
    return `
      <span class="scr-helper-brand-badge${className}" style="${style}">
        ${emoji ? `<span class="scr-helper-brand-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>` : ""}
        <span>${escapeHtml(text)}</span>
      </span>
    `;
  }

  function renderIndustryGroupBadge(value) {
    const text = normalizeSpaces(value);
    const branding = getIndustryGroupBranding(text);
    if (!branding) return text ? escapeHtml(text) : "";
    return renderBrandBadge(text, {
      emoji: branding.emoji,
      color: branding.color,
      soft: branding.soft,
      className: "is-industry-group"
    });
  }

  function renderGtmSubgroupBadge(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    return renderBrandBadge(text, {
      emoji: getGtmSubgroupEmoji(text),
      color: REDWOOD_COLORS.slate100,
      soft: "#ffffff",
      className: "is-gtm-subgroup"
    });
  }

  function renderGtmIndustryValue(value) {
    const text = normalizeSpaces(value);
    return text ? escapeHtml(text) : "";
  }

  function isTigerEnterpriseValue(value) {
    const text = normalizeSpaces(value);
    if (!text) return false;
    return /\b(?:tiger|enterprise)\b/i.test(text);
  }

  function isTigerEnterpriseSalesTier(value) {
    return isTigerEnterpriseValue(value);
  }

  function rowTigerEnterpriseValues(row) {
    const fields = row && row.fields || [];
    const salesTier = row && row.salesTier || getConciseFieldValue(fields, [
      /sales.*tier/, /\btier\b/
    ], [], labeledValuePatterns.salesTier);
    const salesVertical = row && row.salesVertical || getConciseFieldValue(fields, [
      /sales.*vertical/, /\bvertical\b/
    ], [/cross/], labeledValuePatterns.salesVertical);

    return { salesTier, salesVertical };
  }

  function rowIsTigerEnterpriseOpp(row) {
    const values = rowTigerEnterpriseValues(row);
    return isTigerEnterpriseValue(values.salesVertical) || isTigerEnterpriseValue(values.salesTier);
  }

  function renderTigerEnterpriseBadge(value) {
    if (!isTigerEnterpriseValue(value)) return "";
    const label = /\benterprise\b/i.test(value) ? "Enterprise" : "Tiger";
    return renderBrandBadge(label, {
      emoji: "🟪",
      color: REDWOOD_COLORS.tigerPurple,
      soft: REDWOOD_COLORS.tigerPurpleSoft,
      className: "is-tiger-enterprise"
    });
  }

  function htmlToPlainText(html) {
    if (!html) return "";
    const container = document.createElement("div");
    container.innerHTML = html;
    return normalizeMultiline(container.innerText || container.textContent || "");
  }

  function fieldLabelText(field) {
    return `${String(field.label || "").toLowerCase()} ${normalizeKey(field.label)}`;
  }

  function matchesAny(text, patterns) {
    return patterns.some(pattern => pattern.test(text));
  }

  function fieldMatchesLabel(field, patterns, excludedPatterns = []) {
    const text = fieldLabelText(field);
    return matchesAny(text, patterns) && !matchesAny(text, excludedPatterns);
  }

  function findField(fields, patterns, excludedPatterns = []) {
    return fields.find(field => fieldMatchesLabel(field, patterns, excludedPatterns)) || null;
  }

  function findFieldValue(fields, patterns, excludedPatterns = []) {
    const field = findField(fields, patterns, excludedPatterns);
    return field ? field.value : "";
  }

  function firstFieldLink(field, urlPattern) {
    if (!field || !field.links || !field.links.length) return null;
    if (!urlPattern) return field.links[0];
    return field.links.find(link => urlPattern.test(link.href)) || null;
  }

  function fieldLinkHtml(field, fallbackValue, urlPattern) {
    const value = cleanDisplayValue(fallbackValue || field && field.value);
    const link = firstFieldLink(field, urlPattern);
    if (link) {
      return `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value || cleanDisplayValue(link.text) || "Open record")}</a>`;
    }
    return value ? escapeHtml(value) : "";
  }

  function urlFromValue(value) {
    const text = normalizeSpaces(value);
    if (!text || /^-?n\/?a-?$/i.test(text)) return "";
    const absolute = text.match(/https?:\/\/[^\s<>"']+/i);
    if (absolute) return absolute[0].replace(/[),.;]+$/g, "");
    const domain = text.match(/\b(?:www\.)?[\w.-]+\.[a-z]{2,}(?:\/[^\s<>"']*)?/i);
    if (domain) return `https://${domain[0].replace(/[),.;]+$/g, "")}`;
    return "";
  }

  function externalLinkHtml(field, fallbackLabel) {
    const link = firstFieldLink(field, /^https?:\/\//i);
    const value = normalizeSpaces(field && field.value);
    const href = link ? link.href : urlFromValue(value);
    if (!href) return value ? escapeHtml(value) : "";
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fallbackLabel || value || link && link.text || href)}</a>`;
  }

  function normalizeYesNo(value, defaultValue = "") {
    const text = normalizeSpaces(value);
    if (!text) return defaultValue;
    if (/^(t|true|yes|y|checked|1)$/i.test(text)) return "Yes";
    if (/^(f|false|no|n|unchecked|0)$/i.test(text)) return "No";
    return text;
  }

  const labeledValuePatterns = {
    assignedTo: [/Assigned\s*to/i, /Assignee/i, /Assigned\s*SC/i],
    crossVertical: [/Cross[\s-]*vert/i, /Cross[\s-]*vertical/i],
    industry: [/Industry/i],
    subIndustry: [/Sub[\s-]*Industry/i, /Industry\s*Subgroup/i, /Subgroup/i],
    naics: [/NAICS/i],
    expectedCloseDate: [/Exp\s*Close/i, /Expected\s*Close(?:\s*Date)?/i, /Close\s*Date/i],
    projectArr: [/Project\s*ARR/i, /ARR/i],
    salesRepYearsLive: [/Sales\s*Rep\s*Yrs\s*Live/i],
    salesRep: [/Sales\s*Rep/i],
    salesRepManager: [/Sales\s*(?:Mgr|Manager)/i],
    salesDirector: [/Regional\s*Director/i, /Regional\s*Dir/i, /Sales\s*Director/i, /Sales\s*Dir/i, /Sales\s*(?:Mgr|Manager)/i],
    regionalVp: [/Regional\s*VP/i, /RVP/i, /Regional\s*Vice\s*President/i],
    industryLeader: [/Industry\s*Leader/i, /Industry\s*Leader\/AVP/i, /Industry\s*AVP/i],
    oml8: [/OML8/i],
    oml7: [/OML7/i],
    salesTier: [/Sales\s*Tier/i],
    salesRegion: [/Sales\s*Region/i],
    salesVertical: [/Sales\s*Vertical/i],
    advisoryFirm: [/Advisory\s*Firm/i],
    submittedDate: [/Date\s*Submitted/i, /Submitted\s*Date/i, /Submitted/i, /Created\s*Date/i],
    scrAge: [/SCR\s*Age/i, /SC\s*Request\s*Age/i, /Request\s*Age/i],
    dateNeeded: [/Date\s*Needed/i, /Needed/i, /Anticipated\s*Customer\s*Meeting\s*Date/i, /Customer\s*Meeting\s*Date/i],
    requestDetails: [/Request\s*Details/i, /SC\s*Request\s*Details/i],
    flmNotes: [/FLM\s*Notes/i],
    requestingTravel: [/Requesting\s*Travel\s*\(Y\/N\)/i, /Requesting\s*Travel/i],
    companySize: [/Company\s*Size/i, /Employees/i, /Number\s*of\s*Employees/i],
    annualRevenue: [/Annual\s*Revenue/i, /Company\s*Revenue/i],
    website: [/Website/i, /Web\s*Address/i, /Company\s*Website/i],
    linkedin: [/LinkedIn/i, /Linked\s*In/i],
    billingAddress: [/Billing\s*Address/i, /Bill\s*Address/i],
    billingCity: [/Billing\s*City/i, /Bill\s*City/i],
    billingState: [/Billing\s*State/i, /Bill\s*State/i, /Billing\s*Province/i, /Bill\s*Province/i],
    corpStructure: [/Corp\/Subsidiary\s*Structure/i, /Corporate\s*Structure/i, /Subsidiary\s*Structure/i],
    productsServices: [/Products\/Services\s*They\s*Provide/i, /Products\s*Services/i],
    whyNow: [/Why\s*Now/i],
    currentSystems: [/Current\s*Systems/i],
    prospectRegion: [/Prospect\s*Region/i],
    leadSource: [/Lead\s*Source/i],
    leadFit: [/Lead\s*Fit/i],
    allianceInfo: [/Alliance/i, /Partner/i],
    staffingNotes: [/SCM\s*Staffing\s*notes/i, /SC\s*Manager\s*Notes/i, /Staffing\s*Notes/i],
    hashtags: [/Hashtags/i, /Hash\s*Tags/i, /Tags/i]
  };

  const labeledValueBoundaryPatterns = Object.values(labeledValuePatterns).flat();

  function findLabelMatch(text, patterns, startIndex = 0) {
    let best = null;
    patterns.forEach(pattern => {
      const regex = new RegExp(`${pattern.source}\\s*:`, "ig");
      regex.lastIndex = startIndex;
      const match = regex.exec(text);
      if (match && (!best || match.index < best.index)) {
        best = {
          index: match.index,
          end: match.index + match[0].length
        };
      }
    });
    return best;
  }

  function cleanExtractedValue(value) {
    let text = normalizeSpaces(value);
    text = text.replace(/\s*(↗️|🛠️|🚥|🚀).*$/u, "");
    text = text.replace(/\s*(Conversion|Skill Ratings|Availability Summary|Open Launchpad)\b.*$/i, "");
    text = text.replace(/^[\s:;,\-|]+|[\s:;,\-|]+$/g, "");
    return normalizeSpaces(text);
  }

  function extractLabeledValue(text, patterns) {
    const source = normalizeSpaces(text);
    if (!source) return "";

    const labelMatch = findLabelMatch(source, patterns);
    if (!labelMatch) return "";

    const nextBoundary = findLabelMatch(source, labeledValueBoundaryPatterns, labelMatch.end);
    const raw = source.slice(labelMatch.end, nextBoundary ? nextBoundary.index : source.length);
    return cleanExtractedValue(raw);
  }

  function looksLikeCompoundValue(value) {
    const text = normalizeSpaces(value);
    if (text.length > 120) return true;
    return Boolean(findLabelMatch(text, labeledValueBoundaryPatterns));
  }

  function cleanDisplayValue(value) {
    const text = cleanExtractedValue(value);
    const firstLabel = findLabelMatch(text, labeledValueBoundaryPatterns);
    if (firstLabel && firstLabel.index > 0) {
      return cleanExtractedValue(text.slice(0, firstLabel.index));
    }
    return text;
  }

  function extractFromFields(fields, patterns) {
    for (const field of fields) {
      const extracted = extractLabeledValue(field.value, patterns);
      if (extracted) return extracted;
    }
    return "";
  }

  function getConciseFieldValue(fields, fieldPatterns, excludedPatterns = [], valuePatterns = []) {
    const field = findField(fields, fieldPatterns, excludedPatterns);
    if (field) {
      const extracted = valuePatterns.length ? extractLabeledValue(field.value, valuePatterns) : "";
      if (extracted) return extracted;
      if (!looksLikeCompoundValue(field.value)) return cleanDisplayValue(field.value);
    }

    if (valuePatterns.length) {
      const extracted = extractFromFields(fields, valuePatterns);
      if (extracted) return extracted;
    }

    return field ? cleanDisplayValue(field.value) : "";
  }

  function inferSalesRegion(explicitValue, fields) {
    const extracted = extractLabeledValue(explicitValue, labeledValuePatterns.salesRegion)
      || extractFromFields(fields, labeledValuePatterns.salesRegion);
    if (extracted) return canonicalSalesRegion(extracted);

    const explicit = cleanDisplayValue(explicitValue);
    return looksLikeCompoundValue(explicit) ? "" : canonicalSalesRegion(explicit);
  }

  function cleanOpportunityName(value) {
    let text = cleanExtractedValue(value);
    text = text.replace(/^[^\w#]+/u, "");
    text = text.replace(/\s*(Exp\s*Close|Expected\s*Close|ARR|Sales\s*Rep|Regional\s*Director|Regional\s*Dir|Sales\s*Director|Sales\s*Dir|Sales\s*Mgr|Sales\s*Manager|Regional\s*VP|RVP|Industry\s*Leader|Sales\s*Tier|Sales\s*Region|Sales\s*Vertical|Advisory\s*Firm)\s*:.*$/i, "");
    text = text.replace(/\s*(SC\s*Pool|Pri|Flag|CompeteLoc|Loc|T|Trv)\s*:.*$/i, "");
    text = text.replace(/\s*\|.*$/g, "");
    return normalizeSpaces(text);
  }

  function looksLikeOpportunityMetadata(value) {
    return /(?:SC\s*Pool|Pri|Flag|CompeteLoc|Trv)\s*:/i.test(String(value || ""));
  }

  function opportunityDisplayFromText(value) {
    const text = normalizeSpaces(value);
    if (!text || looksLikeOpportunityMetadata(text)) return "";

    const numbered = text.match(/#\d+\s+.*?(?=\s*(?:Exp\s*Close|Expected\s*Close|ARR|Sales\s*Rep|Regional\s*Director|Regional\s*Dir|Sales\s*Director|Sales\s*Dir|Sales\s*Mgr|Sales\s*Manager|Regional\s*VP|RVP|Industry\s*Leader|Sales\s*Tier|Sales\s*Region|Sales\s*Vertical|Advisory\s*Firm)\s*:|$)/i);
    if (numbered) return cleanOpportunityName(numbered[0]);

    if (/opportunity/i.test(text)) return cleanOpportunityName(text);
    return "";
  }

  function getOpportunityDisplay(opportunityField, fields) {
    const link = firstFieldLink(opportunityField, /opprtnty|opportunity|transaction/i);
    if (link) {
      return opportunityDisplayFromText(opportunityField && opportunityField.value)
        || cleanOpportunityName(link.text || opportunityField && opportunityField.value);
    }

    const direct = opportunityDisplayFromText(opportunityField && opportunityField.value);
    if (direct) return direct;

    for (const field of fields) {
      const value = opportunityDisplayFromText(field.value);
      if (value) return value;
    }

    return "";
  }

  function findOpportunityField(fields) {
    const linked = fields.find(field => firstFieldLink(field, /opprtnty|opportunity|transaction/i));
    if (linked) return linked;

    return findField(fields, [
      /opportunity/, /\bopp\b/, /opportunityrecord/
    ], [/state/, /province/, /sales.*region/]) || fields[2] || null;
  }

  function getCompanyDisplay(companyField, fields) {
    const link = firstFieldLink(companyField, /customer|custjob|entity|record/i);
    if (link) return cleanDisplayValue(link.text);
    if (companyField && !looksLikeCompoundValue(companyField.value)) return cleanDisplayValue(companyField.value);

    const candidate = fields.find(field => (
      field.links.some(link => /customer|custjob|entity|record/i.test(link.href))
    ));
    const candidateLink = candidate ? firstFieldLink(candidate, /customer|custjob|entity|record/i) : null;
    if (candidateLink) return cleanDisplayValue(candidateLink.text);

    return "";
  }

  function getWebsiteField(fields) {
    const field = findField(fields, [
      /website/, /web\s*address/, /customer.*web/, /\burl\b/
    ], [/linkedin/]);
    const extracted = field ? extractLabeledValue(field.value, labeledValuePatterns.website) : "";
    const fromCompound = extractFromFields(fields, labeledValuePatterns.website);
    const direct = field && !looksLikeCompoundValue(field.value) ? cleanDisplayValue(field.value) : "";
    const value = extracted || fromCompound || direct;
    if (!value && !field) return null;
    return {
      label: field && field.label || "Website",
      value: value || field && field.value || "",
      rawValue: value || field && field.rawValue || "",
      links: field && Array.isArray(field.links) ? field.links : []
    };
  }

  function cleanAnnualRevenueValue(value) {
    const extracted = extractLabeledValue(value, labeledValuePatterns.annualRevenue);
    let text = cleanExtractedValue(extracted || value);
    text = text.replace(/^\[SC Request\]\s*\|\s*/i, "");
    text = text.split(/\s+\*(?:Corp(?:orate)?|Products?\s*\/?\s*Services?|Why\s*now|Current\s*Systems?)/i)[0];
    text = text.replace(/\s+\[SC Request\]\s*\|.*$/i, "");
    text = cleanExtractedValue(text);

    if (!text || text.length > 80) return "";
    if (/\[SC Request\]|\*(?:Corp|Products?|Why\s*now|Current\s*Systems?)/i.test(text)) return "";
    if (!/(?:[$€£]|\d|million|billion|\b[mbk]\b|under|over|\bto\b)/i.test(text)) return "";
    return text;
  }

  function getAnnualRevenueValue(fields) {
    const field = findField(fields, [
      /annual.*revenue/, /company.*revenue/, /\brevenue\b/
    ], [/arr/, /revenue.*stream/, /products?/, /services?/, /request.*details/]);
    if (field) {
      return cleanAnnualRevenueValue(field.value);
    }

    return cleanAnnualRevenueValue(extractFromFields(fields, labeledValuePatterns.annualRevenue));
  }

  function extractDateValue(value) {
    const text = cleanExtractedValue(value);
    if (!text) return "";

    const datePatterns = [
      /\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\s+\d{1,2}\s+[A-Z]{3,9}\s+\d{4}(?!\d)/i,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b\d{1,2}\s+[A-Z]{3,9}\s+\d{4}(?!\d)/i,
      /\b[A-Z]{3,9}\s+\d{1,2},?\s+\d{4}(?!\d)/i,
      /\b\d{4}-\d{2}-\d{2}\b/
    ];
    const match = datePatterns.map(pattern => text.match(pattern)).find(Boolean);
    return match ? normalizeSpaces(match[0]) : "";
  }

  function monthIndexFromName(value) {
    const key = String(value || "").slice(0, 3).toLowerCase();
    return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key);
  }

  function localDateFromParts(year, monthIndex, day) {
    const date = new Date(year, monthIndex, day);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) return null;
    return date;
  }

  function parseDateValue(value) {
    const text = extractDateValue(value) || cleanExtractedValue(value);
    if (!text) return null;

    let match = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (match) {
      const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
      return localDateFromParts(year, Number(match[1]) - 1, Number(match[2]));
    }

    match = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (match) return localDateFromParts(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    match = text.match(/\b(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)?\s*(\d{1,2})\s+([A-Z]{3,9})\s+(\d{4})\b/i);
    if (match) {
      const monthIndex = monthIndexFromName(match[2]);
      return monthIndex >= 0 ? localDateFromParts(Number(match[3]), monthIndex, Number(match[1])) : null;
    }

    match = text.match(/\b([A-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/i);
    if (match) {
      const monthIndex = monthIndexFromName(match[1]);
      return monthIndex >= 0 ? localDateFromParts(Number(match[3]), monthIndex, Number(match[2])) : null;
    }

    return null;
  }

  function formatDateNeededDisplay(value) {
    const date = parseDateValue(value);
    if (!date) return normalizeSpaces(value);

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isLate = date.getTime() <= todayDate.getTime();
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const formatted = `${weekday}, ${month}/${day}/${date.getFullYear()}`;
    return `${isLate ? "⏰ " : ""}${formatted}`;
  }

  function getDateValue(fields, fieldPatterns, excludedPatterns, valuePatterns) {
    const field = findField(fields, fieldPatterns, excludedPatterns);
    const candidates = [];
    if (field) {
      candidates.push(extractLabeledValue(field.value, valuePatterns), field.value);
    }
    fields.forEach(candidateField => {
      candidates.push(extractLabeledValue(candidateField.value, valuePatterns));
    });

    return candidates.map(extractDateValue).find(Boolean) || "";
  }

  function stripPromptChrome(value) {
    let text = normalizeSpaces(value);
    text = text.replace(/(?:📋\s*)?Copy\s+Exec\s+Brief\s+Prompt/gi, "");
    text = text.replace(/(?:🧠\s*)?Copy\s+Staffing\s+Rec\s+Prompt/gi, "");
    text = text.replace(/\s*Create an executive brief for this NetSuite SC request\..*?\bDATA:\s*/i, " DATA: ");
    return normalizeSpaces(text);
  }

  function cleanRequestDetailsText(value) {
    let text = stripPromptChrome(value);
    if (!text) return "";

    const detailsMatch = /(?:^|\s)Details\s*:\s*/i.exec(text);
    if (detailsMatch) {
      text = text.slice(detailsMatch.index + detailsMatch[0].length);
    }

    text = text.replace(/\s+You are staffing a NetSuite SC request\..*$/i, "");
    text = text.replace(/\s+Return only\s*:.*$/i, "");
    text = text.replace(/\s+Strip\s*:\s*\[.*$/i, "");
    text = text.replace(/\s+DATA\s*:\s*Type\s*:.*$/i, "");
    text = text.replace(/\s*[\*]+$/g, "");
    return cleanExtractedValue(text);
  }

  function stripRequestDetailsCompoundChrome(value) {
    let text = stripPromptChrome(value);
    if (!text) return "";

    const requestDetailsMatch = findLabelMatch(text, labeledValuePatterns.requestDetails);
    if (requestDetailsMatch) {
      text = text.slice(requestDetailsMatch.end);
    }

    const dateNeededMatch = /Date\s*Needed\s*:/i.exec(text);
    if (dateNeededMatch) {
      const afterDateNeeded = text.slice(dateNeededMatch.index);
      const date = extractDateValue(afterDateNeeded);
      if (date) {
        const dateIndex = afterDateNeeded.toLowerCase().indexOf(date.toLowerCase());
        text = afterDateNeeded.slice(dateIndex + date.length);
      }
    }

    const flmMatch = findLabelMatch(text, labeledValuePatterns.flmNotes);
    if (flmMatch) {
      const afterFlm = text.slice(flmMatch.end);
      const compactBoundaryMatches = [...afterFlm.matchAll(/[.!?](?=[A-Z0-9])/g)];
      if (compactBoundaryMatches.length) {
        const boundary = compactBoundaryMatches[compactBoundaryMatches.length - 1];
        text = afterFlm.slice(boundary.index + 1);
      } else {
        text = "";
      }
    }

    const nextQualification = findLabelMatch(text, [
      ...labeledValuePatterns.annualRevenue,
      ...labeledValuePatterns.corpStructure,
      ...labeledValuePatterns.productsServices,
      ...labeledValuePatterns.whyNow,
      ...labeledValuePatterns.currentSystems
    ]);
    if (nextQualification) {
      text = text.slice(0, nextQualification.index);
    }

    return cleanRequestDetailsText(text);
  }

  function cleanRequestDetailsRawValue(value) {
    return stripNetSuiteMoreMarker(value)
      .replace(/\s*\(\s*more\s*\.\.\.\s*\)\s*/gi, " ")
      .trim();
  }

  function cleanRequestDetailsRawHtml(value) {
    return stripNetSuiteMoreMarkerHtml(value)
      .replace(/\s*\(\s*more\s*\.\.\.\s*\)\s*/gi, " ")
      .trim();
  }

  function getRequestDetailsValue(fields) {
    const rawField = fields.find(field => headerMatches(field.label, "requestDetailsRaw")
      || normalizeHeader(field.label) === "requestdetailsraw");
    if (!rawField) {
      return {
        text: "Unknown",
        html: ""
      };
    }

    const html = cleanRequestDetailsRawHtml(rawField.rawHtml || "");
    const text = cleanRequestDetailsRawValue(rawField.rawValue || rawField.value || htmlToPlainText(html));
    return {
      text: text || "Unknown",
      html: html && htmlToPlainText(html) ? html : ""
    };
  }

  function getRawFieldValue(fields, key) {
    const matches = fields.filter(field => headerMatches(field.label, key));
    const rawField = matches.find(field => normalizeMultiline(field.rawValue || field.value)) || matches[0];
    return rawField ? normalizeMultiline(rawField.rawValue || rawField.value) : "";
  }

  function getDateNeededValue(allFields, fields) {
    const rawMatches = allFields.filter(field => headerMatches(field.label, "dateNeededRaw"));
    const rawField = rawMatches.find(field => normalizeMultiline(field.rawValue || field.value)) || rawMatches[0];
    const rawValue = rawField ? normalizeMultiline(rawField.rawValue || rawField.value) : "";
    const rawDate = formatDateNeededDisplay(rawValue);
    if (rawDate) return rawDate;

    const parsedDate = getDateValue(fields, [
      /anticipated.*customer.*meeting/, /customer.*meeting.*date/, /date.*needed/, /need.*date/
    ], [], labeledValuePatterns.dateNeeded);
    return formatDateNeededDisplay(parsedDate);
  }

  function parseScrAgeHours(value) {
    const text = normalizeSpaces(value).toLowerCase();
    if (!text) return null;

    const hourMinute = text.match(/\b(\d{1,4}):(\d{2})\b/);
    if (hourMinute) {
      return Number(hourMinute[1]) + Number(hourMinute[2]) / 60;
    }

    let total = 0;
    let foundUnit = false;
    const unitPattern = /(\d+(?:\.\d+)?)\s*(days?|d|hours?|hrs?|hr|h|minutes?|mins?|min|m)\b/g;
    let match;
    while ((match = unitPattern.exec(text))) {
      const amount = Number(match[1]);
      const unit = match[2];
      if (!Number.isFinite(amount)) continue;
      foundUnit = true;
      if (/^d|day/.test(unit)) total += amount * 24;
      else if (/^h|hr|hour/.test(unit)) total += amount;
      else if (/^m|min/.test(unit)) total += amount / 60;
    }
    if (foundUnit) return total;

    const numeric = text.match(/^\d+(?:\.\d+)?$/);
    if (!numeric) return null;

    const amount = Number(numeric[0]);
    if (!Number.isFinite(amount)) return null;
    return amount * 24;
  }

  function submittedDateAgeHours(value) {
    const date = parseDateValue(value);
    if (!date) return null;
    const age = (Date.now() - date.getTime()) / (60 * 60 * 1000);
    return Number.isFinite(age) && age >= 0 ? age : null;
  }

  function getSubmittedDateValue(fields) {
    return getDateValue(fields, [
      /date.*submitted/, /submitted.*date/, /created.*date/, /^created\b/, /datecreated/
    ], [], labeledValuePatterns.submittedDate);
  }

  function rowFields(row) {
    return row && (row.allFields || row.fields) || [];
  }

  function rowScrAgeValue(row) {
    if (!row) return "";
    const fields = rowFields(row);
    return row.scrAge
      || getRawFieldValue(fields, "scrAge")
      || getConciseFieldValue(fields, [/scr.*age/, /request.*age/], [], labeledValuePatterns.scrAge);
  }

  function rowSubmittedDateValue(row) {
    if (!row) return "";
    const scrAge = rowScrAgeValue(row);
    return row.submittedDate
      || getSubmittedDateValue(rowFields(row))
      || extractDateValue(scrAge);
  }

  function submittedDateSortValue(row) {
    const date = parseDateValue(rowSubmittedDateValue(row));
    return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
  }

  function rowSubmittedAgeHours(row) {
    if (!row) return null;
    const scrAgeHours = parseScrAgeHours(rowScrAgeValue(row));
    if (scrAgeHours !== null) return scrAgeHours;
    return submittedDateAgeHours(rowSubmittedDateValue(row));
  }

  function compareSubmittedOldestFirst(left, right) {
    const submittedOrder = submittedDateSortValue(left) - submittedDateSortValue(right);
    if (submittedOrder) return submittedOrder;

    const leftAge = rowSubmittedAgeHours(left);
    const rightAge = rowSubmittedAgeHours(right);
    if (leftAge !== null && rightAge !== null && leftAge !== rightAge) return rightAge - leftAge;
    if (leftAge !== null && rightAge === null) return -1;
    if (leftAge === null && rightAge !== null) return 1;
    return 0;
  }

  function getSlaInfo(scrAge, submittedDate) {
    const scrAgeHours = parseScrAgeHours(scrAge);
    const submittedHours = submittedDateAgeHours(submittedDate);
    const hours = scrAgeHours !== null ? scrAgeHours : submittedHours;
    return {
      hours,
      passed: hours !== null && hours > 24
    };
  }

  function rowSlaInfo(row) {
    if (!row) return { hours: null, passed: false };
    const fields = row.fields || [];
    const submittedDate = row.submittedDate || getSubmittedDateValue(fields);
    return getSlaInfo(row.scrAge, submittedDate);
  }

  function renderSlaBadge(slaInfo) {
    if (!slaInfo || !slaInfo.passed) return "";
    return `
      <span class="scr-helper-brand-badge is-sla-passed" title="Submitted more than 24 hours ago">
        <span class="scr-helper-brand-emoji">⚠️</span>
        <span>SLA passed</span>
      </span>
    `;
  }

  function splitBillingLocation(value) {
    const text = cleanExtractedValue(value);
    if (!text) return { city: "", state: "" };

    const parts = text.split(",").map(part => normalizeSpaces(part)).filter(Boolean);
    if (parts.length >= 2) {
      return {
        city: parts[0],
        state: parts[1].split(/\s+/)[0] || ""
      };
    }

    const cityState = text.match(/\b([^,|]+?)\s+([A-Z]{2})(?:\b|$)/);
    if (cityState) {
      return {
        city: normalizeSpaces(cityState[1]),
        state: cityState[2]
      };
    }

    return { city: text, state: "" };
  }

  function getBillingLocation(fields) {
    const address = extractFromFields(fields, labeledValuePatterns.billingAddress);
    if (address) return splitBillingLocation(address);

    const city = getConciseFieldValue(fields, [
      /billing.*city/, /bill.*city/
    ], [], labeledValuePatterns.billingCity);
    const state = getConciseFieldValue(fields, [
      /billing.*state/, /bill.*state/, /billing.*province/, /bill.*province/
    ], [], labeledValuePatterns.billingState);

    return {
      city,
      state
    };
  }

  function renderSummaryItem(label, value, options = {}) {
    const normalized = options.multiline ? normalizeMultiline(value) : normalizeSpaces(value);
    if (!normalized && !options.html) return "";
    const html = options.html || (options.multiline ? escapeMultiline(normalized) : escapeHtml(normalized));
    return `
      <div class="scr-helper-summary-item${options.strong ? " is-strong" : ""}${options.long ? " is-long" : ""}${options.rich ? " is-rich" : ""}">
        <div class="scr-helper-summary-label">${escapeHtml(label)}</div>
        <div class="scr-helper-summary-value">${html}</div>
      </div>
    `;
  }

  function renderSummaryColumn(title, items, modifier = "") {
    const visibleItems = items.filter(Boolean);
    return `
      <section class="scr-helper-summary-column${modifier ? ` ${modifier}` : ""}">
        <div class="scr-helper-summary-title">${escapeHtml(title)}</div>
        ${visibleItems.length ? visibleItems.join("") : `<div class="scr-helper-muted">No returned details.</div>`}
      </section>
    `;
  }

  function requestTypeLabel(amoDirect) {
    const normalized = normalizeAmoDirect(amoDirect);
    if (normalized === "AMO") return "Solution Consultant - AMO";
    if (normalized === "Direct") return "Solution Consultant - Direct";
    if (normalized === NSPB_REQUEST_TYPE) return NSPB_REQUEST_TYPE;
    if (normalized === TECH_COE_REQUEST_TYPE) return TECH_COE_REQUEST_TYPE;
    return "";
  }

  function requestTypeKey(amoDirect) {
    const normalized = normalizeAmoDirect(amoDirect);
    if (normalized === "AMO") return "amo";
    if (normalized === "Direct") return "direct";
    if (normalized === NSPB_REQUEST_TYPE) return "nspb";
    if (normalized === TECH_COE_REQUEST_TYPE) return "techcoe";
    return "";
  }

  function requestTypeColor(requestKey) {
    if (requestKey === "amo") return REDWOOD_COLORS.oracleRed;
    if (requestKey === "direct") return REDWOOD_COLORS.netsuiteOcean;
    if (requestKey === "nspb") return REDWOOD_COLORS.tigerPurple;
    if (requestKey === "techcoe") return REDWOOD_COLORS.sky120;
    return "";
  }

  function editUrlForRow(row) {
    if (!row) return "";
    return row.editUrl || makeEditUrl("", row.internalId);
  }

  function viewUrlForRow(row) {
    if (!row) return "";
    const internalId = row.internalId || recordIdFromUrl(row.editUrl);
    const origin = window.location.origin || "https://nlcorp.app.netsuite.com";
    if (internalId) {
      return `${origin}/app/common/custom/custrecordentry.nl?rectype=${encodeURIComponent(SCR_RECORD_TYPE)}&id=${encodeURIComponent(internalId)}`;
    }
    const editUrl = editUrlForRow(row);
    if (!editUrl) return "";
    try {
      const url = new URL(editUrl, origin);
      url.searchParams.delete("e");
      return url.href;
    } catch (error) {
      return editUrl.replace(/([?&])e=T(&?)/i, (match, prefix, suffix) => (prefix === "?" && suffix ? "?" : prefix === "?" ? "" : suffix ? prefix : ""));
    }
  }

  function renderCopyLinkControl(row) {
    const viewUrl = viewUrlForRow(row);
    const disabled = viewUrl ? "" : "disabled";
    const title = viewUrl
      ? "Copy SCR view link"
      : "No SCR link was returned on this row.";
    return `
      <button
        type="button"
        class="scr-helper-copy-link"
        data-view-url="${escapeHtml(viewUrl)}"
        title="${escapeHtml(title)}"
        ${disabled}
      >Copy link</button>
    `;
  }

  function renderStaffScrControl(row, requestColor) {
    const editUrl = editUrlForRow(row);
    const style = requestColor && editUrl ? `style="background-color: ${escapeHtml(requestColor)};"` : "";
    if (editUrl) {
      return `
        <a
          class="scr-helper-edit"
          href="${escapeHtml(editUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          data-edit-url="${escapeHtml(editUrl)}"
          ${style}
        >Staff SCR</a>
      `;
    }

    return `
      <button type="button" class="scr-helper-edit" data-edit-url="" disabled>
        Staff SCR
      </button>
    `;
  }

  function renderAssignedToWithOwnership(row, assignedTo) {
    const assignedName = normalizeSpaces(assignedTo);
    const isAssignedMine = rowAssignedToMatchesCurrentUser(row);
    const isExplicitOwnerMine = rowExplicitScmOwnerMatchesCurrentUser(row);
    const isMine = isAssignedMine || isExplicitOwnerMine;
    const disabled = !row.internalId || isMine ? "disabled" : "";
    const title = !row.internalId
      ? "No SCR internal id was returned on this row."
      : isExplicitOwnerMine
        ? "This SCR is already explicitly owned by you."
        : isAssignedMine
        ? "This SCR is already assigned to you."
        : "Set the current user as explicit SCM owner.";

    return `
      <div class="scr-helper-assigned-line">
        <span class="scr-helper-assigned-name">${assignedName ? escapeHtml(assignedName) : `<span class="scr-helper-muted">Unassigned</span>`}</span>
        <button
          type="button"
          class="scr-helper-take-ownership"
          data-row-id="${escapeHtml(row.id)}"
          title="${escapeHtml(title)}"
          ${disabled}
        >${isMine ? "Owned by Me" : "Take Ownership"}</button>
        <span class="scr-helper-ownership-status" aria-live="polite"></span>
      </div>
    `;
  }

  function renderProductsScmOwnerValue(row) {
    if (!productsScmUserIsAuthorized()) return "";
    const owner = productsScmOwnerForRow(row);
    if (!owner) return "";
    if (owner.scm) {
      return `
        <span class="scr-helper-products-scm-owner">
          <strong>${escapeHtml(owner.scm)}</strong>
          <span class="scr-helper-muted">${escapeHtml(owner.sourceLabel || "SCM owner")}</span>
        </span>
      `;
    }
    return `<span class="scr-helper-muted">${escapeHtml(owner.sourceLabel || "SCM owner not mapped")}</span>`;
  }

  function renderCrossIndustryStaffingControls(row) {
    const info = getCrossIndustryInfoForRow(row);
    const activeTags = new Set(info.targets.map(target => target.tag));
    const disabled = row.internalId ? "" : "disabled";
    const activeText = info.includeAll
      ? "Visible in all industry queues"
      : info.targets.length
        ? `Visible in ${info.targets.map(target => target.family).join(", ")}`
        : isOtherUnmappedIndustry(row.industryFamily)
          ? "Other/Unmapped: visible in all industry queues"
          : "Using saved-search industry family";
    const buttons = CROSS_INDUSTRY_TARGETS.map(target => {
      const branding = getIndustryGroupBranding(target.family);
      const style = branding
        ? `style="--xvr-color: ${escapeHtml(branding.color)}; --xvr-bg: ${escapeHtml(branding.soft)};"`
        : "";
      const label = target.label
        ? `${branding && branding.emoji ? `${branding.emoji} ` : ""}${target.label}`
        : industryOptionLabel(target.family);
      return `
        <button
          type="button"
          class="scr-helper-xvr-button${activeTags.has(target.tag) ? " is-active" : ""}"
          data-row-id="${escapeHtml(row.id)}"
          data-xvr-tag="${escapeHtml(target.tag)}"
          title="${escapeHtml(target.title || `Mark this SCR for ${target.family} queue visibility`)}"
          ${style}
          ${disabled}
        >${escapeHtml(label)}</button>
      `;
    }).join("");

    return `
      <div class="scr-helper-xvr-controls">
        <div class="scr-helper-xvr-buttons">${buttons}</div>
        <div class="scr-helper-xvr-state">${escapeHtml(activeText)}</div>
      </div>
    `;
  }

  function renderStaffingNotesEditor(row, notes) {
    const disabled = row.internalId ? "" : "disabled";
    const disabledHelp = row.internalId ? "" : `<div class="scr-helper-notes-help">Open the SCR to edit notes; no internal id was returned on this row.</div>`;
    const notice = row.routingNotice && row.routingNotice.message ? row.routingNotice : null;
    const noticeLinks = notice && Array.isArray(notice.links) && notice.links.length
      ? `<div class="scr-helper-notice-links">${notice.links.map(link => `
          <a
            class="scr-helper-notice-link"
            href="${escapeHtml(link.href)}"
            target="_blank"
            rel="noopener noreferrer"
          >${escapeHtml(link.label)}</a>
        `).join("")}</div>`
      : "";
    return `
      <div class="scr-helper-notes-editor">
        <textarea class="scr-helper-notes-input" data-row-id="${escapeHtml(row.id)}" placeholder="No staffing notes yet.">${escapeHtml(notes || "")}</textarea>
        <div class="scr-helper-notes-actions">
          <div class="scr-helper-notes-button-stack">
            <button type="button" class="scr-helper-notes-save" data-row-id="${escapeHtml(row.id)}" ${disabled}>Save notes</button>
            <button type="button" class="scr-helper-request-info" data-row-id="${escapeHtml(row.id)}" ${disabled}>Email Sales</button>
          </div>
          <span class="scr-helper-notes-status${notice && notice.state ? ` is-${escapeHtml(notice.state)}` : ""}" aria-live="polite">${notice ? escapeHtml(notice.message) : ""}</span>
          ${noticeLinks}
        </div>
        ${disabledHelp}
      </div>
    `;
  }

  function detectsTravelRequest(fields, requestDetails) {
    const detailText = fields.map(field => field.value).concat(requestDetails).join(" ");
    if (/requesting\s+travel\s*\(y\/n\)\s*:?\s*y\b/i.test(detailText)) return true;
    if (/\bon[\s-]?site\b/i.test(detailText)) return true;

    return fields.some(field => (
      /onsite|on[\s-]?site|travel/i.test(field.label)
      && /^(t|true|yes|y|checked|1)$/i.test(normalizeSpaces(field.value))
    ));
  }

  function getStaffingNotesField(fields) {
    return findField(fields, [
      /scm.*staffing.*notes/,
      /staffing.*notes/,
      /sc.*manager.*notes/,
      /scmanager.*notes/,
      /custrecord.*scmanager.*notes/
    ]);
  }

  function getStaffingNotesValue(field) {
    if (!field) return "";
    return extractLabeledValue(field.value, labeledValuePatterns.staffingNotes)
      || cleanDisplayValue(field.value);
  }

  function getHashtagsField(fields) {
    return findField(fields, [
      /hashtags/,
      /hash\s*tags/,
      /\btags\b/,
      /custrecord.*hashtags/
    ]);
  }

  function getHashtagsValue(field) {
    if (!field) return "";
    return extractLabeledValue(field.value, labeledValuePatterns.hashtags)
      || cleanDisplayValue(field.value);
  }

  function extractAssignedToFromText(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const match = text.match(/Assigned\s*to\s*:?\s*(.*?)(?=\s*(?:Cross[\s-]*vert|Industry\s*:|Sub[\s-]*Industry\s*:|NAICS\s*:|Sales\s+Region\s*:|$))/i);
    return match ? cleanDisplayValue(match[1]) : "";
  }

  function getAssignedToValue(fields) {
    const concise = getConciseFieldValue(fields, [
      /assigned\s*to/, /assignedto/, /assignee/, /assigned\s*sc/, /solution\s*consultant/
    ], [/manager/, /lead\s*source/], labeledValuePatterns.assignedTo);
    if (concise) return concise;

    return fields.map(field => extractAssignedToFromText(`${field.label} ${field.value}`)).find(Boolean) || "";
  }

  function rowAssignedToMatchesCurrentUser(row) {
    if (!row) return false;
    if (assignedToMatchesCurrentUser(row.assignedTo)) return true;

    const userKeys = personNameKeys(getCurrentUserName());
    if (!userKeys.length) return false;
    return (row.fields || []).some(field => {
      const labelAndValue = `${field.label} ${field.value}`;
      if (!/assigned|assignee|solution\s*consultant/i.test(labelAndValue)) return false;
      const fieldKey = normalizeKey(labelAndValue);
      return userKeys.some(key => fieldKey.includes(key));
    });
  }

  function buildRowSummary(row) {
    const fields = row.fields;
    const allFields = row.allFields || fields;
    const assignedTo = row.assignedTo || getAssignedToValue(fields);
    const gtmIndustry = row.gtmIndustry || getConciseFieldValue(fields, [
      /fy27.*gtm.*industry$/, /fy27gtmindustry$/, /gtm.*industry$/
    ], [/subgroup/, /sub\s*industry/]);
    const industrySubgroup = row.gtmIndustrySubgroup || row.industrySubgroup || getConciseFieldValue(fields, [
      /industry.*subgroup/, /industrysubgroup/, /industry.*sub\s*industry/, /industry.*vertical/
    ], [], labeledValuePatterns.subIndustry);
    const submittedDate = row.submittedDate || getSubmittedDateValue(fields);
    const scrAge = row.scrAge || getRawFieldValue(allFields, "scrAge");
    const dateNeeded = getDateNeededValue(allFields, fields);
    const slaInfo = getSlaInfo(scrAge, submittedDate);
    const deliverable = getRawFieldValue(allFields, "deliverableRaw");
    const requestDetailsValue = getRequestDetailsValue(allFields);
    const requestDetails = requestDetailsValue.text;
    const opportunityField = findOpportunityField(fields);
    const opportunityLink = firstFieldLink(opportunityField, /opprtnty|opportunity|transaction/i);
    const opportunityDisplay = getOpportunityDisplay(opportunityField, fields);
    const expectedCloseDate = getConciseFieldValue(fields, [
      /expected.*close/, /close.*date/, /projected.*close/
    ], [], labeledValuePatterns.expectedCloseDate);
    const projectArr = getConciseFieldValue(fields, [
      /project.*arr/, /\barr\b/, /annual.*recurring/
    ], [], labeledValuePatterns.projectArr);
    const salesRep = getConciseFieldValue(fields, [
      /sales\s*rep$/, /salesrep$/, /opp.*sales.*rep/, /sales.*representative/
    ], [/manager/, /yrs.*live/], labeledValuePatterns.salesRep);
    const salesDirector = row.salesDirector || getConciseFieldValue(fields, [
      /regional.*director/, /regionaldirector/, /regional.*dir\b/, /regionaldir\b/, /sales.*director/, /salesdirector/, /sales.*dir\b/, /salesdir\b/, /sales.*rep.*manager/, /salesrepmanager/, /sales.*manager/
    ], [], labeledValuePatterns.salesDirector);
    const regionalVp = row.regionalVp || getConciseFieldValue(fields, [
      /regional.*vp/, /regionalvp/, /\brvp\b/, /regional.*vice.*president/
    ], [], labeledValuePatterns.regionalVp);
    const industryLeader = row.industryLeader || getConciseFieldValue(fields, [
      /industry.*leader/, /industryleader/, /industry.*avp/
    ], [], labeledValuePatterns.industryLeader);
    const salesTier = row.salesTier || getConciseFieldValue(fields, [
      /sales.*tier/, /\btier\b/
    ], [], labeledValuePatterns.salesTier);
    const opportunitySalesRegion = canonicalSalesRegion(getConciseFieldValue(fields, [
      /sales.*region/, /opportunity.*region/
    ], [/staffing/, /prospect/], labeledValuePatterns.salesRegion));
    const salesVertical = row.salesVertical || getConciseFieldValue(fields, [
      /sales.*vertical/, /\bvertical\b/
    ], [/cross/], labeledValuePatterns.salesVertical);
    const companyField = findField(fields, [
      /company\s*name/, /prospect.*customer/, /customer.*prospect/, /\bcustomer\b/, /\bcompany\b/, /\baccount\b/
    ], [/state/, /province/, /website/, /linkedin/, /size/, /revenue/]);
    const websiteField = getWebsiteField(fields);
    const linkedinField = findField(fields, [
      /linkedin/, /linked\s*in/
    ]);
    const companySize = getConciseFieldValue(fields, [
      /company.*size/, /employee/, /number.*employees/, /employees/
    ], [], labeledValuePatterns.companySize);
    const annualRevenue = getAnnualRevenueValue(fields);
    const billingLocation = getBillingLocation(fields);
    const prospectRegion = getConciseFieldValue(fields, [
      /prospect.*region/
    ], [], labeledValuePatterns.prospectRegion);
    const leadSource = getConciseFieldValue(fields, [
      /lead.*source/, /leadsource/
    ], [], labeledValuePatterns.leadSource);
    const leadFit = getConciseFieldValue(fields, [
      /lead.*fit/, /leadfit/
    ], [], labeledValuePatterns.leadFit);
    const allianceInfo = getConciseFieldValue(fields, [
      /alliance/, /partner/
    ], [], labeledValuePatterns.allianceInfo);
    const crossVertical = row.crossVertical || getConciseFieldValue(fields, [
      /cross.*vertical/, /crossvertical/
    ], [], labeledValuePatterns.crossVertical);
    const staffingNotesField = getStaffingNotesField(allFields);
    const staffingNotes = row.staffingNotes || getStaffingNotesValue(staffingNotesField);
    const hashtagsField = getHashtagsField(allFields);
    const hashtags = row.hashtags || getHashtagsValue(hashtagsField);

    return {
      assignedTo,
      industrySubgroup,
      gtmIndustry,
      gtmIndustrySubgroup: industrySubgroup,
      submittedDate,
      scrAge,
      slaInfo,
      dateNeeded,
      deliverable,
      requestDetails,
      requestDetailsHtml: requestDetailsValue.html,
      travelRequested: detectsTravelRequest(fields, requestDetails),
      opportunityField,
      opportunityLink,
      opportunityDisplay,
      expectedCloseDate,
      projectArr,
      salesRep,
      salesDirector,
      regionalVp,
      industryLeader,
      salesTier,
      opportunitySalesRegion,
      salesVertical,
      companyField,
      companyDisplay: getCompanyDisplay(companyField, fields),
      websiteField,
      linkedinField,
      companySize,
      annualRevenue,
      billingCity: billingLocation.city,
      billingState: billingLocation.state,
      prospectRegion,
      leadSource,
      leadFit,
      allianceInfo,
      crossVertical: normalizeYesNo(crossVertical, crossVertical ? "" : "No"),
      staffingNotesField,
      staffingNotes,
      hashtagsField,
      hashtags
    };
  }

  function getControls() {
    return {
      industry: document.getElementById("scr-helper-industry-filter"),
      gtmIndustry: document.getElementById("scr-helper-gtm-industry-filter"),
      industrySubgroup: document.getElementById("scr-helper-industry-subgroup-filter"),
      gtmCriteria: document.getElementById("scr-helper-gtm-criteria-values"),
      salesRegion: document.getElementById("scr-helper-sales-region-filter"),
      salesVertical: document.getElementById("scr-helper-sales-vertical-filter"),
      staffingRegion: document.getElementById("scr-helper-staffing-region-filter"),
      staffingRegions: document.getElementById("scr-helper-staffing-region-values"),
      amoDirect: document.getElementById("scr-helper-amo-direct-filter"),
      productsScmOwnerMe: document.getElementById("scr-helper-products-scm-owner-me-filter"),
      productsScmOwner: document.getElementById("scr-helper-products-scm-owner-value"),
      assignedToMe: document.getElementById("scr-helper-assigned-to-me-filter"),
      unmappedOnly: document.getElementById("scr-helper-unmapped-only-filter"),
      hideTigerEnterprise: document.getElementById("scr-helper-hide-tiger-enterprise-filter"),
      slaHotlist: document.getElementById("scr-helper-sla-hotlist-filter"),
      text: document.getElementById("scr-helper-text-filter")
    };
  }

  function rowAssignedToCurrentUser(row) {
    return rowAssignedToMatchesCurrentUser(row) || rowExplicitScmOwnerMatchesCurrentUser(row);
  }

  function currentExplicitScmOwnerName() {
    return currentProductsScmUserName() || getCurrentUserName();
  }

  function rowExplicitScmOwnerMatchesCurrentUser(row) {
    const owner = productsScmExplicitOwner(row);
    const currentOwner = currentExplicitScmOwnerName();
    return Boolean(owner && owner.scm && currentOwner && personMatchesNames(owner.scm, [currentOwner, getCurrentUserName()]));
  }

  function rowMatchesFilters(row, controls) {
    const industry = controls.industry.value;
    const gtmCriteria = controls.gtmCriteria ? selectedGtmCriteria() : [];
    const salesRegion = controls.salesRegion.value;
    const salesVertical = controls.salesVertical.value;
    const staffingRegions = controls.staffingRegions
      ? staffingRegionValuesFromString(controls.staffingRegions.value)
      : (controls.staffingRegion && controls.staffingRegion.value ? [controls.staffingRegion.value] : []);
    const amoDirect = controls.amoDirect.value;
    const productsScmOwnerMe = controls.productsScmOwnerMe && controls.productsScmOwnerMe.checked;
    const productsScmOwners = controls.productsScmOwner ? productsScmOwnerValuesFromString(controls.productsScmOwner.value) : [];
    const assignedToMe = controls.assignedToMe && controls.assignedToMe.checked;
    const unmappedOnly = controls.unmappedOnly && controls.unmappedOnly.checked;
    const hideTigerEnterprise = controls.hideTigerEnterprise && controls.hideTigerEnterprise.checked;
    const slaHotlist = controls.slaHotlist && controls.slaHotlist.checked;
    const text = normalizeSpaces(controls.text.value).toLowerCase();
    const industryKey = normalizeKey(industry);
    const salesRegionKey = normalizeKey(salesRegion);
    const salesVerticalKey = normalizeKey(salesVertical);
    const staffingRegionKeys = staffingRegions.map(normalizeKey).filter(Boolean);
    const amoDirectKey = normalizeKey(normalizeAmoDirect(amoDirect));
    const productsScmOwnerMeActive = productsScmOwnerMe && productsScmUserIsOwner();
    const peopleFiltersActive = PEOPLE_FILTERS.some(filter => selectedPeopleFilterValues(filter.key).length);
    const hasNonAssignedFilters = Boolean(
      industry
      || gtmCriteria.length
      || salesRegion
      || salesVertical
      || staffingRegionKeys.length
      || amoDirect
      || productsScmOwnerMeActive
      || productsScmOwners.length
      || unmappedOnly
      || hideTigerEnterprise
      || slaHotlist
      || text
      || peopleFiltersActive
    );
    const assignedToCurrentUser = assignedToMe && rowAssignedToCurrentUser(row);

    const matchesSelectedFilters = () => {
      if (hideTigerEnterprise && rowIsTigerEnterpriseOpp(row)) return false;
      if (unmappedOnly && !isUnmappedReviewRow(row)) return false;
      if (slaHotlist && !rowSlaInfo(row).passed) return false;
      if (industry && !rowMatchesIndustryFamily(row, industryKey)) return false;
      if (!rowMatchesGtmCriteria(row, gtmCriteria)) return false;
      if (salesRegion && !isUnmappedReviewRow(row) && normalizeKey(canonicalSalesRegion(row.originalSalesRegion) || row.mappedSalesRegion) !== salesRegionKey) return false;
      if (salesVertical && normalizeKey(row.salesVertical) !== salesVerticalKey) return false;
      if (!rowMatchesPeopleFilters(row)) return false;
      if (productsScmUserCanView() && (productsScmOwnerMeActive || productsScmOwners.length)) {
        const selectedProductsScms = [
          productsScmOwnerMeActive ? currentProductsScmUserName() || getCurrentUserName() : "",
          ...productsScmOwners
        ].filter(Boolean);
        const includeUnmappedProductsScmOwners = Boolean(staffingRegionKeys.length);
        if (!rowMatchesProductsScmOwnerFilter(row, selectedProductsScms, includeUnmappedProductsScmOwners)) return false;
      }
      if (staffingRegionKeys.length) {
        const rowStaffingRegionKeys = effectiveStaffingRegionKeys(row, industryKey);
        if (!staffingRegionKeys.some(regionKey => rowStaffingRegionKeys.includes(regionKey))) return false;
      }
      if (amoDirect && normalizeKey(normalizeAmoDirect(row.amoDirect)) !== amoDirectKey) return false;
      if (text && !row.allText.includes(text)) return false;
      return true;
    };

    const selectedFiltersMatch = matchesSelectedFilters();
    if (!assignedToMe) return selectedFiltersMatch;
    return hasNonAssignedFilters ? selectedFiltersMatch || assignedToCurrentUser : assignedToCurrentUser;
  }

  function renderRow(row) {
    const summary = buildRowSummary(row);
    const displayQueueMapping = displayQueueMappingForRow(row);
    const opportunitySalesRegion = canonicalSalesRegion(summary.opportunitySalesRegion || row.originalSalesRegion);
    const displaySalesRegion = opportunitySalesRegion || displayQueueMapping.salesRegion || "";
    const salesRegionHtml = escapeHtml(displaySalesRegion || "No mapping");
    const displayIndustryFamily = primaryDisplayedIndustryFamily(row);
    const industryGroupBadges = renderDisplayedIndustryGroupBadges(row);
    const staffingRegionHtml = displayQueueMapping.staffingRegion
      ? escapeHtml(displayQueueMapping.staffingRegion)
      : displayQueueMapping.stateMappingGap
        ? `<span class="scr-helper-muted">No state mapping for ${escapeHtml(row.state || "blank state")}; visible in all staffing regions</span>`
      : displayQueueMapping.crossIndustryDisplay
        ? `<span class="scr-helper-muted">All regions for ${escapeHtml(displayIndustryFamily || "cross-industry target")}</span>`
        : `<span class="scr-helper-missing">No mapping for ${escapeHtml(displayIndustryFamily || "blank SC industry group")} / ${escapeHtml(row.state || "blank state")}</span>`;
    const opportunityValue = summary.opportunityDisplay;
    const opportunityHtml = summary.opportunityLink
      ? fieldLinkHtml(summary.opportunityField, opportunityValue, /opprtnty|opportunity|transaction/i)
      : opportunityValue
        ? escapeHtml(opportunityValue)
        : `<span class="scr-helper-muted">No linked opportunity</span>`;
    const companyHtml = summary.companyField
      ? fieldLinkHtml(summary.companyField, summary.companyDisplay, /customer|custjob|entity|record/i)
      : "";
    const billingLocation = [summary.billingCity, summary.billingState || row.state].filter(Boolean).join(", ");
    const requestType = requestTypeLabel(row.amoDirect);
    const requestKey = requestTypeKey(row.amoDirect);
    const requestColor = requestTypeColor(requestKey);
    const requestClass = requestKey ? ` is-request-${requestKey}` : "";
    const titleScrPrefix = formatScrTitlePrefix(row.scrDisplayId);
    const titleOpportunity = opportunityValue || "No linked opportunity";
    const titleCompany = summary.companyDisplay;
    const industryBranding = getIndustryGroupBranding(displayIndustryFamily) || getIndustryGroupBranding(row.industryFamily);
    const cardStyle = industryBranding
      ? `style="--scr-industry-color: ${escapeHtml(industryBranding.color)}; --scr-industry-bg: ${escapeHtml(industryBranding.soft)};"`
      : "";
    const titleBadges = [
      industryGroupBadges,
      renderGtmSubgroupBadge(summary.gtmIndustrySubgroup),
      renderTigerEnterpriseBadge(summary.salesVertical) || renderTigerEnterpriseBadge(summary.salesTier),
      renderSlaBadge(summary.slaInfo)
    ].filter(Boolean).join("");

    const columns = [
      renderSummaryColumn("Industry & Assignment", [
        renderSummaryItem("Request Type", requestType || "Not found"),
        renderSummaryItem("SC Industry Group", "", { html: industryGroupBadges || "Not found" }),
        renderSummaryItem("FY27 GTM Industry", "", { html: renderGtmIndustryValue(summary.gtmIndustry) || "Not found" }),
        renderSummaryItem("FY27 GTM Industry Subgroup", "", { html: renderGtmSubgroupBadge(summary.gtmIndustrySubgroup) || "Not found" }),
        renderSummaryItem("Sales Region", "", { html: salesRegionHtml }),
        renderSummaryItem("SC Staffing Region", "", { html: staffingRegionHtml }),
        renderSummaryItem("SCM Owner", "", { html: renderProductsScmOwnerValue(row) }),
        renderSummaryItem("Assigned To", "", { html: renderAssignedToWithOwnership(row, summary.assignedTo) }),
        renderSummaryItem("Cross-Vertical", summary.crossVertical || "No")
      ]),
      renderSummaryColumn("SC Request Details", [
        renderSummaryItem("Submitted", summary.submittedDate),
        renderSummaryItem("SCR Age", summary.scrAge),
        renderSummaryItem("Date Needed", summary.dateNeeded, { strong: true }),
        summary.travelRequested
          ? renderSummaryItem("Travel", "", { html: `<span class="scr-helper-travel-icon" aria-label="Travel requested">✈</span> on-site/travel requested` })
          : "",
        renderSummaryItem("Deliverable", summary.deliverable || "Unknown"),
        renderSummaryItem(
          "Request Details",
          summary.requestDetails,
          summary.requestDetailsHtml
            ? { html: summary.requestDetailsHtml, long: true, rich: true }
            : { multiline: true, long: true }
        )
      ], "scr-helper-wide-text"),
      renderSummaryColumn("Opportunity", [
        renderSummaryItem("Opportunity Record", "", { html: opportunityHtml }),
        renderSummaryItem("Expected Close Date", summary.expectedCloseDate),
        renderSummaryItem("Project ARR", summary.projectArr),
        renderSummaryItem("Sales Rep", summary.salesRep),
        renderSummaryItem("Regional Director", summary.salesDirector),
        renderSummaryItem("Regional VP", summary.regionalVp),
        renderSummaryItem("Industry Leader/AVP", summary.industryLeader),
        renderSummaryItem(
          "Sales Tier",
          summary.salesTier,
          isTigerEnterpriseSalesTier(summary.salesTier)
            ? { html: renderTigerEnterpriseBadge(summary.salesTier) }
            : {}
        ),
        renderSummaryItem("Sales Region", opportunitySalesRegion || displayQueueMapping.salesRegion),
        renderSummaryItem(
          "Sales Vertical",
          summary.salesVertical,
          isTigerEnterpriseValue(summary.salesVertical)
            ? { html: renderTigerEnterpriseBadge(summary.salesVertical) }
            : {}
        )
      ]),
      renderSummaryColumn("Company", [
        renderSummaryItem("Company Name", "", { html: companyHtml || escapeHtml(summary.companyField && summary.companyField.value || "") }),
        renderSummaryItem("Website", "", { html: externalLinkHtml(summary.websiteField) }),
        renderSummaryItem("LinkedIn", "", { html: externalLinkHtml(summary.linkedinField, "LinkedIn") }),
        renderSummaryItem("Company Size", summary.companySize),
        renderSummaryItem("Annual Revenue", summary.annualRevenue || "Unknown"),
        renderSummaryItem("Billing City/State", billingLocation),
        renderSummaryItem("Prospect Region", summary.prospectRegion),
        renderSummaryItem("Lead Source", summary.leadSource),
        renderSummaryItem("Lead Fit", summary.leadFit),
        renderSummaryItem("Alliance", summary.allianceInfo)
      ]),
      renderSummaryColumn("Staffing Notes", [
        renderSummaryItem("Cross Industry Staffing", "", { html: renderCrossIndustryStaffingControls(row) }),
        renderStaffingNotesEditor(row, summary.staffingNotes)
      ])
    ];

    return `
      <article class="scr-helper-card${requestClass}${summary.slaInfo.passed ? " is-sla-passed" : ""}" data-row-id="${escapeHtml(row.id)}" data-request-type="${escapeHtml(requestKey)}" ${cardStyle}>
        <div class="scr-helper-card-head">
          <div>
            <div class="scr-helper-card-title" ${requestColor ? `style="color: ${escapeHtml(requestColor)};"` : ""}>
              ${titleScrPrefix ? `<strong class="scr-helper-title-scr">${escapeHtml(titleScrPrefix)}</strong><span class="scr-helper-title-separator">|</span>` : ""}
              <span>${escapeHtml(titleOpportunity)}</span>
              ${titleCompany ? `<span class="scr-helper-title-separator">|</span><strong>${escapeHtml(titleCompany)}</strong>` : ""}
              ${renderCopyLinkControl(row)}
            </div>
            ${titleBadges ? `<div class="scr-helper-card-badges">${titleBadges}</div>` : ""}
          </div>
          ${renderStaffScrControl(row, requestColor)}
        </div>
        <div class="scr-helper-summary-grid">${columns.join("")}</div>
      </article>
    `;
  }

  function filterSummaryItems(controls) {
    if (!controls || !controls.industry) return [];

    const items = [];
    const add = (label, value, displayValue = value, extra = {}) => {
      const normalized = normalizeSpaces(value);
      if (normalized) {
        const groupKey = extra.groupKey || `${extra.removeType || "filter"}:${extra.removeKey || normalizeKey(label)}`;
        items.push({ label, value: normalizeSpaces(displayValue) || normalized, removable: true, section: "queue", groupKey, ...extra });
      }
    };

    add("SC Industry Group", controls.industry.value, industryOptionLabel(controls.industry.value), { removeType: "select", removeKey: "industry" });
    if (controls.gtmCriteria) {
      selectedGtmCriteria().forEach(criterion => {
        add("FY27 GTM", gtmCriterionLabel(criterion), gtmCriterionLabel(criterion), {
          removeType: "gtmCriteria",
          groupKey: "gtmCriteria",
          removeValue: gtmCriterionKey(criterion)
        });
      });
    }
    add("Sales Region", controls.salesRegion.value, controls.salesRegion.value, { removeType: "select", removeKey: "salesRegion" });
    add("Sales Vertical", controls.salesVertical.value, controls.salesVertical.value, { removeType: "select", removeKey: "salesVertical" });
    if (controls.staffingRegions) {
      staffingRegionValuesFromString(controls.staffingRegions.value).forEach(region => {
        add("SC Region", region, region, { removeType: "staffingRegion", groupKey: "staffingRegion" });
      });
    } else {
      add("SC Region", controls.staffingRegion.value, controls.staffingRegion.value, { removeType: "select", removeKey: "staffingRegion" });
    }
    add("Type", controls.amoDirect.value, controls.amoDirect.value, { removeType: "select", removeKey: "amoDirect" });
    if (controls.productsScmOwnerMe && controls.productsScmOwnerMe.checked) {
      add("SCM Owner", currentProductsScmUserName() ? `Me (${currentProductsScmUserName()})` : "Me", undefined, { removeType: "checkbox", removeKey: "productsScmOwnerMe", groupKey: "scmOwner", section: "owner" });
    }
    if (controls.productsScmOwner) {
      productsScmOwnerValuesFromString(controls.productsScmOwner.value).forEach(owner => {
        add("SCM Owner", owner, owner, { removeType: "productsScmOwner", groupKey: "scmOwner", section: "owner" });
      });
    }
    PEOPLE_FILTERS.forEach(filter => {
      selectedPeopleFilterValues(filter.key).forEach(person => {
        add(filter.label, person, person, { removeType: "people", removeKey: filter.key, groupKey: "people", section: "people" });
      });
    });
    if (controls.assignedToMe && controls.assignedToMe.checked) {
      add("Assigned", getCurrentUserName() ? `Me (${getCurrentUserName()})` : "Me", undefined, { removeType: "checkbox", removeKey: "assignedToMe", section: "assigned", sectionConnector: items.length ? "OR" : "" });
    }
    if (controls.unmappedOnly && controls.unmappedOnly.checked) add("Review", "Unmapped", undefined, { removeType: "checkbox", removeKey: "unmappedOnly", section: "flags" });
    if (controls.hideTigerEnterprise && controls.hideTigerEnterprise.checked) add("Hidden", "Enterprise / Tiger", undefined, { removeType: "checkbox", removeKey: "hideTigerEnterprise", section: "flags" });
    if (controls.slaHotlist && controls.slaHotlist.checked) add("SLA", "Past 24h", undefined, { removeType: "checkbox", removeKey: "slaHotlist", section: "flags" });
    add("Search", controls.text.value, controls.text.value, { removeType: "text", removeKey: "text", section: "search" });

    return items;
  }

  function updateFilterSummary() {
    const summary = document.getElementById("scr-helper-filter-summary");
    if (!summary) return;

    const items = filterSummaryItems(getControls());
    const connectorFor = (lineItems, item, index) => {
      if (!index) return "";
      if (item.connectorBefore) return item.connectorBefore;
      return item.groupKey && item.groupKey === lineItems[index - 1].groupKey ? "OR" : "AND";
    };
    const renderConnector = connector => connector
      ? `<span class="scr-helper-filter-operator is-${escapeHtml(connector.toLowerCase())}" title="${escapeHtml(connector === "OR" ? "Either filter group can match" : "Both filter groups must match")}">${escapeHtml(connector)}</span>`
      : "";
    const renderExpression = lineItems => {
      const groupRanges = new Map();
      lineItems.forEach((item, index) => {
        if (!item.groupKey) return;
        const range = groupRanges.get(item.groupKey) || { first: index, last: index, count: 0 };
        range.last = index;
        range.count += 1;
        groupRanges.set(item.groupKey, range);
      });
      const opensGroup = (item, index) => {
        const range = item.groupKey && groupRanges.get(item.groupKey);
        return Boolean(range && range.count > 1 && range.first === index);
      };
      const closesGroup = (item, index) => {
        const range = item.groupKey && groupRanges.get(item.groupKey);
        return Boolean(range && range.count > 1 && range.last === index);
      };
      return lineItems.map((item, index) => `
        ${renderConnector(connectorFor(lineItems, item, index))}
        ${opensGroup(item, index) ? `<span class="scr-helper-filter-paren" aria-hidden="true">(</span>` : ""}
        <span class="scr-helper-filter-chip${item.removable ? " is-removable" : ""}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          ${item.removable ? `<button type="button" class="scr-helper-filter-chip-remove" data-filter-remove="${escapeHtml(item.removeType)}" data-filter-key="${escapeHtml(item.removeKey || "")}" data-filter-value="${escapeHtml(item.removeValue || item.value)}" aria-label="Remove ${escapeHtml(item.value)}">×</button>` : ""}
        </span>
        ${closesGroup(item, index) ? `<span class="scr-helper-filter-paren" aria-hidden="true">)</span>` : ""}
      `).join("");
    };
    const sections = [];
    items.forEach(item => {
      const key = item.section || "queue";
      let section = sections.find(entry => entry.key === key);
      if (!section) {
        section = {
          key,
          connector: sections.length ? item.sectionConnector || "AND" : "",
          items: []
        };
        sections.push(section);
      } else if (item.sectionConnector) {
        section.connector = item.sectionConnector;
      }
      section.items.push(item);
    });
    summary.classList.toggle("is-empty", !items.length);
    summary.innerHTML = items.length
      ? sections.map(section => `
          <div class="scr-helper-filter-expression-line">
            ${renderConnector(section.connector)}
            <span class="scr-helper-filter-expression">${renderExpression(section.items)}</span>
          </div>
        `).join("")
      : `<span class="scr-helper-filter-empty">No filters applied</span>`;
  }

  function handleFilterRemove(button) {
    const controls = getControls();
    const type = button.dataset.filterRemove;
    const key = button.dataset.filterKey;
    const value = button.dataset.filterValue;

    if (type === "people") {
      removePeopleFilter(key, value);
      return;
    }
    if (type === "productsScmOwner") {
      removeProductsScmOwnerFilter(value);
      return;
    }
    if (type === "staffingRegion") {
      removeStaffingRegionFilter(value);
      return;
    }
    if (type === "gtmCriteria") {
      removeGtmCriterionFilter(value);
      return;
    }

    if (type === "select" && controls[key]) {
      controls[key].value = "";
    } else if (type === "checkbox" && controls[key]) {
      controls[key].checked = false;
    } else if (type === "text" && controls[key]) {
      controls[key].value = "";
    } else {
      return;
    }

    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function readHelperState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HELPER_STATE_STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("SCR helper could not read saved helper state", error);
      return {};
    }
  }

  function getFilterState(controls = getControls()) {
    return {
      industry: controls.industry ? controls.industry.value : "",
      gtmCriteria: controls.gtmCriteria ? selectedGtmCriteria().map(criterion => ({
        industry: criterion.industry,
        subgroup: criterion.subgroup
      })) : [],
      salesRegion: controls.salesRegion ? controls.salesRegion.value : "",
      salesVertical: controls.salesVertical ? controls.salesVertical.value : "",
      peopleFilters: selectedPeopleFilterMap(),
      productsScmOwnerMe: Boolean(controls.productsScmOwnerMe && controls.productsScmOwnerMe.checked),
      productsScmOwners: controls.productsScmOwner ? productsScmOwnerValuesFromString(controls.productsScmOwner.value) : [],
      productsScmOwner: controls.productsScmOwner ? productsScmOwnerValuesFromString(controls.productsScmOwner.value)[0] || "" : "",
      staffingRegions: controls.staffingRegions ? staffingRegionValuesFromString(controls.staffingRegions.value) : [],
      staffingRegion: controls.staffingRegions ? staffingRegionValuesFromString(controls.staffingRegions.value)[0] || "" : (controls.staffingRegion ? controls.staffingRegion.value : ""),
      amoDirect: controls.amoDirect ? controls.amoDirect.value : "",
      assignedToMe: Boolean(controls.assignedToMe && controls.assignedToMe.checked),
      unmappedOnly: Boolean(controls.unmappedOnly && controls.unmappedOnly.checked),
      hideTigerEnterprise: Boolean(controls.hideTigerEnterprise && controls.hideTigerEnterprise.checked),
      slaHotlist: Boolean(controls.slaHotlist && controls.slaHotlist.checked),
      text: controls.text ? controls.text.value : ""
    };
  }

  function getPortletMaximized() {
    const portlet = document.getElementById(HELPER_ID);
    return Boolean(portlet && portlet.classList.contains("scr-helper-fullscreen"));
  }

  function writeHelperState(nextState = {}) {
    helperState = {
      ...helperState,
      ...nextState,
      filters: nextState.filters || helperState.filters || {}
    };
    try {
      localStorage.setItem(HELPER_STATE_STORAGE_KEY, JSON.stringify(helperState));
    } catch (error) {
      console.warn("SCR helper could not save helper state", error);
    }
  }

  function saveHelperState() {
    writeHelperState({
      maximized: getPortletMaximized(),
      filtersCollapsed,
      filters: getFilterState()
    });
  }

  function scriptVersionFromText(text) {
    const match = String(text || "").match(/^\s*\/\/\s*@version\s+([^\s]+)/m);
    return match ? normalizeSpaces(match[1]) : "";
  }

  function versionTokens(value) {
    return String(value || "").match(/\d+|[a-z]+/gi) || [];
  }

  function compareScriptVersions(left, right) {
    const leftTokens = versionTokens(left);
    const rightTokens = versionTokens(right);
    const max = Math.max(leftTokens.length, rightTokens.length);
    for (let index = 0; index < max; index += 1) {
      const leftToken = leftTokens[index] || "0";
      const rightToken = rightTokens[index] || "0";
      const leftNumber = /^\d+$/.test(leftToken) ? Number(leftToken) : null;
      const rightNumber = /^\d+$/.test(rightToken) ? Number(rightToken) : null;
      if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) return leftNumber - rightNumber;
      if (leftNumber !== null && rightNumber === null) return 1;
      if (leftNumber === null && rightNumber !== null) return -1;
      const compared = String(leftToken).localeCompare(String(rightToken));
      if (compared) return compared;
    }
    return 0;
  }

  function readUpdateCheckCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(SCRIPT_UPDATE_CHECK_CACHE_KEY) || "null");
      return cached && typeof cached === "object" ? cached : null;
    } catch (error) {
      return null;
    }
  }

  function writeUpdateCheckCache(value) {
    try {
      localStorage.setItem(SCRIPT_UPDATE_CHECK_CACHE_KEY, JSON.stringify({
        checkedAt: Date.now(),
        ...value
      }));
    } catch (error) {
      console.warn("IQUEUE could not cache update check", error);
    }
  }

  function gmGetValue(key, fallback = null) {
    try {
      return typeof GM_getValue === "function" ? GM_getValue(key, fallback) : fallback;
    } catch (error) {
      console.warn("IQUEUE could not read Tampermonkey storage", error);
      return fallback;
    }
  }

  function gmSetValue(key, value) {
    try {
      if (typeof GM_setValue === "function") GM_setValue(key, value);
    } catch (error) {
      console.warn("IQUEUE could not write Tampermonkey storage", error);
    }
  }

  function scriptUpdateCheckUrl() {
    const separator = SCRIPT_UPDATE_URL.includes("?") ? "&" : "?";
    return `${SCRIPT_UPDATE_URL}${separator}t=${Date.now()}`;
  }

  function fetchScriptUpdateText() {
    const url = scriptUpdateCheckUrl();
    const request = {
      method: "GET",
      url,
      headers: {
        "Cache-Control": "no-cache"
      },
      timeout: 15000
    };

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          ...request,
          onload(response) {
            if (response.status >= 200 && response.status < 300) {
              resolve(String(response.responseText || ""));
              return;
            }
            reject(new Error(`Update check failed: ${response.status || "unknown status"}`));
          },
          onerror() {
            reject(new Error("Update check failed: network error"));
          },
          ontimeout() {
            reject(new Error("Update check failed: timed out"));
          }
        });
      });
    }

    if (typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function") {
      return Promise.resolve(GM.xmlHttpRequest(request)).then(response => {
        if (response.status >= 200 && response.status < 300) return String(response.responseText || "");
        throw new Error(`Update check failed: ${response.status || "unknown status"}`);
      });
    }

    return fetch(url, {
      cache: "no-cache",
      credentials: "omit"
    }).then(response => {
      if (!response.ok) throw new Error(`Update check failed: ${response.status}`);
      return response.text();
    });
  }

  function setScriptUpdateStatus(message = "", options = {}) {
    const portlet = document.getElementById(HELPER_ID);
    const version = document.getElementById("scr-helper-version");
    const link = document.getElementById("scr-helper-update-link");
    if (!portlet || !version || !link) return;

    const tone = options.tone || "";
    portlet.classList.toggle("scr-helper-update-available", tone === "available");
    portlet.classList.toggle("scr-helper-update-checking", tone === "checking");
    portlet.classList.toggle("scr-helper-update-error", tone === "error");
    version.textContent = `Version ${HELPER_VERSION}${message ? ` · ${message}` : ""}`;
    version.title = options.title || "";
    link.hidden = !options.linkVisible;
    if (options.linkVisible) {
      link.href = options.href || SCRIPT_UPDATE_URL;
      link.textContent = options.linkText || "Update available";
    }
  }

  function setScriptUpdateAvailable(remoteVersion) {
    setScriptUpdateStatus(`Update ${remoteVersion} available`, {
      tone: "available",
      linkVisible: true,
      href: SCRIPT_UPDATE_URL,
      linkText: "Update available"
    });
  }

  function clearScriptUpdateAvailable(message = "") {
    setScriptUpdateStatus(message);
  }

  async function checkForScriptUpdate(options = {}) {
    const force = Boolean(options.force);
    const cached = readUpdateCheckCache();
    if (!force && cached && Date.now() - cached.checkedAt < SCRIPT_UPDATE_CHECK_INTERVAL_MS) {
      if (cached.updateAvailable && cached.remoteVersion) setScriptUpdateAvailable(cached.remoteVersion);
      return;
    }

    try {
      if (force) setScriptUpdateStatus("Checking for update...", { tone: "checking" });
      const remoteVersion = scriptVersionFromText(await fetchScriptUpdateText());
      if (!remoteVersion) throw new Error("Update check failed: remote version not found");
      const updateAvailable = Boolean(remoteVersion && compareScriptVersions(HELPER_VERSION, remoteVersion) < 0);
      writeUpdateCheckCache({ remoteVersion, updateAvailable });
      if (updateAvailable) setScriptUpdateAvailable(remoteVersion);
      else {
        const currentMessage = compareScriptVersions(HELPER_VERSION, remoteVersion) === 0
          ? `Up to date (${remoteVersion})`
          : `No newer update (latest ${remoteVersion})`;
        clearScriptUpdateAvailable(force ? currentMessage : "");
      }
    } catch (error) {
      console.warn("IQUEUE update check failed", error);
      writeUpdateCheckCache({ error: error.message || "Update check failed", updateAvailable: false });
      if (force) {
        setScriptUpdateStatus("Update check failed", {
          tone: "error",
          title: error.message || "Update check failed"
        });
      }
    }
  }

  function setGraphTokenStatus(message, tone = "", detail = "") {
    const status = document.getElementById("scr-helper-graph-token-status");
    const optionsStatus = document.getElementById("scr-helper-graph-token-options-status");
    const text = normalizeSpaces(message);
    const shouldShowRefreshLink = Boolean(text && tone !== "good" && tone !== "checking");
    const html = text
      ? `${escapeHtml(text)}${shouldShowRefreshLink ? ` <a href="${escapeHtml(GRAPH_TOKEN_REFRESH_RELAY_URL)}" target="_blank">Refresh token</a>` : ""}`
      : "";
    [status, optionsStatus].filter(Boolean).forEach(element => {
      element.hidden = !text;
      element.dataset.tone = tone || "";
      element.innerHTML = html;
      element.title = detail || "";
    });
  }

  function isGraphTokenRefreshPage() {
    return IS_GRAPH_TOKEN_REFRESH_PAGE;
  }

  function decodeJwtPayload(token) {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    try {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
      return JSON.parse(atob(padded));
    } catch (error) {
      return null;
    }
  }

  function graphTokenBase64ToBytes(value) {
    const binary = atob(String(value || ""));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function graphTokenScopesFromPayload(payload) {
    if (!payload || typeof payload !== "object") return [];
    const scopes = [];
    if (typeof payload.scp === "string") scopes.push(...payload.scp.split(/\s+/));
    if (Array.isArray(payload.roles)) scopes.push(...payload.roles);
    return uniqueSorted(scopes.map(normalizeSpaces).filter(Boolean));
  }

  function graphTokenHasScope(tokenInfo, scope) {
    const wanted = normalizeKey(scope);
    return Boolean(tokenInfo && Array.isArray(tokenInfo.scopes) && tokenInfo.scopes.some(item => normalizeKey(item) === wanted));
  }

  function tokenLooksLikeJwt(value) {
    return /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/.test(String(value || ""));
  }

  function jwtTokensFromString(value) {
    const matches = String(value || "").match(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g);
    return matches || [];
  }

  function graphTokenCandidateScore(token, source = "") {
    const payload = decodeJwtPayload(token);
    if (!payload) return 0;
    const expiresAt = Number(payload.exp || 0) * 1000;
    if (!expiresAt || expiresAt <= Date.now()) return 0;

    const scopes = graphTokenScopesFromPayload(payload);
    const aud = normalizeSpaces(payload.aud || "");
    const sourceKey = normalizeKey(source);
    let score = 10;
    if (/graph\.microsoft\.com/i.test(aud) || aud === "00000003-0000-0000-c000-000000000000") score += 50;
    if (scopes.some(scope => /^mail\.send$/i.test(scope))) score += 30;
    if (scopes.some(scope => /^calendars?\./i.test(scope))) score += 10;
    if (/access|graph|token|bearer/.test(sourceKey)) score += 8;
    score += Math.min(12, Math.max(0, Math.floor((expiresAt - Date.now()) / (60 * 60 * 1000))));
    return score;
  }

  function graphTokenInfoFromToken(token, source = "") {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    const expiresAt = Number(payload.exp || 0) * 1000;
    const scopes = graphTokenScopesFromPayload(payload);
    return {
      token,
      source,
      checkedAt: Date.now(),
      expiresAt,
      scopes,
      audience: normalizeSpaces(payload.aud || ""),
      user: normalizeSpaces(payload.upn || payload.preferred_username || payload.email || payload.unique_name || "")
    };
  }

  function storeGraphAccessTokenFromToken(token, source = "") {
    const info = graphTokenInfoFromToken(token, source);
    if (!info || !info.token || !info.expiresAt || info.expiresAt <= Date.now()) return null;
    gmSetValue(GRAPH_ACCESS_TOKEN_KEY, info);
    return info;
  }

  function writeGraphTokenStatusBridge(tokenInfo, status = {}) {
    const expiresAt = Number(tokenInfo && tokenInfo.expiresAt || status.expiresAt || 0);
    const valid = Boolean(tokenInfo && tokenInfo.token && expiresAt > Date.now() || status.valid);
    gmSetValue(GRAPH_TOKEN_STATUS_KEY, {
      checkedAt: Date.now(),
      source: status.source || tokenInfo && tokenInfo.source || "calendar-refresh",
      valid,
      expiresAt,
      tokenAvailable: Boolean(tokenInfo && tokenInfo.token),
      scopes: tokenInfo && tokenInfo.scopes || status.scopes || [],
      message: status.message || (valid ? "Saved token ready." : "Token status not found.")
    });
  }

  function graphTokenRelayTargets() {
    return [
      "https://nlcorp.app.netsuite.com",
      "https://nlcorp-sb2.app.netsuite.com"
    ];
  }

  function postGraphTokenRelay(tokenInfo) {
    if (!tokenInfo || !tokenInfo.token || !isGraphTokenRefreshPage()) return;
    const payload = {
      kind: GRAPH_TOKEN_RELAY_KIND,
      token: tokenInfo.token,
      expiresAt: tokenInfo.expiresAt || 0,
      source: tokenInfo.source || "calendar-refresh"
    };
    const targets = [window.opener, window.parent].filter(target => target && target !== window);
    targets.forEach(target => {
      graphTokenRelayTargets().forEach(origin => {
        try {
          target.postMessage(payload, origin);
        } catch (error) {
          console.warn("IQUEUE could not post Graph token relay", error);
        }
      });
    });
  }

  function installGraphTokenRelayListener() {
    if (window.__iqueueGraphTokenRelayListenerInstalled) return;
    window.__iqueueGraphTokenRelayListenerInstalled = true;
    window.addEventListener("message", event => {
      if (event.origin !== "https://mcanderson14.github.io") return;
      const data = event.data || {};
      if (!data || data.kind !== GRAPH_TOKEN_RELAY_KIND || !data.token) return;
      const tokenInfo = storeGraphAccessTokenFromToken(data.token, data.source || "calendar-refresh:postMessage");
      if (!tokenInfo) {
        setGraphTokenStatus("Microsoft Graph token relay did not contain a usable access token.", "warn");
        return;
      }
      writeGraphTokenStatusBridge(tokenInfo, {
        source: "calendar-refresh:postMessage",
        message: "Saved token ready."
      });
      setGraphTokenStatus(
        `Graph token synced${tokenInfo.expiresAt ? ` until ${formatGraphTokenExpiry(tokenInfo.expiresAt)}` : ""}.`,
        "good"
      );
    });
  }

  function captureBearerTokenFromText(value, source = "") {
    const text = String(value || "");
    const bearerMatch = text.match(/Bearer\s+(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/i);
    if (bearerMatch) return storeGraphAccessTokenFromToken(bearerMatch[1], source);
    const tokens = jwtTokensFromString(text);
    for (const token of tokens) {
      if (graphTokenCandidateScore(token, source) > 0) return storeGraphAccessTokenFromToken(token, source);
    }
    return null;
  }

  function captureBearerTokenFromHeaders(headers, source = "") {
    if (!headers) return null;
    try {
      if (typeof Headers !== "undefined" && headers instanceof Headers) {
        return captureBearerTokenFromText(headers.get("Authorization") || headers.get("authorization") || "", source);
      }
      if (Array.isArray(headers)) {
        for (const [key, value] of headers) {
          if (/^authorization$/i.test(key)) {
            const info = captureBearerTokenFromText(value, source);
            if (info) return info;
          }
        }
        return null;
      }
      if (typeof headers === "object") {
        const key = Object.keys(headers).find(item => /^authorization$/i.test(item));
        return key ? captureBearerTokenFromText(headers[key], source) : null;
      }
    } catch (error) {
      console.warn("IQUEUE could not inspect request headers for Graph token", error);
    }
    return null;
  }

  function collectGraphTokenCandidatesFromValue(value, source = "", depth = 0) {
    if (depth > 4 || value == null) return [];
    if (typeof value === "string") {
      return jwtTokensFromString(value).map(token => ({ token, source }));
    }
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => collectGraphTokenCandidatesFromValue(item, `${source}[${index}]`, depth + 1));
    }
    if (typeof value === "object") {
      return Object.entries(value).flatMap(([key, item]) => (
        collectGraphTokenCandidatesFromValue(item, source ? `${source}.${key}` : key, depth + 1)
      ));
    }
    return [];
  }

  function collectGraphTokenCandidatesFromStorage(storage, label) {
    const candidates = [];
    if (!storage) return candidates;
    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        const raw = storage.getItem(key);
        if (!raw || !tokenLooksLikeJwt(raw)) continue;
        let value = raw;
        try {
          value = JSON.parse(raw);
        } catch (error) {
          value = raw;
        }
        candidates.push(...collectGraphTokenCandidatesFromValue(value, `${label}:${key}`));
      }
    } catch (error) {
      console.warn(`IQUEUE could not inspect ${label} for Graph token`, error);
    }
    return candidates;
  }

  function collectGraphTokenCandidatesFromPageFields() {
    try {
      return Array.from(document.querySelectorAll("textarea,input"))
        .flatMap(field => {
          const value = field && field.value || "";
          if (!tokenLooksLikeJwt(value)) return [];
          const name = field.getAttribute("name") || field.id || field.placeholder || "field";
          return collectGraphTokenCandidatesFromValue(value, `page:${name}`);
        });
    } catch (error) {
      console.warn("IQUEUE could not inspect refresh-page fields for Graph token", error);
      return [];
    }
  }

  function graphAccessTokenFromRefreshPage() {
    const candidates = []
      .concat(collectGraphTokenCandidatesFromStorage(window.localStorage, "localStorage"))
      .concat(collectGraphTokenCandidatesFromStorage(window.sessionStorage, "sessionStorage"))
      .concat(collectGraphTokenCandidatesFromPageFields())
      .map(candidate => ({
        ...candidate,
        score: graphTokenCandidateScore(candidate.token, candidate.source)
      }))
      .filter(candidate => candidate.score > 0)
      .sort((left, right) => right.score - left.score);

    const best = candidates[0];
    return best ? graphTokenInfoFromToken(best.token, best.source) : null;
  }

  async function graphAccessTokenFromRefreshPageEncryptedVault() {
    try {
      if (!window.crypto || !window.crypto.subtle) return null;
      const rawRecord = window.localStorage.getItem(CALENDAR_GRAPH_TOKEN_VAULT_KEY);
      const rawKey = window.localStorage.getItem(CALENDAR_GRAPH_TOKEN_LOCAL_KEY);
      if (!rawRecord || !rawKey) return null;

      const record = JSON.parse(rawRecord);
      if (!record || record.kind !== "sc-calendar-graph-explorer-token-vault" || record.keyMode !== "browser-local") return null;
      if (!record.ciphertext || !record.iv) return null;

      const key = await window.crypto.subtle.importKey(
        "raw",
        graphTokenBase64ToBytes(rawKey),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const plaintext = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: graphTokenBase64ToBytes(record.iv) },
        key,
        graphTokenBase64ToBytes(record.ciphertext)
      );
      const payload = JSON.parse(new TextDecoder().decode(plaintext));
      const token = normalizeSpaces(payload && payload.token || "");
      return token ? storeGraphAccessTokenFromToken(token, "calendar-refresh:encrypted-vault") : null;
    } catch (error) {
      console.warn("IQUEUE could not read encrypted Graph token vault", error);
      return null;
    }
  }

  async function graphAccessTokenFromRefreshPageVault() {
    const pageWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
    const readerNames = ["getStoredGraphExplorerToken", "getGraphExplorerToken"];
    for (const readerName of readerNames) {
      const reader = pageWindow && pageWindow[readerName];
      if (typeof reader !== "function") continue;
      try {
        const value = await reader.call(pageWindow);
        const token = typeof value === "string" ? value : value && value.token;
        const info = token ? storeGraphAccessTokenFromToken(token, `calendar-refresh:${readerName}`) : null;
        if (info) return info;
      } catch (error) {
        console.warn(`IQUEUE could not read Graph token through ${readerName}`, error);
      }
    }
    return graphAccessTokenFromRefreshPageEncryptedVault();
  }

  function installGraphTokenRequestCapture() {
    if (window.__iqueueGraphTokenCaptureInstalled) return;
    window.__iqueueGraphTokenCaptureInstalled = true;

    try {
      const originalFetch = window.fetch;
      if (typeof originalFetch === "function") {
        window.fetch = function patchedIqueueFetch(input, init) {
          try {
            if (init && init.headers) captureBearerTokenFromHeaders(init.headers, "fetch:init");
            if (input && input.headers) captureBearerTokenFromHeaders(input.headers, "fetch:request");
          } catch (error) {
            console.warn("IQUEUE fetch token capture failed", error);
          }
          return originalFetch.apply(this, arguments);
        };
      }
    } catch (error) {
      console.warn("IQUEUE could not patch fetch for Graph token capture", error);
    }

    try {
      const OriginalXhr = window.XMLHttpRequest;
      if (OriginalXhr && OriginalXhr.prototype) {
        const originalSetRequestHeader = OriginalXhr.prototype.setRequestHeader;
        OriginalXhr.prototype.setRequestHeader = function patchedIqueueSetRequestHeader(name, value) {
          try {
            if (/^authorization$/i.test(name)) captureBearerTokenFromText(value, "xhr");
          } catch (error) {
            console.warn("IQUEUE XHR token capture failed", error);
          }
          return originalSetRequestHeader.apply(this, arguments);
        };
      }
    } catch (error) {
      console.warn("IQUEUE could not patch XHR for Graph token capture", error);
    }
  }

  function expiryFromUnknownValue(value, depth = 0) {
    if (depth > 4 || value == null) return 0;
    if (typeof value === "number") {
      if (value > 1000000000000) return value;
      if (value > 1000000000) return value * 1000;
      return 0;
    }
    if (typeof value === "string") {
      const text = value.trim();
      const jwtMatch = text.match(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/);
      if (jwtMatch) {
        const payload = decodeJwtPayload(jwtMatch[0]);
        if (payload && payload.exp) return Number(payload.exp) * 1000;
      }
      if (/^\d{10,13}$/.test(text)) return expiryFromUnknownValue(Number(text), depth + 1);
      const parsedDate = Date.parse(text);
      return Number.isFinite(parsedDate) ? parsedDate : 0;
    }
    if (Array.isArray(value)) {
      return value.map(item => expiryFromUnknownValue(item, depth + 1)).filter(Boolean).sort((a, b) => b - a)[0] || 0;
    }
    if (typeof value === "object") {
      const preferredKeys = Object.keys(value).filter(key => /(?:expires?|expiry|expiration|expiresAt|expiresOn|exp|validUntil)/i.test(key));
      for (const key of preferredKeys) {
        const expiry = expiryFromUnknownValue(value[key], depth + 1);
        if (expiry) return expiry;
      }
      return Object.values(value).map(item => expiryFromUnknownValue(item, depth + 1)).filter(Boolean).sort((a, b) => b - a)[0] || 0;
    }
    return 0;
  }

  function graphTokenStatusFromStorage() {
    const expiries = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        let value = raw;
        try {
          value = JSON.parse(raw);
        } catch (error) {
          value = raw;
        }
        const expiry = expiryFromUnknownValue(value);
        if (expiry) expiries.push(expiry);
      }
    } catch (error) {
      console.warn("IQUEUE could not inspect refresh-page local storage", error);
    }
    return expiries.sort((a, b) => b - a)[0] || 0;
  }

  function graphTokenStatusFromPageText() {
    const text = normalizeSpaces(document.body && document.body.innerText || "");
    if (!text) return { valid: false, expiresAt: 0, message: "Token status not found." };

    const expired = /\b(?:expired|not\s+ready|missing|invalid)\b/i.test(text) && !/saved\s+token\s+ready/i.test(text);
    const expiryMatch = text.match(/Expires\s+(.+?)(?:\s*\(([^)]*)\)|$)/i);
    let expiresAt = expiryMatch ? Date.parse(normalizeSpaces(expiryMatch[1])) : 0;
    if (!expiresAt && expiryMatch && expiryMatch[2]) {
      const relative = expiryMatch[2].match(/(\d+(?:\.\d+)?)\s*(hr|hour|hours|min|minute|minutes)/i);
      if (relative) {
        const amount = Number(relative[1]);
        const unit = relative[2].toLowerCase();
        expiresAt = Date.now() + amount * (/^h/.test(unit) ? 60 * 60 * 1000 : 60 * 1000);
      }
    }

    const ready = /saved\s+token\s+ready/i.test(text) || /token\s+saved/i.test(text);
    return {
      valid: Boolean(!expired && (ready || expiresAt > Date.now())),
      expiresAt,
      message: ready ? "Saved token ready." : expired ? "Token expired or missing." : "Token status not found."
    };
  }

  async function publishGraphTokenStatusFromRefreshPage() {
    const pageStatus = graphTokenStatusFromPageText();
    const storageExpiry = graphTokenStatusFromStorage();
    const tokenInfo = graphAccessTokenFromRefreshPage() || await graphAccessTokenFromRefreshPageVault();
    const expiresAt = tokenInfo && tokenInfo.expiresAt || pageStatus.expiresAt || storageExpiry || 0;
    const valid = Boolean(pageStatus.valid || expiresAt > Date.now());
    if (tokenInfo && tokenInfo.token && tokenInfo.expiresAt > Date.now()) {
      storeGraphAccessTokenFromToken(tokenInfo.token, tokenInfo.source || "calendar-refresh");
      postGraphTokenRelay(tokenInfo);
    }
    writeGraphTokenStatusBridge(tokenInfo, {
      source: "calendar-refresh",
      valid,
      expiresAt,
      message: valid ? "Saved token ready." : pageStatus.message || "Token status not found."
    });
  }

  function installGraphTokenRefreshPageBridge() {
    const scheduleGraphTokenPublish = (delay = 0) => {
      window.setTimeout(() => {
        Promise.resolve(publishGraphTokenStatusFromRefreshPage()).catch(error => {
          console.warn("IQUEUE could not publish Graph token status from refresh page", error);
        });
      }, delay);
    };
    installGraphTokenRequestCapture();
    scheduleGraphTokenPublish();
    scheduleGraphTokenPublish(750);
    scheduleGraphTokenPublish(2500);
    try {
      const observer = new MutationObserver(() => scheduleGraphTokenPublish());
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (error) {
      // MutationObserver can fail on unusual partial page loads; timed checks above still cover normal use.
    }
    window.addEventListener("storage", () => scheduleGraphTokenPublish());
  }

  function formatGraphTokenExpiry(expiresAt) {
    if (!expiresAt) return "";
    try {
      return new Date(expiresAt).toLocaleString();
    } catch (error) {
      return "";
    }
  }

  function readGraphTokenStatusBridge() {
    const value = gmGetValue(GRAPH_TOKEN_STATUS_KEY, null);
    return value && typeof value === "object" ? value : null;
  }

  function readGraphAccessTokenBridge() {
    const value = gmGetValue(GRAPH_ACCESS_TOKEN_KEY, null);
    if (!value || typeof value !== "object" || !value.token) return null;
    const expiresAt = Number(value.expiresAt || 0);
    if (!expiresAt || expiresAt <= Date.now()) return null;
    return value;
  }

  async function checkGraphTokenStatus(options = {}) {
    const force = Boolean(options.force);
    if (force) setGraphTokenStatus("Checking Microsoft Graph token...", "checking");

    const bridge = readGraphTokenStatusBridge();
    if (!bridge || !bridge.checkedAt) {
      setGraphTokenStatus(
        force ? "Open the refresh page to verify Microsoft Graph token status." : "",
        force ? "warn" : "",
        "IQUEUE has not yet seen token status from calendar-refresh.html."
      );
      return bridge;
    }

    const age = Date.now() - Number(bridge.checkedAt || 0);
    const expiresAt = Number(bridge.expiresAt || 0);
    const expiryText = formatGraphTokenExpiry(expiresAt);
    const tokenInfo = readGraphAccessTokenBridge();
    if (age > GRAPH_TOKEN_STATUS_STALE_MS) {
      setGraphTokenStatus(
        "Microsoft Graph token status is stale.",
        "warn",
        "Open the refresh page so IQUEUE can read the latest token status."
      );
      return bridge;
    }

    if (!bridge.valid || expiresAt && expiresAt <= Date.now()) {
      setGraphTokenStatus(
        "Microsoft Graph token needs refresh.",
        "warn",
        bridge.message || "The refresh page reported an expired or missing token."
      );
      return bridge;
    }

    if (!tokenInfo) {
      setGraphTokenStatus(
        "Microsoft Graph token is valid, but IQUEUE cannot read the access token yet.",
        "warn",
        "Open the refresh page from IQUEUE's Refresh token link so it can sync the token back to this queue."
      );
      return bridge;
    }

    if (expiresAt && expiresAt - Date.now() <= GRAPH_TOKEN_EXPIRING_SOON_MS) {
      setGraphTokenStatus(
        `Microsoft Graph token expires soon${expiryText ? ` (${expiryText})` : ""}.`,
        "warn"
      );
      return bridge;
    }

    setGraphTokenStatus(
      force ? `Graph token valid${expiryText ? ` until ${expiryText}` : ""}.` : "",
      force ? "good" : ""
    );
    return bridge;
  }

  function graphRequest(options) {
    const request = {
      method: options.method || "GET",
      url: options.url,
      headers: options.headers || {},
      data: options.body || undefined,
      timeout: options.timeout || 20000
    };

    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          ...request,
          onload(response) {
            const text = String(response.responseText || "");
            let body = text;
            try {
              body = text ? JSON.parse(text) : null;
            } catch (error) {
              body = text;
            }
            if (response.status >= 200 && response.status < 300) {
              resolve({ status: response.status, body });
              return;
            }
            const message = body && typeof body === "object" && body.error
              ? body.error.message || body.error.code
              : text || `HTTP ${response.status}`;
            reject(new Error(`Graph request failed: ${message}`));
          },
          onerror() {
            reject(new Error("Graph request failed: network error"));
          },
          ontimeout() {
            reject(new Error("Graph request failed: timed out"));
          }
        });
      });
    }

    if (typeof GM !== "undefined" && GM && typeof GM.xmlHttpRequest === "function") {
      return Promise.resolve(GM.xmlHttpRequest(request)).then(response => {
        if (response.status >= 200 && response.status < 300) {
          return { status: response.status, body: response.responseText || "" };
        }
        throw new Error(`Graph request failed: HTTP ${response.status}`);
      });
    }

    return fetch(options.url, {
      method: options.method || "GET",
      headers: options.headers || {},
      body: options.body || undefined
    }).then(async response => {
      if (response.ok) return { status: response.status, body: await response.text() };
      throw new Error(`Graph request failed: HTTP ${response.status}`);
    });
  }

  function graphMailHtmlForOwnerRoute(row, ownerName, target, routeNoteLine = "") {
    const summary = buildRowSummary(row);
    const scrLabel = formatScrTitlePrefix(row.scrDisplayId) || row.title || "SC Request";
    const opportunity = summary.opportunityDisplay || "Missing Opportunity";
    const company = summary.companyDisplay || "";
    const editUrl = editUrlForRow(row);
    const routedBy = getCurrentUserName() || "IQUEUE user";
    const targetFamily = target && target.family || primaryDisplayedIndustryFamily(row) || "selected queue";
    const rows = [
      ["SCM Owner", ownerName],
      ["Routed By", routedBy],
      ["Redirect Note", routeNoteLine],
      ["SC Staffing Industry", targetFamily],
      ["Request Type", requestTypeLabel(row.amoDirect)],
      ["Date Needed", summary.dateNeeded],
      ["Company", company],
      ["Opportunity", opportunity],
      ["Sales Rep", summary.salesRep],
      ["Regional Director", summary.salesDirector]
    ].filter(([, value]) => normalizeSpaces(value));

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #3C4545; font-size: 14px; line-height: 1.45;">
        <p>${escapeHtml(routedBy)} routed an SCR to your IQUEUE owner view.</p>
        <p>
          <strong>${escapeHtml(scrLabel)}</strong>
          ${opportunity ? ` | ${escapeHtml(opportunity)}` : ""}
          ${company ? ` | ${escapeHtml(company)}` : ""}
        </p>
        <table style="border-collapse: collapse; margin: 12px 0;">
          <tbody>
            ${rows.map(([label, value]) => `
              <tr>
                <td style="padding: 4px 10px 4px 0; color: #697778; font-weight: 700;">${escapeHtml(label)}</td>
                <td style="padding: 4px 0;">${escapeHtml(value)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${editUrl ? `<p><a href="${escapeHtml(editUrl)}">Open SCR</a></p>` : ""}
      </div>
    `;
  }

  function graphMailSubjectForOwnerRoute(row, target) {
    const summary = buildRowSummary(row);
    const scrLabel = formatScrTitlePrefix(row.scrDisplayId) || row.title || "SC Request";
    const targetFamily = target && target.family || primaryDisplayedIndustryFamily(row) || "SCM owner";
    const opportunity = summary.opportunityDisplay || "";
    const company = summary.companyDisplay || "";
    return normalizeSpaces(`IQUEUE: ${targetFamily} SCR routed to you - ${scrLabel}${opportunity ? ` | ${opportunity}` : ""}${company ? ` | ${company}` : ""}`).slice(0, 240);
  }

  function ownerRouteMailText(row, ownerName, target, routeNoteLine = "") {
    const summary = buildRowSummary(row);
    const scrLabel = formatScrTitlePrefix(row.scrDisplayId) || row.title || "SC Request";
    const routedBy = getCurrentUserName() || "IQUEUE user";
    const targetFamily = target && target.family || primaryDisplayedIndustryFamily(row) || "selected queue";
    const editUrl = editUrlForRow(row);
    const lines = [
      `${routedBy} routed an SCR to your IQUEUE owner view.`,
      "",
      `${scrLabel}${summary.opportunityDisplay ? ` | ${summary.opportunityDisplay}` : ""}${summary.companyDisplay ? ` | ${summary.companyDisplay}` : ""}`,
      "",
      `SCM Owner: ${ownerName}`,
      routeNoteLine ? `Redirect Note: ${routeNoteLine}` : "",
      `SC Staffing Industry: ${targetFamily}`,
      `Request Type: ${requestTypeLabel(row.amoDirect) || "Unknown"}`,
      `Date Needed: ${summary.dateNeeded || "Unknown"}`,
      `Company: ${summary.companyDisplay || "Unknown"}`,
      `Opportunity: ${summary.opportunityDisplay || "Missing Opportunity"}`,
      `Sales Rep: ${summary.salesRep || "Unknown"}`,
      `Regional Director: ${summary.salesDirector || "Unknown"}`,
      editUrl ? `Open SCR: ${editUrl}` : ""
    ];
    return lines.filter(line => line !== "").join("\r\n");
  }

  function openOwnerRouteEmailDraft(row, ownerName, target, email, reason = "", routeNoteLine = "") {
    const subject = graphMailSubjectForOwnerRoute(row, target);
    const fullBody = ownerRouteMailText(row, ownerName, target, routeNoteLine);
    const compactBody = fullBody.length > 1200
      ? `${fullBody.slice(0, 1150)}\r\n\r\n[Details trimmed for draft length. Open the SCR for full context.]`
      : fullBody;
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compactBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compactBody)}`;
    const autoOpened = openEmailDraftUrl({ outlookUrl, mailtoUrl });
    return {
      email,
      mode: "draft",
      autoOpened,
      reason: reason || "Microsoft Graph email send is unavailable.",
      subject,
      links: [
        { label: "Open Outlook web compose", href: outlookUrl },
        { label: "Open email compose", href: mailtoUrl }
      ]
    };
  }

  async function sendOwnerRouteEmail(row, ownerName, target, routeNoteLine = "") {
    const email = authorizedManagerEmailForName(ownerName);
    if (!email) throw new Error(`No email address found for ${ownerName} in Authorized Managers.`);
    return openOwnerRouteEmailDraft(row, ownerName, target, email, "Owner notifications use Outlook drafts.", routeNoteLine);
  }

  function findSalesRepField(fields) {
    const direct = findField(fields, [
      /sales\s*rep$/, /salesrep$/, /opp.*sales.*rep/, /sales.*representative/
    ], [/manager/, /mgr/, /yrs.*live/, /regional/, /director/, /vp/, /leader/]);
    if (direct) return direct;

    return (fields || []).find(field => {
      const text = `${field.label || ""} ${field.value || ""} ${field.rawValue || ""}`;
      return /sales\s*rep\s*:/i.test(text)
        && !/sales\s*rep\s*(?:manager|mgr|yrs)/i.test(text)
        && !/(regional\s*(?:director|dir|vp)|industry\s*leader|sales\s*director|sales\s*dir)/i.test(text);
    }) || null;
  }

  function salesRepEmployeeIdFromField(field, salesRepName) {
    if (!field || !Array.isArray(field.links) || !field.links.length) return "";
    const employeeLinks = field.links.filter(link => (
      /employee|\/entity\/employee|empcenter/i.test(link.href || "")
    ));
    if (!employeeLinks.length) return "";

    const targetKeys = personNameKeys(salesRepName);
    const namedLink = employeeLinks.find(link => personKeyListsOverlap(personNameKeys(link.text), targetKeys));
    const link = namedLink || (employeeLinks.length === 1 ? employeeLinks[0] : null);
    return recordIdFromUrl(link && link.href);
  }

  function pickEmployeeEmailMatch(rows, names) {
    const candidates = (rows || []).filter(row => row && row.email);
    if (!candidates.length) return null;

    const variants = [...new Set(names.flatMap(rosterNameVariants))];
    const targetKeys = names.flatMap(personNameKeys);
    const exact = candidates.find(row => {
      const rowName = normalizeRosterName(row.name);
      return rowName && variants.some(variant => rowName === variant || rowName.includes(variant) || variant.includes(rowName));
    });
    if (exact) return exact;

    const keyed = candidates.find(row => personKeyListsOverlap(personNameKeys(row.name), targetKeys));
    return keyed || (candidates.length === 1 ? candidates[0] : null);
  }

  function employeeLookupRow(id, name, email, source) {
    const cleanEmail = normalizeSpaces(email);
    if (!cleanEmail) return null;
    return {
      id: normalizeSpaces(id),
      name: cleanPersonName(name),
      email: cleanEmail,
      source: source || "employee"
    };
  }

  function lookupEmployeeEmailWithNlapi(pageWindow, names, employeeId) {
    if (employeeId && typeof pageWindow.nlapiLookupField === "function") {
      const email = normalizeLookupFieldValue(pageWindow.nlapiLookupField("employee", employeeId, "email"));
      const name = normalizeLookupFieldValue(pageWindow.nlapiLookupField("employee", employeeId, "entityid"));
      const row = employeeLookupRow(employeeId, name || names[0], email, "employee record");
      if (row) return row;
    }

    if (typeof pageWindow.nlapiSearchRecord !== "function" || typeof pageWindow.nlobjSearchFilter !== "function") {
      return null;
    }

    for (const term of rosterSearchTerms(names)) {
      const filters = [
        new pageWindow.nlobjSearchFilter("entityid", null, "contains", term),
        new pageWindow.nlobjSearchFilter("isinactive", null, "is", "F")
      ];
      const columns = [
        new pageWindow.nlobjSearchColumn("internalid"),
        new pageWindow.nlobjSearchColumn("entityid"),
        new pageWindow.nlobjSearchColumn("email")
      ];
      const results = pageWindow.nlapiSearchRecord("employee", null, filters, columns) || [];
      const rows = results.map(result => employeeLookupRow(
        result.getValue("internalid") || result.getId && result.getId(),
        result.getValue("entityid") || result.getText("entityid"),
        result.getValue("email"),
        "employee search"
      )).filter(Boolean);
      const match = pickEmployeeEmailMatch(rows, names);
      if (match) return match;
    }

    return null;
  }

  function lookupEmployeeEmailWithRequire(pageWindow, names, employeeId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(result);
      };
      timer = setTimeout(finish(reject), 8000, new Error("Timed out resolving Sales Rep email."));

      try {
        pageWindow.require(["N/search"], search => {
          try {
            const employeeType = search.Type && search.Type.EMPLOYEE || "employee";
            if (employeeId) {
              const result = search.lookupFields({
                type: employeeType,
                id: employeeId,
                columns: ["entityid", "email"]
              });
              finish(resolve)(employeeLookupRow(
                employeeId,
                normalizeLookupFieldValue(result && result.entityid) || names[0],
                normalizeLookupFieldValue(result && result.email),
                "employee record"
              ));
              return;
            }

            for (const term of rosterSearchTerms(names)) {
              const results = search.create({
                type: employeeType,
                filters: [["entityid", "contains", term], "AND", ["isinactive", "is", "F"]],
                columns: ["internalid", "entityid", "email"]
              }).run().getRange({ start: 0, end: 25 }) || [];
              const rows = results.map(result => employeeLookupRow(
                result.getValue({ name: "internalid" }),
                result.getValue({ name: "entityid" }),
                result.getValue({ name: "email" }),
                "employee search"
              )).filter(Boolean);
              const match = pickEmployeeEmailMatch(rows, names);
              if (match) {
                finish(resolve)(match);
                return;
              }
            }
            finish(resolve)(null);
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function resolveSalesRepEmail(row) {
    const summary = buildRowSummary(row);
    const salesRepName = cleanPersonName(summary.salesRep);
    if (!salesRepName) throw new Error("No Sales Rep was returned on this SCR row.");

    const fields = row && (row.allFields || row.fields) || [];
    const salesRepField = findSalesRepField(fields);
    const employeeId = salesRepEmployeeIdFromField(salesRepField, salesRepName);
    const cacheKey = employeeId
      ? `id:${employeeId}`
      : `name:${personNameKeys(salesRepName).sort().join("|") || normalizeKey(salesRepName)}`;
    if (salesRepEmailLookupCache.has(cacheKey)) return salesRepEmailLookupCache.get(cacheKey);

    const names = [salesRepName];
    const pageWindow = getPageWindow();
    let match = null;
    if (pageWindow && (typeof pageWindow.nlapiLookupField === "function" || typeof pageWindow.nlapiSearchRecord === "function")) {
      try {
        match = lookupEmployeeEmailWithNlapi(pageWindow, names, employeeId);
      } catch (error) {
        console.warn("IQUEUE nlapi employee email lookup failed", error);
      }
    }
    if (!match && pageWindow && typeof pageWindow.require === "function") {
      try {
        match = await lookupEmployeeEmailWithRequire(pageWindow, names, employeeId);
      } catch (error) {
        console.warn("IQUEUE N/search employee email lookup failed", error);
      }
    }
    if (!match) {
      const inferred = inferOracleEmailFromName(salesRepName);
      match = inferred
        ? employeeLookupRow("", salesRepName, inferred, "oracle email fallback")
        : {
          id: "",
          name: salesRepName,
          email: salesRepName,
          source: "Outlook name resolution"
        };
    }
    if (!match || !match.email) throw new Error(`No Sales Rep recipient was available for ${salesRepName}.`);

    const resolved = {
      name: match.name || salesRepName,
      email: match.email,
      source: match.source || "employee"
    };
    salesRepEmailLookupCache.set(cacheKey, resolved);
    return resolved;
  }

  function requestInfoQueueLabel(row) {
    const info = getCrossIndustryInfoForRow(row);
    if (info.targets.length) return info.targets.map(target => target.family).join(", ");
    if (info.includeAll) return "All industry queues";
    return primaryDisplayedIndustryFamily(row) || row && row.industryFamily || "Unknown";
  }

  function requestInfoOwnerName(row) {
    const mappedOwner = productsScmOwnerForRow(row);
    return currentProductsScmUserName()
      || getCurrentUserName()
      || mappedOwner && mappedOwner.scm
      || "IQUEUE user";
  }

  function requesterInfoMailSubject(row) {
    const summary = buildRowSummary(row);
    const scrLabel = formatScrTitlePrefix(row.scrDisplayId) || row.title || "SC Request";
    return normalizeSpaces(`Questions regarding ${scrLabel}${summary.opportunityDisplay ? ` | ${summary.opportunityDisplay}` : ""}`).slice(0, 240);
  }

  function requesterInfoMailText(row) {
    const summary = buildRowSummary(row);
    const ownerName = requestInfoOwnerName(row);
    const scrLabel = formatScrTitlePrefix(row.scrDisplayId) || row.title || "SC Request";
    const editUrl = editUrlForRow(row);
    const lines = [
      `${ownerName} has questions regarding a submitted SC Request:`,
      "",
      [scrLabel, summary.opportunityDisplay || "Missing Opportunity", summary.companyDisplay].filter(Boolean).join(" | "),
      "",
      `SCM Owner: ${ownerName}`,
      `SC Staffing Industry: ${requestInfoQueueLabel(row)}`,
      `Request Type: ${requestTypeLabel(row.amoDirect) || "Unknown"}`,
      `Date Needed: ${summary.dateNeeded || "Unknown"}`,
      `Company: ${summary.companyDisplay || "Unknown"}`,
      `Opportunity: ${summary.opportunityDisplay || "Missing Opportunity"}`,
      `Sales Rep: ${summary.salesRep || "Unknown"}`,
      `Regional Director: ${summary.salesDirector || "Unknown"}`,
      editUrl ? `Open SCR: ${editUrl}` : ""
    ];
    return lines.filter(line => line !== "").join("\r\n");
  }

  function buildEmailComposeDraft(email, subject, body, labels = {}) {
    const compactBody = body.length > 1400
      ? `${body.slice(0, 1350)}\r\n\r\n[Details trimmed for draft length. Open the SCR for full context.]`
      : body;
    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compactBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compactBody)}`;
    return {
      email,
      subject,
      body: compactBody,
      mailtoUrl,
      outlookUrl,
      autoOpened: "",
      links: [
        { label: labels.outlook || "Open Outlook web compose", href: outlookUrl },
        { label: labels.mailto || "Mailto fallback", href: mailtoUrl }
      ]
    };
  }

  function openRequesterInfoDraft(row, recipient) {
    const draft = buildEmailComposeDraft(
      recipient.email,
      requesterInfoMailSubject(row),
      requesterInfoMailText(row),
      {
        mailto: "Open email compose",
        outlook: "Open Outlook web compose"
      }
    );
    draft.autoOpened = openEmailDraftUrl(draft);
    return draft;
  }

  if (isGraphTokenRefreshPage()) {
    installGraphTokenRefreshPageBridge();
    return;
  }

  function optionValueFor(control, value) {
    const normalized = normalizeSpaces(value);
    if (!control || !normalized) return "";
    const exact = Array.from(control.options || []).find(option => option.value === normalized);
    if (exact) return exact.value;
    const key = normalizeKey(normalized);
    const fuzzy = Array.from(control.options || []).find(option => normalizeKey(option.value) === key);
    return fuzzy ? fuzzy.value : "";
  }

  function peopleFilterId(key, suffix) {
    return `scr-helper-${String(key || "").replace(/([A-Z])/g, "-$1").toLowerCase()}-${suffix}`;
  }

  function peopleFilterConfig(key) {
    return PEOPLE_FILTERS.find(filter => filter.key === key) || null;
  }

  function selectedPeopleFilterValues(key) {
    const chips = document.getElementById(peopleFilterId(key, "tokens"));
    if (!chips) return [];
    return Array.from(chips.querySelectorAll(".scr-helper-token"))
      .map(token => token.dataset.value)
      .filter(Boolean);
  }

  function selectedPeopleFilterMap() {
    return Object.fromEntries(PEOPLE_FILTERS.map(filter => [filter.key, selectedPeopleFilterValues(filter.key)]));
  }

  function peopleFilterFieldPatterns(key) {
    if (key === "salesDirector") {
      return [/regional.*director/, /regionaldirector/, /regional.*dir\b/, /regionaldir\b/, /sales.*director/, /salesdirector/, /sales.*dir\b/, /salesdir\b/, /sales.*rep.*manager/, /salesrepmanager/, /sales.*manager/];
    }
    if (key === "regionalVp") {
      return [/regional.*vp/, /regionalvp/, /\brvp\b/, /regional.*vice.*president/];
    }
    if (key === "industryLeader") {
      return [/industry.*leader/, /industryleader/, /industry.*avp/];
    }
    return [];
  }

  function rowPeopleFilterValue(row, key) {
    if (!row) return "";
    const direct = normalizeSpaces(row[key]);
    if (direct) return direct;

    const fields = row.allFields || row.fields || [];
    return getConciseFieldValue(fields, peopleFilterFieldPatterns(key), [], labeledValuePatterns[key] || []);
  }

  function peopleFilterOptions(key) {
    return uniqueSorted(searchRows.map(row => rowPeopleFilterValue(row, key)));
  }

  function closestPeopleFilterOption(key, value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const normalized = normalizeKey(text);
    const options = peopleFilterOptions(key);
    return options.find(option => normalizeKey(option) === normalized)
      || options.find(option => normalizeKey(option).startsWith(normalized))
      || options.find(option => normalizeKey(option).includes(normalized))
      || text;
  }

  function renderPeopleFilterTokens(key, values) {
    const container = document.getElementById(peopleFilterId(key, "tokens"));
    const config = peopleFilterConfig(key);
    if (!container || !config) return;

    const uniqueValues = uniqueSorted((Array.isArray(values) ? values : [values]).map(normalizeSpaces));
    container.innerHTML = uniqueValues.map(value => `
      <span class="scr-helper-token" data-value="${escapeHtml(value)}">
        <span>${escapeHtml(value)}</span>
        <button
          type="button"
          class="scr-helper-token-remove"
          data-filter-remove="people"
          data-filter-key="${escapeHtml(key)}"
          data-filter-value="${escapeHtml(value)}"
          aria-label="Remove ${escapeHtml(value)} from ${escapeHtml(config.label)}"
        >×</button>
      </span>
    `).join("");
  }

  function addPeopleFilter(key, value) {
    const person = closestPeopleFilterOption(key, value);
    if (!person) return;
    const nextValues = uniqueSorted(selectedPeopleFilterValues(key).concat([person]));
    renderPeopleFilterTokens(key, nextValues);
    const input = document.getElementById(peopleFilterId(key, "filter"));
    if (input) input.value = "";
    hidePeopleSuggestions(key);
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function removePeopleFilter(key, value) {
    const normalized = normalizeKey(value);
    const nextValues = selectedPeopleFilterValues(key).filter(person => normalizeKey(person) !== normalized);
    renderPeopleFilterTokens(key, nextValues);
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function rowMatchesPeopleFilters(row) {
    const selected = PEOPLE_FILTERS
      .map(filter => ({
        key: filter.key,
        values: selectedPeopleFilterValues(filter.key).map(normalizeKey)
      }))
      .filter(filter => filter.values.length);
    if (!selected.length) return true;

    return selected.some(filter => filter.values.includes(normalizeKey(rowPeopleFilterValue(row, filter.key))));
  }

  function allScmOwnerOptions() {
    return uniqueSorted(productsScmAuthorizedScms.concat(authorizedManagerCanOwnNames));
  }

  function productsScmOwnerOptions() {
    return allScmOwnerOptions().slice().sort((a, b) => a.localeCompare(b));
  }

  function authorizedManagersLoaded() {
    return Boolean(authorizedManagerRecords.length || authorizedManagersMetadata.rowCount);
  }

  function listValuesFromString(value) {
    const raw = normalizeSpaces(value);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return uniqueSorted(parsed.map(normalizeSpaces).filter(Boolean));
    } catch (error) {
      // Older saved state stored a single value as plain text.
    }
    return [raw].filter(Boolean);
  }

  function productsScmOwnerValuesFromString(value) {
    return listValuesFromString(value).map(cleanPersonName).filter(Boolean);
  }

  function selectedProductsScmOwners() {
    const control = document.getElementById("scr-helper-products-scm-owner-value");
    return control ? productsScmOwnerValuesFromString(control.value) : [];
  }

  function staffingRegionValuesFromString(value) {
    return listValuesFromString(value);
  }

  function selectedStaffingRegions() {
    const control = document.getElementById("scr-helper-staffing-region-values");
    return control ? staffingRegionValuesFromString(control.value) : [];
  }

  function normalizeGtmCriterion(value) {
    const record = value && typeof value === "object" ? value : {};
    const industry = normalizeSpaces(record.industry || record.gtmIndustry || "");
    const subgroup = normalizeSpaces(record.subgroup || record.industrySubgroup || record.gtmIndustrySubgroup || "");
    if (!industry) return null;
    return {
      industry,
      industryKey: normalizeKey(industry),
      subgroup,
      subgroupKey: normalizeKey(subgroup)
    };
  }

  function gtmCriteriaValuesFromString(value) {
    const raw = normalizeSpaces(value);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return uniqueGtmCriteria(parsed.map(normalizeGtmCriterion).filter(Boolean));
      }
    } catch (error) {
      // Older saved states did not store multi-select GTM criteria.
    }
    return [];
  }

  function gtmCriterionKey(criterion) {
    const normalized = normalizeGtmCriterion(criterion);
    return normalized ? `${normalized.industryKey}|${normalized.subgroupKey}` : "";
  }

  function gtmCriterionLabel(criterion) {
    const normalized = normalizeGtmCriterion(criterion);
    if (!normalized) return "";
    return normalized.subgroup ? `${normalized.industry} - ${normalized.subgroup}` : normalized.industry;
  }

  function uniqueGtmCriteria(criteria) {
    const seen = new Set();
    const next = [];
    (criteria || []).forEach(criterion => {
      const normalized = normalizeGtmCriterion(criterion);
      const key = gtmCriterionKey(normalized);
      if (!normalized || !key || seen.has(key)) return;
      seen.add(key);
      next.push(normalized);
    });
    return next.sort((left, right) => gtmCriterionLabel(left).localeCompare(gtmCriterionLabel(right)));
  }

  function selectedGtmCriteria() {
    const control = document.getElementById("scr-helper-gtm-criteria-values");
    return control ? gtmCriteriaValuesFromString(control.value) : [];
  }

  function renderGtmCriteriaFilters(criteria) {
    const control = document.getElementById("scr-helper-gtm-criteria-values");
    const values = uniqueGtmCriteria(Array.isArray(criteria) ? criteria : []);
    if (control) {
      control.value = values.length
        ? JSON.stringify(values.map(criterion => ({
          industry: criterion.industry,
          subgroup: criterion.subgroup
        })))
        : "";
    }
  }

  function addGtmCriterionFilter() {
    const industrySelect = document.getElementById("scr-helper-gtm-industry-filter");
    const subgroupSelect = document.getElementById("scr-helper-industry-subgroup-filter");
    const industry = normalizeSpaces(industrySelect && industrySelect.value);
    const subgroup = normalizeSpaces(subgroupSelect && subgroupSelect.value);
    if (!industry) return;

    renderGtmCriteriaFilters(selectedGtmCriteria().concat([{ industry, subgroup }]));
    if (industrySelect) industrySelect.value = "";
    if (subgroupSelect) subgroupSelect.value = "";
    updateIndustrySubgroupFilterOptions();
    updateGtmAddFilterButtonState();
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function removeGtmCriterionFilter(value = "") {
    const key = normalizeSpaces(value);
    const normalizedKey = normalizeKey(key);
    const nextCriteria = selectedGtmCriteria().filter(criterion => (
      gtmCriterionKey(criterion) !== key && normalizeKey(gtmCriterionLabel(criterion)) !== normalizedKey
    ));
    renderGtmCriteriaFilters(nextCriteria);
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function rowMatchesGtmCriteria(row, criteria) {
    const active = uniqueGtmCriteria(criteria);
    if (!active.length || isUnmappedReviewRow(row)) return true;
    return active.some(criterion => (
      row.gtmIndustryKey === criterion.industryKey
      && (!criterion.subgroupKey || row.gtmIndustrySubgroupKey === criterion.subgroupKey)
    ));
  }

  function closestStaffingRegionOption(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const normalized = normalizeKey(text);
    return staffingRegionOptions.find(option => normalizeKey(option) === normalized)
      || staffingRegionOptions.find(option => normalizeKey(option).startsWith(normalized))
      || "";
  }

  function renderStaffingRegionTokens(values) {
    const container = document.getElementById("scr-helper-staffing-region-tokens");
    const control = document.getElementById("scr-helper-staffing-region-values");
    const regions = uniqueSorted((Array.isArray(values) ? values : [values]).map(normalizeSpaces).filter(Boolean));
    if (control) control.value = regions.length ? JSON.stringify(regions) : "";
    if (!container) return;
    container.innerHTML = regions.map(region => `
      <span class="scr-helper-token" data-value="${escapeHtml(region)}">
        <span>${escapeHtml(region)}</span>
        <button
          type="button"
          class="scr-helper-token-remove"
          data-filter-remove="staffingRegion"
          data-filter-value="${escapeHtml(region)}"
          aria-label="Remove SC region ${escapeHtml(region)}"
        >×</button>
      </span>
    `).join("");
  }

  function addStaffingRegionFilter(value) {
    const region = closestStaffingRegionOption(value);
    const select = document.getElementById("scr-helper-staffing-region-filter");
    if (select) select.value = "";
    if (!region) return;
    renderStaffingRegionTokens(selectedStaffingRegions().concat([region]));
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function removeStaffingRegionFilter(value = "") {
    const normalized = normalizeKey(value);
    const nextRegions = normalized
      ? selectedStaffingRegions().filter(region => normalizeKey(region) !== normalized)
      : [];
    renderStaffingRegionTokens(nextRegions);
    const select = document.getElementById("scr-helper-staffing-region-filter");
    if (select) select.value = "";
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function closestProductsScmOwnerOption(value) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const normalized = normalizeKey(text);
    const options = productsScmOwnerOptions();
    return options.find(option => normalizeKey(option) === normalized)
      || options.find(option => normalizeKey(option).startsWith(normalized))
      || options.find(option => normalizeKey(option).includes(normalized))
      || "";
  }

  function renderProductsScmOwnerTokens(values) {
    const container = document.getElementById("scr-helper-products-scm-owner-tokens");
    const control = document.getElementById("scr-helper-products-scm-owner-value");
    const owners = uniqueSorted((Array.isArray(values) ? values : [values]).map(cleanPersonName).filter(Boolean));
    if (control) control.value = owners.length ? JSON.stringify(owners) : "";
    if (!container) return;
    container.innerHTML = owners.map(owner => `
      <span class="scr-helper-token" data-value="${escapeHtml(owner)}">
        <span>${escapeHtml(owner)}</span>
        <button
          type="button"
          class="scr-helper-token-remove"
          data-filter-remove="productsScmOwner"
          data-filter-value="${escapeHtml(owner)}"
          aria-label="Remove SCM owner ${escapeHtml(owner)}"
        >×</button>
      </span>
    `).join("");
  }

  function addProductsScmOwnerFilter(value) {
    if (!productsScmUserCanView()) return;
    const owner = closestProductsScmOwnerOption(value);
    if (!owner) return;
    const input = document.getElementById("scr-helper-products-scm-owner-filter");
    if (input) input.value = "";
    renderProductsScmOwnerTokens(selectedProductsScmOwners().concat([owner]));
    hideProductsScmOwnerSuggestions();
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function removeProductsScmOwnerFilter(value = "") {
    const normalized = normalizeKey(value);
    const nextOwners = normalized
      ? selectedProductsScmOwners().filter(owner => normalizeKey(owner) !== normalized)
      : [];
    renderProductsScmOwnerTokens(nextOwners);
    const input = document.getElementById("scr-helper-products-scm-owner-filter");
    if (input) input.value = "";
    saveHelperState();
    updateFilterSummary();
    renderResults();
  }

  function matchingProductsScmOwnerOptions(query) {
    const selectedKeys = new Set(selectedProductsScmOwners().map(normalizeKey));
    const queryKey = normalizeKey(query);
    return productsScmOwnerOptions()
      .filter(option => !selectedKeys.has(normalizeKey(option)))
      .filter(option => !queryKey || normalizeKey(option).includes(queryKey))
      .slice(0, 30);
  }

  function hideProductsScmOwnerSuggestions() {
    const panel = document.getElementById("scr-helper-products-scm-owner-suggestions");
    if (panel) panel.hidden = true;
  }

  function renderProductsScmOwnerSuggestions() {
    const input = document.getElementById("scr-helper-products-scm-owner-filter");
    const panel = document.getElementById("scr-helper-products-scm-owner-suggestions");
    if (!input || !panel) return;
    if (!productsScmUserCanView()) {
      panel.hidden = true;
      panel.innerHTML = "";
      return;
    }

    const options = matchingProductsScmOwnerOptions(input.value);
    panel.hidden = !options.length;
    panel.innerHTML = options.map(option => `
      <button
        type="button"
        class="scr-helper-products-scm-suggestion"
        data-products-scm-owner="${escapeHtml(option)}"
      >${escapeHtml(option)}</button>
    `).join("");
  }

  function matchingPeopleFilterOptions(key, query) {
    const selectedKeys = new Set(selectedPeopleFilterValues(key).map(normalizeKey));
    const queryKey = normalizeKey(query);
    return peopleFilterOptions(key)
      .filter(option => !selectedKeys.has(normalizeKey(option)))
      .filter(option => {
        if (!queryKey) return true;
        return normalizeKey(option).includes(queryKey);
      })
      .slice(0, 30);
  }

  function hidePeopleSuggestions(key) {
    const panel = document.getElementById(peopleFilterId(key, "suggestions"));
    if (panel) panel.hidden = true;
  }

  function hideAllPeopleSuggestions(exceptKey = "") {
    PEOPLE_FILTERS.forEach(filter => {
      if (filter.key !== exceptKey) hidePeopleSuggestions(filter.key);
    });
  }

  function renderPeopleSuggestions(key) {
    const input = document.getElementById(peopleFilterId(key, "filter"));
    const panel = document.getElementById(peopleFilterId(key, "suggestions"));
    if (!input || !panel) return;

    const options = matchingPeopleFilterOptions(key, input.value);
    panel.hidden = !options.length;
    panel.innerHTML = options.map(option => `
      <button
        type="button"
        class="scr-helper-people-suggestion"
        data-people-key="${escapeHtml(key)}"
        data-people-value="${escapeHtml(option)}"
      >${escapeHtml(option)}</button>
    `).join("");
  }

  function setSelectValue(control, value) {
    if (!control) return false;
    const normalized = normalizeSpaces(value);
    if (!normalized) {
      control.value = "";
      return true;
    }
    const optionValue = optionValueFor(control, normalized);
    if (!optionValue) return false;
    control.value = optionValue;
    return true;
  }

  function legacyGtmCriteriaFromFilters(filters = {}) {
    if (Array.isArray(filters.gtmCriteria)) return filters.gtmCriteria;
    if (filters.gtmIndustry) {
      return [{
        industry: filters.gtmIndustry,
        subgroup: filters.industrySubgroup || ""
      }];
    }
    return [];
  }

  function restoreStoredFilters(options = {}) {
    const filters = helperState.filters || {};
    const controls = getControls();
    if (!controls.industry) return;

    if (!options.dynamicOnly) {
      setSelectValue(controls.industry, filters.industry);
      setSelectValue(controls.salesRegion, filters.salesRegion);
      if (controls.staffingRegion) controls.staffingRegion.value = "";
      renderStaffingRegionTokens(Array.isArray(filters.staffingRegions) ? filters.staffingRegions : [filters.staffingRegion].filter(Boolean));
      setSelectValue(controls.amoDirect, filters.amoDirect);
      if (controls.productsScmOwnerMe) controls.productsScmOwnerMe.checked = Boolean(filters.productsScmOwnerMe);
      const savedScmOwners = Array.isArray(filters.productsScmOwners) ? filters.productsScmOwners : [filters.productsScmOwner].filter(Boolean);
      renderProductsScmOwnerTokens(savedScmOwners);
      if (controls.assignedToMe) controls.assignedToMe.checked = Boolean(filters.assignedToMe);
      if (controls.unmappedOnly) controls.unmappedOnly.checked = Boolean(filters.unmappedOnly);
      if (controls.hideTigerEnterprise) controls.hideTigerEnterprise.checked = Boolean(filters.hideTigerEnterprise);
      if (controls.slaHotlist) controls.slaHotlist.checked = Boolean(filters.slaHotlist);
      if (controls.text) controls.text.value = filters.text || "";
    }

    if (options.includeDynamic) {
      renderGtmCriteriaFilters(legacyGtmCriteriaFromFilters(filters));
      if (controls.gtmIndustry) controls.gtmIndustry.value = "";
      updateIndustrySubgroupFilterOptions();
      if (controls.industrySubgroup) controls.industrySubgroup.value = "";
      setSelectValue(controls.salesVertical, filters.salesVertical);
      PEOPLE_FILTERS.forEach(filter => {
        const savedValues = filters.peopleFilters && filters.peopleFilters[filter.key];
        const legacyValues = filter.key === "salesDirector" ? filters.salesRepManagers : [];
        renderPeopleFilterTokens(filter.key, savedValues || legacyValues || []);
      });
    }

    updateFilterSummary();
  }

  function setFiltersCollapsed(collapsed, options = {}) {
    filtersCollapsed = collapsed;
    const portlet = document.getElementById(HELPER_ID);
    const button = document.getElementById("scr-helper-filter-toggle");
    if (portlet) portlet.classList.toggle("scr-helper-filters-collapsed", collapsed);
    if (button) {
      button.textContent = collapsed ? "Expand Filters" : "Collapse Filters";
      button.title = collapsed ? "Show filter controls" : "Hide filter controls";
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }
    updateFilterSummary();
    if (options.persist !== false) saveHelperState();
  }

  function toggleFiltersCollapsed() {
    setFiltersCollapsed(!filtersCollapsed);
  }

  function setOptionsPanelOpen(open) {
    const button = document.getElementById("scr-helper-options-toggle");
    const panel = document.getElementById("scr-helper-options-panel");
    if (!button || !panel) return;
    panel.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function toggleOptionsPanel() {
    const panel = document.getElementById("scr-helper-options-panel");
    setOptionsPanelOpen(Boolean(panel && panel.hidden));
  }

  function renderResults() {
    const controls = getControls();
    const list = document.getElementById("scr-helper-results");
    const status = document.getElementById("scr-helper-status");
    if (!list || !status) return;

    updateFilterSummary();

    const visibleRows = searchRows
      .filter(row => rowMatchesFilters(row, controls))
      .sort((left, right) => {
        const submittedOrder = compareSubmittedOldestFirst(left, right);
        if (!controls.slaHotlist || !controls.slaHotlist.checked) return submittedOrder;
        const leftSla = rowSlaInfo(left);
        const rightSla = rowSlaInfo(right);
        if (leftSla.passed !== rightSla.passed) return leftSla.passed ? -1 : 1;
        return submittedOrder || ((rightSla.hours || 0) - (leftSla.hours || 0));
      });
    list.innerHTML = visibleRows.length
      ? visibleRows.map(renderRow).join("")
      : `<div class="scr-helper-empty">No visible SCRs match the selected filters.</div>`;

    const unmappedCount = visibleRows.filter(isUnmappedReviewRow).length;
    const loadedText = searchResultTotal > searchRows.length
      ? `${searchRows.length} of ${searchResultTotal} NetSuite results loaded`
      : `${searchRows.length} loaded SCRs`;
    const assignedText = controls.assignedToMe && controls.assignedToMe.checked && getCurrentUserName()
      ? `; includes assigned to ${getCurrentUserName()}`
      : "";
    const slaText = controls.slaHotlist && controls.slaHotlist.checked
      ? `; ${visibleRows.length} past SLA`
      : "";
    const productsOwnerText = productsScmUserCanView() && (controls.productsScmOwnerMe && controls.productsScmOwnerMe.checked && productsScmUserIsOwner() || controls.productsScmOwner && productsScmOwnerValuesFromString(controls.productsScmOwner.value).length)
      ? "; SCM owner view"
      : "";
    status.textContent = `${visibleRows.length} of ${loadedText} shown${unmappedCount ? `; ${unmappedCount} unmapped` : ""}${slaText}${assignedText}${productsOwnerText}. ${mappingStatusText()}.`;
    list.querySelectorAll(".scr-helper-edit").forEach(button => {
      button.textContent = "Staff SCR";
    });
    applyRequestPresentation(visibleRows);
  }

  function updateAssignedToMeControl() {
    const checkbox = document.getElementById("scr-helper-assigned-to-me-filter");
    const note = document.getElementById("scr-helper-current-user");
    if (!checkbox || !note) return;

    const userName = getCurrentUserName();
    checkbox.disabled = !userName;
    if (!userName) {
      checkbox.checked = false;
    } else if (helperState.filters && helperState.filters.assignedToMe) {
      checkbox.checked = true;
    }
    note.textContent = userName ? `Me: ${userName}` : "Current user not detected";
  }

  function updateProductsScmControls() {
    const row = document.getElementById("scr-helper-products-scm-filter-row");
    const checkbox = document.getElementById("scr-helper-products-scm-owner-me-filter");
    const input = document.getElementById("scr-helper-products-scm-owner-filter");
    const datalist = document.getElementById("scr-helper-products-scm-owner-options");
    const note = document.getElementById("scr-helper-products-scm-note");
    if (!row || !checkbox || !input) return;

    const canView = productsScmUserCanView();
    const isOwner = productsScmUserIsOwner();
    row.hidden = !canView;
    checkbox.disabled = !isOwner;
    input.disabled = !canView;
    if (!canView) {
      checkbox.checked = false;
      renderProductsScmOwnerTokens([]);
      hideProductsScmOwnerSuggestions();
    } else if (!isOwner) {
      checkbox.checked = false;
    }

    if (datalist) {
      datalist.innerHTML = productsScmOwnerOptions().map(option => (
        `<option value="${escapeHtml(option)}"></option>`
      )).join("");
    }

    if (note) {
      if (!productsScmMetadata.rowCount && productsScmMetadata.error) {
        note.textContent = `SCM relationship mapping not loaded: ${shortMappingError(productsScmMetadata.error)}`;
      } else if (!productsScmMetadata.rowCount) {
        note.textContent = "SCM relationship mapping not loaded";
      } else if (isOwner) {
        note.textContent = `SCM owner: ${currentProductsScmUserName() || getCurrentUserName()}`;
      } else if (productsScmUserIsDirector()) {
        note.textContent = `Director view: ${currentProductsScmDirectorName() || getCurrentUserName()}`;
      } else if (productsScmUserIsViewer()) {
        note.textContent = `SCM queue viewer: ${currentProductsScmViewerName() || getCurrentUserName()}`;
      } else {
        note.textContent = "SCM owner controls hidden for this user";
      }
    }
    updateFilterSummary();
  }

  function preserveSelectValue(control, values, emptyValue = "") {
    if (!control) return;
    const selected = control.value;
    if (selected && values.some(value => normalizeKey(value) === normalizeKey(selected))) {
      setSelectValue(control, selected);
    } else {
      control.value = emptyValue;
    }
  }

  function updateMappingFilterOptions() {
    const controls = getControls();
    if (!controls.industry) return;

    const selectedIndustry = controls.industry.value;
    const selectedAmoDirect = controls.amoDirect.value;
    const selectedRegionValues = selectedStaffingRegions();

    controls.industry.innerHTML = optionHtml(industryFilterOptions, "All SC industry groups", industryOptionLabel);
    controls.amoDirect.innerHTML = optionHtml(amoDirectOptions, "All requests");
    controls.staffingRegion.innerHTML = optionHtml(staffingRegionOptions, "Add region");

    preserveSelectValue(controls.industry, industryFilterOptions);
    if (selectedIndustry) setSelectValue(controls.industry, selectedIndustry);
    if (selectedAmoDirect) setSelectValue(controls.amoDirect, selectedAmoDirect);
    renderStaffingRegionTokens(staffingRegionOptions.length
      ? selectedRegionValues.filter(region => staffingRegionOptions.some(option => normalizeKey(option) === normalizeKey(region)))
      : selectedRegionValues);
    updateSalesRegionFilterOptions();
    updateFilterSummary();
  }

  function updateGtmIndustryFilterOptions() {
    const control = document.getElementById("scr-helper-gtm-industry-filter");
    if (!control) return;

    const selected = control.value;
    const options = uniqueSorted(searchRows.map(row => row.gtmIndustry));
    control.innerHTML = optionHtml(options, "Choose GTM industry");
    if (selected && options.some(option => normalizeKey(option) === normalizeKey(selected))) {
      control.value = selected;
    }
  }

  function updateSalesRegionFilterOptions() {
    const control = document.getElementById("scr-helper-sales-region-filter");
    if (!control) return;

    const selected = control.value;
    const options = uniqueSorted(
      salesRegionOptions.concat(searchRows.map(row => canonicalSalesRegion(row.originalSalesRegion) || row.mappedSalesRegion))
    );
    control.innerHTML = optionHtml(options, "All sales regions");
    if (selected && options.some(option => normalizeKey(option) === normalizeKey(selected))) {
      control.value = selected;
    }
  }

  function updateSalesVerticalFilterOptions() {
    const control = document.getElementById("scr-helper-sales-vertical-filter");
    if (!control) return;

    const selected = control.value;
    const options = uniqueSorted(searchRows.map(row => row.salesVertical));
    control.innerHTML = optionHtml(options, "All sales verticals");
    if (selected && options.some(option => normalizeKey(option) === normalizeKey(selected))) {
      control.value = selected;
    }
  }

  function updatePeopleFilterOptions() {
    PEOPLE_FILTERS.forEach(filter => {
      const datalist = document.getElementById(peopleFilterId(filter.key, "options"));
      if (!datalist) return;

      datalist.innerHTML = peopleFilterOptions(filter.key).map(option => (
        `<option value="${escapeHtml(option)}"></option>`
      )).join("");
      const input = document.getElementById(peopleFilterId(filter.key, "filter"));
      if (input && document.activeElement === input) renderPeopleSuggestions(filter.key);
    });
  }

  function updateIndustrySubgroupFilterOptions() {
    const control = document.getElementById("scr-helper-industry-subgroup-filter");
    if (!control) return;

    const gtmIndustryControl = document.getElementById("scr-helper-gtm-industry-filter");
    const selectedGtmIndustryKey = normalizeKey(gtmIndustryControl && gtmIndustryControl.value);
    const selected = control.value;
    const sourceRows = isOtherUnmappedIndustry(selectedGtmIndustryKey)
      ? searchRows.filter(isUnmappedReviewRow)
      : selectedGtmIndustryKey
        ? searchRows.filter(row => row.gtmIndustryKey === selectedGtmIndustryKey)
        : searchRows;
    const options = uniqueSorted(sourceRows.map(row => row.gtmIndustrySubgroup));
    control.innerHTML = optionHtml(options, "Optional subgroup", gtmSubgroupOptionLabel);
    if (selected && options.some(option => normalizeKey(option) === normalizeKey(selected))) {
      control.value = selected;
    }
    updateGtmAddFilterButtonState();
  }

  function updateGtmAddFilterButtonState() {
    const button = document.getElementById("scr-helper-add-gtm-filter");
    const industrySelect = document.getElementById("scr-helper-gtm-industry-filter");
    if (!button) return;
    const hasIndustry = Boolean(normalizeSpaces(industrySelect && industrySelect.value));
    button.disabled = !hasIndustry;
    button.title = hasIndustry
      ? "Add selected GTM industry criteria to the active filters"
      : "Choose a FY27 GTM Industry first";
  }

  function applyRequestPresentation(rows) {
    const byId = new Map(rows.map(row => [row.id, row]));
    document.querySelectorAll(`#${HELPER_ID} .scr-helper-card`).forEach(card => {
      const row = byId.get(card.dataset.rowId);
      if (!row) return;

      const requestKey = requestTypeKey(row.amoDirect);
      const color = requestTypeColor(requestKey);
      const industryBranding = getIndustryGroupBranding(row.industryFamily);
      card.dataset.requestType = requestKey;
      card.classList.toggle("is-request-amo", requestKey === "amo");
      card.classList.toggle("is-request-direct", requestKey === "direct");
      card.classList.toggle("is-sla-passed", rowSlaInfo(row).passed);
      if (industryBranding) {
        card.style.setProperty("--scr-industry-color", industryBranding.color);
        card.style.setProperty("--scr-industry-bg", industryBranding.soft);
      }

      const title = card.querySelector(".scr-helper-card-title");
      if (title) title.style.color = color || "";

      const button = card.querySelector(".scr-helper-edit");
      if (button) {
        button.textContent = "Staff SCR";
        button.style.backgroundColor = button.disabled ? "" : color || "";
      }
    });
  }

  function normalizeSearchPageUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      parsed.hash = "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  }

  function isLikelySearchPageLink(anchor) {
    const href = anchor && anchor.getAttribute("href");
    if (!href || /^javascript:/i.test(href)) return false;

    let parsed;
    try {
      parsed = new URL(href, window.location.href);
    } catch (error) {
      return false;
    }

    if (parsed.origin !== window.location.origin) return false;
    if (!/\/app\/common\/search\/(?:searchresults|savedsearchresults)\.nl$/i.test(parsed.pathname)) return false;
    const searchId = parsed.searchParams.get("searchid");
    if (searchId && searchId !== CURRENT_SEARCH_ID) return false;

    const text = normalizeSpaces(anchor.textContent);
    if (/export|excel|csv|pdf|email|customize|edit\s+this\s+search/i.test(text)) return false;
    return true;
  }

  function findSearchPageLinks(root = document) {
    return uniqueSorted(Array.from(root.querySelectorAll("a[href]"))
      .filter(isLikelySearchPageLink)
      .map(anchor => normalizeSearchPageUrl(anchor.getAttribute("href")))
      .filter(Boolean));
  }

  function findSearchResultTotal(root = document) {
    const text = normalizeSpaces(root.body ? root.body.textContent : "");
    const totals = [...text.matchAll(/\b[\d,]+\s*[-–]\s*[\d,]+\s+of\s+([\d,]+)\b/ig)]
      .map(match => Number(match[1].replace(/,/g, "")))
      .filter(Boolean);
    return totals.length ? Math.max(...totals) : 0;
  }

  function rowIdentity(row) {
    if (row.internalId) return `id:${row.internalId}`;
    if (row.editUrl) return `url:${row.editUrl}`;

    const richKey = normalizeKey([
      row.title,
      row.industryFamily,
      row.industrySubgroup,
      row.gtmIndustry,
      row.gtmIndustrySubgroup,
      row.state,
      row.amoDirect,
      row.assignedTo,
      row.allKeyText
    ].join("|"));
    return richKey || row.id;
  }

  function dedupeSearchRows(rows) {
    const seen = new Set();
    return rows.filter(row => {
      const key = rowIdentity(row);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function fetchSearchDocument(url) {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) throw new Error(`Search page request failed: ${response.status}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  async function fetchAdditionalSearchRows() {
    const rows = [];
    const seenUrls = new Set([normalizeSearchPageUrl(window.location.href)]);
    const queue = findSearchPageLinks(document).filter(url => !seenUrls.has(url));
    let pageNumber = 1;

    while (queue.length && pageNumber <= 8) {
      const url = queue.shift();
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);

      try {
        const page = await fetchSearchDocument(url);
        searchResultTotal = Math.max(searchResultTotal, findSearchResultTotal(page));
        rows.push(...parseSearchResults(page, `scr-page-${pageNumber}-row`));
        findSearchPageLinks(page).forEach(nextUrl => {
          if (!seenUrls.has(nextUrl) && !queue.includes(nextUrl)) queue.push(nextUrl);
        });
        pageNumber += 1;
      } catch (error) {
        console.warn("SCR helper could not fetch an additional search result page", error);
      }
    }

    return rows;
  }

  async function refreshRows(options = {}) {
    const sequence = ++refreshSequence;
    const status = document.getElementById("scr-helper-status");
    if (status) status.textContent = `Loading ${CURRENT_QUEUE.loadingLabel} (${SAVED_SEARCH_ID}).`;

    const retryCount = options.retryCount || 0;
    if (!findResultTable(document) && retryCount < 12) {
      renderStartupSplash(`Waiting for NetSuite search results (${SAVED_SEARCH_ID}).`);
      window.setTimeout(() => {
        if (sequence === refreshSequence) refreshRows({ retryCount: retryCount + 1 });
      }, 250);
      return;
    }

    const currentRows = parseSearchResults(document, "scr-row");
    searchResultTotal = Math.max(findSearchResultTotal(document), currentRows.length);
    searchRows = currentRows;
    updateSalesRegionFilterOptions();
    updateGtmIndustryFilterOptions();
    updateSalesVerticalFilterOptions();
    updatePeopleFilterOptions();
    restoreStoredFilters({ includeDynamic: true });
    updateIndustrySubgroupFilterOptions();
    restoreStoredFilters({ includeDynamic: true, dynamicOnly: true });
    renderResults();
    scheduleRoutingHashtagHydration(searchRows, sequence);

    const extraRows = await fetchAdditionalSearchRows();
    if (sequence !== refreshSequence) return;

    searchRows = dedupeSearchRows(currentRows.concat(extraRows));
    searchResultTotal = Math.max(searchResultTotal, searchRows.length);
    updateSalesRegionFilterOptions();
    updateGtmIndustryFilterOptions();
    updateSalesVerticalFilterOptions();
    updatePeopleFilterOptions();
    restoreStoredFilters({ includeDynamic: true });
    updateIndustrySubgroupFilterOptions();
    restoreStoredFilters({ includeDynamic: true, dynamicOnly: true });
    renderResults();
    scheduleRoutingHashtagHydration(searchRows, sequence);
  }

  function openEditUrl(url) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openMailtoUrlInNewWindow(url) {
    let opened = null;
    try {
      opened = window.open("about:blank", "_blank");
      if (opened) {
        try {
          opened.opener = null;
          opened.document.title = "Opening email compose";
          opened.document.body.innerHTML = `
            <p style="font-family: Arial, sans-serif; color: #3C4545;">
              Opening email compose...
            </p>
          `;
        } catch (error) {
          // Some browser privacy settings prevent writing to the child tab; location handoff still usually works.
        }
        window.setTimeout(() => {
          try {
            opened.location.href = url;
          } catch (error) {
            console.warn("SCR helper child-window mailto handoff failed", error);
          }
        }, 0);
        return;
      }
    } catch (error) {
      console.warn("SCR helper blank-window mailto open failed", error);
    }

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openEditUrlWithGm(url) {
    if (!url) return;
    if (/^mailto:/i.test(url)) {
      openMailtoUrlInNewWindow(url);
      return;
    }
    try {
      if (typeof GM_openInTab === "function") {
        GM_openInTab(url, { active: true, insert: true, setParent: true });
        return;
      }
    } catch (error) {
      console.warn("SCR helper GM_openInTab failed", error);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function browserLooksLikeFirefox() {
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    return /\bfirefox\//i.test(userAgent);
  }

  function openEmailDraftUrl(draft) {
    if (!draft) return "";
    const useMailto = browserLooksLikeFirefox() && draft.mailtoUrl;
    const url = useMailto ? draft.mailtoUrl : draft.outlookUrl;
    openEditUrlWithGm(url);
    return useMailto ? "mailto" : "outlook";
  }

  function getPageWindow() {
    try {
      if (typeof unsafeWindow !== "undefined") return unsafeWindow;
    } catch (error) {
      return window;
    }
    return window;
  }

  function submitSingleFieldWithRequire(pageWindow, internalId, fieldId, value) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(result);
      };
      timer = setTimeout(finish(reject), 12000, new Error("Timed out waiting for NetSuite record module."));

      try {
        pageWindow.require(["N/record"], record => {
          try {
            record.submitFields({
              type: SCR_RECORD_SCRIPT_ID,
              id: internalId,
              values: {
                [fieldId]: value
              },
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
              }
            });
            finish(resolve)("N/record");
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  function normalizeLookupFieldValue(value) {
    if (Array.isArray(value)) {
      return value.map(item => (
        normalizeSpaces(item && (item.text || item.value) || item)
      )).filter(Boolean).join("\n");
    }
    if (value && typeof value === "object") {
      return normalizeSpaces(value.text || value.value || "");
    }
    return normalizeSpaces(value);
  }

  function lookupSingleFieldWithRequire(pageWindow, internalId, fieldId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = callback => result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(result);
      };
      timer = setTimeout(finish(reject), 8000, new Error("Timed out waiting for NetSuite search module."));

      try {
        pageWindow.require(["N/search"], search => {
          try {
            const result = search.lookupFields({
              type: SCR_RECORD_SCRIPT_ID,
              id: internalId,
              columns: [fieldId]
            });
            finish(resolve)(normalizeLookupFieldValue(result && result[fieldId]));
          } catch (error) {
            finish(reject)(error);
          }
        }, finish(reject));
      } catch (error) {
        finish(reject)(error);
      }
    });
  }

  async function lookupSingleField(row, fieldId) {
    const internalId = row.internalId || recordIdFromUrl(row.editUrl);
    if (!internalId) return "";

    const pageWindow = getPageWindow();
    if (typeof pageWindow.nlapiLookupField === "function") {
      try {
        return normalizeLookupFieldValue(pageWindow.nlapiLookupField(SCR_RECORD_SCRIPT_ID, internalId, fieldId));
      } catch (error) {
        console.warn("SCR helper page nlapiLookupField failed", error);
      }
    }

    if (typeof pageWindow.require === "function") {
      try {
        return await lookupSingleFieldWithRequire(pageWindow, internalId, fieldId);
      } catch (error) {
        console.warn("SCR helper N/search lookup failed", error);
      }
    }

    return "";
  }

  function rowHasReturnedHashtagsField(row) {
    return Boolean(getHashtagsField(row && (row.allFields || row.fields) || []));
  }

  function rowNeedsRoutingHashtagHydration(row) {
    if (!row || !row.internalId || row.hashtagsHydrated) return false;
    const routingText = crossIndustryTextForRow(row);
    const hasCrossIndustryRoute = getCrossIndustryInfo(routingText).targets.length;
    const hasExplicitOwnerTag = /#(?:scm-owner|pscm-owner)-[a-z0-9]+/i.test(routingText);
    if (hasCrossIndustryRoute && !hasExplicitOwnerTag) return true;
    if (hasCrossIndustryRoute) return false;
    return !rowHasReturnedHashtagsField(row) || rowHasCrossVerticalFlag(row);
  }

  async function hydrateMissingRoutingHashtags(rows, sequence) {
    const candidates = (rows || []).filter(rowNeedsRoutingHashtagHydration).slice(0, 150);
    if (!candidates.length) return;

    let changed = false;
    for (const row of candidates) {
      if (sequence !== refreshSequence) return;
      row.hashtagsHydrated = true;
      const value = await lookupSingleField(row, HASHTAGS_FIELD_ID);
      if (value && value !== row.hashtags) {
        updateRowHashtags(row, value);
        changed = true;
      }
    }

    if (changed && sequence === refreshSequence) {
      updateIndustrySubgroupFilterOptions();
      renderResults();
    }
  }

  function scheduleRoutingHashtagHydration(rows, sequence) {
    hydrateMissingRoutingHashtags(rows, sequence).catch(error => {
      console.warn("SCR helper could not hydrate routing hashtags", error);
    });
  }

  function waitForFrameLoad(frame, timeoutMs, errorMessage) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        frame.removeEventListener("load", onLoad);
        reject(new Error(errorMessage || "Timed out waiting for NetSuite edit page."));
      }, timeoutMs);

      function onLoad() {
        clearTimeout(timer);
        frame.removeEventListener("load", onLoad);
        resolve(frame.contentWindow);
      }

      frame.addEventListener("load", onLoad);
    });
  }

  function setFrameFieldValue(frameWindow, fieldId, value) {
    let updated = false;

    try {
      if (typeof frameWindow.nlapiSetFieldValue === "function") {
        frameWindow.nlapiSetFieldValue(fieldId, value, false, true);
        updated = true;
      }
    } catch (error) {
      console.warn("SCR helper iframe nlapiSetFieldValue failed", error);
    }

    const frameDocument = frameWindow.document;
    const field = frameDocument.getElementById(fieldId)
      || frameDocument.querySelector(`[name="${fieldId}"]`);
    if (field) {
      field.value = value;
      field.dispatchEvent(new frameWindow.Event("input", { bubbles: true }));
      field.dispatchEvent(new frameWindow.Event("change", { bubbles: true }));
      updated = true;
    }

    return updated;
  }

  function submitFrameForm(frameWindow) {
    const frameDocument = frameWindow.document;
    const saveButton = frameDocument.querySelector("#submitter, [name='submitter'], input[value='Save'], button[value='Save']");
    if (saveButton && typeof saveButton.click === "function") {
      saveButton.click();
      return true;
    }

    const form = frameDocument.forms.main_form || frameDocument.querySelector("form");
    if (form) {
      form.submit();
      return true;
    }

    return false;
  }

  async function submitSingleFieldViaEditFrame(row, internalId, fieldId, value, label) {
    const editUrl = row.editUrl || makeEditUrl("", internalId);
    if (!editUrl) throw new Error("No SCR edit URL was available for background save.");

    const frame = document.createElement("iframe");
    frame.className = "scr-helper-save-frame";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    document.body.appendChild(frame);

    try {
      const initialLoad = waitForFrameLoad(frame, 30000, "Timed out loading SCR edit page.");
      frame.src = editUrl;
      const frameWindow = await initialLoad;

      if (typeof frameWindow.nlapiSubmitField === "function") {
        try {
          frameWindow.nlapiSubmitField(SCR_RECORD_SCRIPT_ID, internalId, fieldId, value, false);
          return "editFrame nlapiSubmitField";
        } catch (error) {
          console.warn("SCR helper iframe nlapiSubmitField failed", error);
        }
      }

      if (typeof frameWindow.require === "function") {
        try {
          return await submitSingleFieldWithRequire(frameWindow, internalId, fieldId, value);
        } catch (error) {
          console.warn("SCR helper iframe N/record submit failed", error);
        }
      }

      if (!setFrameFieldValue(frameWindow, fieldId, value)) {
        throw new Error(`Could not find ${label || fieldId} field on the SCR edit page.`);
      }

      const submitted = submitFrameForm(frameWindow);
      if (!submitted) throw new Error("Could not find a Save button or form on the SCR edit page.");

      await waitForFrameLoad(frame, 30000, "Timed out waiting for SCR edit page save.");
      return "editFrame form";
    } finally {
      setTimeout(() => frame.remove(), 1000);
    }
  }

  async function submitSingleFieldViaEditForm(row, internalId, fieldId, value, label) {
    const editUrl = row.editUrl || makeEditUrl("", internalId);
    if (!editUrl) throw new Error("No SCR edit URL was available for background save.");

    const frame = document.createElement("iframe");
    frame.className = "scr-helper-save-frame";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    document.body.appendChild(frame);

    try {
      const initialLoad = waitForFrameLoad(frame, 30000, "Timed out loading SCR edit page.");
      frame.src = editUrl;
      const frameWindow = await initialLoad;

      if (!setFrameFieldValue(frameWindow, fieldId, value)) {
        throw new Error(`Could not find ${label || fieldId} field on the SCR edit page.`);
      }

      const submitted = submitFrameForm(frameWindow);
      if (!submitted) throw new Error("Could not find a Save button or form on the SCR edit page.");

      await waitForFrameLoad(frame, 30000, "Timed out waiting for SCR edit page save.");
      return "editFrame form";
    } finally {
      setTimeout(() => frame.remove(), 1000);
    }
  }

  async function submitSingleField(row, fieldId, value, label) {
    const internalId = row.internalId || recordIdFromUrl(row.editUrl);
    if (!internalId) throw new Error("No SCR internal id was available for this row.");

    const pageWindow = getPageWindow();
    if (typeof pageWindow.nlapiSubmitField === "function") {
      try {
        pageWindow.nlapiSubmitField(SCR_RECORD_SCRIPT_ID, internalId, fieldId, value, false);
        return "nlapiSubmitField";
      } catch (error) {
        console.warn("SCR helper page nlapiSubmitField failed", error);
      }
    }

    if (typeof pageWindow.require === "function") {
      try {
        return await submitSingleFieldWithRequire(pageWindow, internalId, fieldId, value);
      } catch (error) {
        console.warn("SCR helper page N/record submit failed", error);
      }
    }

    return submitSingleFieldViaEditFrame(row, internalId, fieldId, value, label);
  }

  function submitStaffingNotes(row, value) {
    return submitSingleField(row, STAFFING_NOTES_FIELD_ID, value, "SCM Staffing notes");
  }

  function submitHashtags(row, value) {
    return submitSingleField(row, HASHTAGS_FIELD_ID, value, "hashtags");
  }

  function submitCrossVertical(row, value) {
    return submitSingleField(row, CROSS_VERTICAL_FIELD_ID, value, "Cross-Vertical");
  }

  function submitAssignee(row, value) {
    const internalId = row.internalId || recordIdFromUrl(row.editUrl);
    if (!internalId) throw new Error("No SCR internal id was available for this row.");
    return submitSingleFieldViaEditForm(row, internalId, ASSIGNEE_FIELD_ID, value, "Assigned To");
  }

  function setStaffingNotesStatus(card, message, state = "") {
    const status = card && card.querySelector(".scr-helper-notes-status");
    if (!status) return;
    status.textContent = message;
    status.className = `scr-helper-notes-status${state ? ` is-${state}` : ""}`;
    if (card) card.classList.toggle("is-working", state === "working");
  }

  async function copyTextToClipboard(text) {
    const value = String(text || "");
    if (!value) throw new Error("No text was available to copy.");

    if (typeof GM_setClipboard === "function") {
      GM_setClipboard(value, "text");
      return;
    }

    let clipboardError = null;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (error) {
        clipboardError = error;
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      if (!document.execCommand("copy")) {
        throw clipboardError || new Error("Copy command was blocked.");
      }
    } finally {
      textarea.remove();
    }
  }

  async function handleCopyScrLink(button) {
    const card = button && button.closest(".scr-helper-card");
    const row = searchRows.find(item => item.id === (card && card.dataset.rowId));
    const viewUrl = button.dataset.viewUrl || viewUrlForRow(row);
    const originalText = button.textContent;
    const originalTitle = button.title;
    if (!viewUrl) return;

    button.disabled = true;
    try {
      await copyTextToClipboard(viewUrl);
      button.textContent = "Copied";
      button.title = "SCR link copied";
      window.setTimeout(() => {
        button.textContent = originalText || "Copy link";
        button.title = originalTitle || "Copy SCR view link";
        button.disabled = false;
      }, 1600);
    } catch (error) {
      console.warn("IQUEUE could not copy SCR link", error);
      button.textContent = "Copy failed";
      button.title = "Clipboard blocked; copy the link from the prompt.";
      window.prompt("Copy this SCR link:", viewUrl);
      window.setTimeout(() => {
        button.textContent = originalText || "Copy link";
        button.title = originalTitle || "Copy SCR view link";
        button.disabled = false;
      }, 2200);
    }
  }

  function updateRowSearchText(row) {
    const allTextParts = row.fields.map(item => `${item.label} ${item.value}`)
      .concat([
        row.industryFamily,
        row.industrySubgroup,
        row.gtmIndustry,
        row.gtmIndustrySubgroup,
        row.state,
        row.originalSalesRegion,
        row.mappedSalesRegion,
        row.staffingRegion,
        row.salesTier,
        row.salesDirector,
        row.regionalVp,
        row.industryLeader,
        row.crossVertical,
        row.scrAge,
        row.salesVertical,
        row.amoDirect,
        row.hashtags,
        row.staffingNotes,
        row.assignedTo
      ]);
    row.allText = allTextParts.join(" ").toLowerCase();
    row.allKeyText = normalizeKey(allTextParts.join(" "));
  }

  function updateRowStaffingNotes(row, value) {
    const field = getStaffingNotesField(row.allFields || row.fields);
    if (field) {
      field.value = value;
      field.rawValue = value;
    }
    if (field && value && !row.fields.includes(field)) {
      row.fields.push(field);
    }
    row.staffingNotes = value;
    updateRowSearchText(row);
  }

  function updateRowHashtags(row, value) {
    let field = getHashtagsField(row.allFields || row.fields);
    if (!field && row.allFields) {
      field = {
        label: "Hashtags",
        value: "",
        rawValue: "",
        rawHtml: "",
        links: [],
        index: row.allFields.length
      };
      row.allFields.push(field);
    }
    if (field) {
      field.value = value;
      field.rawValue = value;
    }
    if (field && value && !row.fields.includes(field)) {
      row.fields.push(field);
    }
    row.hashtags = value;
    updateRowSearchText(row);
  }

  function updateRowAssignedTo(row, value) {
    const normalized = normalizeSpaces(value);
    const fields = row.allFields || row.fields;
    let field = findField(fields, [
      /assigned\s*to/, /assignedto/, /assignee/, /assigned\s*sc/, /solution\s*consultant/
    ], [/manager/, /lead\s*source/]);
    if (!field && row.allFields) {
      field = {
        label: "Assigned To",
        value: "",
        rawValue: "",
        rawHtml: "",
        links: [],
        index: row.allFields.length
      };
      row.allFields.push(field);
    }
    if (field) {
      field.value = normalized;
      field.rawValue = normalized;
    }
    if (field && normalized && !row.fields.includes(field)) {
      row.fields.push(field);
    }
    row.assignedTo = normalized;
    row.assignedToKey = normalizeKey(normalized);
    updateRowSearchText(row);
  }

  function crossIndustryOwnerOptions(row, target) {
    const family = target && target.family || "";
    const keys = scIndustryGroupKeyVariants(family);
    const authorizedOwners = uniqueSorted(keys.flatMap(key => authorizedManagerGroupLookup.get(key) || []));
    if (authorizedOwners.length) return authorizedOwners;

    if (authorizedManagersLoaded()) return [];

    return productsScmOwnerOptions();
  }

  function defaultCrossIndustryOwner(row, target) {
    return "";
  }

  function matchOwnerOption(value, options) {
    const text = normalizeSpaces(value);
    if (!text) return "";
    const numeric = text.match(/^\d+$/);
    if (numeric) {
      const index = Number(text) - 1;
      if (index >= 0 && index < options.length) return options[index];
    }

    const key = normalizeKey(text);
    return options.find(option => normalizeKey(option) === key)
      || options.find(option => normalizeKey(option).startsWith(key))
      || options.find(option => normalizeKey(option).includes(key))
      || "";
  }

  function showCrossIndustryAssignmentDialog(row, target) {
    const family = target && target.family || "selected queue";
    const defaultOwner = defaultCrossIndustryOwner(row, target);
    const options = uniqueSorted([defaultOwner].concat(crossIndustryOwnerOptions(row, target)).filter(Boolean));

    return new Promise(resolve => {
      const backdrop = document.createElement("div");
      backdrop.className = "scr-helper-owner-modal-backdrop";
      backdrop.innerHTML = `
        <div class="scr-helper-owner-modal" role="dialog" aria-modal="true" aria-labelledby="scr-helper-owner-modal-title">
          <div class="scr-helper-owner-modal-head">
            <div>
              <div id="scr-helper-owner-modal-title" class="scr-helper-owner-modal-title">Cross-staff to ${escapeHtml(family)}</div>
              <div class="scr-helper-owner-modal-subtitle">${escapeHtml(options.length ? "Choose an SCM owner, or route to the industry queue only." : "No authorized SCM owners are loaded for this industry. You can still route to the industry queue.")}</div>
            </div>
            <button type="button" class="scr-helper-owner-modal-close" title="Cancel">×</button>
          </div>
          <label class="scr-helper-owner-modal-field">
            <span>SCM Owner</span>
            <input class="scr-helper-owner-modal-input" type="search" placeholder="Start typing a manager name" autocomplete="off" value="${escapeHtml(defaultOwner)}">
          </label>
          <div class="scr-helper-owner-modal-list" role="listbox"></div>
          <label class="scr-helper-owner-modal-field">
            <span>Redirect note</span>
            <textarea class="scr-helper-owner-note-input" placeholder="Why is this cross-industry redirect happening?"></textarea>
          </label>
          <label class="scr-helper-owner-notify">
            <input class="scr-helper-owner-notify-input" type="checkbox" disabled>
            <span>Open email notification draft for SCM owner</span>
          </label>
          <div class="scr-helper-owner-modal-message" aria-live="polite"></div>
          <div class="scr-helper-owner-modal-actions">
            <button type="button" class="scr-helper-owner-route-only" title="Route to the industry queue without assigning an SCM owner.">Route to Industry</button>
            <button type="button" class="scr-helper-owner-cancel">Cancel</button>
            <button type="button" class="scr-helper-owner-save" title="Route to the selected SCM owner.">Route to SCM Owner</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      const input = backdrop.querySelector(".scr-helper-owner-modal-input");
      const noteInput = backdrop.querySelector(".scr-helper-owner-note-input");
      const list = backdrop.querySelector(".scr-helper-owner-modal-list");
      const message = backdrop.querySelector(".scr-helper-owner-modal-message");
      const save = backdrop.querySelector(".scr-helper-owner-save");
      const routeOnly = backdrop.querySelector(".scr-helper-owner-route-only");
      const notifyInput = backdrop.querySelector(".scr-helper-owner-notify-input");
      let selectedOwnerName = defaultOwner || "";
      let notifyTouched = false;

      function close(value) {
        backdrop.remove();
        resolve(value);
      }

      function updateSaveLabel() {
        const ownerName = selectedOwner();
        routeOnly.textContent = "Route to Industry";
        save.textContent = ownerName ? `Route to ${ownerName}` : "Route to SCM Owner";
        save.disabled = !ownerName;
        save.classList.toggle("is-ready", Boolean(ownerName));
        if (notifyInput) {
          notifyInput.disabled = !ownerName;
          if (!ownerName) {
            notifyInput.checked = false;
            notifyTouched = false;
          } else if (!notifyTouched) {
            notifyInput.checked = true;
          }
        }
      }

      function filteredOptions() {
        const key = normalizeKey(input.value);
        return options
          .filter(option => !key || normalizeKey(option).includes(key))
          .slice(0, 80);
      }

      function renderOptions() {
        const visible = filteredOptions();
        list.innerHTML = visible.map(option => `
          <button
            type="button"
            class="scr-helper-owner-option${normalizeKey(option) === normalizeKey(selectedOwnerName) ? " is-selected" : ""}"
            data-owner-name="${escapeHtml(option)}"
            role="option"
            aria-selected="${normalizeKey(option) === normalizeKey(selectedOwnerName) ? "true" : "false"}"
          >
            ${escapeHtml(option)}
          </button>
        `).join("");
        list.hidden = !visible.length;
        message.textContent = options.length || normalizeSpaces(input.value)
          ? ""
          : "Upload or load Authorized_Managers.json to show filtered SCM owners.";
        updateSaveLabel();
      }

      function selectedOwner() {
        const value = normalizeSpaces(input.value);
        if (!value) return "";
        if (selectedOwnerName && normalizeKey(value) === normalizeKey(selectedOwnerName)) return selectedOwnerName;
        return matchOwnerOption(value, options);
      }

      function notifyOwner() {
        return Boolean(notifyInput && notifyInput.checked);
      }

      function redirectNote() {
        return normalizeSpaces(noteInput && noteInput.value);
      }

      function saveSelection() {
        const value = normalizeSpaces(input.value);
        if (!value) {
          message.textContent = "Choose an SCM owner first, or use Route to Industry.";
          input.focus();
          return;
        }
        const ownerName = selectedOwner();
        if (!ownerName) {
          message.textContent = `No authorized manager matched "${value}".`;
          input.focus();
          return;
        }
        close({ ownerName, notifyOwner: notifyOwner(), redirectNote: redirectNote() });
      }

      function routeSelectionWithoutAssignment() {
        close({ ownerName: "", notifyOwner: false, redirectNote: redirectNote() });
      }

      input.addEventListener("input", () => {
        const matched = matchOwnerOption(input.value, options);
        const nextOwnerName = matched && normalizeKey(matched) === normalizeKey(input.value) ? matched : "";
        if (nextOwnerName && normalizeKey(nextOwnerName) !== normalizeKey(selectedOwnerName)) notifyTouched = false;
        selectedOwnerName = nextOwnerName;
        renderOptions();
      });
      input.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          event.preventDefault();
          close(null);
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const visible = filteredOptions();
          if (visible.length === 1) input.value = visible[0];
          saveSelection();
        }
      });
      list.addEventListener("click", event => {
        const option = closestElement(event.target, ".scr-helper-owner-option");
        if (!option) return;
        selectedOwnerName = option.dataset.ownerName || "";
        notifyTouched = false;
        input.value = selectedOwnerName;
        renderOptions();
        message.textContent = selectedOwnerName ? `Selected ${selectedOwnerName}.` : "";
        save.focus();
      });
      if (notifyInput) notifyInput.addEventListener("change", () => { notifyTouched = true; });
      routeOnly.addEventListener("click", routeSelectionWithoutAssignment);
      backdrop.querySelector(".scr-helper-owner-cancel").addEventListener("click", () => close(null));
      backdrop.querySelector(".scr-helper-owner-modal-close").addEventListener("click", () => close(null));
      save.addEventListener("click", saveSelection);
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) close(null);
      });

      renderOptions();
      input.focus();
      if (defaultOwner) input.select();
    });
  }

  function setOwnershipStatus(button, message, state = "") {
    const line = button && button.closest(".scr-helper-assigned-line");
    const status = line && line.querySelector(".scr-helper-ownership-status");
    if (!status) return;
    status.textContent = message;
    status.className = `scr-helper-ownership-status${state ? ` is-${state}` : ""}`;
  }

  function updateOwnershipDisplay(button, ownerName) {
    if (button) {
      button.textContent = "Owned by Me";
      button.disabled = true;
      button.title = "This SCR is explicitly owned by you.";
    }
  }

  function promptForOwnershipNote(ownerName) {
    const dateText = new Date().toLocaleDateString();
    const defaultNote = `Ownership taken by ${ownerName || "current user"} on ${dateText}.`;
    const value = window.prompt("Staffing notes are blank. Add an ownership note?", defaultNote);
    return value === null ? "" : normalizeMultiline(value);
  }

  function formatShortNumericDate(date = new Date()) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${date.getFullYear()}`;
  }

  function initialsFromPersonName(value) {
    const name = cleanPersonName(value);
    if (!name) return "";
    if (name.includes(",")) {
      const parts = name.split(",");
      const lastName = normalizeSpaces(parts[0]).split(/\s+/).find(Boolean) || "";
      const firstName = normalizeSpaces(parts.slice(1).join(" ")).split(/\s+/).find(Boolean) || "";
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }

    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function currentUserInitials() {
    return initialsFromPersonName(getCurrentUserName()) || "IQ";
  }

  function formatCrossIndustryRouteNote(noteText) {
    const text = normalizeSpaces(noteText);
    return text ? `${formatShortNumericDate()} [${currentUserInitials()}]: ${text}` : "";
  }

  function prependStaffingNoteLine(currentNotes, noteLine) {
    const current = normalizeMultiline(currentNotes);
    const line = normalizeSpaces(noteLine);
    if (!line) return current;
    if (current === line || current.startsWith(`${line}\n`)) return current;
    return current ? `${line}\n\n${current}` : line;
  }

  async function handleTakeOwnership(button) {
    const card = button.closest(".scr-helper-card");
    const row = searchRows.find(item => item.id === button.dataset.rowId);
    if (!row || !row.internalId) return;

    button.disabled = true;
    setOwnershipStatus(button, "Resolving current user...");
    setStaffingNotesStatus(card, "");

    try {
      const ownerName = cleanPersonName(currentExplicitScmOwnerName());
      if (!ownerName) {
        throw new Error("Could not determine the current user.");
      }

      const ownershipNote = normalizeMultiline(row.staffingNotes) ? "" : promptForOwnershipNote(ownerName);
      setOwnershipStatus(button, `Saving explicit SCM owner ${ownerName}...`);
      setStaffingNotesStatus(card, `⏳ Saving explicit SCM owner ${ownerName}...`, "working");
      const currentHashtags = row.hashtags || await lookupSingleField(row, HASHTAGS_FIELD_ID);
      const nextHashtags = valueWithScmOwnerTag(currentHashtags, ownerName);
      await submitHashtags(row, nextHashtags);
      updateRowHashtags(row, nextHashtags);
      updateOwnershipDisplay(button, ownerName);

      if (ownershipNote) {
        try {
          setOwnershipStatus(button, "Saving ownership note...");
          await submitStaffingNotes(row, ownershipNote);
          updateRowStaffingNotes(row, ownershipNote);
          const textarea = card && card.querySelector(".scr-helper-notes-input");
          if (textarea) textarea.value = ownershipNote;
        } catch (noteError) {
          console.warn("SCR helper saved explicit ownership but could not save ownership note", noteError);
          setOwnershipStatus(button, "Owner saved, but note did not save.", "error");
          setStaffingNotesStatus(card, "Owner saved, but ownership note did not save.", "error");
          return;
        }
      }

      setOwnershipStatus(button, "Ownership saved", "success");
      setStaffingNotesStatus(card, "Ownership saved", "success");
      renderResults();
    } catch (error) {
      console.warn("SCR helper failed to take ownership", error);
      button.disabled = rowAssignedToMatchesCurrentUser(row) || rowExplicitScmOwnerMatchesCurrentUser(row) || !row.internalId;
      setOwnershipStatus(button, "Could not save explicit owner.", "error");
      setStaffingNotesStatus(card, "Could not save explicit SCM owner from this page. Staff SCR is still available.", "error");
    }
  }

  async function handleRequesterInfoEmail(button) {
    const card = button.closest(".scr-helper-card");
    const row = searchRows.find(item => item.id === button.dataset.rowId);
    if (!row) return;

    button.disabled = true;
    setStaffingNotesStatus(card, "⏳ Resolving Sales Rep email...", "working");

    try {
      const recipient = await resolveSalesRepEmail(row);
      const draft = openRequesterInfoDraft(row, recipient);
      const openedText = draft.autoOpened === "mailto"
        ? "email compose opened using the Firefox fallback"
        : "Outlook compose opened";
      row.routingNotice = {
        message: `Info request ${openedText} for ${draft.email}. Review and send it. If it did not appear, use the links below.`,
        state: "success",
        links: draft.links || []
      };
      renderResults();
    } catch (error) {
      console.warn("IQUEUE could not compose requester info email", error);
      row.routingNotice = {
        message: `Could not compose requester email: ${error.message || error}`,
        state: "error"
      };
      renderResults();
    }
  }

  async function handleStaffingNotesSave(button) {
    const card = button.closest(".scr-helper-card");
    const textarea = card && card.querySelector(".scr-helper-notes-input");
    const row = searchRows.find(item => item.id === button.dataset.rowId);
    if (!row || !textarea) return;

    const value = textarea.value;
    const previousRoutingKey = crossIndustryRoutingKey(row);
    button.disabled = true;
    setStaffingNotesStatus(card, "⏳ Saving notes...", "working");

    try {
      await submitStaffingNotes(row, value);
      updateRowStaffingNotes(row, value);
      if (crossIndustryRoutingKey(row) !== previousRoutingKey) {
        updateIndustrySubgroupFilterOptions();
        renderResults();
        return;
      }
      setStaffingNotesStatus(card, "Saved", "success");
    } catch (error) {
      console.warn("SCR helper failed to save staffing notes", error);
      button.disabled = false;
      setStaffingNotesStatus(card, "Could not save from this page. Staff SCR is still available.", "error");
    }
  }

  async function handleCrossIndustryStaffing(button) {
    const card = button.closest(".scr-helper-card");
    const row = searchRows.find(item => item.id === button.dataset.rowId);
    const tag = button.dataset.xvrTag;
    if (!row || !tag) return;

    const target = CROSS_INDUSTRY_TARGETS.find(item => item.tag === tag);
    if (isTechCoeTarget(target) && !rowRequestTypeIsTechCoe(row)) {
      const actualType = requestTypeLabel(row.amoDirect) || normalizeSpaces(row.amoDirect) || "Not found";
      row.routingNotice = {
        message: `Tech COE route not saved. Request Type must be ${TECH_COE_REQUEST_TYPE}; current Request Type is ${actualType}. Open Staff SCR and update the request type first.`,
        state: "error",
        links: editUrlForRow(row) ? [{ label: "Staff SCR", href: editUrlForRow(row) }] : []
      };
      setStaffingNotesStatus(card, `Request Type must be ${TECH_COE_REQUEST_TYPE} before Tech COE routing.`, "error");
      renderResults();
      return;
    }
    const assignment = await showCrossIndustryAssignmentDialog(row, target);
    if (!assignment) return;
    const routeNoteLine = formatCrossIndustryRouteNote(assignment.redirectNote);

    const buttons = card ? Array.from(card.querySelectorAll(".scr-helper-xvr-button")) : [];
    buttons.forEach(item => { item.disabled = true; });
    setStaffingNotesStatus(card, `⏳ Saving route to ${target && target.family || "industry"}...`, "working");

    try {
      if (routeNoteLine) {
        setStaffingNotesStatus(card, "⏳ Saving redirect note...", "working");
        const currentNotes = await lookupSingleField(row, STAFFING_NOTES_FIELD_ID) || row.staffingNotes || "";
        const nextNotes = prependStaffingNoteLine(currentNotes, routeNoteLine);
        await submitStaffingNotes(row, nextNotes);
        updateRowStaffingNotes(row, nextNotes);
      }

      setStaffingNotesStatus(card, `⏳ Saving route to ${target && target.family || "industry"}...`, "working");
      const currentHashtags = row.hashtags || await lookupSingleField(row, HASHTAGS_FIELD_ID);
      const nextValue = valueWithCrossIndustryTag(currentHashtags, tag, target && target.markerTag, assignment.ownerName || "");
      await submitHashtags(row, nextValue);
      try {
        await submitCrossVertical(row, "T");
      } catch (crossVerticalError) {
        console.warn("SCR helper could not set Cross-Vertical flag", crossVerticalError);
      }
      updateRowHashtags(row, nextValue);
      if (!assignment.ownerName) {
        row.routingNotice = {
          message: `Route saved to ${target && target.family || "industry"} queue${routeNoteLine ? "; redirect note added." : "."}`,
          state: "success",
          links: []
        };
      } else if (assignment.notifyOwner === false) {
        row.routingNotice = {
          message: `Route saved${routeNoteLine ? "; redirect note added" : ""}; SCM email notification skipped.`,
          state: "success",
          links: []
        };
      } else if (assignment.ownerName) {
        try {
          setStaffingNotesStatus(card, "⏳ Route saved. Opening owner notification draft...", "working");
          const notice = await sendOwnerRouteEmail(row, assignment.ownerName, target, routeNoteLine);
          const openedText = notice.autoOpened === "mailto"
            ? "email compose opened using the Firefox fallback"
            : "Outlook compose opened";
          row.routingNotice = {
            message: `Route saved${routeNoteLine ? "; redirect note added" : ""}; ${openedText} for ${notice.email}. Review and send it. If it did not appear, use the links below.`,
            state: "success",
            links: notice.links || []
          };
        } catch (emailError) {
          console.warn("IQUEUE could not send owner route email", emailError);
          row.routingNotice = {
            message: `Route saved; email not sent: ${emailError.message || emailError}`,
            state: "error"
          };
          setGraphTokenStatus("Route email was not sent.", "warn", emailError.message || String(emailError));
        }
      }
      updateIndustrySubgroupFilterOptions();
      renderResults();
    } catch (error) {
      console.warn("SCR helper failed to save cross-industry route", error);
      buttons.forEach(item => { item.disabled = !row.internalId; });
      setStaffingNotesStatus(card, "Could not save route from this page. Staff SCR is still available.", "error");
    }
  }

  function setPortletMaximized(maximized, options = {}) {
    const portlet = document.getElementById(HELPER_ID);
    const button = document.getElementById("scr-helper-maximize");
    const logo = document.getElementById("scr-helper-logo");
    if (!portlet || !button) return;

    portlet.classList.toggle("scr-helper-fullscreen", maximized);
    button.textContent = maximized ? "Restore" : "Maximize";
    button.title = maximized ? "Restore portlet size" : "Maximize to full screen";
    button.setAttribute("aria-pressed", maximized ? "true" : "false");
    if (logo) {
      logo.src = maximized ? LOGO_LARGE_URL : LOGO_SMALL_URL;
      logo.classList.toggle("is-large", maximized);
      logo.classList.toggle("is-small", !maximized);
    }
    if (options.persist !== false) saveHelperState();
  }

  function togglePortletMaximized() {
    const portlet = document.getElementById(HELPER_ID);
    if (!portlet) return;
    setPortletMaximized(!portlet.classList.contains("scr-helper-fullscreen"));
  }

  function reloadPageWithHelperState() {
    saveHelperState();
    window.location.reload();
  }

  function afterNextPaint(callback) {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
      return;
    }
    window.setTimeout(callback, 0);
  }

  function scheduleBackgroundTask(callback, delay = 750) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: delay + 1000 });
      return;
    }
    window.setTimeout(callback, delay);
  }

  function renderStartupSplash(message = "Loading IQUEUE...") {
    const list = document.getElementById("scr-helper-results");
    const status = document.getElementById("scr-helper-status");
    if (status) status.textContent = message;
    if (!list || searchRows.length) return;
    list.innerHTML = `
      <div class="scr-helper-loading-splash" role="status" aria-live="polite">
        <div class="scr-helper-loading-mark">⏳</div>
        <div>
          <div class="scr-helper-loading-title">Loading IQUEUE</div>
          <div class="scr-helper-loading-text">${escapeHtml(message)}</div>
        </div>
      </div>
    `;
  }

  function setupPortletResize(portlet) {
    const handle = document.getElementById("scr-helper-resize-handle");
    if (!portlet || !handle) return;

    handle.addEventListener("pointerdown", event => {
      if (portlet.classList.contains("scr-helper-fullscreen")) return;

      event.preventDefault();
      const rect = portlet.getBoundingClientRect();
      portlet.style.left = `${rect.left}px`;
      portlet.style.top = `${rect.top}px`;
      portlet.style.right = "auto";
      portlet.style.bottom = "auto";
      portlet.style.width = `${rect.width}px`;
      portlet.style.height = `${rect.height}px`;

      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;
      const minWidth = Math.min(380, window.innerWidth - 20);
      const minHeight = Math.min(280, window.innerHeight - 20);
      const maxWidth = Math.max(minWidth, window.innerWidth - rect.left - 10);
      const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 10);

      document.body.classList.add("scr-helper-resizing");
      if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);

      function onPointerMove(moveEvent) {
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX));
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + moveEvent.clientY - startY));
        portlet.style.width = `${nextWidth}px`;
        portlet.style.height = `${nextHeight}px`;
      }

      function onPointerUp(upEvent) {
        document.body.classList.remove("scr-helper-resizing");
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        if (handle.releasePointerCapture) handle.releasePointerCapture(upEvent.pointerId);
      }

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    });
  }

  function insertPortlet() {
    const portlet = document.createElement("section");
    portlet.id = HELPER_ID;
    portlet.dataset.helperVersion = HELPER_VERSION;
    portlet.dataset.queueMode = CURRENT_QUEUE.key;
    const queueNav = [
      { key: "active", label: "Requested", icon: "▶", url: ACTIVE_SEARCH_URL, title: "View requested SCR queue" },
      { key: "onHold", label: "On Hold", icon: "⏸", url: ON_HOLD_SEARCH_URL, title: "View on hold SCR queue" }
    ].map(item => {
      const active = item.key === CURRENT_QUEUE.key;
      return `
        <button
          type="button"
          class="scr-helper-queue-nav-button${active ? " is-active" : ""}"
          data-queue-url="${escapeHtml(item.url)}"
          title="${escapeHtml(active ? `${item.label} queue is active` : item.title)}"
          aria-pressed="${active ? "true" : "false"}"
        >
          <span class="scr-helper-queue-nav-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <span>${escapeHtml(item.label)}</span>
        </button>
      `;
    }).join("");
    portlet.innerHTML = `
      <div class="scr-helper-header ${escapeHtml(CURRENT_QUEUE.headerClass)}">
        <div class="scr-helper-brand">
          <img
            id="scr-helper-logo"
            class="scr-helper-logo${helperState.maximized ? " is-large" : " is-small"}"
            src="${escapeHtml(helperState.maximized ? LOGO_LARGE_URL : LOGO_SMALL_URL)}"
            alt="IQUEUE"
            referrerpolicy="no-referrer"
          >
          <div class="scr-helper-header-meta">
            <div id="scr-helper-version" class="scr-helper-version">Version ${escapeHtml(HELPER_VERSION)}</div>
            <a id="scr-helper-update-link" class="scr-helper-update-link" href="${escapeHtml(SCRIPT_UPDATE_URL)}" target="_blank" rel="noopener noreferrer" hidden>Update available</a>
            <div id="scr-helper-status" class="scr-helper-status">Loading ${escapeHtml(CURRENT_QUEUE.loadingLabel)} (${escapeHtml(SAVED_SEARCH_ID)}).</div>
          </div>
        </div>
        <div class="scr-helper-header-actions">
          <div id="scr-helper-queue-nav" class="scr-helper-queue-nav" aria-label="Queue selector">${queueNav}</div>
          <button type="button" id="scr-helper-options-toggle" class="scr-helper-icon-button scr-helper-options-toggle" title="Options" aria-expanded="false" aria-controls="scr-helper-options-panel">⚙</button>
          <button type="button" id="scr-helper-maximize" class="scr-helper-icon-button" title="Maximize to full screen" aria-pressed="false">Maximize</button>
          <button type="button" id="scr-helper-refresh" class="scr-helper-icon-button" title="Refresh the full NetSuite page">Refresh</button>
        </div>
        <div id="scr-helper-options-panel" class="scr-helper-options-panel" hidden>
          <label class="scr-helper-options-row">
            <span>Show Enterprise / Tiger Opps</span>
            <span class="scr-helper-checkbox-row">
              <input id="scr-helper-hide-tiger-enterprise-filter" type="checkbox">
              Hide
            </span>
          </label>
          <button type="button" id="scr-helper-refresh-mapping" class="scr-helper-options-button">Refresh Mapping JSONs</button>
          <button type="button" id="scr-helper-check-update" class="scr-helper-options-button">Check for IQUEUE Update</button>
        </div>
      </div>
      <div class="scr-helper-filter-shell">
        <div class="scr-helper-filter-toolbar">
          <div class="scr-helper-filter-heading">Filters</div>
          <button type="button" id="scr-helper-filter-toggle" class="scr-helper-filter-toggle" aria-expanded="true" title="Hide filter controls">Collapse Filters</button>
        </div>
        <div id="scr-helper-filter-summary" class="scr-helper-filter-summary is-empty">
          <span class="scr-helper-filter-empty">No filters applied</span>
        </div>
        <div id="scr-helper-filter-body" class="scr-helper-filters">
          <div class="scr-helper-routing-filter-row">
            <label>
              <span>SC Industry Group</span>
              <select id="scr-helper-industry-filter">${optionHtml(industryFilterOptions, "All SC industry groups", industryOptionLabel)}</select>
            </label>
            <label>
              <span>SC Staffing Region</span>
              <select id="scr-helper-staffing-region-filter">${optionHtml(staffingRegionOptions, "Add region")}</select>
              <input id="scr-helper-staffing-region-values" type="hidden" value="">
              <div id="scr-helper-staffing-region-tokens" class="scr-helper-token-list"></div>
            </label>
            <label>
              <span>Request Type</span>
              <select id="scr-helper-amo-direct-filter">${optionHtml(amoDirectOptions, "All requests")}</select>
            </label>
          </div>
          <div class="scr-helper-gtm-filter-row">
            <label>
              <span>FY27 GTM Industry</span>
              <select id="scr-helper-gtm-industry-filter">${optionHtml([], "Choose GTM industry")}</select>
            </label>
            <label>
              <span>FY27 GTM Industry Subgroup</span>
              <select id="scr-helper-industry-subgroup-filter">${optionHtml([], "Optional subgroup")}</select>
            </label>
            <input id="scr-helper-gtm-criteria-values" type="hidden" value="">
            <button type="button" id="scr-helper-add-gtm-filter" class="scr-helper-add-filter-button" title="Choose a FY27 GTM Industry first" disabled>Add to Filter</button>
          </div>
          <label>
            <span>Sales Region</span>
            <select id="scr-helper-sales-region-filter">${optionHtml(salesRegionOptions, "All sales regions")}</select>
          </label>
          <label>
            <span>Sales Vertical</span>
            <select id="scr-helper-sales-vertical-filter">${optionHtml([], "All sales verticals")}</select>
          </label>
          <div class="scr-helper-people-filter-row">
            ${PEOPLE_FILTERS.map(filter => `
              <label class="scr-helper-people-token-filter">
                <span>${escapeHtml(filter.label)}</span>
                <input id="${escapeHtml(peopleFilterId(filter.key, "filter"))}" type="search" list="${escapeHtml(peopleFilterId(filter.key, "options"))}" placeholder="${escapeHtml(filter.placeholder)}">
                <datalist id="${escapeHtml(peopleFilterId(filter.key, "options"))}"></datalist>
                <div id="${escapeHtml(peopleFilterId(filter.key, "suggestions"))}" class="scr-helper-people-suggestions" hidden></div>
                <div id="${escapeHtml(peopleFilterId(filter.key, "tokens"))}" class="scr-helper-token-list"></div>
              </label>
            `).join("")}
          </div>
          <div id="scr-helper-products-scm-filter-row" class="scr-helper-products-scm-filter-row" hidden>
            <label class="scr-helper-checkbox-filter">
              <span>SCM Owner</span>
              <span class="scr-helper-checkbox-row">
                <input id="scr-helper-products-scm-owner-me-filter" type="checkbox">
                Me
              </span>
              <span id="scr-helper-products-scm-note" class="scr-helper-filter-note"></span>
            </label>
            <label class="scr-helper-people-token-filter scr-helper-products-scm-token-filter">
              <span>View SCM queue</span>
              <input id="scr-helper-products-scm-owner-filter" type="search" list="scr-helper-products-scm-owner-options" placeholder="Type SCM, press Enter">
              <input id="scr-helper-products-scm-owner-value" type="hidden" value="">
              <datalist id="scr-helper-products-scm-owner-options"></datalist>
              <div id="scr-helper-products-scm-owner-suggestions" class="scr-helper-people-suggestions" hidden></div>
              <div id="scr-helper-products-scm-owner-tokens" class="scr-helper-token-list"></div>
            </label>
          </div>
          <div class="scr-helper-checkbox-filter-row">
            <label class="scr-helper-checkbox-filter">
              <span>Assigned</span>
              <span class="scr-helper-checkbox-row">
                <input id="scr-helper-assigned-to-me-filter" type="checkbox">
                Assigned to me
              </span>
              <span id="scr-helper-current-user" class="scr-helper-filter-note"></span>
            </label>
            <label class="scr-helper-checkbox-filter">
              <span>Review</span>
              <span class="scr-helper-checkbox-row">
                <input id="scr-helper-unmapped-only-filter" type="checkbox">
                Review unmapped
              </span>
              <span class="scr-helper-filter-note">Includes rows with no queue mapping</span>
            </label>
            <label class="scr-helper-checkbox-filter">
              <span>SLA Hotlist</span>
              <span class="scr-helper-checkbox-row">
                <input id="scr-helper-sla-hotlist-filter" type="checkbox">
                Past SLA only
              </span>
              <span class="scr-helper-filter-note">Shows aging SCRs first</span>
            </label>
          </div>
          <label class="scr-helper-text-filter">
            <span>Search Returned Fields</span>
            <input id="scr-helper-text-filter" type="search" placeholder="Filter visible rows">
          </label>
        </div>
      </div>
      <div id="scr-helper-results" class="scr-helper-results"></div>
      <div id="scr-helper-resize-handle" class="scr-helper-resize-handle" title="Resize"></div>
    `;
    document.body.appendChild(portlet);

    const controls = getControls();
    const handleFilterChange = () => {
      saveHelperState();
      renderResults();
    };
    controls.industry.addEventListener("change", () => {
      saveHelperState();
      renderResults();
    });
    controls.gtmIndustry.addEventListener("change", () => {
      controls.industrySubgroup.value = "";
      updateIndustrySubgroupFilterOptions();
    });
    const addGtmButton = document.getElementById("scr-helper-add-gtm-filter");
    if (addGtmButton) addGtmButton.addEventListener("click", addGtmCriterionFilter);
    [controls.salesRegion, controls.salesVertical, controls.amoDirect, controls.productsScmOwnerMe, controls.assignedToMe, controls.unmappedOnly, controls.slaHotlist].forEach(control => {
      if (control) control.addEventListener("change", handleFilterChange);
    });
    if (controls.staffingRegion) {
      controls.staffingRegion.addEventListener("change", () => addStaffingRegionFilter(controls.staffingRegion.value));
    }
    const productsScmInput = document.getElementById("scr-helper-products-scm-owner-filter");
    if (productsScmInput) {
      productsScmInput.addEventListener("focus", () => {
        hideAllPeopleSuggestions();
        renderProductsScmOwnerSuggestions();
      });
      productsScmInput.addEventListener("input", renderProductsScmOwnerSuggestions);
      productsScmInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          hideProductsScmOwnerSuggestions();
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        window.setTimeout(() => addProductsScmOwnerFilter(productsScmInput.value), 0);
      });
      productsScmInput.addEventListener("change", () => {
        const value = normalizeSpaces(productsScmInput.value);
        if (value && productsScmOwnerOptions().some(option => normalizeKey(option) === normalizeKey(value))) {
          addProductsScmOwnerFilter(value);
        }
      });
    }
    PEOPLE_FILTERS.forEach(filter => {
      const input = document.getElementById(peopleFilterId(filter.key, "filter"));
      if (!input) return;
      input.addEventListener("focus", () => {
        hideAllPeopleSuggestions(filter.key);
        renderPeopleSuggestions(filter.key);
      });
      input.addEventListener("input", () => {
        renderPeopleSuggestions(filter.key);
      });
      input.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          hidePeopleSuggestions(filter.key);
          return;
        }
        if (event.key !== "Enter") return;
        event.preventDefault();
        window.setTimeout(() => addPeopleFilter(filter.key, input.value), 0);
      });
      input.addEventListener("change", () => {
        const value = normalizeSpaces(input.value);
        if (value && peopleFilterOptions(filter.key).some(option => normalizeKey(option) === normalizeKey(value))) {
          addPeopleFilter(filter.key, value);
        }
      });
    });
    if (controls.hideTigerEnterprise) controls.hideTigerEnterprise.addEventListener("change", handleFilterChange);
    controls.text.addEventListener("input", handleFilterChange);
    document.getElementById("scr-helper-filter-toggle").addEventListener("click", toggleFiltersCollapsed);
    document.getElementById("scr-helper-options-toggle").addEventListener("click", event => {
      event.stopPropagation();
      toggleOptionsPanel();
    });
    document.getElementById("scr-helper-options-panel").addEventListener("click", event => {
      event.stopPropagation();
    });
    document.getElementById("scr-helper-queue-nav").addEventListener("click", event => {
      const button = closestElement(event.target, ".scr-helper-queue-nav-button");
      if (!button || button.classList.contains("is-active")) return;
      openEditUrlWithGm(button.dataset.queueUrl);
    });
    document.getElementById("scr-helper-refresh-mapping").addEventListener("click", () => {
      loadExternalMapping({ force: true });
      loadGtmScIndustryMapping({ force: true });
      loadProductsScmMapping({ force: true });
      loadAuthorizedManagers({ force: true });
    });
    document.getElementById("scr-helper-check-update").addEventListener("click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = "Checking...";
      try {
        await checkForScriptUpdate({ force: true });
      } finally {
        button.disabled = false;
        button.textContent = "Check for IQUEUE Update";
      }
    });
    document.addEventListener("click", event => {
      const portlet = document.getElementById(HELPER_ID);
      if (portlet && !portlet.contains(event.target)) {
        setOptionsPanelOpen(false);
        hideAllPeopleSuggestions();
        hideProductsScmOwnerSuggestions();
        return;
      }
      if (!closestElement(event.target, ".scr-helper-people-token-filter")) hideAllPeopleSuggestions();
      if (!closestElement(event.target, ".scr-helper-products-scm-token-filter")) hideProductsScmOwnerSuggestions();
    });
    portlet.addEventListener("click", event => {
      const productsScmSuggestion = closestElement(event.target, ".scr-helper-products-scm-suggestion");
      if (productsScmSuggestion) {
        addProductsScmOwnerFilter(productsScmSuggestion.dataset.productsScmOwner);
        return;
      }

      const suggestionButton = closestElement(event.target, ".scr-helper-people-suggestion");
      if (suggestionButton) {
        addPeopleFilter(suggestionButton.dataset.peopleKey, suggestionButton.dataset.peopleValue);
        return;
      }

      const removeButton = closestElement(event.target, "[data-filter-remove]");
      if (!removeButton) return;
      handleFilterRemove(removeButton);
    });
    portlet.addEventListener("focusin", event => {
      const peopleFilter = closestElement(event.target, ".scr-helper-people-token-filter");
      if (!peopleFilter) hideAllPeopleSuggestions();
    });
    document.getElementById("scr-helper-maximize").addEventListener("click", togglePortletMaximized);
    document.getElementById("scr-helper-refresh").addEventListener("click", reloadPageWithHelperState);
    document.getElementById("scr-helper-results").addEventListener("click", event => {
      const mailtoLink = closestElement(event.target, ".scr-helper-notice-link[href^='mailto:']");
      if (mailtoLink) {
        event.preventDefault();
        openMailtoUrlInNewWindow(mailtoLink.href);
        return;
      }

      const copyLinkButton = closestElement(event.target, ".scr-helper-copy-link");
      if (copyLinkButton) {
        handleCopyScrLink(copyLinkButton);
        return;
      }

      const ownershipButton = closestElement(event.target, ".scr-helper-take-ownership");
      if (ownershipButton) {
        handleTakeOwnership(ownershipButton);
        return;
      }

      const xvrButton = closestElement(event.target, ".scr-helper-xvr-button");
      if (xvrButton) {
        handleCrossIndustryStaffing(xvrButton);
        return;
      }

      const saveButton = closestElement(event.target, ".scr-helper-notes-save");
      if (saveButton) {
        handleStaffingNotesSave(saveButton);
        return;
      }

      const requestInfoButton = closestElement(event.target, ".scr-helper-request-info");
      if (requestInfoButton) {
        handleRequesterInfoEmail(requestInfoButton);
        return;
      }

      const button = closestElement(event.target, ".scr-helper-edit");
      if (!button) return;
      const card = button.closest(".scr-helper-card");
      const row = searchRows.find(item => item.id === (card && card.dataset.rowId));
      const editUrl = button.getAttribute("href") || button.dataset.editUrl || editUrlForRow(row);
      if (!editUrl) return;

      if (button.tagName === "A") {
        button.href = editUrl;
        return;
      }

      openEditUrl(editUrl);
    });
    document.getElementById("scr-helper-results").addEventListener("input", event => {
      const textarea = closestElement(event.target, ".scr-helper-notes-input");
      if (!textarea) return;
      const card = textarea.closest(".scr-helper-card");
      const row = searchRows.find(item => item.id === textarea.dataset.rowId);
      const saveButton = card && card.querySelector(".scr-helper-notes-save");
      if (saveButton) saveButton.disabled = !row || !row.internalId;
      setStaffingNotesStatus(card, "");
    });
    setupPortletResize(portlet);
    restoreStoredFilters();
    updateProductsScmControls();
    setPortletMaximized(Boolean(helperState.maximized), { persist: false });
    setFiltersCollapsed(filtersCollapsed, { persist: false });
    hydrateCurrentUserName();
    checkForScriptUpdate();
  }

  function removeExistingHelperArtifacts() {
    const existingPortlet = document.getElementById(HELPER_ID);
    if (existingPortlet) existingPortlet.remove();

    document.querySelectorAll(".scr-helper-save-frame").forEach(frame => frame.remove());
    Array.from(document.querySelectorAll("style")).forEach(style => {
      const text = style.textContent || "";
      if (style.id === HELPER_STYLE_ID || text.includes(`#${HELPER_ID}`) || text.includes(".scr-helper-save-frame")) {
        style.remove();
      }
    });
  }

  function addStyles() {
    const style = document.createElement("style");
    style.id = HELPER_STYLE_ID;
    style.dataset.scrHelperVersion = HELPER_VERSION;
    style.textContent = `
      #${HELPER_ID} {
        --rw-oracle-red: ${REDWOOD_COLORS.oracleRed};
        --rw-netsuite-ocean: ${REDWOOD_COLORS.netsuiteOcean};
        --rw-slate-150: ${REDWOOD_COLORS.slate150};
        --rw-slate-100: ${REDWOOD_COLORS.slate100};
        --rw-slate-50: ${REDWOOD_COLORS.slate50};
        --rw-neutral-30: ${REDWOOD_COLORS.neutral30};
        --rw-brand-yellow: ${REDWOOD_COLORS.brandYellow};
        --rw-netsuite-brand-yellow: ${REDWOOD_COLORS.netsuiteBrandYellow};
        --rw-pine-100: ${REDWOOD_COLORS.pine100};
        --rw-pine-90: ${REDWOOD_COLORS.pine90};
        --rw-ocean-30: ${REDWOOD_COLORS.ocean30};
        --rw-ocean-60: ${REDWOOD_COLORS.ocean60};
        --rw-plum-100: ${REDWOOD_COLORS.plum100};
        --rw-sienna-60: ${REDWOOD_COLORS.sienna60};
        --rw-sky-120: ${REDWOOD_COLORS.sky120};
        --rw-sky-30: ${REDWOOD_COLORS.sky30};
        --rw-teal-100: ${REDWOOD_COLORS.teal100};
        --scr-tiger-purple: ${REDWOOD_COLORS.tigerPurple};
        --scr-tiger-purple-soft: ${REDWOOD_COLORS.tigerPurpleSoft};
        --ns-ui-primary: ${CURRENT_QUEUE.primaryColor};
        --ns-ui-primary-soft: ${CURRENT_QUEUE.primarySoft};
        --ns-ui-primary-mid: ${CURRENT_QUEUE.primaryMid};
        --ns-ui-header-accent: ${CURRENT_QUEUE.headerAccent};
        --ns-ui-accent: ${REDWOOD_COLORS.oracleRed};
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 999999;
        width: min(560px, calc(100vw - 36px));
        height: min(760px, calc(100vh - 36px));
        min-width: 380px;
        min-height: 280px;
        max-width: calc(100vw - 36px);
        max-height: calc(100vh - 36px);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid var(--rw-slate-50);
        border-radius: 8px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
        background: #ffffff;
        color: var(--rw-slate-150);
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
      }

      #${HELPER_ID}.scr-helper-fullscreen {
        inset: 0 !important;
        width: auto !important;
        height: auto !important;
        min-width: 0;
        min-height: 0;
        max-width: none;
        max-height: none;
        border-radius: 0;
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
      }

      body.scr-helper-resizing,
      body.scr-helper-resizing * {
        cursor: nwse-resize !important;
        user-select: none !important;
      }

      #${HELPER_ID} .scr-helper-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 12px 10px;
        border-bottom: 3px solid var(--ns-ui-primary-mid);
        background: var(--ns-ui-primary);
        color: var(--rw-neutral-30);
        flex: 0 0 auto;
      }

      #${HELPER_ID} .scr-helper-header.scr-helper-queue-on-hold {
        border-bottom-color: var(--ns-ui-header-accent);
        background:
          repeating-linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.14) 0,
            rgba(255, 255, 255, 0.14) 8px,
            transparent 8px,
            transparent 18px
          ),
          linear-gradient(90deg, var(--rw-sky-120), var(--rw-netsuite-ocean));
      }

      #${HELPER_ID}.scr-helper-update-available .scr-helper-header {
        border-bottom-color: #7a4a00;
        background: var(--rw-brand-yellow);
        color: var(--rw-slate-150);
      }

      #${HELPER_ID} .scr-helper-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }

      #${HELPER_ID} .scr-helper-logo {
        display: block;
        flex: 0 0 auto;
        width: auto;
        object-fit: contain;
      }

      #${HELPER_ID} .scr-helper-logo.is-small {
        max-width: 44px;
        max-height: 34px;
      }

      #${HELPER_ID} .scr-helper-logo.is-large {
        max-width: min(280px, 36vw);
        max-height: 58px;
      }

      #${HELPER_ID}:not(.scr-helper-fullscreen) .scr-helper-logo.is-large {
        max-width: 44px;
        max-height: 34px;
      }

      #${HELPER_ID} .scr-helper-header-meta {
        min-width: 0;
      }

      #${HELPER_ID} .scr-helper-version {
        color: var(--rw-slate-50);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
      }

      #${HELPER_ID}.scr-helper-update-available .scr-helper-version,
      #${HELPER_ID}.scr-helper-update-available .scr-helper-status {
        color: var(--rw-slate-150);
      }

      #${HELPER_ID} .scr-helper-update-link {
        display: inline-flex;
        width: fit-content;
        margin-top: 3px;
        border: 1px solid rgba(122, 74, 0, 0.45);
        border-radius: 4px;
        padding: 2px 6px;
        background: #ffffff;
        color: #7a4a00;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
        text-decoration: none;
      }

      #${HELPER_ID} .scr-helper-update-link[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-update-link:hover {
        border-color: #7a4a00;
        text-decoration: underline;
      }

      #${HELPER_ID} .scr-helper-graph-token-status {
        width: fit-content;
        margin-top: 4px;
        border: 1px solid rgba(122, 74, 0, 0.42);
        border-radius: 4px;
        padding: 2px 6px;
        background: #fff8df;
        color: #7a4a00;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.3;
      }

      #${HELPER_ID} .scr-helper-graph-token-status[data-tone="good"] {
        border-color: rgba(31, 122, 77, 0.38);
        background: #e8f4ed;
        color: #1f7a4d;
      }

      #${HELPER_ID} .scr-helper-graph-token-status a {
        color: inherit;
        text-decoration: underline;
      }

      #${HELPER_ID} .scr-helper-graph-token-status[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-status {
        margin-top: 2px;
        color: var(--rw-neutral-30);
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-header-actions {
        position: relative;
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-queue-nav {
        display: inline-flex;
        align-items: center;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.38);
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.12);
      }

      #${HELPER_ID} .scr-helper-queue-nav-button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 0;
        border-right: 1px solid rgba(255, 255, 255, 0.28);
        padding: 7px 9px;
        background: transparent;
        color: rgba(255, 255, 255, 0.82);
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }

      #${HELPER_ID} .scr-helper-queue-nav-button:last-child {
        border-right: 0;
      }

      #${HELPER_ID} .scr-helper-queue-nav-button:hover {
        background: rgba(255, 255, 255, 0.18);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-queue-nav-button.is-active {
        background: #ffffff;
        color: var(--ns-ui-primary);
        cursor: default;
      }

      #${HELPER_ID} .scr-helper-queue-nav-icon {
        font-size: 11px;
        line-height: 1;
      }

      #${HELPER_ID} .scr-helper-options-toggle {
        min-width: 34px;
        padding-left: 8px;
        padding-right: 8px;
      }

      #${HELPER_ID} .scr-helper-options-panel {
        position: absolute;
        top: calc(100% - 2px);
        right: 12px;
        z-index: 2;
        width: min(260px, calc(100vw - 54px));
        border: 1px solid var(--rw-slate-50);
        border-radius: 6px;
        padding: 10px;
        background: #ffffff;
        box-shadow: 0 12px 30px rgba(60, 69, 69, 0.2);
        color: var(--rw-slate-150);
      }

      #${HELPER_ID} .scr-helper-options-panel[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-options-row {
        gap: 7px;
      }

      #${HELPER_ID} .scr-helper-options-button {
        width: 100%;
        margin-top: 9px;
        border: 0;
        border-radius: 4px;
        padding: 8px 10px;
        background: var(--ns-ui-primary);
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-options-button:hover {
        background: #24495a;
      }

      #${HELPER_ID} .scr-helper-options-link {
        display: flex;
        justify-content: center;
        width: 100%;
        margin-top: 9px;
        border: 1px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 7px 10px;
        color: var(--ns-ui-primary);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-decoration: none;
      }

      #${HELPER_ID} .scr-helper-options-link:hover {
        background: var(--ns-ui-primary-soft);
      }

      #${HELPER_ID} .scr-helper-options-status {
        margin-top: 9px;
        border-radius: 4px;
        padding: 7px 8px;
        background: #fff8df;
        color: #7a4a00;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-options-status[data-tone="good"] {
        background: #e8f4ed;
        color: #1f7a4d;
      }

      #${HELPER_ID} .scr-helper-options-status a {
        color: inherit;
        text-decoration: underline;
      }

      #${HELPER_ID} .scr-helper-options-status[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-icon-button,
      #${HELPER_ID} .scr-helper-edit {
        border: 0;
        border-radius: 4px;
        background: var(--ns-ui-primary);
        color: #ffffff;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }

      #${HELPER_ID} .scr-helper-icon-button {
        padding: 7px 9px;
      }

      #${HELPER_ID} .scr-helper-queue-switch {
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-queue-switch:hover {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-edit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 10px;
        line-height: 1.2;
        text-decoration: none;
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo .scr-helper-edit,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] .scr-helper-edit {
        background: var(--rw-oracle-red);
      }

      #${HELPER_ID} .scr-helper-card.is-request-direct .scr-helper-edit,
      #${HELPER_ID} .scr-helper-card[data-request-type="direct"] .scr-helper-edit {
        background: var(--ns-ui-primary);
      }

      #${HELPER_ID} .scr-helper-icon-button:hover,
      #${HELPER_ID} .scr-helper-edit:hover {
        background: #24495a;
      }

      #${HELPER_ID} .scr-helper-icon-button.scr-helper-queue-switch:hover {
        background: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo .scr-helper-edit:hover,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] .scr-helper-edit:hover {
        background: #a53a2b;
      }

      #${HELPER_ID} .scr-helper-card.is-request-direct .scr-helper-edit:hover,
      #${HELPER_ID} .scr-helper-card[data-request-type="direct"] .scr-helper-edit:hover {
        background: #24495a;
      }

      #${HELPER_ID} .scr-helper-card .scr-helper-edit:disabled,
      #${HELPER_ID} .scr-helper-edit:disabled {
        background: var(--rw-slate-50);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-filter-shell {
        flex: 0 0 auto;
        border-bottom: 1px solid var(--rw-slate-50);
        background: var(--ns-ui-primary-soft);
      }

      #${HELPER_ID} .scr-helper-filter-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 12px;
      }

      #${HELPER_ID} .scr-helper-filter-heading {
        color: var(--rw-slate-150);
        font-size: 12px;
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-filter-toggle {
        flex: 0 0 auto;
        border: 1px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 5px 8px;
        background: #ffffff;
        color: var(--ns-ui-primary);
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }

      #${HELPER_ID} .scr-helper-filter-toggle:hover {
        background: var(--ns-ui-primary);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-filter-summary {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        padding: 0 12px 9px;
      }

      #${HELPER_ID} .scr-helper-filter-expression-line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-filter-expression {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-filter-operator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        border-radius: 999px;
        padding: 3px 6px;
        color: #ffffff;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0;
        line-height: 1;
      }

      #${HELPER_ID} .scr-helper-filter-operator.is-and {
        background: var(--ns-ui-primary);
      }

      #${HELPER_ID} .scr-helper-filter-operator.is-or {
        background: var(--rw-pine-100);
      }

      #${HELPER_ID} .scr-helper-filter-paren {
        display: inline-flex;
        align-items: center;
        color: var(--rw-slate-150);
        font-size: 20px;
        font-weight: 900;
        line-height: 1;
      }

      #${HELPER_ID} .scr-helper-filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        border: 1px solid var(--rw-slate-50);
        border-left: 3px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 4px 7px;
        background: #ffffff;
        color: var(--rw-slate-100);
        line-height: 1.2;
      }

      #${HELPER_ID} .scr-helper-filter-chip strong {
        min-width: 0;
        color: var(--rw-slate-150);
        overflow-wrap: anywhere;
      }

      #${HELPER_ID} .scr-helper-filter-chip-remove,
      #${HELPER_ID} .scr-helper-token-remove {
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        border: 0;
        border-radius: 50%;
        padding: 0;
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        line-height: 18px;
        text-align: center;
      }

      #${HELPER_ID} .scr-helper-filter-chip-remove:hover,
      #${HELPER_ID} .scr-helper-token-remove:hover {
        background: var(--ns-ui-primary);
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-filter-empty {
        color: var(--rw-slate-100);
        font-size: 11px;
        line-height: 1.3;
      }

      #${HELPER_ID}.scr-helper-filters-collapsed .scr-helper-filters {
        display: grid;
        grid-template-columns: 1fr;
        padding-top: 0;
      }

      #${HELPER_ID}.scr-helper-filters-collapsed .scr-helper-filters > :not(.scr-helper-text-filter) {
        display: none !important;
      }

      #${HELPER_ID} .scr-helper-filters {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        padding: 0 12px 10px;
        background: var(--ns-ui-primary-soft);
        flex: 0 0 auto;
      }

      #${HELPER_ID} label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        color: var(--rw-slate-100);
        font-weight: 700;
      }

      #${HELPER_ID} select,
      #${HELPER_ID} input,
      #${HELPER_ID} textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 30px;
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        padding: 5px 7px;
        background: #ffffff;
        color: var(--rw-slate-150);
        font-size: 12px;
      }

      #${HELPER_ID} textarea {
        min-height: 120px;
        resize: vertical;
        line-height: 1.35;
        font-family: Arial, Helvetica, sans-serif;
      }

      #${HELPER_ID} .scr-helper-text-filter {
        grid-column: 1 / -1;
      }

      #${HELPER_ID} .scr-helper-routing-filter-row,
      #${HELPER_ID} .scr-helper-gtm-filter-row,
      #${HELPER_ID} .scr-helper-checkbox-filter-row,
      #${HELPER_ID} .scr-helper-products-scm-filter-row,
      #${HELPER_ID} .scr-helper-people-filter-row {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      #${HELPER_ID} .scr-helper-gtm-filter-row {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
        align-items: end;
      }

      #${HELPER_ID} .scr-helper-add-filter-button {
        min-height: 30px;
        border: 1px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 5px 10px;
        background: var(--ns-ui-primary);
        color: #ffffff;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
      }

      #${HELPER_ID} .scr-helper-add-filter-button:hover {
        background: #24495a;
      }

      #${HELPER_ID} .scr-helper-add-filter-button:disabled {
        border-color: var(--rw-slate-50);
        background: var(--rw-slate-50);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-products-scm-filter-row {
        grid-template-columns: minmax(180px, 0.55fr) minmax(280px, 1.45fr);
      }

      #${HELPER_ID} .scr-helper-products-scm-filter-row[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-people-token-filter {
        position: relative;
        min-width: 0;
      }

      #${HELPER_ID} .scr-helper-people-suggestions {
        position: absolute;
        z-index: 20;
        top: 52px;
        left: 0;
        right: 0;
        max-height: 180px;
        overflow-y: auto;
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        box-shadow: 0 8px 18px rgba(31, 42, 42, 0.18);
        background: #ffffff;
      }

      #${HELPER_ID} .scr-helper-people-suggestions[hidden] {
        display: none;
      }

      #${HELPER_ID} .scr-helper-people-suggestion,
      #${HELPER_ID} .scr-helper-products-scm-suggestion {
        display: block;
        width: 100%;
        border: 0;
        border-bottom: 1px solid var(--rw-neutral-30);
        padding: 7px 8px;
        background: #ffffff;
        color: var(--rw-slate-150);
        cursor: pointer;
        font-size: 12px;
        line-height: 1.25;
        text-align: left;
      }

      #${HELPER_ID} .scr-helper-people-suggestion:hover,
      #${HELPER_ID} .scr-helper-people-suggestion:focus,
      #${HELPER_ID} .scr-helper-products-scm-suggestion:hover,
      #${HELPER_ID} .scr-helper-products-scm-suggestion:focus {
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
        outline: none;
      }

      #${HELPER_ID} .scr-helper-token-list {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        min-height: 0;
      }

      #${HELPER_ID} .scr-helper-token {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        border: 1px solid var(--rw-slate-50);
        border-left: 3px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 3px 5px 3px 7px;
        background: #ffffff;
        color: var(--rw-slate-150);
        font-size: 11px;
        line-height: 1.2;
      }

      #${HELPER_ID} .scr-helper-checkbox-filter {
        justify-content: start;
      }

      #${HELPER_ID} .scr-helper-checkbox-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        color: var(--rw-slate-150);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-checkbox-row input {
        width: auto;
        min-height: 0;
        margin: 0;
      }

      #${HELPER_ID} .scr-helper-filter-note {
        min-height: 13px;
        color: var(--rw-slate-100);
        font-size: 11px;
        font-weight: 400;
        line-height: 1.2;
      }

      #${HELPER_ID} .scr-helper-results {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        padding: 10px 12px 12px;
      }

      #${HELPER_ID}.scr-helper-fullscreen .scr-helper-results {
        padding: 12px 16px 16px;
      }

      #${HELPER_ID} .scr-helper-loading-splash {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 148px;
        border: 1px solid var(--rw-slate-50);
        border-radius: 8px;
        padding: 18px;
        background: linear-gradient(90deg, var(--rw-ocean-30), #ffffff 72%);
        color: var(--rw-slate-150);
        box-shadow: inset 4px 0 0 var(--ns-ui-primary);
      }

      #${HELPER_ID} .scr-helper-loading-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        background: #fff4d8;
        color: #7a4a00;
        font-size: 18px;
      }

      #${HELPER_ID} .scr-helper-loading-title {
        color: var(--ns-ui-primary);
        font-size: 15px;
        font-weight: 800;
      }

      #${HELPER_ID} .scr-helper-loading-text {
        margin-top: 3px;
        color: var(--rw-slate-100);
        font-size: 12px;
        font-weight: 600;
      }

      #${HELPER_ID}.scr-helper-fullscreen .scr-helper-summary-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }

      #${HELPER_ID} .scr-helper-resize-handle {
        position: absolute;
        right: 2px;
        bottom: 2px;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        border-right: 2px solid var(--rw-slate-100);
        border-bottom: 2px solid var(--rw-slate-100);
        opacity: 0.7;
      }

      #${HELPER_ID}.scr-helper-fullscreen .scr-helper-resize-handle {
        display: none;
      }

      .scr-helper-save-frame {
        position: fixed;
        width: 1px;
        height: 1px;
        left: -9999px;
        top: -9999px;
        opacity: 0;
        pointer-events: none;
      }

      #${HELPER_ID} .scr-helper-card {
        position: relative;
        border: 1px solid var(--rw-slate-50);
        border-left: 5px solid var(--scr-industry-color, var(--ns-ui-primary-mid));
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }

      #${HELPER_ID} .scr-helper-card.is-working {
        box-shadow: 0 0 0 2px rgba(241, 177, 63, 0.35), 0 6px 18px rgba(60, 69, 69, 0.12);
      }

      #${HELPER_ID} .scr-helper-card.is-working::after {
        content: "⏳ Working...";
        position: absolute;
        right: 12px;
        bottom: 10px;
        z-index: 2;
        border: 1px solid var(--rw-brand-yellow);
        border-radius: 999px;
        padding: 4px 9px;
        background: #fff4d8;
        color: #7a4a00;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 2px 6px rgba(60, 69, 69, 0.14);
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] {
        border-left-color: var(--scr-industry-color, var(--ns-ui-accent));
      }

      #${HELPER_ID} .scr-helper-card.is-request-direct,
      #${HELPER_ID} .scr-helper-card[data-request-type="direct"] {
        border-left-color: var(--scr-industry-color, var(--ns-ui-primary));
      }

      #${HELPER_ID} .scr-helper-card + .scr-helper-card {
        margin-top: 10px;
      }

      #${HELPER_ID} .scr-helper-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 10px;
        background: linear-gradient(90deg, var(--scr-industry-bg, #ffffff), #ffffff 72%);
      }

      #${HELPER_ID} .scr-helper-card.is-sla-passed .scr-helper-card-head {
        background: linear-gradient(90deg, #fff4d8, var(--scr-industry-bg, #ffffff) 42%, #ffffff 86%);
        box-shadow: inset 0 2px 0 var(--rw-brand-yellow);
      }

      #${HELPER_ID} .scr-helper-card-title {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 6px;
        font-weight: 700;
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-card-title strong {
        font-size: 14px;
      }

      #${HELPER_ID} .scr-helper-copy-link {
        border: 1px solid var(--scr-tiger-purple);
        border-radius: 4px;
        padding: 3px 7px;
        background: var(--scr-tiger-purple);
        color: #ffffff;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }

      #${HELPER_ID} .scr-helper-copy-link:hover {
        border-color: #4c2aa4;
        background: #4c2aa4;
        color: #ffffff;
      }

      #${HELPER_ID} .scr-helper-copy-link:disabled {
        opacity: 0.78;
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-card-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 6px;
      }

      #${HELPER_ID} .scr-helper-brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 100%;
        border: 1px solid var(--badge-color, var(--rw-slate-50));
        border-left-width: 3px;
        border-radius: 4px;
        padding: 3px 6px;
        background: var(--badge-bg, #ffffff);
        color: var(--badge-color, var(--rw-slate-150));
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        vertical-align: middle;
      }

      #${HELPER_ID} .scr-helper-brand-badge.is-gtm-subgroup {
        border-color: var(--rw-slate-50);
        border-left-color: var(--scr-industry-color, var(--rw-slate-100));
        color: var(--rw-slate-150);
      }

      #${HELPER_ID} .scr-helper-brand-badge.is-tiger-enterprise {
        border-color: var(--scr-tiger-purple);
        background: var(--scr-tiger-purple-soft);
        color: var(--scr-tiger-purple);
      }

      #${HELPER_ID} .scr-helper-brand-badge.is-sla-passed {
        border-color: var(--rw-brand-yellow);
        background: #fff4d8;
        color: #7a4a00;
      }

      #${HELPER_ID} .scr-helper-brand-emoji {
        flex: 0 0 auto;
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo .scr-helper-card-title,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] .scr-helper-card-title {
        color: var(--rw-oracle-red);
      }

      #${HELPER_ID} .scr-helper-card.is-request-direct .scr-helper-card-title,
      #${HELPER_ID} .scr-helper-card[data-request-type="direct"] .scr-helper-card-title {
        color: var(--ns-ui-primary);
      }

      #${HELPER_ID} .scr-helper-title-separator {
        color: var(--rw-slate-50);
      }

      #${HELPER_ID} .scr-helper-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 8px;
        padding: 10px;
        border-top: 1px solid var(--rw-slate-50);
      }

      #${HELPER_ID} .scr-helper-summary-column {
        min-width: 0;
        padding: 9px;
        border: 1px solid var(--rw-slate-50);
        border-radius: 6px;
        background: #ffffff;
      }

      #${HELPER_ID} .scr-helper-summary-title {
        margin-bottom: 8px;
        color: var(--rw-slate-150);
        font-size: 12px;
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-summary-item + .scr-helper-summary-item {
        margin-top: 8px;
      }

      #${HELPER_ID} .scr-helper-summary-label {
        color: var(--rw-slate-100);
        font-size: 11px;
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-summary-value {
        margin-top: 3px;
        overflow-wrap: anywhere;
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-summary-value .scr-helper-brand-badge {
        font-size: 12px;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-strong .scr-helper-summary-value {
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-long .scr-helper-summary-value {
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 4px;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-long:not(.is-rich) .scr-helper-summary-value {
        white-space: pre-wrap;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value {
        white-space: normal;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value p,
      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value ul,
      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value ol {
        margin: 0 0 7px;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value ul,
      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value ol {
        padding-left: 18px;
      }

      #${HELPER_ID} .scr-helper-summary-item.is-rich .scr-helper-summary-value li + li {
        margin-top: 3px;
      }

      #${HELPER_ID} .scr-helper-summary-value a {
        color: var(--ns-ui-primary);
        text-decoration: none;
      }

      #${HELPER_ID} .scr-helper-summary-value a:hover {
        text-decoration: underline;
      }

      #${HELPER_ID} .scr-helper-assigned-line {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-assigned-name {
        min-width: 0;
      }

      #${HELPER_ID} .scr-helper-products-scm-owner {
        display: inline-flex;
        flex-direction: column;
        gap: 2px;
      }

      #${HELPER_ID} .scr-helper-take-ownership {
        border: 1px solid var(--ns-ui-primary);
        border-radius: 4px;
        padding: 4px 7px;
        background: #ffffff;
        color: var(--ns-ui-primary);
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo .scr-helper-take-ownership,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] .scr-helper-take-ownership {
        border-color: var(--rw-oracle-red);
        color: var(--rw-oracle-red);
      }

      #${HELPER_ID} .scr-helper-take-ownership:hover {
        background: var(--ns-ui-primary-soft);
      }

      #${HELPER_ID} .scr-helper-card.is-request-amo .scr-helper-take-ownership:hover,
      #${HELPER_ID} .scr-helper-card[data-request-type="amo"] .scr-helper-take-ownership:hover {
        background: rgba(199, 70, 52, 0.08);
      }

      #${HELPER_ID} .scr-helper-take-ownership:disabled {
        border-color: var(--rw-slate-50);
        background: var(--rw-neutral-30);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-ownership-status {
        color: var(--rw-slate-100);
        font-size: 11px;
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-ownership-status.is-success {
        color: var(--rw-pine-100);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-ownership-status.is-error {
        color: var(--rw-oracle-red);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-notes-editor {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      #${HELPER_ID} .scr-helper-notes-actions {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      #${HELPER_ID} .scr-helper-notes-button-stack {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-xvr-controls {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      #${HELPER_ID} .scr-helper-xvr-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      #${HELPER_ID} .scr-helper-xvr-button {
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        padding: 5px 7px;
        background: #ffffff;
        color: var(--rw-slate-150);
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
      }

      #${HELPER_ID} .scr-helper-xvr-button:hover {
        border-color: var(--xvr-color, var(--ns-ui-primary));
        color: var(--xvr-color, var(--ns-ui-primary));
      }

      #${HELPER_ID} .scr-helper-xvr-button.is-active {
        border-color: var(--xvr-color, var(--ns-ui-primary));
        background: var(--xvr-bg, var(--ns-ui-primary-soft));
        color: var(--xvr-color, var(--ns-ui-primary));
      }

      #${HELPER_ID} .scr-helper-xvr-button:disabled {
        background: var(--rw-neutral-30);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-xvr-state {
        color: var(--rw-slate-100);
        font-size: 11px;
        line-height: 1.35;
      }

      .scr-helper-owner-modal-backdrop {
        --ns-ui-primary: #36677D;
        --ns-ui-primary-soft: #E7F2F5;
        --ns-ui-primary-mid: #94BFCE;
        --rw-neutral-30: #F1EFED;
        --rw-slate-50: #C2D4D4;
        --rw-slate-100: #697778;
        --rw-slate-150: #3C4545;
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(15, 31, 35, 0.42);
      }

      .scr-helper-owner-modal {
        width: min(520px, calc(100vw - 40px));
        max-height: min(620px, calc(100vh - 40px));
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--rw-slate-50);
        border-radius: 8px;
        box-shadow: 0 16px 38px rgba(15, 31, 35, 0.22);
        background: #ffffff;
        color: var(--rw-slate-150);
        padding: 16px;
        font-family: Arial, Helvetica, sans-serif;
      }

      .scr-helper-owner-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .scr-helper-owner-modal-title {
        color: var(--ns-ui-primary);
        font-size: 16px;
        font-weight: 800;
        line-height: 1.25;
      }

      .scr-helper-owner-modal-subtitle,
      .scr-helper-owner-modal-message {
        color: var(--rw-slate-100);
        font-size: 12px;
        line-height: 1.35;
      }

      .scr-helper-owner-modal-close {
        flex: 0 0 auto;
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        background: #ffffff;
        color: var(--rw-slate-150);
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }

      .scr-helper-owner-modal-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        color: var(--rw-slate-100);
        font-size: 11px;
        font-weight: 700;
      }

      .scr-helper-owner-modal-input,
      .scr-helper-owner-note-input {
        min-height: 34px;
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        padding: 7px 9px;
        color: var(--rw-slate-150);
        font-size: 13px;
        box-sizing: border-box;
        width: 100%;
      }

      .scr-helper-owner-note-input {
        min-height: 82px;
        resize: vertical;
        line-height: 1.35;
        font-family: Arial, Helvetica, sans-serif;
      }

      .scr-helper-owner-modal-input:focus,
      .scr-helper-owner-note-input:focus {
        border-color: var(--ns-ui-primary);
        outline: 2px solid var(--ns-ui-primary-soft);
      }

      .scr-helper-owner-notify {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--rw-slate-150);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
      }

      .scr-helper-owner-notify input {
        margin: 0;
      }

      .scr-helper-owner-modal-list {
        display: grid;
        gap: 5px;
        overflow: auto;
        max-height: 260px;
        padding-right: 2px;
      }

      .scr-helper-owner-option {
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        padding: 7px 9px;
        background: #ffffff;
        color: var(--rw-slate-150);
        cursor: pointer;
        text-align: left;
        font-size: 12px;
        font-weight: 700;
      }

      .scr-helper-owner-option:hover {
        border-color: var(--ns-ui-primary);
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
      }

      .scr-helper-owner-option.is-selected {
        border-color: var(--ns-ui-primary);
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
        box-shadow: inset 3px 0 0 var(--ns-ui-primary);
      }

      .scr-helper-owner-modal-actions {
        display: flex;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }

      .scr-helper-owner-modal-actions button {
        border: 1px solid var(--rw-slate-50);
        border-radius: 4px;
        padding: 9px 13px;
        background: #ffffff;
        color: var(--rw-slate-150);
        cursor: pointer;
        font-size: 13px;
        font-weight: 800;
        min-height: 36px;
      }

      .scr-helper-owner-modal-actions button:disabled {
        border-color: var(--rw-slate-50);
        background: var(--rw-neutral-30);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      .scr-helper-owner-modal-actions .scr-helper-owner-save {
        border-color: var(--ns-ui-primary, #36677D);
        background: var(--ns-ui-primary, #36677D);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(54, 103, 125, 0.22);
      }

      .scr-helper-owner-modal-actions .scr-helper-owner-route-only {
        border-color: var(--ns-ui-primary-mid, #94BFCE);
        background: var(--ns-ui-primary-soft, #E7F2F5);
        color: var(--ns-ui-primary, #36677D);
      }

      .scr-helper-owner-modal-actions button:disabled,
      .scr-helper-owner-modal-actions .scr-helper-owner-save:disabled {
        border-color: var(--rw-slate-50);
        background: var(--rw-neutral-30);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-notes-save {
        flex: 0 0 auto;
        border: 0;
        border-radius: 4px;
        padding: 6px 9px;
        background: var(--ns-ui-primary);
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      #${HELPER_ID} .scr-helper-notes-save:disabled {
        background: var(--rw-slate-50);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-request-info {
        flex: 0 0 auto;
        border: 1px solid var(--ns-ui-primary-mid);
        border-radius: 4px;
        padding: 6px 9px;
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
      }

      #${HELPER_ID} .scr-helper-request-info:hover {
        border-color: var(--ns-ui-primary);
        color: var(--ns-ui-primary);
      }

      #${HELPER_ID} .scr-helper-request-info:disabled {
        border-color: var(--rw-slate-50);
        background: var(--rw-neutral-30);
        color: var(--rw-slate-100);
        cursor: not-allowed;
      }

      #${HELPER_ID} .scr-helper-notes-status,
      #${HELPER_ID} .scr-helper-notes-help {
        color: var(--rw-slate-100);
        font-size: 11px;
        line-height: 1.35;
      }

      #${HELPER_ID} .scr-helper-notes-status.is-success {
        color: var(--rw-pine-100);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-notes-status.is-error {
        color: var(--rw-oracle-red);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-notes-status.is-working {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--rw-brand-yellow);
        border-radius: 999px;
        padding: 4px 8px;
        background: #fff4d8;
        color: #7a4a00;
        font-size: 12px;
        font-weight: 800;
      }

      #${HELPER_ID} .scr-helper-notice-links {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        width: 100%;
        margin-top: 4px;
      }

      #${HELPER_ID} .scr-helper-notice-link {
        border: 1px solid var(--ns-ui-primary-mid);
        border-radius: 4px;
        padding: 4px 7px;
        background: var(--ns-ui-primary-soft);
        color: var(--ns-ui-primary);
        font-size: 11px;
        font-weight: 800;
        text-decoration: none;
      }

      #${HELPER_ID} .scr-helper-muted {
        color: var(--rw-slate-100);
      }

      #${HELPER_ID} .scr-helper-missing {
        color: var(--rw-oracle-red);
      }

      #${HELPER_ID} .scr-helper-travel-icon {
        color: var(--rw-brand-yellow);
        font-weight: 700;
      }

      #${HELPER_ID} .scr-helper-empty {
        padding: 16px;
        border: 1px dashed var(--rw-slate-50);
        border-radius: 8px;
        color: var(--rw-slate-100);
        text-align: center;
      }

      @media (max-width: 700px) {
        #${HELPER_ID} {
          right: 10px;
          bottom: 10px;
          width: calc(100vw - 20px);
          height: min(680px, calc(100vh - 20px));
          min-width: 0;
          max-height: calc(100vh - 20px);
        }

        #${HELPER_ID} .scr-helper-filters,
        #${HELPER_ID} .scr-helper-routing-filter-row,
        #${HELPER_ID} .scr-helper-gtm-filter-row,
        #${HELPER_ID} .scr-helper-checkbox-filter-row,
        #${HELPER_ID} .scr-helper-products-scm-filter-row,
        #${HELPER_ID} .scr-helper-people-filter-row,
        #${HELPER_ID} .scr-helper-summary-grid,
        #${HELPER_ID}.scr-helper-fullscreen .scr-helper-summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyStartupCachedData() {
    applyCachedExternalMapping();
    applyCachedGtmScIndustryMapping();
    applyCachedProductsScmMapping();
    applyCachedAuthorizedManagers();
    updateMappingFilterOptions();
    updateProductsScmControls();
    updateFilterSummary();
  }

  function loadStartupBackgroundData() {
    loadExternalMapping();
    loadGtmScIndustryMapping();
    loadProductsScmMapping();
    loadAuthorizedManagers();
  }

  function startHelper() {
    installGraphTokenRelayListener();
    removeExistingHelperArtifacts();
    addStyles();
    insertPortlet();
    renderStartupSplash(`Preparing ${CURRENT_QUEUE.loadingLabel}.`);

    afterNextPaint(() => {
      renderStartupSplash(`Loading ${CURRENT_QUEUE.loadingLabel} (${SAVED_SEARCH_ID}).`);
      applyStartupCachedData();
      refreshRows();
      scheduleBackgroundTask(loadStartupBackgroundData, 900);
    });
  }

  startHelper();
})();
