(function () {
  "use strict";

  const SCHEMA = "ns-scm-tools.region-map.v3";
  const PRODUCTS_SCM_SCHEMA = "ns-scm-tools.scm-relationships.v3";
  const TOOL_VERSION = "27.0.1";
  const TOOL_NAME = "FY27 Queue Mapping JSON Maker";
  const CONFIG_STORAGE_KEY = "ns-scm-tools-region-map-industry-config-v1";
  const REGION_MAPPING_TYPE = "region";
  const PRODUCTS_SCM_MAPPING_TYPE = "productsScm";
  const REGION_OUTPUT_FILE_NAME = "SC_Industry_State_Region_Mapping.json";
  const PRODUCTS_SCM_OUTPUT_FILE_NAME = "Products_SCM_Relationship_Mapping.json";
  const SOURCE_DESCRIPTIONS = {
    [REGION_MAPPING_TYPE]: "Use an Excel workbook where row 1 contains SC industry groups, row 2 contains Direct/AMO, and column A contains state/province codes.",
    [PRODUCTS_SCM_MAPPING_TYPE]: "Use an Excel workbook with columns for Sales Region, AMO/Direct, Regional Director or RSM, and SCM owner. SCM ownership applies across SC Industry Groups."
  };
  const PRODUCTS_SCM_HEADER_ALIASES = {
    salesRegion: ["salesregion", "region", "salesarea"],
    requestType: ["amodirect", "directamo", "requesttype", "type"],
    regionalDirector: ["rd", "regionaldirector", "regionalsalesmanager", "rsm", "salesdirector", "salesdir", "regionaldirectorregionalsalesmanager"],
    scm: ["scm", "scmanager", "solutionconsultingmanager", "productsscm", "productsscmmanager", "scmowner", "queueowner", "productsscmqueueowner"]
  };
  const DEFAULT_INDUSTRY_GROUPS = [
    "Business Services",
    "Products",
    "Health & Hospitality",
    "Construction",
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
    "Construction": "Construction",
    "Construction & Energy": "Construction",
    "Construction and Energy": "Construction",
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
    return state.mappingType === PRODUCTS_SCM_MAPPING_TYPE
      ? PRODUCTS_SCM_OUTPUT_FILE_NAME
      : REGION_OUTPUT_FILE_NAME;
  }

  function updateMappingTypeUi() {
    const isProductsScm = state.mappingType === PRODUCTS_SCM_MAPPING_TYPE;
    if (elements["source-description"]) {
      elements["source-description"].textContent = SOURCE_DESCRIPTIONS[state.mappingType] || SOURCE_DESCRIPTIONS[REGION_MAPPING_TYPE];
    }
    if (elements["region-parsing-settings"]) {
      elements["region-parsing-settings"].hidden = isProductsScm;
    }
    if (elements["industry-map-panel"] && isProductsScm) {
      elements["industry-map-panel"].hidden = true;
    }
  }

  async function handleUrlLoad() {
    const url = (elements["sharepoint-url"].value || "").trim();
    if (!url) {
      setStatus("Paste a SharePoint workbook URL first", true);
      return;
    }

    setStatus("Trying SharePoint URL...");
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      state.workbookName = fileNameFromUrl(url) || "sharepoint-workbook.xlsx";
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
      const output = state.mappingType === PRODUCTS_SCM_MAPPING_TYPE
        ? buildProductsScmJson(state.workbook, state.workbookName)
        : buildMappingJson(state.workbook, state.workbookName);
      state.jsonText = JSON.stringify(output, null, 2);
      renderOutput(output);
      if (output.schema === PRODUCTS_SCM_SCHEMA && (output.counts.incompleteRows || output.counts.duplicateExactKeys)) {
        const reviewCount = output.counts.incompleteRows + output.counts.duplicateExactKeys;
        setStatus(`Review ${reviewCount} SCM relationship issue${reviewCount === 1 ? "" : "s"}`, true);
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
        scmKey: normalizePersonKey(scm)
      };

      relationships.push(record);
      if (salesRegion) salesRegions.add(salesRegion);
      requestTypes.add(requestType);
      regionalDirectors.add(regionalDirector);
      scms.add(scm);
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
        regionalDirectors: regionalDirectors.size,
        salesRegions: salesRegions.size,
        requestTypes: requestTypes.size,
        incompleteRows: incompleteRows.length,
        duplicateExactKeys: duplicateExactKeys.length,
        ambiguousDirectorKeys: ambiguousDirectorKeys.length
      },
      scms: scmSummaries,
      authorizedScms: scmSummaries.map(item => item.scm),
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
        scm: productsHeaderCellInfo(winner.row, winner.indexes.scm)
      }
    };
  }

  function findProductsHeaderIndex(normalizedHeaders, aliases) {
    const exact = normalizedHeaders.findIndex(header => aliases.includes(header));
    if (exact >= 0) return exact;
    return normalizedHeaders.findIndex(header => header && aliases.some(alias => {
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
        regionalDirectors: uniqueSorted(rows.map(row => row.regionalDirector))
      }))
      .sort((left, right) => alphaSort(left.scm, right.scm));
  }

  function buildEmojiMappings(industryGroups) {
    const scIndustryGroups = { ...DEFAULT_EMOJI_MAPPINGS.scIndustryGroups };
    industryGroups.forEach(group => {
      if (!Object.prototype.hasOwnProperty.call(scIndustryGroups, group)) {
        scIndustryGroups[group] = "";
      }
    });

    return {
      scIndustryGroups: sortObjectByKey(scIndustryGroups),
      gtmIndustries: sortObjectByKey(DEFAULT_EMOJI_MAPPINGS.gtmIndustries),
      gtmIndustrySubgroups: sortObjectByKey(DEFAULT_EMOJI_MAPPINGS.gtmIndustrySubgroups)
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
      ["RD/RSMs", output.counts.regionalDirectors],
      ["Sales Regions", output.counts.salesRegions || "Any/blank"],
      ["Review Items", output.counts.incompleteRows + output.counts.duplicateExactKeys]
    ]);

    elements["columns-preview"].innerHTML = renderTable(
      ["Type", "Sales Region", "Regional Director/RSM", "SCM Owner", "Source Row"],
      output.relationships.map(row => [
        row.requestType,
        row.salesRegion || "Any/blank",
        row.regionalDirector,
        row.scm,
        row.sourceRow
      ])
    );

    elements["spot-checks"].innerHTML = renderTable(
      ["SCM Owner", "Relationships", "Request Types", "Sales Regions", "RD/RSMs"],
      output.scms.map(row => [
        row.scm,
        row.relationshipCount,
        row.requestTypes.join(", "),
        row.salesRegions.join(", "),
        row.regionalDirectors.join(", ")
      ])
    );
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
    const groups = uniqueSorted(defaultConfig.groups.concat(config.groups || []).map(cleanCell));
    const aliases = { ...defaultConfig.aliases };
    Object.entries(config.aliases || {}).forEach(([source, target]) => {
      const sourceValue = cleanCell(source);
      const targetValue = cleanCell(target);
      if (sourceValue && targetValue) aliases[sourceValue] = targetValue;
    });
    return { groups, aliases };
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
