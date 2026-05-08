SC Calendar Sync Codex Setup
============================

Purpose
-------
This folder contains the local SC calendar dashboard, roster configuration page,
and Codex sync helpers used to refresh Outlook free/busy data through the
ChatGPT/Codex Microsoft Outlook Calendar connector.

The sync is intentionally chunked. Codex processes one chunk per automation run,
updates the local dashboard cache, and resumes with the next chunk on the next
scheduled run.


Required Files
--------------
Keep these files together in this folder:

- calendar-refresh.html
  Configuration page for importing the SC roster, selecting consultants, and
  preparing the Codex sync request.

- staffing-dashboard.html
  Calendar dashboard used by the staffing workflow.

- consultant-roster.js
  Built-in fallback roster.

- direct-connector-events.js
  Local calendar cache used by staffing-dashboard.html.

- codex-calendar-sync-request.json
  The active chunked sync request. Replace this file whenever the roster,
  consultant selection, date window, time zone, interval, or chunk size changes.

- codex-calendar-sync-state.json
  The resume file used by Codex automation. Do not edit manually unless you are
  intentionally resetting a run.

- calendar-codex-sync-tools.mjs
  Helper used by Codex to initialize state, merge chunk results, and report
  status.

- CODEX-CALENDAR-SYNC.md
  Technical workflow notes for Codex.


Prerequisites
-------------
1. The user running the sync must be signed in to Codex/ChatGPT.

2. The Microsoft Outlook Calendar connector must be available and authenticated
   for that Codex/ChatGPT session.

3. The NetSuite saved search must be available to the user:
   https://nlcorp.app.netsuite.com/app/common/search/savedsearchresults.nl?rectype=1572&searchtype=Custom&style=REPORT&sortcol=Custom_NAME_raw&sortdir=ASC&csv=HTML&OfficeXML=F&pdf=&size=50&twbx=F&report=T&grid=&searchid=1311451&dle=T

   Do not preserve or share the _csrf token from a copied NetSuite URL; that
   value is tied to the current NetSuite session.

4. The local project folder can live anywhere on the user's computer. For a
   shared team convention, use these paths:

   macOS:
   /netsuite/scm_tools

   Windows:
   C:\netsuite\scm_tools

   Set this folder in calendar-refresh.html before preparing a Codex sync. If a
   user stores the package somewhere else, enter that custom path instead.


Roster Setup
------------
1. Open calendar-refresh.html in a browser.

2. In the "Codex Automation" section, set "Local Project Folder" to the folder
   where this package lives on the user's computer. Mac and Windows paths are
   supported. Use "Use current page folder" when the page is opened directly
   from the package folder.

3. Open NetSuite saved search 1311451.

4. Copy or export the active SC roster. The page accepts JSON or copied
   delimited rows. The roster should include, when available:
   - Name
   - Email
   - Title
   - Manager / Team Name
   - Industry Family
   - Direct or AMO / Legacy Designation
   - Office Location
   - Region
   - E-mail Address

   Current saved-search column order:
   SC Name (Consultant), Team, Job Title, Industry Family,
   Direct/AMO (Legacy), Office Location, Region, E-mail Adress.

   The configuration page uses Office Location to infer the consultant time
   zone. US locations should be formatted like US-NC, where NC is the two-letter
   state abbreviation. Canadian locations should be formatted like CA-Ontario,
   with the province spelled out. Arizona is mapped to America/Phoenix because
   Arizona does not observe daylight saving time. Indiana is mapped to
   America/New_York because county level detail is not available in the saved
   search. The dashboard displays these as business-friendly buckets: Eastern,
   Central, Mountain, Arizona, Pacific, Atlantic, Alaska, Hawaii, and
   Newfoundland.

5. Paste the roster into the "NetSuite SC Saved Search Roster" box.

6. Click "Import and save roster".

7. Confirm the roster table shows the expected SCs and attributes.


Sync Configuration
------------------
1. In calendar-refresh.html, use the roster table filters to review consultants.

2. Select the consultants to include in the sync:
   - "Select visible" selects the currently filtered rows.
   - "Clear visible" removes the currently filtered rows.
   - "Select missing sync" selects visible consultants without a clean calendar
     snapshot.

3. Set the sync window:
   - Start Date
   - Days
   - Interval
   - Request Time Zone

4. Set Batch Size. Recommended value: 20 to 25.

5. Click "Save page configuration".

6. Click "Prepare Codex sync".

7. Click "Download request file".

8. Replace the codex-calendar-sync-request.json file in the local project
   folder with the downloaded request file.

9. Initialize the new request state from a terminal or Codex:

   macOS example:
   node "/netsuite/scm_tools/calendar-codex-sync-tools.mjs" init-state

   Windows example:
   node "C:\netsuite\scm_tools\calendar-codex-sync-tools.mjs" init-state

   If the request has a new sync ID, this starts the sync at chunk 0. If it is
   the same request, it keeps the current progress.


Manual Status Check
-------------------
Run:

