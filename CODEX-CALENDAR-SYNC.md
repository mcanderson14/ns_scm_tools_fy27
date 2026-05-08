# Codex Calendar Sync

This folder can refresh the staffing dashboard with the Outlook Calendar connector through Codex.

## Files

- `codex-calendar-sync-request.json` is the prepared 275-consultant sync plan from `calendar-refresh.html`.
- `codex-calendar-sync-state.json` tracks completed chunks and resume position.
- `calendar-codex-sync-tools.mjs` merges each connector result into `direct-connector-events.js`.
- `direct-connector-events.js` is the local dashboard calendar database.

## Status

```bash
node "calendar-codex-sync-tools.mjs" status
```

When replacing `codex-calendar-sync-request.json` from the configuration page, initialize the run state:

```bash
node "calendar-codex-sync-tools.mjs" init-state
```

## Codex Run Loop

When asked to run the sync, Codex should:

1. Read `codex-calendar-sync-request.json` and `codex-calendar-sync-state.json`.
2. Start at `nextChunkIndex`.
3. Use the Microsoft Outlook Calendar connector to call `get_schedule` for that chunk's `emails`.
4. Request the window from `request.start` through `request.end`, using `request.timeZone` and `request.intervalMinutes`.
5. Save a compact JSON result for the chunk, shaped like:

```json
{
  "refreshedAt": "2026-05-08T00:00:00.000Z",
  "start": "2026-05-07",
  "end": "2026-05-28",
  "intervalMinutes": 30,
  "loadedEmails": ["person@oracle.com"],
  "availability": [
    {
      "email": "person@oracle.com",
      "start": "2026-05-07T00:00:00.000Z",
      "intervalMinutes": 30,
      "view": "000022220000"
    }
  ],
  "events": [],
  "errors": []
}
```

6. Merge it:

```bash
node "calendar-codex-sync-tools.mjs" merge-result 0 "/path/to/chunk-result.json"
```

7. Repeat until the status command reports `complete`.

Prefer the compact `availabilityView` data. Only include event records when the connector cannot provide an availability view.

## Configuration Page

Open `calendar-refresh.html` locally to configure the sync. The page is now the roster and automation configuration surface:

1. Set **Local Project Folder** to the folder where this package lives. The suggested shared paths are `/netsuite/scm_tools` for macOS and `C:\netsuite\scm_tools` for Windows, but any local folder path is supported.
2. Open NetSuite saved search `1311451`.
3. Copy/export the active SC roster as JSON or copied result rows.
4. Paste that data into the NetSuite SC Saved Search Roster box and click **Import and save roster**.
5. Review the roster table, filter by team or industry family, and select the SCs to include.
6. Set the date window, time zone, interval, and chunk batch size.
7. Click **Save page configuration** so the browser remembers the selected consultants and local folder.
8. Click **Prepare Codex sync** and use **Download request file** to save/replace `codex-calendar-sync-request.json` in this folder when the roster or selection changes.

The roster table shows team, industry family, legacy designation, region, time zone, and the last sync state from `direct-connector-events.js`. A consultant can be present in the roster but still show a warning if Outlook returned no availability snapshot.

## Automation

The Codex automation should run during the business day and process one chunk per run. Each run should:

1. Read `codex-calendar-sync-request.json` and run `calendar-codex-sync-tools.mjs init-state` so a new request starts from chunk 0 while an existing request keeps its current position.
2. If the state is already `complete`, stop and report the current status.
3. Otherwise process `nextChunkIndex` only, using the Outlook Calendar connector.
4. Merge the result into `direct-connector-events.js`.
5. Update `codex-calendar-sync-state.json` so the next automation run continues with the next chunk.

Before enabling or changing the automation, make sure the request file reflects the configuration page selection, the automation workspace is set to the same local project folder, and the user running Codex is authenticated to the Microsoft Outlook Calendar connector.
