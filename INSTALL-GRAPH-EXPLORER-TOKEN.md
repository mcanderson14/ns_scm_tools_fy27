# SC Calendar Dashboard: Microsoft Graph Explorer Token

This guide walks a user through refreshing calendar availability with their own
Microsoft Graph Explorer access token.

Do not share a Graph access token. Each user must sign in to Graph Explorer and
copy their own temporary token.

## What This Method Does

The GitHub Pages `calendar-refresh.html` page calls Microsoft Graph from the user's
browser:

```text
POST https://graph.microsoft.com/v1.0/me/calendar/getSchedule
```

The page asks Microsoft Graph for free/busy availability only. It stores the
availability snapshots in the dashboard's local browser cache and can export a
clean `direct-connector-events.js` file as a fallback backup.

The page can save the token in an encrypted browser-local vault so a normal page
refresh keeps it available without displaying the token again. The token is not
written into any dashboard file, shared package file, or sync config. Use
**Clear saved token** when finished, and copy a fresh token when Graph Explorer
expires the old one.

## Before You Start

You need:

- Access to the GitHub Pages calendar refresh page:
  https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html
- Access to NetSuite saved search `1311451`.
- Access to Microsoft Graph Explorer:
  https://developer.microsoft.com/en-us/graph/graph-explorer
- Permission in Graph Explorer to call `calendar/getSchedule`. Microsoft lists
  `Calendars.ReadBasic` as the least-privileged delegated permission for this
  endpoint. If `Calendars.ReadBasic` is unavailable or blocked, `Calendars.Read`
  or `Calendars.ReadWrite` may also work if your tenant permits them.

## Open The Refresh Page

Open the GitHub Pages refresh page:

```text
https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html
```

## Install The NetSuite Roster Helper

The package includes a Tampermonkey userscript named
`netsuite-sc-roster-calendar-refresh.user.js`. Install it before importing the
roster:

1. Open Tampermonkey.
2. Create a new userscript.
3. Paste or import `netsuite-sc-roster-calendar-refresh.user.js`.
4. Save the script.
6. Use the Tampermonkey menu command **SC roster helper: set calendar refresh
   URL** and paste the GitHub Pages `calendar-refresh.html` URL if the helper
   is not already pointing there.

## Load The Consultant Roster

Import the current NetSuite roster before choosing consultants. The refresh page
uses this saved search data to populate SC Manager and industry filters.

1. Click **Open SC roster search**.
2. Click **Send roster to refresh** on the NetSuite saved search page.
3. If the helper is not available, copy/export the NetSuite saved search rows
   manually.
4. Paste them into **Saved Search JSON or Rows** if the helper did not populate
   the field automatically.
5. Click **Import and save roster** if the helper did not already import it.
6. In **Step 3. Refresh Via Saved Token**, click **Load full SC roster** or
   select a smaller set of emails.

## Get A Graph Explorer Token

1. Open Graph Explorer:
   https://developer.microsoft.com/en-us/graph/graph-explorer
2. Sign in with your Oracle Microsoft Office 365 account.
3. Click **API Explorer**.
4. Open **Modify permissions** or the profile menu's **Consent to permissions**.
5. Consent to `Calendars.ReadBasic` if available. If your tenant does not allow
   that scope, use the least permissive allowed calendar read scope available to
   you.
6. Open the **Access token** tab.
7. Copy the token text.

Important: Treat this token like a temporary password. Do not paste it into
chat, email, Slack, a shared document, or a committed file.

## Probe And Refresh

1. Return to the GitHub Pages `calendar-refresh.html`.
2. Paste the token into **Graph Explorer Access Token**.
3. Click **Save encrypted token**. The token field clears after save.
4. Click **Probe first 3**.

Expected success:

```text
Probe complete
3 loaded consultants
3 availability snapshots
```

After the probe succeeds:

1. Open the GitHub Pages `staffing-dashboard.html`.
2. Choose the SC manager or consultant filters you want to refresh.
3. Click **Refresh selected**.
4. Wait for the dashboard status to report **Graph refresh complete**.

The dashboard uses the saved encrypted token and writes refreshed availability
into the same local browser cache used by `calendar-refresh.html`. If the
dashboard cannot find the saved token, click **Open token refresh**, save a
fresh token, return to the dashboard, and try again.

## Notes

- The Graph Explorer token method is manual. The user must copy a fresh token
  when the old token expires.
- The saved token is stored in the user's encrypted browser-local vault; it is
  not included in the export or share package.
- Do not include anyone's real `direct-connector-events.js` in a shared package.
- If a user needs no-click scheduled refreshes, the next architecture is a
  tenant-approved Microsoft Entra delegated sign-in flow.
