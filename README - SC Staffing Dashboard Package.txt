SC Staffing Dashboard - Test Package

Files included:
- staffing-dashboard.html
- calendar-refresh.html
- consultant-roster.js
- direct-connector-events.js

Companion Tampermonkey script:
- /Users/michaean/Documents/New project/netsuite-sc-roster-calendar-refresh.user.js can be installed in Tampermonkey to launch the refresh console from NetSuite saved search 1311451.

How to open:
1. Keep all files in the same folder.
2. Open staffing-dashboard.html in a browser or Codex environment.
3. If the dashboard appears stale, do a hard refresh so the browser reloads direct-connector-events.js.

Local refresh console:
- Open calendar-refresh.html, or use the dashboard's Open refresh console button.
- Use Open saved search to launch NetSuite saved search 1311451, then paste/export the active SC rows into the NetSuite SC Saved Search Roster panel.
- If the NetSuite saved-search launcher userscript is installed, use its Open refresh console button on saved search 1311451 to send the visible roster directly into calendar-refresh.html.
- Use Import NetSuite roster to make the saved search roster the full-refresh source.
- Use Prepare Codex sync to create one full Codex-readable sync plan on the page. Large rosters are split into internal chunks, defaulting to 20 consultants per chunk. Use Run with Codex to copy the one-line Codex command and make the handoff explicit; Codex can read the plan from the page and run every chunk without manual copy/paste.
- Enter consultant emails and copy the generated ChatGPT Outlook connector request.
- Use Load full SC roster to prepare a full-refresh request. If a NetSuite roster is imported, that roster is used; otherwise consultant-roster.js is used.
- Run that request in ChatGPT/Codex using the allowed Outlook Calendar connector.
- Paste the returned JSON into calendar-refresh.html and save it to the local dashboard cache.
- The console stores free/busy data in browser local storage for the dashboard and can also export direct-connector-events.js as a fallback.

Data note:
This package includes internal Oracle calendar availability signals and some meeting subjects from the Direct consultant test snapshot. Share internally only with appropriate Oracle/NetSuite colleagues.

Snapshot scope:
- Direct consultants are loaded for the 21-day staffing window.
- Some calendars expose full meeting subjects.
- Some calendars expose only Outlook free/busy blocks, shown in the dashboard as subject unavailable.
