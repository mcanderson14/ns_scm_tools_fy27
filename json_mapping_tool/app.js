(function () {
  "use strict";

  const SCHEMA = "ns-scm-tools.region-map.v3";
  const PRODUCTS_SCM_SCHEMA = "ns-scm-tools.scm-relationships.v3";
  const AUTHORIZED_MANAGERS_SCHEMA = "ns-scm-tools.authorized-managers.v1";
  const GTM_SC_INDUSTRY_SCHEMA = "ns-scm-tools.gtm-sc-industry.v1";
  const TOOL_VERSION = "27.0.5";
  const TOOL_NAME = "FY27 Queue Mapping JSON Maker";
  const CONFIG_STORAGE_KEY = "ns-scm-tools-region-map-industry-config-v1";
  const EMOJI_CONFIG_STORAGE_KEY = "ns-scm-tools-emoji-config-v1";
  const REGION_MAPPING_TYPE = "region";
  const PRODUCTS_SCM_MAPPING_TYPE = "productsScm";
  const AUTHORIZED_MANAGERS_MAPPING_TYPE = "authorizedManagers";
  const GTM_SC_INDUSTRY_MAPPING_TYPE = "gtmScIndustry";
  const REGION_OUTPUT_FILE_NAME = "SC_Industry_State_Region_Mapping.json";
  const PRODUCTS_SCM_OUTPUT_FILE_NAME = "Products_SCM_Relationship_Mapping.json";
  const AUTHORIZED_MANAGERS_OUTPUT_FILE_NAME = "Authorized_Managers.json";
  const GTM_SC_INDUSTRY_OUTPUT_FILE_NAME = "GTM_to_SC_Industry_Mapping.json";
  const AUTHORIZED_MANAGERS_SEARCH_URL = "https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?searchid=1319617";
  const SOURCE_DESCRIPTIONS = {
    [REGION_MAPPING_TYPE]: "Use an Excel workbook where row 1 contains SC industry groups, row 2 contains Direct/AMO, and column A contains state/province codes.",
    [PRODUCTS_SCM_MAPPING_TYPE]: "Use an Excel workbook with columns for Sales Region, AMO/Direct, Regional Director or RSM, SCM owner, and optional SCM Director. SCM ownership applies across SC Industry Groups.",
    [AUTHORIZED_MANAGERS_MAPPING_TYPE]: "Use an Excel export from NetSuite saved search 1319617. Expected columns include Manager/Name, Email, Role, SC Industry Group(s), Can Own, Can View, and Active.",
    [GTM_SC_INDUSTRY_MAPPING_TYPE]: "Use an Excel workbook with columns for SC Industry Group, GTM Industry, and GTM Industry Subgroup. Optional emoji columns can override default display icons."
  };
  const PRODUCTS_SCM_HEADER_ALIASES = {
    salesRegion: ["salesregion", "region", "salesarea"],
    requestType: ["amodirect", "directamo", "requesttype", "type"],
    regionalDirector: ["rd", "regionaldirector", "regionalsalesmanager", "rsm", "salesdirector", "salesdir", "regionaldirectorregionalsalesmanager"],
    scm: ["scm", "scmanager", "solutionconsultingmanager", "productsscm", "productsscmmanager", "scmowner", "queueowner", "productsscmqueueowner"],
    scmDirector: ["scmdirector", "scmdirectors", "scdirector", "scdirectors", "queuedirector", "queuedirectors", "managerdirector", "managerdirectors", "authorizeddirector", "authorizeddirectors", "director", "directors"]
  };
  const AUTHORIZED_MANAGER_HEADER_ALIASES = {
    name: ["name", "manager", "scm", "scmanager", "solutionconsultingmanager", "authorizedmanager", "employee", "employeename", "owner", "queueowner"],
    email: ["email", "emailaddress", "workemail", "employeeemail"],
    role: ["role", "title", "jobtitle", "managerrole", "type"],
    groups: ["scindustrygroup", "scindustrygroups", "industrygroup", "industrygroups", "industryfamily", "industryfamilies", "groups", "scgroups", "queuegroups"],
    canOwn: ["canown", "ownereligible", "assignable", "canbeassigned", "assignowner", "ownscr", "queueowner"],
    canView: ["canview", "viewer", "viewqueue", "canviewqueue", "queueviewer", "view"],
    active: ["active", "isinactive", "inactive", "status"]
  };
  const GTM_SC_INDUSTRY_HEADER_ALIASES = {
    scIndustryGroup: ["scindustrygroup", "scindustry", "scgroup", "industrygroup", "industryfamily", "scindustryfamily"],
    gtmIndustry: ["gtmindustry", "fy27gtmindustry", "industry", "fy27industry"],
    gtmIndustrySubgroup: ["gtmindustrysubgroup", "fy27gtmindustrysubgroup", "fy27gtmindusrysubgroup", "industrysubgroup", "subgroup", "gtmsubgroup"],
    scIndustryGroupEmoji: ["scindustrygroupemoji", "scindustryemoji", "scgroupemoji", "industrygroupemoji"],
    gtmIndustrySubgroupEmoji: ["gtmindustrysubgroupemoji", "gtmsubgroupemoji", "subgroupemoji", "industrysubgroupemoji"]
  };
  const DEFAULT_INDUSTRY_GROUPS = [
    "Business Services",
    "Products",
    "Health & Hospitality",
    "Construction & Energy",
    "Consumer Services",
    "Software",
    "EPM"
  ];
  const DEFAULT_INDUSTRY_ALIASES = {
    "Business Services": "Business Services",
    "Products": "Products",
    "Software": "Software",
    "HH": "Health & Hospitality",
    "Health & Hospitality": "Health & Hospitality",
    "Health and Hospitality": "Health & Hospitality",
    "Life Science": "Health & Hospitality",
    "Life Sciences": "Health & Hospitality",
    "Construction": "Construction & Energy",
    "Construction & Energy": "Construction & Energy",
    "Construction and Energy": "Construction & Energy",
    "Consumer Services": "Consumer Services",
    "Consumer Services/NFP": "Consumer Services",
    "Consumer Services / NFP": "Consumer Services",
    "EPM": "EPM",
    "Enterprise Performance Management": "EPM",
    "Financial Services": "Consumer Services"
  };
  const DEFAULT_SPOT_CHECKS = [
    ["CA", "Business Services", "Direct"],
    ["TX", "Products", "AMO"],
    ["NY", "Construction", "Direct"],
    ["ON", "Consumer Services", "AMO"],
    ["CA", "Consumer Services", "Direct"],
    ["FL", "Health & Hospitality", "AMO"]
  ];
  const DEFAULT_EMOJI_MAPPINGS = {
    scIndustryGroups: {
      "Business Services": "💼",
      "Construction": "🚧",
      "Construction & Energy": "🚧",
      "Consumer Services": "🛍️",
      "EPM": "📈",
      "Enterprise Performance Management": "📈",
      "Life Science": "🧬",
      "Life Sciences": "🧬",
      "Products": "📦",
      "Software": "💻",
      "Health & Hospitality": "🏨"
    },
    gtmIndustries: {},
    gtmIndustrySubgroups: {
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
      "MedTech": "🦾",
      "Research & Pharma": "🧪"
    }
  };

  const state = {
    mappingType: REGION_MAPPING_TYPE,
    workbookName: "",
    workbook: null,
    detectedIndustryLabels: [],
    industryConfig: loadIndustryConfig(),
    emojiConfig: loadEmojiConfig(),
    jsonText: "",
    outputFileName: REGION_OUTPUT_FILE_NAME
  };

  const elements = {};

  document.addEventListener("DOMContentLoaded", () => {
    [
      "workbook-file",
      "app-version",
      "file-name",
      "source-description",
      "sharepoint-url",
      "load-url",
      "region-parsing-settings",
      "industry-row",
      "mode-row",
      "data-row",
      "state-column",
      "industry-map-panel",
      "industry-map-summary",
      "industry-map-filter",
      "industry-map-unresolved-only",
      "industry-map-table",
      "new-industry-group",
      "add-industry-group",
      "emoji-map-panel",
      "emoji-map-summary",
      "emoji-map-filter",
      "emoji-map-missing-only",
      "emoji-map-table",
      "status-pill",
      "results-panel",
      "summary-text",
      "stats-grid",
      "columns-preview-title",
      "columns-preview",
      "spot-checks-title",
      "spot-checks",
      "json-output",
      "copy-json",
      "download-json"
    ].forEach(id => {
      elements[id] = document.getElementById(id);
    });

    elements["workbook-file"].addEventListener("change", handleFileInput);
    if (elements["app-version"]) elements["app-version"].textContent = `Version ${TOOL_VERSION}`;
    elements["load-url"].addEventListener("click", handleUrlLoad);
    document.querySelectorAll("input[name='mapping-type']").forEach(input => {
      input.addEventListener("change", handleMappingTypeChange);
    });
    elements["industry-map-filter"].addEventListener("input", renderIndustryMappingTable);
    elements["industry-map-unresolved-only"].addEventListener("change", renderIndustryMappingTable);
    elements["add-industry-group"].addEventListener("click", handleAddIndustryGroup);
    elements["new-industry-group"].addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleAddIndustryGroup();
    });
    elements["industry-map-table"].addEventListener("change", handleIndustryMappingChange);
    elements["emoji-map-filter"].addEventListener("input", renderEmojiMappingTable);
    elements["emoji-map-missing-only"].addEventListener("change", renderEmojiMappingTable);
    elements["emoji-map-table"].addEventListener("change", handleEmojiMappingChange);
    ["industry-row", "mode-row", "data-row", "state-column"].forEach(id => {
      elements[id].addEventListener("change", reprocessWorkbook);
    });
    elements["copy-json"].addEventListener("click", copyJson);
    elements["download-json"].addEventListener("click", downloadJson);
    updateMappingTypeUi();
  });

  async function handleFileInput(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    elements["file-name"].textContent = file.name;
    state.workbookName = file.name;
    state.outputFileName = outputFileNameForMode();
    await parseArrayBuffer(await file.arrayBuffer());
  }

  function handleMappingTypeChange(event) {
    if (!event.target.checked) return;
    state.mappingType = event.target.value || REGION_MAPPING_TYPE;
    state.outputFileName = outputFileNameForMode();
    updateMappingTypeUi();
    reprocessWorkbook();
  }

  function outputFileNameForMode() {
    if (state.mappingType === PRODUCTS_SCM_MAPPING_TYPE) return PRODUCTS_SCM_OUTPUT_FILE_NAME;
    if (state.mappingType === AUTHORIZED_MANAGERS_MAPPING_TYPE) return AUTHORIZED_MANAGERS_OUTPUT_FILE_NAME;
    if (state.mappingType === GTM_SC_INDUSTRY_MAPPING_TYPE) return GTM_SC_INDUSTRY_OUTPUT_FILE_NAME;
    return REGION_OUTPUT_FILE_NAME;
  }

  function updateMappingTypeUi() {
    const usesFlatWorkbook = state.mappingType === PRODUCTS_SCM_MAPPING_TYPE
      || state.mappingType === AUTHORIZED_MANAGERS_MAPPING_TYPE
      || state.mappingType === GTM_SC_INDUSTRY_MAPPING_TYPE;
    if (elements["source-description"]) {
      elements["source-description"].textContent = SOURCE_DESCRIPTIONS[state.mappingType] || SOURCE_DESCRIPTIONS[REGION_MAPPING_TYPE];
    }
    if (elements["region-parsing-settings"]) {
      elements["region-parsing-settings"].hidden = usesFlatWorkbook;
    }
    if (elements["industry-map-panel"] && usesFlatWorkbook) {
      elements["industry-map-panel"].hidden = true;
    }
    if (elements["emoji-map-panel"] && state.mappingType !== GTM_SC_INDUSTRY_MAPPING_TYPE) {
      elements["emoji-map-panel"].hidden = true;
    }
  }

  async function handleUrlLoad() {
    const url = (elements["sharepoint-url"].value || "").trim();
    if (!url) {
      setStatus("Paste a workbook URL first", true);
      return;
    }

    setStatus("Trying workbook URL...");
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      state.workbookName = fileNameFromUrl(url) || "linked-workbook.xlsx";
      state.outputFileName = outputFileNameForMode();
      await parseArrayBuffer(buffer);
    } catch (error) {
      setStatus("URL load blocked. Use manual upload.", true);
      console.warn("Workbook URL load failed", error);
    }
  }

  async function parseArrayBuffer(buffer) {
    if (!window.XLSX) {
      setStatus("XLSX library did not load", true);
      return;
    }

    try {
      state.workbook = window.XLSX.read(buffer, { type: "array" });
      reprocessWorkbook();
    } catch (error) {
      setStatus("Could not read Excel workbook", true);
      console.error(error);
    }
  }

  function reprocessWorkbook() {
    if (!state.workbook) return;
    try {
      const output = buildJsonForCurrentMode(state.workbook, state.workbookName);
      state.jsonText = JSON.stringify(output, null, 2);
      renderOutput(output);
      if (output.schema === AUTHORIZED_MANAGERS_SCHEMA && (output.counts.incompleteRows || output.counts.duplicateManagers || output.counts.missingGroups)) {
        const reviewCount = output.counts.incompleteRows + output.counts.duplicateManagers + output.counts.missingGroups;
        setStatus(`Review ${reviewCount} manager issue${reviewCount === 1 ? "" : "s"}`, true);
      } else if (output.schema === PRODUCTS_SCM_SCHEMA && (output.counts.incompleteRows || output.counts.duplicateExactKeys)) {
        const reviewCount = output.counts.incompleteRows + output.counts.duplicateExactKeys;
        setStatus(`Review ${reviewCount} SCM relationship issue${reviewCount === 1 ? "" : "s"}`, true);
      } else if (output.schema === GTM_SC_INDUSTRY_SCHEMA && (output.counts.incompleteRows || output.counts.duplicateMappings || output.counts.missingEmojiMappings)) {
        const reviewCount = output.counts.incompleteRows + output.counts.duplicateMappings + output.counts.missingEmojiMappings;
        setStatus(`Review ${reviewCount} GTM mapping issue${reviewCount === 1 ? "" : "s"}`, true);
      } else if (output.counts.unresolvedIndustryGroups) {
        setStatus(`Clarify ${output.counts.unresolvedIndustryGroups} industry label${output.counts.unresolvedIndustryGroups === 1 ? "" : "s"}`, true);
      } else {
        setStatus("JSON ready");
      }
    } catch (error) {
      setStatus(error.message || "Could not convert workbook", true);
      console.error(error);
    }
  }

  function buildJsonForCurrentMode(workbook, fileName) {
    if (state.mappingType === PRODUCTS_SCM_MAPPING_TYPE) return buildProductsScmJson(workbook, fileName);
    if (state.mappingType === AUTHORIZED_MANAGERS_MAPPING_TYPE) return buildAuthorizedManagersJson(workbook, fileName);
    if (state.mappingType === GTM_SC_INDUSTRY_MAPPING_TYPE) return buildGtmScIndustryJson(workbook, fileName);
    return buildMappingJson(workbook, fileName);
  }

  function buildMappingJson(workbook, fileName) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      raw: false
    });

    const settings = readSettings();
    const industryRow = matrix[settings.industryRow - 1] || [];
    const modeRow = matrix[settings.modeRow - 1] || [];
    const stateColumnIndex = columnNameToIndex(settings.stateColumn);
    const columns = detectMappingColumns(industryRow, modeRow, stateColumnIndex);
    if (!columns.length) throw new Error("No mapping columns were found.");
    state.detectedIndustryLabels = uniqueSorted(columns.map(column => column.sourceIndustryFamily));
    renderIndustryMappingPanel();

    const rows = [];
    const states = new Set();
    const regions = new Set();
    const sourceIndustries = new Set();
    const industryGroups = new Set();
    const modes = new Set();
    const lookup = {};
    const industryGroupLookup = {};
    const unresolvedIndustryGroups = new Set();

    for (let rowIndex = settings.dataRow - 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      const stateValue = cleanCell(row[stateColumnIndex]);
      if (!stateValue) continue;
      const stateKey = normalizeStateKey(stateValue);
      states.add(stateKey);

      columns.forEach(column => {
        const staffingRegion = cleanCell(row[column.index]);
        if (!staffingRegion) return;
        const sourceIndustryFamily = column.sourceIndustryFamily;
        const sourceIndustryKey = column.sourceIndustryKey;
        const industryFamily = column.industryFamily || sourceIndustryFamily;
        const industryKey = column.industryKey || sourceIndustryKey;
        const amoDirect = column.amoDirect;
        const amoDirectKey = normalizeKey(amoDirect);
        const sourceLookupKey = `${sourceIndustryKey}|${amoDirectKey}|${stateKey}`;
        const groupLookupKey = `${industryKey}|${amoDirectKey}|${stateKey}`;
        const record = {
          state: stateValue,
          stateKey,
          sourceIndustryFamily,
          sourceIndustryKey,
          industryFamily,
          industryKey,
          needsClarification: column.needsClarification,
          amoDirect,
          amoDirectKey,
          staffingRegion
        };
        rows.push(record);
        lookup[sourceLookupKey] = {
          state: stateValue,
          stateKey,
          sourceIndustryFamily,
          industryFamily,
          needsClarification: column.needsClarification,
          amoDirect,
          staffingRegion
        };
        if (!industryGroupLookup[groupLookupKey]) industryGroupLookup[groupLookupKey] = [];
        industryGroupLookup[groupLookupKey].push({
          state: stateValue,
          stateKey,
          sourceIndustryFamily,
          industryFamily,
          amoDirect,
          staffingRegion
        });
        regions.add(staffingRegion);
        sourceIndustries.add(sourceIndustryFamily);
        industryGroups.add(industryFamily);
        modes.add(amoDirect);
        if (column.needsClarification) unresolvedIndustryGroups.add(sourceIndustryFamily);
      });
    }

    const sortedIndustryGroups = [...industryGroups].sort(alphaSort);

    return {
      schema: SCHEMA,
      generator: {
        name: TOOL_NAME,
        version: TOOL_VERSION
      },
      generatedAt: new Date().toISOString(),
      source: {
        fileName: fileName || "",
        sheetName,
        industryHeaderRow: settings.industryRow,
        modeHeaderRow: settings.modeRow,
        firstStateRow: settings.dataRow,
        stateColumn: settings.stateColumn
      },
      counts: {
        rows: rows.length,
        states: states.size,
        sourceIndustries: sourceIndustries.size,
        industryGroups: industryGroups.size,
        modes: modes.size,
        staffingRegions: regions.size,
        unresolvedIndustryGroups: unresolvedIndustryGroups.size
      },
      states: [...states].sort(alphaSort),
      sourceIndustries: [...sourceIndustries].sort(alphaSort),
      industryGroups: sortedIndustryGroups,
      amoDirectModes: [...modes].sort(alphaSort),
      staffingRegions: [...regions].sort(alphaSort),
      unresolvedIndustryGroups: [...unresolvedIndustryGroups].sort(alphaSort),
      industryGroupConfig: exportIndustryConfig(),
      emojiMappings: buildEmojiMappings(sortedIndustryGroups),
      industryMappings: state.detectedIndustryLabels.map(sourceIndustryFamily => ({
        sourceIndustryFamily,
        sourceIndustryKey: normalizeKey(sourceIndustryFamily),
        industryFamily: resolveIndustryGroup(sourceIndustryFamily) || "",
        industryKey: normalizeKey(resolveIndustryGroup(sourceIndustryFamily)),
        needsClarification: !resolveIndustryGroup(sourceIndustryFamily)
      })),
      columns,
      rows,
      lookup,
      industryGroupLookup
    };
  }

  function buildProductsScmJson(workbook, fileName) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      raw: false
    });

    const header = detectProductsScmHeader(matrix);
    if (!header) throw new Error("No SCM relationship header row was found.");

    const relationships = [];
    const incompleteRows = [];
    const salesRegions = new Set();
    const requestTypes = new Set();
    const regionalDirectors = new Set();
    const scms = new Set();
    const authorizedDirectors = new Set();
    const exactLookup = {};
    const directorLookup = {};
    const scmLookup = {};

    for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      if (!row.some(cleanCell)) continue;

      const salesRegion = cleanCell(row[header.indexes.salesRegion]);
      const requestType = normalizeAmoDirect(row[header.indexes.requestType]);
      const regionalDirector = cleanPersonName(row[header.indexes.regionalDirector]);
      const scm = cleanPersonName(row[header.indexes.scm]);
      const directors = header.indexes.scmDirector >= 0
        ? cleanPersonList(row[header.indexes.scmDirector])
        : [];
      const missing = [];
      if (!requestType) missing.push("AMO/Direct");
      if (!regionalDirector) missing.push("Regional Director/RSM");
      if (!scm) missing.push("SCM");

      if (missing.length) {
        incompleteRows.push({
          sourceRow: rowIndex + 1,
          missing,
          values: row.map(cleanCell).filter(Boolean)
        });
        continue;
      }

      const record = {
        sourceRow: rowIndex + 1,
        salesRegion,
        salesRegionKey: normalizeKey(salesRegion),
        requestType,
        requestTypeKey: normalizeKey(requestType),
        regionalDirector,
        regionalDirectorKey: normalizePersonKey(regionalDirector),
        scm,
        scmKey: normalizePersonKey(scm),
        directors,
        directorKeys: directors.map(normalizePersonKey)
      };

      relationships.push(record);
      if (salesRegion) salesRegions.add(salesRegion);
      requestTypes.add(requestType);
      regionalDirectors.add(regionalDirector);
      scms.add(scm);
      directors.forEach(director => authorizedDirectors.add(director));
      addProductsLookupRecord(exactLookup, productsExactLookupKey(record), record);
      addProductsLookupRecord(directorLookup, productsDirectorLookupKey(record), record);
      addProductsLookupRecord(scmLookup, record.scmKey, record);
    }

    const duplicateExactKeys = productsLookupGroupsWithMultipleOwners(exactLookup);
    const ambiguousDirectorKeys = productsLookupGroupsWithMultipleOwners(directorLookup);
    const scmSummaries = buildProductsScmSummaries(scmLookup);

    return {
      schema: PRODUCTS_SCM_SCHEMA,
      generator: {
        name: TOOL_NAME,
        version: TOOL_VERSION
      },
      generatedAt: new Date().toISOString(),
      source: {
        fileName: fileName || "",
        sheetName,
        headerRow: header.rowIndex + 1,
        firstDataRow: header.rowIndex + 2,
        detectedHeaders: header.detectedHeaders
      },
      counts: {
        relationships: relationships.length,
        scms: scms.size,
        authorizedDirectors: authorizedDirectors.size,
        regionalDirectors: regionalDirectors.size,
        salesRegions: salesRegions.size,
        requestTypes: requestTypes.size,
        incompleteRows: incompleteRows.length,
        duplicateExactKeys: duplicateExactKeys.length,
        ambiguousDirectorKeys: ambiguousDirectorKeys.length
      },
      scms: scmSummaries,
      authorizedScms: scmSummaries.map(item => item.scm),
      authorizedDirectors: [...authorizedDirectors].sort(alphaSort),
      regionalDirectors: [...regionalDirectors].sort(alphaSort),
      salesRegions: [...salesRegions].sort(alphaSort),
      requestTypes: [...requestTypes].sort(alphaSort),
      relationships,
      lookup: exactLookup,
      directorLookup,
      scmLookup,
      review: {
        incompleteRows,
        duplicateExactKeys,
        ambiguousDirectorKeys
      }
    };
  }

  function readSettings() {
    return {
      industryRow: positiveInteger(elements["industry-row"].value, 1),
      modeRow: positiveInteger(elements["mode-row"].value, 2),
      dataRow: positiveInteger(elements["data-row"].value, 3),
      stateColumn: (elements["state-column"].value || "A").trim().toUpperCase()
    };
  }

  function buildAuthorizedManagersJson(workbook, fileName) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      raw: false
    });

    const header = detectAuthorizedManagersHeader(matrix);
    if (!header) throw new Error("No Authorized Managers header row was found.");

    const managerMap = new Map();
    const incompleteRows = [];
    const missingGroups = [];
    const duplicateRows = [];

    for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      if (!row.some(cleanCell)) continue;

      const name = cleanPersonName(row[header.indexes.name]);
      const email = cleanEmail(row[header.indexes.email]);
      const role = cleanCell(row[header.indexes.role]);
      const groups = parseGroupList(row[header.indexes.groups]);
      const active = parseBooleanCell(row[header.indexes.active], true, { inactiveMeansFalse: true });
      const canOwn = parseBooleanCell(row[header.indexes.canOwn], defaultCanOwnForRole(role));
      const canView = parseBooleanCell(row[header.indexes.canView], true);

      if (!name) {
        incompleteRows.push({
          sourceRow: rowIndex + 1,
          missing: ["Name"],
          values: row.map(cleanCell).filter(Boolean)
        });
        continue;
      }

      if (!groups.length) {
        missingGroups.push({
          sourceRow: rowIndex + 1,
          name,
          role,
          message: "No SC Industry Group was returned. This manager will not be assignable until a group is added."
        });
      }

      const nameKey = normalizePersonKey(name);
      const record = managerMap.get(nameKey);
      if (record) {
        duplicateRows.push({
          name,
          firstSourceRow: record.sourceRows[0],
          sourceRow: rowIndex + 1
        });
        record.sourceRows.push(rowIndex + 1);
        record.email = record.email || email;
        record.role = mergeTextList([record.role, role]).join("; ");
        record.groups = uniqueSorted(record.groups.concat(groups));
        record.groupKeys = record.groups.map(normalizeKey);
        record.canOwn = Boolean(record.canOwn || canOwn);
        record.canView = Boolean(record.canView || canView);
        record.active = Boolean(record.active || active);
        continue;
      }

      managerMap.set(nameKey, {
        sourceRows: [rowIndex + 1],
        name,
        nameKey,
        email,
        role,
        groups,
        groupKeys: groups.map(normalizeKey),
        canOwn,
        canView,
        active
      });
    }

    const authorizedManagers = Array.from(managerMap.values())
      .map(record => ({
        ...record,
        groups: uniqueSorted(record.groups),
        groupKeys: uniqueSorted(record.groups.map(normalizeKey))
      }))
      .sort((left, right) => alphaSort(left.name, right.name));
    if (!authorizedManagers.length) throw new Error("No authorized manager rows were generated.");

    const activeManagers = authorizedManagers.filter(manager => manager.active);
    const canOwnManagers = activeManagers.filter(manager => manager.canOwn && manager.groups.length);
    const canViewManagers = activeManagers.filter(manager => manager.canView);
    const industryGroups = uniqueSorted(authorizedManagers.flatMap(manager => manager.groups));
    const groupLookup = {};
    industryGroups.forEach(group => {
      const groupKey = normalizeKey(group);
      groupLookup[groupKey] = canOwnManagers
        .filter(manager => manager.groupKeys.includes(groupKey) || manager.groupKeys.includes("all") || manager.groups.includes("*"))
        .map(manager => manager.name);
    });

    return {
      schema: AUTHORIZED_MANAGERS_SCHEMA,
      generator: {
        name: TOOL_NAME,
        version: TOOL_VERSION
      },
      generatedAt: new Date().toISOString(),
      source: {
        fileName: fileName || "",
        sheetName,
        searchUrl: AUTHORIZED_MANAGERS_SEARCH_URL,
        headerRow: header.rowIndex + 1,
        firstDataRow: header.rowIndex + 2,
        detectedHeaders: header.detectedHeaders
      },
      counts: {
        managers: authorizedManagers.length,
        activeManagers: activeManagers.length,
        canOwn: canOwnManagers.length,
        canView: canViewManagers.length,
        industryGroups: industryGroups.length,
        incompleteRows: incompleteRows.length,
        duplicateManagers: duplicateRows.length,
        missingGroups: missingGroups.length
      },
      industryGroups,
      authorizedManagers,
      canOwnManagers: canOwnManagers.map(manager => manager.name),
      canViewManagers: canViewManagers.map(manager => manager.name),
      managerLookup: Object.fromEntries(authorizedManagers.map(manager => [manager.nameKey, manager])),
      groupLookup,
      review: {
        incompleteRows,
        duplicateRows,
        missingGroups
      }
    };
  }

  function buildGtmScIndustryJson(workbook, fileName) {
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = window.XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      raw: false
    });

    const header = detectGtmScIndustryHeader(matrix);
    if (!header) throw new Error("No GTM to SC Industry header row was found.");

    const rows = [];
    const incompleteRows = [];
    const duplicateMappings = [];
    const scIndustryGroups = new Set();
    const gtmIndustries = new Set();
    const gtmIndustrySubgroups = new Set();
    const lookup = {};
    const subgroupLookup = {};
    const industryLookup = {};
    const scIndustryEmojiOverrides = {};
    const gtmSubgroupEmojiOverrides = {};
    const missingEmojiMappings = [];
    const missingEmojiKeys = new Set();

    for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      if (!row.some(cleanCell)) continue;

      const rawScIndustryGroup = cleanCell(row[header.indexes.scIndustryGroup]);
      const scIndustryGroup = resolveIndustryGroup(rawScIndustryGroup) || rawScIndustryGroup;
      const gtmIndustry = cleanCell(row[header.indexes.gtmIndustry]);
      const gtmIndustrySubgroup = cleanCell(row[header.indexes.gtmIndustrySubgroup]);
      const scIndustryGroupEmoji = resolveScIndustryGroupEmoji(scIndustryGroup, header.indexes.scIndustryGroupEmoji >= 0
        ? row[header.indexes.scIndustryGroupEmoji]
        : "");
      const gtmIndustrySubgroupEmoji = resolveGtmIndustrySubgroupEmoji(gtmIndustrySubgroup, header.indexes.gtmIndustrySubgroupEmoji >= 0
        ? row[header.indexes.gtmIndustrySubgroupEmoji]
        : "");
      const missing = [];

      if (!scIndustryGroup) missing.push("SC Industry Group");
      if (!gtmIndustry) missing.push("GTM Industry");
      if (!gtmIndustrySubgroup) missing.push("GTM Industry Subgroup");

      if (missing.length) {
        incompleteRows.push({
          sourceRow: rowIndex + 1,
          missing,
          values: row.map(cleanCell).filter(Boolean)
        });
        continue;
      }

      const record = {
        sourceRow: rowIndex + 1,
        scIndustryGroup,
        scIndustryGroupKey: normalizeKey(scIndustryGroup),
        sourceScIndustryGroup: rawScIndustryGroup,
        sourceScIndustryGroupKey: normalizeKey(rawScIndustryGroup),
        gtmIndustry,
        gtmIndustryKey: normalizeKey(gtmIndustry),
        gtmIndustrySubgroup,
        gtmIndustrySubgroupKey: normalizeKey(gtmIndustrySubgroup),
        scIndustryGroupEmoji,
        gtmIndustrySubgroupEmoji
      };
      const exactKey = `${record.gtmIndustryKey}|${record.gtmIndustrySubgroupKey}`;

      if (lookup[exactKey] && lookup[exactKey].scIndustryGroupKey !== record.scIndustryGroupKey) {
        duplicateMappings.push({
          key: exactKey,
          firstSourceRow: lookup[exactKey].sourceRow,
          sourceRow: record.sourceRow,
          gtmIndustry,
          gtmIndustrySubgroup,
          scIndustryGroups: uniqueSorted([lookup[exactKey].scIndustryGroup, record.scIndustryGroup])
        });
      }

      rows.push(record);
      lookup[exactKey] = record;
      addLookupArrayRecord(subgroupLookup, record.gtmIndustrySubgroupKey, record);
      addLookupArrayRecord(industryLookup, record.gtmIndustryKey, record);
      scIndustryGroups.add(scIndustryGroup);
      gtmIndustries.add(gtmIndustry);
      gtmIndustrySubgroups.add(gtmIndustrySubgroup);

      scIndustryEmojiOverrides[scIndustryGroup] = scIndustryGroupEmoji || "";
      gtmSubgroupEmojiOverrides[gtmIndustrySubgroup] = gtmIndustrySubgroupEmoji || "";
      addMissingEmojiMapping(missingEmojiMappings, missingEmojiKeys, "SC Industry Group", scIndustryGroup, rowIndex + 1);
      addMissingEmojiMapping(missingEmojiMappings, missingEmojiKeys, "GTM Industry Subgroup", gtmIndustrySubgroup, rowIndex + 1);
    }

    if (!rows.length) throw new Error("No GTM mapping rows were generated.");

    return {
      schema: GTM_SC_INDUSTRY_SCHEMA,
      generator: {
        name: TOOL_NAME,
        version: TOOL_VERSION
      },
      generatedAt: new Date().toISOString(),
      source: {
        fileName: fileName || "",
        sheetName,
        headerRow: header.rowIndex + 1,
        firstDataRow: header.rowIndex + 2,
        detectedHeaders: header.detectedHeaders
      },
      counts: {
        rows: rows.length,
        scIndustryGroups: scIndustryGroups.size,
        gtmIndustries: gtmIndustries.size,
        gtmIndustrySubgroups: gtmIndustrySubgroups.size,
        incompleteRows: incompleteRows.length,
        duplicateMappings: duplicateMappings.length,
        missingEmojiMappings: missingEmojiMappings.length
      },
      scIndustryGroups: [...scIndustryGroups].sort(alphaSort),
      gtmIndustries: [...gtmIndustries].sort(alphaSort),
      gtmIndustrySubgroups: [...gtmIndustrySubgroups].sort(alphaSort),
      emojiMappings: {
        scIndustryGroups: sortObjectByKey(scIndustryEmojiOverrides),
        gtmIndustrySubgroups: sortObjectByKey(gtmSubgroupEmojiOverrides)
      },
      rows: rows.sort((left, right) => alphaSort(left.scIndustryGroup, right.scIndustryGroup)
        || alphaSort(left.gtmIndustry, right.gtmIndustry)
        || alphaSort(left.gtmIndustrySubgroup, right.gtmIndustrySubgroup)),
      lookup,
      subgroupLookup,
      industryLookup,
      review: {
        incompleteRows,
        duplicateMappings,
        missingEmojiMappings
      }
    };
  }

  function detectMappingColumns(industryRow, modeRow, stateColumnIndex) {
    const columns = [];
    let activeIndustry = "";
    const maxLength = Math.max(industryRow.length, modeRow.length);

    for (let index = 0; index < maxLength; index += 1) {
      const industryCell = cleanCell(industryRow[index]);
      if (industryCell) activeIndustry = industryCell;
      if (index === stateColumnIndex) continue;

      const mode = normalizeAmoDirect(modeRow[index]);
      if (!activeIndustry || !mode) continue;
      const industryFamily = resolveIndustryGroup(activeIndustry);
      columns.push({
        column: indexToColumnName(index),
        index,
        sourceIndustryFamily: activeIndustry,
        sourceIndustryKey: normalizeKey(activeIndustry),
        industryFamily,
        industryKey: normalizeKey(industryFamily),
        needsClarification: !industryFamily,
        amoDirect: mode,
        amoDirectKey: normalizeKey(mode)
      });
    }

    return columns;
  }

  function detectProductsScmHeader(matrix) {
    const maxRows = Math.min(matrix.length, 15);
    const candidates = [];

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      const normalizedHeaders = row.map(normalizeKey);
      const indexes = {
        salesRegion: findProductsHeaderIndex(normalizedHeaders, PRODUCTS_SCM_HEADER_ALIASES.salesRegion),
        requestType: findProductsHeaderIndex(normalizedHeaders, PRODUCTS_SCM_HEADER_ALIASES.requestType),
        regionalDirector: findProductsHeaderIndex(normalizedHeaders, PRODUCTS_SCM_HEADER_ALIASES.regionalDirector),
        scm: findProductsHeaderIndex(normalizedHeaders, PRODUCTS_SCM_HEADER_ALIASES.scm)
      };
      indexes.scmDirector = findProductsHeaderIndex(normalizedHeaders, PRODUCTS_SCM_HEADER_ALIASES.scmDirector, {
        exactOnly: true,
        exclude: [indexes.regionalDirector, indexes.scm]
      });
      const requiredCount = ["requestType", "regionalDirector", "scm"].filter(key => indexes[key] >= 0).length;
      const score = requiredCount * 5 + (indexes.salesRegion >= 0 ? 2 : 0);
      if (requiredCount === 3) candidates.push({ rowIndex, row, indexes, score });
    }

    candidates.sort((left, right) => right.score - left.score || left.rowIndex - right.rowIndex);
    const winner = candidates[0];
    if (!winner) return null;

    return {
      rowIndex: winner.rowIndex,
      indexes: winner.indexes,
      detectedHeaders: {
        salesRegion: productsHeaderCellInfo(winner.row, winner.indexes.salesRegion),
        requestType: productsHeaderCellInfo(winner.row, winner.indexes.requestType),
        regionalDirector: productsHeaderCellInfo(winner.row, winner.indexes.regionalDirector),
        scm: productsHeaderCellInfo(winner.row, winner.indexes.scm),
        scmDirector: productsHeaderCellInfo(winner.row, winner.indexes.scmDirector)
      }
    };
  }

  function findProductsHeaderIndex(normalizedHeaders, aliases, options = {}) {
    const excluded = new Set((options.exclude || []).filter(index => index >= 0));
    const exact = normalizedHeaders.findIndex((header, index) => !excluded.has(index) && aliases.includes(header));
    if (exact >= 0) return exact;
    if (options.exactOnly) return -1;
    return normalizedHeaders.findIndex((header, index) => !excluded.has(index) && header && aliases.some(alias => {
      if (alias.length <= 4) return header === alias;
      return header.includes(alias) || alias.includes(header);
    }));
  }

  function productsHeaderCellInfo(row, index) {
    return {
      column: index >= 0 ? indexToColumnName(index) : "",
      label: index >= 0 ? cleanCell(row[index]) : ""
    };
  }

  function addProductsLookupRecord(lookup, key, record) {
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push({
      salesRegion: record.salesRegion,
      salesRegionKey: record.salesRegionKey,
      requestType: record.requestType,
      requestTypeKey: record.requestTypeKey,
      regionalDirector: record.regionalDirector,
      regionalDirectorKey: record.regionalDirectorKey,
      scm: record.scm,
      scmKey: record.scmKey,
      directors: record.directors || [],
      directorKeys: record.directorKeys || [],
      sourceRow: record.sourceRow
    });
  }

  function productsExactLookupKey(record) {
    return `${record.requestTypeKey}|${record.regionalDirectorKey}|${record.salesRegionKey}`;
  }

  function productsDirectorLookupKey(record) {
    return `${record.requestTypeKey}|${record.regionalDirectorKey}`;
  }

  function productsLookupGroupsWithMultipleOwners(lookup) {
    return Object.entries(lookup)
      .map(([key, rows]) => ({
        key,
        scms: uniqueSorted(rows.map(row => row.scm)),
        rows: rows.map(row => row.sourceRow)
      }))
      .filter(item => item.scms.length > 1)
      .sort((left, right) => alphaSort(left.key, right.key));
  }

  function buildProductsScmSummaries(scmLookup) {
    return Object.entries(scmLookup)
      .map(([scmKey, rows]) => ({
        scm: rows[0].scm,
        scmKey,
        relationshipCount: rows.length,
        requestTypes: uniqueSorted(rows.map(row => row.requestType)),
        salesRegions: uniqueSorted(rows.map(row => row.salesRegion || "Any/blank")),
        regionalDirectors: uniqueSorted(rows.map(row => row.regionalDirector)),
        directors: uniqueSorted(rows.flatMap(row => row.directors || []))
      }))
      .sort((left, right) => alphaSort(left.scm, right.scm));
  }

  function detectAuthorizedManagersHeader(matrix) {
    const maxRows = Math.min(matrix.length, 15);
    const candidates = [];

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      const normalizedHeaders = row.map(normalizeKey);
      const indexes = {
        name: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.name),
        email: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.email),
        role: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.role),
        groups: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.groups),
        canOwn: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.canOwn),
        canView: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.canView),
        active: findProductsHeaderIndex(normalizedHeaders, AUTHORIZED_MANAGER_HEADER_ALIASES.active)
      };
      const requiredCount = indexes.name >= 0 ? 1 : 0;
      const score = requiredCount * 10
        + (indexes.email >= 0 ? 2 : 0)
        + (indexes.role >= 0 ? 2 : 0)
        + (indexes.groups >= 0 ? 3 : 0)
        + (indexes.canOwn >= 0 ? 1 : 0)
        + (indexes.canView >= 0 ? 1 : 0)
        + (indexes.active >= 0 ? 1 : 0);
      if (requiredCount) candidates.push({ rowIndex, row, indexes, score });
    }

    candidates.sort((left, right) => right.score - left.score || left.rowIndex - right.rowIndex);
    const winner = candidates[0];
    if (!winner) return null;

    return {
      rowIndex: winner.rowIndex,
      indexes: winner.indexes,
      detectedHeaders: Object.fromEntries(Object.entries(winner.indexes).map(([key, index]) => [
        key,
        productsHeaderCellInfo(winner.row, index)
      ]))
    };
  }

  function detectGtmScIndustryHeader(matrix) {
    const maxRows = Math.min(matrix.length, 15);
    const candidates = [];

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      const normalizedHeaders = row.map(normalizeKey);
      const indexes = {
        scIndustryGroup: findProductsHeaderIndex(normalizedHeaders, GTM_SC_INDUSTRY_HEADER_ALIASES.scIndustryGroup),
        gtmIndustry: findProductsHeaderIndex(normalizedHeaders, GTM_SC_INDUSTRY_HEADER_ALIASES.gtmIndustry),
        gtmIndustrySubgroup: findProductsHeaderIndex(normalizedHeaders, GTM_SC_INDUSTRY_HEADER_ALIASES.gtmIndustrySubgroup)
      };
      indexes.scIndustryGroupEmoji = findProductsHeaderIndex(normalizedHeaders, GTM_SC_INDUSTRY_HEADER_ALIASES.scIndustryGroupEmoji, {
        exactOnly: true
      });
      indexes.gtmIndustrySubgroupEmoji = findProductsHeaderIndex(normalizedHeaders, GTM_SC_INDUSTRY_HEADER_ALIASES.gtmIndustrySubgroupEmoji, {
        exactOnly: true
      });
      const requiredCount = ["scIndustryGroup", "gtmIndustry", "gtmIndustrySubgroup"].filter(key => indexes[key] >= 0).length;
      const score = requiredCount * 10
        + (indexes.scIndustryGroupEmoji >= 0 ? 1 : 0)
        + (indexes.gtmIndustrySubgroupEmoji >= 0 ? 1 : 0);
      if (requiredCount === 3) candidates.push({ rowIndex, row, indexes, score });
    }

    candidates.sort((left, right) => right.score - left.score || left.rowIndex - right.rowIndex);
    const winner = candidates[0];
    if (!winner) return null;

    return {
      rowIndex: winner.rowIndex,
      indexes: winner.indexes,
      detectedHeaders: Object.fromEntries(Object.entries(winner.indexes).map(([key, index]) => [
        key,
        productsHeaderCellInfo(winner.row, index)
      ]))
    };
  }

  function addLookupArrayRecord(lookup, key, record) {
    if (!key) return;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(record);
  }

  function addMissingEmojiMapping(rows, seenKeys, type, value, sourceRow) {
    if (!value) return;
    const key = `${type}|${normalizeKey(value)}`;
    if (seenKeys.has(key)) return;
    const emoji = type === "SC Industry Group"
      ? resolveScIndustryGroupEmoji(value)
      : resolveGtmIndustrySubgroupEmoji(value);
    if (emoji) return;
    seenKeys.add(key);
    rows.push({ type, value, sourceRow });
  }

  function defaultScIndustryGroupEmoji(group) {
    const key = normalizeKey(group);
    const entry = Object.entries(DEFAULT_EMOJI_MAPPINGS.scIndustryGroups)
      .find(([name]) => normalizeKey(name) === key);
    return entry ? cleanCell(entry[1]) : "";
  }

  function defaultGtmIndustrySubgroupEmoji(subgroup) {
    const key = normalizeKey(subgroup);
    const entry = Object.entries(DEFAULT_EMOJI_MAPPINGS.gtmIndustrySubgroups)
      .find(([name]) => normalizeKey(name) === key);
    return entry ? cleanCell(entry[1]) : "";
  }

  function configuredScIndustryGroupEmoji(group) {
    return configuredEmojiValue("scIndustryGroups", group);
  }

  function configuredGtmIndustrySubgroupEmoji(subgroup) {
    return configuredEmojiValue("gtmIndustrySubgroups", subgroup);
  }

  function configuredEmojiValue(type, label) {
    const key = normalizeKey(label);
    if (!key) return "";
    const configured = state.emojiConfig && state.emojiConfig[type] || {};
    const match = Object.entries(configured).find(([name]) => normalizeKey(name) === key);
    return match ? cleanCell(match[1]) : "";
  }

  function resolveScIndustryGroupEmoji(group, workbookValue = "") {
    return cleanCell(workbookValue) || configuredScIndustryGroupEmoji(group) || defaultScIndustryGroupEmoji(group);
  }

  function resolveGtmIndustrySubgroupEmoji(subgroup, workbookValue = "") {
    return cleanCell(workbookValue) || configuredGtmIndustrySubgroupEmoji(subgroup) || defaultGtmIndustrySubgroupEmoji(subgroup);
  }

  function parseGroupList(value) {
    const text = cleanCell(value);
    if (!text) return [];
    return uniqueSorted(
      text
        .split(/\s*(?:;|\||,|\n|\r|\t)\s*/g)
        .map(cleanCell)
        .filter(Boolean)
        .map(group => resolveIndustryGroup(group) || group)
    );
  }

  function cleanEmail(value) {
    const match = cleanCell(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].toLowerCase() : "";
  }

  function parseBooleanCell(value, fallback = false, options = {}) {
    const text = cleanCell(value);
    if (!text) return Boolean(fallback);
    if (/^(?:y|yes|true|t|1|active|enabled)$/i.test(text)) return true;
    if (/^(?:n|no|false|f|0|disabled)$/i.test(text)) return false;
    if (options.inactiveMeansFalse && /inactive|terminated|disabled/i.test(text)) return false;
    if (/active|enabled/i.test(text)) return true;
    return Boolean(fallback);
  }

  function defaultCanOwnForRole(role) {
    const text = cleanCell(role);
    if (!text) return true;
    if (/\b(?:director|avp|vp|vice\s*president|leader|executive)\b/i.test(text)) return false;
    return true;
  }

  function mergeTextList(values) {
    return uniqueSorted(values.map(cleanCell).filter(Boolean));
  }

  function buildEmojiMappings(industryGroups) {
    const scIndustryGroups = { ...DEFAULT_EMOJI_MAPPINGS.scIndustryGroups };
    industryGroups.forEach(group => {
      if (!Object.prototype.hasOwnProperty.call(scIndustryGroups, group)) {
        scIndustryGroups[group] = "";
      }
    });

    return {
      scIndustryGroups: sortObjectByKey({
        ...scIndustryGroups,
        ...state.emojiConfig.scIndustryGroups
      }),
      gtmIndustries: sortObjectByKey(DEFAULT_EMOJI_MAPPINGS.gtmIndustries),
      gtmIndustrySubgroups: sortObjectByKey({
        ...DEFAULT_EMOJI_MAPPINGS.gtmIndustrySubgroups,
        ...state.emojiConfig.gtmIndustrySubgroups
      })
    };
  }

  function sortObjectByKey(value) {
    return Object.fromEntries(Object.entries(value || {}).sort(([left], [right]) => alphaSort(left, right)));
  }

  function renderOutput(output) {
    elements["results-panel"].hidden = false;
    elements["json-output"].value = state.jsonText;
    updateMappingTypeUi();

    if (output.schema === PRODUCTS_SCM_SCHEMA) {
      renderProductsScmOutput(output);
      return;
    }
    if (output.schema === AUTHORIZED_MANAGERS_SCHEMA) {
      renderAuthorizedManagersOutput(output);
      return;
    }
    if (output.schema === GTM_SC_INDUSTRY_SCHEMA) {
      renderGtmScIndustryOutput(output);
      return;
    }

    renderRegionOutput(output);
  }

  function renderRegionOutput(output) {
    elements["columns-preview-title"].textContent = "Detected Columns";
    elements["spot-checks-title"].textContent = "Spot Checks";
    elements["summary-text"].textContent = `${output.counts.rows.toLocaleString()} mapping rows generated from ${output.source.sheetName}.`;

    renderStats([
      ["Rows", output.counts.rows],
      ["States", output.counts.states],
      ["SC Groups", output.counts.industryGroups],
      ["Clarifications", output.counts.unresolvedIndustryGroups],
      ["Regions", output.counts.staffingRegions]
    ]);

    elements["columns-preview"].innerHTML = renderTable(
      ["Column", "Workbook Label", "SC Industry Group", "AMO/Direct", "Status"],
      output.columns.map(column => [
        column.column,
        column.sourceIndustryFamily,
        column.industryFamily || "Needs clarification",
        column.amoDirect,
        column.needsClarification ? "Clarify" : "Mapped"
      ])
    );

    const lookup = output.industryGroupLookup || {};
    elements["spot-checks"].innerHTML = renderTable(
      ["State", "SC Industry", "AMO/Direct", "Region"],
      DEFAULT_SPOT_CHECKS.map(([stateValue, industryFamily, amoDirect]) => {
        const key = `${normalizeKey(industryFamily)}|${normalizeKey(amoDirect)}|${normalizeStateKey(stateValue)}`;
        const matches = lookup[key] || [];
        const regions = [...new Set(matches.map(match => match.staffingRegion))].join(", ");
        return [stateValue, industryFamily, amoDirect, regions || "Not found"];
      })
    );
  }

  function renderProductsScmOutput(output) {
    elements["columns-preview-title"].textContent = "Generated Relationships";
    elements["spot-checks-title"].textContent = "SCM Coverage";
    elements["summary-text"].textContent = `${output.counts.relationships.toLocaleString()} SCM relationship rows generated from ${output.source.sheetName}.`;

    renderStats([
      ["Relationships", output.counts.relationships],
      ["SCM Owners", output.counts.scms],
      ["Authorized Directors", output.counts.authorizedDirectors],
      ["RD/RSMs", output.counts.regionalDirectors],
      ["Sales Regions", output.counts.salesRegions || "Any/blank"],
      ["Review Items", output.counts.incompleteRows + output.counts.duplicateExactKeys]
    ]);

    elements["columns-preview"].innerHTML = renderTable(
      ["Type", "Sales Region", "Regional Director/RSM", "SCM Owner", "SCM Director(s)", "Source Row"],
      output.relationships.map(row => [
        row.requestType,
        row.salesRegion || "Any/blank",
        row.regionalDirector,
        row.scm,
        (row.directors || []).join(", ") || "None listed",
        row.sourceRow
      ])
    );

    elements["spot-checks"].innerHTML = renderTable(
      ["SCM Owner", "Director(s)", "Relationships", "Request Types", "Sales Regions", "RD/RSMs"],
      output.scms.map(row => [
        row.scm,
        (row.directors || []).join(", ") || "None listed",
        row.relationshipCount,
        row.requestTypes.join(", "),
        row.salesRegions.join(", "),
        row.regionalDirectors.join(", ")
      ])
    );
  }

  function renderAuthorizedManagersOutput(output) {
    elements["columns-preview-title"].textContent = "Authorized Managers";
    elements["spot-checks-title"].textContent = "Assignment Groups";
    elements["summary-text"].textContent = `${output.counts.managers.toLocaleString()} authorized manager row${output.counts.managers === 1 ? "" : "s"} generated from ${output.source.sheetName}.`;

    renderStats([
      ["Managers", output.counts.managers],
      ["Active", output.counts.activeManagers],
      ["Can Own", output.counts.canOwn],
      ["Can View", output.counts.canView],
      ["SC Groups", output.counts.industryGroups],
      ["Review Items", output.counts.incompleteRows + output.counts.duplicateManagers + output.counts.missingGroups]
    ]);

    elements["columns-preview"].innerHTML = renderTable(
      ["Manager", "Email", "Role", "Groups", "Can Own", "Can View", "Active", "Source Rows"],
      output.authorizedManagers.map(row => [
        row.name,
        row.email || "",
        row.role || "",
        row.groups.join(", ") || "Missing",
        row.canOwn ? "Yes" : "No",
        row.canView ? "Yes" : "No",
        row.active ? "Yes" : "No",
        row.sourceRows.join(", ")
      ])
    );

    elements["spot-checks"].innerHTML = renderTable(
      ["SC Industry Group", "Assignable Managers"],
      output.industryGroups.map(group => [
        group,
        (output.groupLookup[normalizeKey(group)] || []).join(", ") || "None"
      ])
    );
  }

  function renderGtmScIndustryOutput(output) {
    elements["columns-preview-title"].textContent = "GTM to SC Industry Rows";
    elements["spot-checks-title"].textContent = "Emoji Coverage";
    elements["summary-text"].textContent = `${output.counts.rows.toLocaleString()} GTM mapping row${output.counts.rows === 1 ? "" : "s"} generated from ${output.source.sheetName}.`;

    renderStats([
      ["Rows", output.counts.rows],
      ["SC Groups", output.counts.scIndustryGroups],
      ["GTM Industries", output.counts.gtmIndustries],
      ["GTM Subgroups", output.counts.gtmIndustrySubgroups],
      ["Review Items", output.counts.incompleteRows + output.counts.duplicateMappings + output.counts.missingEmojiMappings]
    ]);

    elements["columns-preview"].innerHTML = renderTable(
      ["SC Industry Group", "GTM Industry", "GTM Industry Subgroup", "SC Emoji", "Subgroup Emoji", "Source Row"],
      output.rows.map(row => [
        row.scIndustryGroup,
        row.gtmIndustry,
        row.gtmIndustrySubgroup,
        row.scIndustryGroupEmoji || "Fallback",
        row.gtmIndustrySubgroupEmoji || "Fallback",
        row.sourceRow
      ])
    );

    const missing = output.review && output.review.missingEmojiMappings || [];
    elements["spot-checks"].innerHTML = missing.length
      ? renderTable(
          ["Type", "Value", "Source Row"],
          missing.map(row => [row.type, row.value, row.sourceRow])
        )
      : renderTable(
          ["SC Industry Group", "Emoji"],
          output.scIndustryGroups.map(group => [
            group,
            output.emojiMappings.scIndustryGroups[group] || "Fallback"
          ])
        );
    renderEmojiMappingPanel(output);
  }

  function renderStats(items) {
    elements["stats-grid"].innerHTML = items.map(([label, value]) => `
      <div class="stat">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `).join("");
  }

  function renderIndustryMappingPanel() {
    const panel = elements["industry-map-panel"];
    if (!panel) return;
    panel.hidden = false;
    const unresolved = state.detectedIndustryLabels.filter(label => !resolveIndustryGroup(label));
    elements["industry-map-summary"].textContent = unresolved.length
      ? `${unresolved.length} detected workbook label${unresolved.length === 1 ? "" : "s"} need clarification before this is fully mapped.`
      : `${state.detectedIndustryLabels.length} workbook industry label${state.detectedIndustryLabels.length === 1 ? "" : "s"} mapped to SC Industry Groups.`;
    renderIndustryMappingTable();
  }

  function renderIndustryMappingTable() {
    const target = elements["industry-map-table"];
    if (!target) return;

    const filterText = normalizeKey(elements["industry-map-filter"].value);
    const unresolvedOnly = elements["industry-map-unresolved-only"].checked;
    const rows = state.detectedIndustryLabels
      .map(sourceIndustryFamily => ({
        sourceIndustryFamily,
        industryFamily: resolveIndustryGroup(sourceIndustryFamily),
        needsClarification: !resolveIndustryGroup(sourceIndustryFamily)
      }))
      .filter(row => {
        if (unresolvedOnly && !row.needsClarification) return false;
        if (!filterText) return true;
        return normalizeKey(`${row.sourceIndustryFamily} ${row.industryFamily}`).includes(filterText);
      });

    target.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Workbook Label</th>
            <th>SC Industry Group</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr class="${row.needsClarification ? "needs-clarification" : ""}">
              <td>${escapeHtml(row.sourceIndustryFamily)}</td>
              <td>
                <select data-industry-source="${escapeHtml(row.sourceIndustryFamily)}">
                  <option value="">Choose group</option>
                  ${state.industryConfig.groups.map(group => `
                    <option value="${escapeHtml(group)}"${normalizeKey(group) === normalizeKey(row.industryFamily) ? " selected" : ""}>${escapeHtml(group)}</option>
                  `).join("")}
                </select>
              </td>
              <td>${row.needsClarification ? "Needs clarification" : "Mapped"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderEmojiMappingPanel(output) {
    const panel = elements["emoji-map-panel"];
    if (!panel) return;
    if (!output || output.schema !== GTM_SC_INDUSTRY_SCHEMA) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    const rows = emojiMappingRowsForOutput(output);
    const missingCount = rows.filter(row => !row.emoji).length;
    elements["emoji-map-summary"].textContent = missingCount
      ? `${missingCount} emoji mapping${missingCount === 1 ? "" : "s"} need a value. Add them here and regenerate the JSON without changing Excel.`
      : `${rows.length} emoji mapping${rows.length === 1 ? "" : "s"} ready.`;
    renderEmojiMappingTable(output);
  }

  function emojiMappingRowsForOutput(output) {
    if (!output || output.schema !== GTM_SC_INDUSTRY_SCHEMA) return [];
    const scRows = (output.scIndustryGroups || []).map(label => ({
      type: "scIndustryGroups",
      typeLabel: "SC Industry Group",
      label,
      emoji: resolveScIndustryGroupEmoji(label)
    }));
    const subgroupRows = (output.gtmIndustrySubgroups || []).map(label => ({
      type: "gtmIndustrySubgroups",
      typeLabel: "GTM Industry Subgroup",
      label,
      emoji: resolveGtmIndustrySubgroupEmoji(label)
    }));
    return scRows.concat(subgroupRows).sort((left, right) => alphaSort(left.typeLabel, right.typeLabel) || alphaSort(left.label, right.label));
  }

  function currentOutputJson() {
    try {
      return state.jsonText ? JSON.parse(state.jsonText) : null;
    } catch (error) {
      return null;
    }
  }

  function renderEmojiMappingTable(output = currentOutputJson()) {
    const target = elements["emoji-map-table"];
    if (!target) return;
    const filterText = normalizeKey(elements["emoji-map-filter"].value);
    const missingOnly = elements["emoji-map-missing-only"].checked;
    const rows = emojiMappingRowsForOutput(output).filter(row => {
      if (missingOnly && row.emoji) return false;
      if (!filterText) return true;
      return normalizeKey(`${row.typeLabel} ${row.label} ${row.emoji}`).includes(filterText);
    });

    target.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Value</th>
            <th>Emoji</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr class="${row.emoji ? "" : "needs-clarification"}">
              <td>${escapeHtml(row.typeLabel)}</td>
              <td>${escapeHtml(row.label)}</td>
              <td>
                <input
                  class="emoji-input"
                  type="text"
                  maxlength="12"
                  value="${escapeHtml(row.emoji)}"
                  data-emoji-type="${escapeHtml(row.type)}"
                  data-emoji-label="${escapeHtml(row.label)}"
                  aria-label="Emoji for ${escapeHtml(row.label)}"
                >
              </td>
              <td>${row.emoji ? "Ready" : "Missing"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function handleEmojiMappingChange(event) {
    const input = event.target && event.target.matches("[data-emoji-type][data-emoji-label]")
      ? event.target
      : null;
    if (!input) return;
    const type = input.dataset.emojiType;
    const label = cleanCell(input.dataset.emojiLabel);
    const emoji = cleanCell(input.value);
    if (!label || !state.emojiConfig[type]) return;
    if (emoji) state.emojiConfig[type][label] = emoji;
    else delete state.emojiConfig[type][label];
    saveEmojiConfig();
    reprocessWorkbook();
  }

  function handleIndustryMappingChange(event) {
    const select = event.target && event.target.matches("[data-industry-source]")
      ? event.target
      : null;
    if (!select) return;
    const sourceIndustryFamily = select.dataset.industrySource;
    const industryFamily = cleanCell(select.value);
    if (industryFamily) {
      state.industryConfig.aliases[sourceIndustryFamily] = industryFamily;
    } else {
      delete state.industryConfig.aliases[sourceIndustryFamily];
    }
    saveIndustryConfig();
    reprocessWorkbook();
  }

  function handleAddIndustryGroup() {
    const input = elements["new-industry-group"];
    const group = cleanCell(input.value);
    if (!group) return;
    if (!state.industryConfig.groups.some(existing => normalizeKey(existing) === normalizeKey(group))) {
      state.industryConfig.groups.push(group);
      state.industryConfig.groups.sort(alphaSort);
    }
    input.value = "";
    saveIndustryConfig();
    renderIndustryMappingPanel();
    reprocessWorkbook();
  }

  function renderTable(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  async function copyJson() {
    if (!state.jsonText) return;
    await navigator.clipboard.writeText(state.jsonText);
    setStatus("JSON copied");
  }

  function downloadJson() {
    if (!state.jsonText) return;
    const blob = new Blob([state.jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = state.outputFileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setStatus(message, isError = false) {
    elements["status-pill"].textContent = message;
    elements["status-pill"].classList.toggle("is-error", Boolean(isError));
  }

  function defaultIndustryConfig() {
    return {
      groups: [...DEFAULT_INDUSTRY_GROUPS],
      aliases: { ...DEFAULT_INDUSTRY_ALIASES }
    };
  }

  function loadIndustryConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "null");
      if (parsed && Array.isArray(parsed.groups) && parsed.aliases && typeof parsed.aliases === "object") {
        return cleanIndustryConfig(parsed);
      }
    } catch (error) {
      console.warn("Could not read saved industry group mapping config", error);
    }
    return cleanIndustryConfig(defaultIndustryConfig());
  }

  function cleanIndustryConfig(config) {
    const defaultConfig = defaultIndustryConfig();
    const groups = uniqueSorted(defaultConfig.groups.concat(config.groups || []).map(value => normalizeConfiguredIndustryGroup(cleanCell(value))));
    const aliases = { ...defaultConfig.aliases };
    Object.entries(config.aliases || {}).forEach(([source, target]) => {
      const sourceValue = cleanCell(source);
      const targetValue = normalizeConfiguredIndustryGroup(cleanCell(target));
      if (sourceValue && targetValue) aliases[sourceValue] = targetValue;
    });
    return { groups, aliases };
  }

  function normalizeConfiguredIndustryGroup(value) {
    const text = cleanCell(value);
    if (!text) return "";
    if (/^construction(?:and|&)?energy$/i.test(normalizeKey(text))) return "Construction & Energy";
    if (normalizeKey(text) === "construction") return "Construction & Energy";
    return text;
  }

  function saveIndustryConfig() {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(exportIndustryConfig()));
    } catch (error) {
      console.warn("Could not save industry group mapping config", error);
    }
  }

  function exportIndustryConfig() {
    return {
      groups: uniqueSorted(state.industryConfig.groups.map(cleanCell)),
      aliases: Object.fromEntries(
        Object.entries(state.industryConfig.aliases)
          .map(([source, target]) => [cleanCell(source), cleanCell(target)])
          .filter(([source, target]) => source && target)
          .sort(([a], [b]) => alphaSort(a, b))
      )
    };
  }

  function defaultEmojiConfig() {
    return {
      scIndustryGroups: { ...DEFAULT_EMOJI_MAPPINGS.scIndustryGroups },
      gtmIndustrySubgroups: { ...DEFAULT_EMOJI_MAPPINGS.gtmIndustrySubgroups }
    };
  }

  function loadEmojiConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EMOJI_CONFIG_STORAGE_KEY) || "null");
      if (parsed && typeof parsed === "object") return cleanEmojiConfig(parsed);
    } catch (error) {
      console.warn("Could not read saved emoji mapping config", error);
    }
    return cleanEmojiConfig(defaultEmojiConfig());
  }

  function cleanEmojiConfig(config) {
    const defaults = defaultEmojiConfig();
    return {
      scIndustryGroups: cleanEmojiMap({
        ...defaults.scIndustryGroups,
        ...config.scIndustryGroups
      }),
      gtmIndustrySubgroups: cleanEmojiMap({
        ...defaults.gtmIndustrySubgroups,
        ...config.gtmIndustrySubgroups,
        ...config.gtmSubgroups
      })
    };
  }

  function cleanEmojiMap(values) {
    return Object.fromEntries(
      Object.entries(values || {})
        .map(([label, emoji]) => [cleanCell(label), cleanCell(emoji)])
        .filter(([label]) => label)
        .sort(([left], [right]) => alphaSort(left, right))
    );
  }

  function saveEmojiConfig() {
    try {
      localStorage.setItem(EMOJI_CONFIG_STORAGE_KEY, JSON.stringify(state.emojiConfig));
    } catch (error) {
      console.warn("Could not save emoji mapping config", error);
    }
  }

  function resolveIndustryGroup(sourceIndustryFamily) {
    const sourceKey = normalizeKey(sourceIndustryFamily);
    if (!sourceKey) return "";
    const directGroup = state.industryConfig.groups.find(group => normalizeKey(group) === sourceKey);
    if (directGroup) return directGroup;
    const alias = Object.entries(state.industryConfig.aliases)
      .find(([source]) => normalizeKey(source) === sourceKey);
    if (!alias) return "";
    const target = cleanCell(alias[1]);
    return state.industryConfig.groups.find(group => normalizeKey(group) === normalizeKey(target)) || target;
  }

  function fileNameFromUrl(value) {
    try {
      const parsed = new URL(value);
      const lastPath = parsed.pathname.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(lastPath.split("?")[0]);
    } catch (error) {
      return "";
    }
  }

  function positiveInteger(value, fallback) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function columnNameToIndex(value) {
    const letters = String(value || "A").toUpperCase().replace(/[^A-Z]/g, "") || "A";
    return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  function indexToColumnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function cleanCell(value) {
    return String(value == null ? "" : value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function cleanPersonName(value) {
    return cleanCell(value).replace(/\s+,/g, ",").replace(/,\s+/g, ", ");
  }

  function cleanPersonList(value) {
    const text = String(value == null ? "" : value).replace(/\u00a0/g, " ").trim();
    if (!text) return [];
    return uniqueSorted(
      text
        .split(/\s*(?:;|\||\n|\r|\t)\s*/g)
        .map(cleanPersonName)
        .filter(Boolean)
    );
  }

  function normalizeAmoDirect(value) {
    const text = cleanCell(value);
    if (/^amo$/i.test(text)) return "AMO";
    if (/^direct$/i.test(text) || /^dir$/i.test(text)) return "Direct";
    return "";
  }

  function normalizeKey(value) {
    return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  }

  function normalizePersonKey(value) {
    return normalizeKey(cleanPersonName(value));
  }

  function normalizeStateKey(value) {
    const text = cleanCell(value);
    return text.toLowerCase() === "singapore" ? "Singapore" : text.toUpperCase();
  }

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort(alphaSort);
  }

  function alphaSort(a, b) {
    return String(a).localeCompare(String(b));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