macOS example:

node "/netsuite/scm_tools/calendar-codex-sync-tools.mjs" status

Windows example:

node "C:\netsuite\scm_tools\calendar-codex-sync-tools.mjs" status

Expected fields:

- status
  "in_progress" while chunks remain, "complete" when all chunks are done.

- nextChunkIndex
  The next chunk Codex should process.

- loadedEmails
  Count of emails present in direct-connector-events.js.

- availabilitySnapshots
  Count of free/busy availability snapshots.

- warnings
  Count of connector warnings or failed consultant lookups.

- refreshedAt
  Last successful cache refresh timestamp.


Codex Automation Configuration
------------------------------
Automation names:
SC calendar chunk sync - morning
SC calendar chunk sync - midday

Automation IDs:
sc-calendar-chunk-sync
sc-calendar-chunk-sync-midday

Kind:
cron

Workspace:
Set this to the user's local project folder.

macOS example:
/netsuite/scm_tools

Windows example:
C:\netsuite\scm_tools

Execution environment:
local

Model:
gpt-5.4

Reasoning effort:
medium

Status:
ACTIVE

Schedule:
Weekdays at 8:00 AM and 12:30 PM local time.

Morning RRULE:
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=0;BYSECOND=0

Midday RRULE:
FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=12;BYMINUTE=30;BYSECOND=0

Automation prompt:
Process one pending SC calendar sync chunk for the Outlook Calendar staffing
dashboard.

Use the project files in the workspace:
- CODEX-CALENDAR-SYNC.md for workflow notes
- codex-calendar-sync-request.json for the prepared roster/window/chunks
- codex-calendar-sync-state.json for resume state
- calendar-codex-sync-tools.mjs for status, state initialization, and merging
- direct-connector-events.js for the dashboard cache

Workflow:
1. Run `node calendar-codex-sync-tools.mjs init-state`. This starts chunk 0 for
   a newly saved request while preserving progress for the current request.
2. Run the status helper. If codex-calendar-sync-state.json has status
   `complete` or nextChunkIndex is at/after totalChunks, report the current
   status and stop without rewriting files.
3. Otherwise read nextChunkIndex and process exactly that one chunk from
   codex-calendar-sync-request.json.
4. Use the Microsoft Outlook Calendar connector get_schedule/free-busy data for
   every email in that chunk, using request.start through request.end,
   request.timeZone, and request.intervalMinutes.
5. Normalize the connector result into the chunk result shape documented in
   CODEX-CALENDAR-SYNC.md, preserving roster metadata and recording per-email
   connector warnings/errors.
6. Merge the result into direct-connector-events.js using
   calendar-codex-sync-tools.mjs merge-result, then run the status helper and a
   JavaScript syntax check on direct-connector-events.js.
7. Report the chunk processed, loaded email count, availability snapshot count,
   warnings/errors, nextChunkIndex, and whether the sync is complete.

Important:
Do not process more than one chunk per automation run. The next scheduled run
should resume from the updated state.


Manual Chunk Processing
-----------------------
Normally the automation handles this. If a manual run is needed, ask Codex:

Process one pending SC calendar sync chunk.

Codex should:
1. Run init-state.
2. Check status.
3. Process only nextChunkIndex with the Outlook Calendar connector.
4. Merge the result.
5. Validate direct-connector-events.js.
6. Report the next chunk.


Resetting or Starting a New Full Sync
-------------------------------------
Use this flow when the roster or date window changes:

1. Update the configuration in calendar-refresh.html.
2. Save the page configuration.
3. Prepare Codex sync.
4. Download request file.
5. Replace codex-calendar-sync-request.json.
6. Run:

   macOS example:
   node "/netsuite/scm_tools/calendar-codex-sync-tools.mjs" init-state

   Windows example:
   node "C:\netsuite\scm_tools\calendar-codex-sync-tools.mjs" init-state

7. Confirm status shows nextChunkIndex 0 and status in_progress.

If you intentionally need to restart the same sync ID from chunk 0, use:

macOS example:

node "/netsuite/scm_tools/calendar-codex-sync-tools.mjs" init-state "/netsuite/scm_tools/codex-calendar-sync-request.json" "/netsuite/scm_tools/codex-calendar-sync-state.json" --force

Windows example:

node "C:\netsuite\scm_tools\calendar-codex-sync-tools.mjs" init-state "C:\netsuite\scm_tools\codex-calendar-sync-request.json" "C:\netsuite\scm_tools\codex-calendar-sync-state.json" --force


Known Behavior
--------------
- Some mailboxes may return Outlook connector timeouts or no free/busy snapshot.
  Those are preserved as warnings instead of fake availability.

- The dashboard can still load other consultants when one consultant fails.

- The automation only works while the Codex/ChatGPT connector authentication is
  valid for the user/session running the job.

- calendar-refresh.html stores UI configuration in browser local storage. If a
  different browser or profile is used, re-import the roster and save the page
  configuration again.
