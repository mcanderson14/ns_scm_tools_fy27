# FY27 Queue Mapping JSON Maker

Static browser tool for converting FY27 queue mapping Excel workbooks into JSON mapping files.

The tool currently supports two outputs:

- `SC_Industry_State_Region_Mapping.json`
- `Products_SCM_Relationship_Mapping.json`

## SC Industry State Region Mapping

- Row 1: SC industry group names.
- Row 2: `Direct` or `AMO`.
- Column A: state/province/territory code.
- Rows 3+: queue staffing regions.

The parser fills industry names across columns, so it supports either repeated industry labels or merged/header-style groups.

## SCM Relationships

Use the `SCM Relationships` mode for a workbook with these columns:

- `SC Industry Group` optional; defaults to `Products` when blank or missing
- `Sales Region`
- `AMO/Direct`
- `RD` or `Regional Director` or `Regional Sales Manager`
- `SCM`

The generated JSON uses schema `ns-scm-tools.scm-relationships.v2` and includes:

- `authorizedScms`: SCM names allowed to use SCM owner controls.
- `relationships`: one row per RD/RSM to SCM relationship.
- `lookup`: exact lookup keyed as `scIndustryGroupKey|requestTypeKey|regionalDirectorKey|salesRegionKey`.
- `directorLookup`: fallback lookup keyed as `scIndustryGroupKey|requestTypeKey|regionalDirectorKey`.
- `scmLookup`: all relationships by SCM owner.
- `review`: skipped or ambiguous rows to inspect before uploading.

## Use

1. Open `index.html` in a browser, or publish this folder with GitHub Pages.
2. Choose the mapping type.
3. Upload the Excel workbook.
4. Review the generated preview.
5. For state-region mappings, clarify any workbook industry labels that are not mapped.
6. Download the JSON file.
7. Upload the JSON file to NetSuite File Cabinet when the queue helper is ready to consume external mappings.

## SC Industry Group Clarification

The tool keeps a configurable list of canonical SC Industry Groups in browser storage. The default groups are:

- Business Services
- Products
- Health & Hospitality
- Construction
- Consumer Services
- Software
- EPM

The workbook can use different labels, misspellings, abbreviations, or future groups. When a detected workbook label does not resolve to one of the configured SC Industry Groups, the tool flags it as `Needs clarification`.

Use the mapping table to assign the workbook label to a canonical SC Industry Group. Use the `Add SC Industry Group` box when a seventh or future group should become part of the canonical list.

## SharePoint URL Option

The URL field attempts to fetch a workbook directly from a SharePoint link using the browser session. This may be blocked by SharePoint or browser CORS policies when the tool is hosted on GitHub Pages. Manual upload is the reliable fallback.

## Region JSON Schema

The generated file uses schema `ns-scm-tools.region-map.v3` and includes:

- `source`: workbook and parser metadata.
- `counts`: row, state, industry, mode, and staffing-region counts.
- `states`, `sourceIndustries`, `industryGroups`, `amoDirectModes`, `staffingRegions`: distinct values.
- `industryGroupConfig`: configured canonical SC Industry Groups and workbook-label aliases.
- `emojiMappings`: optional UI emoji metadata for SC Industry Groups and FY27 GTM Industry Subgroups. IQUEUE keeps the FY27 GTM Industry dropdown text-only and falls back to embedded defaults when a value is blank or missing.
- `industryMappings`: detected workbook labels and their resolved SC Industry Groups.
- `columns`: detected workbook mapping columns.
- `rows`: full mapping rows.
- `lookup`: direct lookup keyed as `sourceIndustryKey|amoDirectKey|stateKey`, preserving exact workbook labels.
- `industryGroupLookup`: lookup keyed as `industryGroupKey|amoDirectKey|stateKey`; values are arrays so multiple workbook labels can map into the same canonical SC Industry Group without silently losing data.
