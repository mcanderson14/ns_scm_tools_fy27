# FY27 Queue Mapping JSON Maker

Static browser tool for converting FY27 queue mapping Excel workbooks into JSON mapping files.

Current tool version: `27.0.7`.

The tool currently supports these outputs:

- `SC_Industry_State_Region_Mapping.json`
- `Products_SCM_Relationship_Mapping.json`
- `Authorized_Managers.json`
- `GTM_to_SC_Industry_Mapping.json`

## SC Industry State Region Mapping

- Row 1: SC industry group names.
- Row 2: `Direct` or `AMO`.
- Column A: state/province/territory code.
- Rows 3+: queue staffing regions.

The parser fills industry names across columns, so it supports either repeated industry labels or merged/header-style groups.

## SCM Relationships

Use the `SCM Relationships` mode for a workbook with these columns:

- `Sales Region`
- `AMO/Direct`
- `RD` or `Regional Director` or `Regional Sales Manager`
- `SCM`
- Optional `SCM Director`, `SC Director`, `Queue Director`, or `Authorized Director`

The generated JSON uses schema `ns-scm-tools.scm-relationships.v3` and includes:

- `generator`: tool name and version used to create the file.
- `authorizedScms`: SCM names allowed to use SCM owner controls.
- `authorizedDirectors`: director names allowed to view SCM owner controls without being SCM owners.
- `relationships`: one row per RD/RSM to SCM relationship.
- `lookup`: exact lookup keyed as `requestTypeKey|regionalDirectorKey|salesRegionKey`.
- `directorLookup`: fallback lookup keyed as `requestTypeKey|regionalDirectorKey`.
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

## Authorized Managers

Use the `Authorized Managers` mode for an Excel export from NetSuite saved search `1319617`:

`https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?searchid=1319617`

Recommended columns:

- `Name` or `Manager`
- `Email`
- `Role` or `Title`
- `SC Industry Group`, `SC Industry`, `Sales Vertical`, or `Groups`
- `Can Own`
- `Can View`
- `Active`

The generated JSON uses schema `ns-scm-tools.authorized-managers.v1` and includes:

- `authorizedManagers`: one row per deduped manager.
- `canOwnManagers`: active managers eligible for manual SCR owner assignment.
- `canViewManagers`: active managers/directors allowed to view SCM queue controls.
- `groupLookup`: assignable managers by SC Industry Group.
- `review`: incomplete, duplicate, or missing-group rows to inspect before uploading.

Multiple group-like columns are merged. For example, `SC Industry` and `Sales Vertical` can both be present. `PBCS` is normalized to `EPM`.

If `Can Own` is missing, the tool defaults directors, AVPs, VPs, leaders, and executives to `false`; other roles default to `true`. `Can View` defaults to `true`. Missing groups are included in review because they should not become assignable until a group is supplied.

## GTM to SC Industry

Use the `GTM to SC Industry` mode for a workbook with these columns:

- `SC Industry Group`
- `GTM Industry`
- `GTM Industry Subgroup`

Optional columns:

- `SC Industry Group Emoji`
- `GTM Industry Subgroup Emoji`

The generated JSON uses schema `ns-scm-tools.gtm-sc-industry.v1` and includes:

- `rows`: one row per GTM Industry/Subgroup to SC Industry Group relationship.
- `lookup`: exact lookup keyed as `gtmIndustryKey|gtmIndustrySubgroupKey`.
- `subgroupLookup`: fallback lookup by GTM Industry Subgroup.
- `industryLookup`: fallback lookup by GTM Industry.
- `emojiMappings`: SC Industry Group and GTM Industry Subgroup emojis used by IQUEUE, with embedded fallbacks when an emoji is blank or missing.
- `review`: incomplete, duplicate, or missing-emoji rows to inspect before uploading.

The Excel file does not need emoji columns. When new SC Industry Groups or GTM Industry Subgroups appear, use the builder's `Emoji Mapping` panel to add or adjust emojis. Those values are saved in browser storage and included in the downloaded JSON.

## SC Industry Group Clarification

The tool keeps a configurable list of canonical SC Industry Groups in browser storage. The default groups are:

- Business Services
- Products
- Health & Hospitality
- Construction & Energy
- Consumer Services
- Software
- EPM
- Tech COE

The workbook can use different labels, misspellings, abbreviations, or future groups. When a detected workbook label does not resolve to one of the configured SC Industry Groups, the tool flags it as `Needs clarification`.

Use the mapping table to assign the workbook label to a canonical SC Industry Group. Use the `Add SC Industry Group` box when a seventh or future group should become part of the canonical list.

## SharePoint URL Option

The URL field attempts to fetch a workbook directly from a SharePoint link using the browser session. This may be blocked by SharePoint or browser CORS policies when the tool is hosted on GitHub Pages. Manual upload is the reliable fallback.

## Region JSON Schema

The generated file uses schema `ns-scm-tools.region-map.v3` and includes:

- `generator`: tool name and version used to create the file.
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
