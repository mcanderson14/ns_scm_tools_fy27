# GitHub Pages Setup

Use GitHub Pages as the static host for the SCOUT calendar dashboard.

## Target URLs

```text
https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html
https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html
```

## Files To Publish

Publish these files at the repository root:

- `staffing-dashboard.html`
- `calendar-refresh.html`
- `direct-connector-events.js` as the starter empty cache
- `direct-connector-events.starter.js`
- `scr-staffing-helper.user.js`
- `netsuite-sc-roster-calendar-refresh.user.js`
- `sc-calendar-dashboard-bridge.user.js`
- install/setup docs
- `scout-tools-manifest.json`

Do not publish a populated `direct-connector-events.js` from a user's browser
unless intentionally sharing a calendar snapshot.

## GitHub Pages Settings

In the GitHub repository:

1. Go to **Settings > Pages**.
2. Set Source to the publishing branch, usually `main`.
3. Set folder to `/root` if the files are at the repository root.
4. Save and wait for the Pages deployment.

## Userscript URLs

Once the repository is public or internally reachable, Tampermonkey can use raw
GitHub URLs for update/download metadata. Until then, users can manually import
the `.user.js` files from the shared package or repository file view.

## Data Location

User-specific data is stored in that user's browser storage for the GitHub Pages
origin:

- encrypted Graph Explorer token vault until token expiry
- imported NetSuite SC roster
- Microsoft Graph free/busy availability snapshots
- dashboard preferences and refresh metadata

Moving from SharePoint or local files to GitHub Pages creates a new browser
storage origin, so users should reimport the roster and save a fresh Graph token
the first time they use the GitHub Pages app.
