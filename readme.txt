SC Calendar Dashboard GitHub Pages Package
==========================================

Run the SCOUT calendar dashboard from GitHub Pages:

https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html
https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html
https://mcanderson14.github.io/ns_scm_tools_fy27/install-guide.html

Start here:

1. Open install-guide.html for clickable setup links, or read INSTALL.txt.
2. Install the Tampermonkey userscripts.
3. Open the GitHub Pages calendar refresh page.
4. Import the NetSuite SC roster.
5. Save a Graph Explorer token.
6. Open the GitHub Pages staffing dashboard.

Core files:

- calendar-refresh.html
  Imports roster data, saves an encrypted Graph Explorer token in browser-local
  storage, and refreshes Microsoft Graph free/busy snapshots.

- staffing-dashboard.html
  Displays roster/calendar availability and refreshes selected SCs using the
  saved token.

- scr-staffing-helper.user.js
  SCOUT NetSuite widget. Defaults to the GitHub Pages dashboard.

- netsuite-sc-roster-calendar-refresh.user.js
  Tampermonkey helper that sends NetSuite saved search roster rows into the
  GitHub Pages calendar-refresh.html page.

- sc-calendar-dashboard-bridge.user.js
  Optional bridge cache between supported page origins.

- direct-connector-events.starter.js
  Starter empty cache.

- direct-connector-events.js
  Active starter empty cache. Do not replace the shared copy with a populated
  user-specific availability file unless intentionally sharing a snapshot.

- GITHUB-PAGES-SETUP.md
  Publishing notes for the GitHub Pages repository.

- install-guide.html
  Clickable step-by-step setup guide for new users.

- INSTALL-GRAPH-EXPLORER-TOKEN.md
  Detailed Graph Explorer token instructions.

- scout-tools-manifest.json
  Version and URL manifest.
