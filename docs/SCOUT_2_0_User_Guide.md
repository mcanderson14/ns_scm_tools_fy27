# SCOUT 2.0 User Guide

This guide covers SCOUT 2.0 setup and day-to-day use for NetSuite SC Request staffing.

SCOUT 2.0 includes:

| Component | Local version referenced | What it does |
| --- | --- | --- |
| SCOUT main userscript | 27.0.26 | Adds the SCOUT side panel to NetSuite SCR record pages. |
| SCOUT 2.0 staffing dashboard | 27.0.50 | Shows consultant calendar, workload, availability, and recommendation context. |
| SCOUT Inline Calendar Drawer | 27.0.1 | Adds inline calendar/workload cards to SCOUT result cards. |
| SCOUT Staffing Load Cache Bridge | 27.0.8 | Refreshes dashboard workload data from NetSuite saved search `1324335`. |

## What SCOUT 2.0 Is For

Use SCOUT 2.0 when you are inside one SC Request and need to:

- Review the request context.
- Find qualified Direct, AMO, or combined staffing candidates.
- Check consultant calendars and workload.
- Compare candidates using skills, industry, region, location, and availability signals.
- Staff the selected SC into the SCR.
- Put an SCR on hold or cancel it.
- Build a GPT staffing prompt when GPT Assist is enabled.

SCOUT 2.0 is not the queue triage tool. Use IQUEUE for queue filtering, ownership, and routing. Use SCOUT 2.0 after opening the SCR you are ready to work.

## Required Access

- NetSuite access to SC Request records.
- NetSuite access to SC roster, product skills, industry skills, and workload saved-search data.
- Tampermonkey or a compatible userscript manager in Chrome or Edge.
- Browser pop-ups allowed for NetSuite, GitHub Pages, Outlook, and ChatGPT if those workflows are used.
- Microsoft Graph token refresh access for calendar availability.

## Install SCOUT 2.0

Install the production scripts in this order.

| Order | Script | Required? | Install URL | After install |
| --- | --- | --- | --- | --- |
| 1 | SCOUT | Yes | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scr-staffing-helper.user.js` | Open an SCR and confirm the floating **SCOUT** button appears. |
| 2 | SCOUT Inline Calendar Drawer | Recommended | Preferred: click **Install drawer helper** inside SCOUT settings. Direct SCOUT 2.0 helper URL: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js` | Enable **Inline Calendar Drawer** in SCOUT settings and refresh the SCR page. |
| 3 | SCOUT Staffing Load Cache Bridge | Recommended | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scout-staffing-load-cache.user.js` | Open the staffing dashboard and click **Refresh Staffing Data**. |
| 4 | SCOUT Industry Skills Heat Map | Optional manager review tool | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/scout-industry-skills-heatmap.user.js` | Open NetSuite saved search `1326590` to review industry skills coverage. |
| 5 | SCOUT GPT Staffing Fit Assistant | Optional GPT chat panel | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/scout-gpt-staffing-fit.user.js` | Set the OpenAI API key from the Tampermonkey menu command before use. |

Do not install these for normal SCOUT 2.0 production use:

- `scr-staffing-helper.user.js.work`: local working copy.
- `scout-calendar-inline-drawer-test.user.js`: test-only drawer helper.
- `SCOUT ZERO`: fallback/minimal staffing tool. Disable it if full SCOUT is installed, unless the rollout owner asks for both.
- Testing-channel SCOUT scripts, unless the rollout owner asks you to use early-adopter updates.

## SCOUT 2.0 URLs

| Page or script | URL |
| --- | --- |
| SCOUT install | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scr-staffing-helper.user.js` |
| SCOUT 2.0 dashboard | `https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/staffing-dashboard.html` |
| Calendar refresh page | `https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html` |
| SCOUT 2.0 drawer helper | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js` |
| Staffing load cache bridge | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scout-staffing-load-cache.user.js` |

Best practice: open the dashboard from SCOUT **View Cal** buttons instead of opening the URL manually. SCOUT passes consultant, date, and filter context in the dashboard URL.

## First-Time Setup

1. Install SCOUT.
2. Open a NetSuite SCR record.
3. Click the floating **SCOUT** button.
4. Open the settings gear.
5. Turn on the features needed for your rollout.
6. Click **Save Settings**.
7. Refresh the SCR page.

Recommended baseline settings:

| Setting | Recommendation | Why |
| --- | --- | --- |
| Enable Calendar Integration | On | Shows **View Cal** buttons on candidate cards. |
| Enable Inline Calendar Drawer | On if the drawer helper is installed | Shows inline workload/calendar cards without leaving the SCR. |
| Enable GPT Assist | On if managers use the prompt builder | Shows **Ask AI Agent**. |
| Combine Direct and AMO staffing search | On if managers need one search across both pools | Adds the **Combined Staffing** tab. |
| Enable Previous SC History | Optional | Adds lazy-loaded previous SC history. |
| Enable Customer License Lookup | Optional, mostly AMO | Adds lazy-loaded AMO customer license context. |
| Enable Debug Mode | Off by default | Turn on only when troubleshooting parsing/history/license issues. |
| Comment Initials | Optional | Overrides initials used in generated staffing comments. |
| Additional My Team Members | Optional | Adds dotted-line support or backup coverage to My Team. |
| Additional Managers | Optional | Adds extra manager/team relationships for My Team filtering. |
| Additional AMO Deliverables | Optional | Adds local AMO deliverable options. |
| Slack Feedback Webhook URL | Optional | Enables one-click **Bug / Idea** workflow if configured. |

## Calendar Setup

SCOUT 2.0 calendar integration has three layers:

- SCOUT opens the staffing dashboard from candidate cards.
- The dashboard refreshes Outlook calendar data with a saved Microsoft Graph token.
- The inline drawer and dashboard read locally cached calendar and workload data.

### One-Time Calendar Setup

1. Install the SCOUT Inline Calendar Drawer helper.
2. Install the SCOUT Staffing Load Cache Bridge.
3. Open an SCR and open SCOUT settings.
4. Turn on **Enable Calendar Integration**.
5. Turn on **Enable Inline Calendar Drawer**.
6. Save settings and refresh the SCR page.
7. Run a SCOUT search and click **View Cal** for a candidate.
8. On the dashboard, click **Open token refresh**.
9. Sign in or authorize Microsoft Graph if prompted.
10. Save the token on the refresh page.
11. Return to the dashboard and click **Refresh selected via token**.
12. Wait for **Graph refresh complete**.

Calendar data is local to the browser profile. Repeat setup if you switch browsers, profiles, or machines.

### Refresh Workload Data

Workload data is separate from Outlook calendar data.

1. Open the SCOUT 2.0 staffing dashboard.
2. Click **Refresh Staffing Data**.
3. Keep the page open while the bridge rebuilds the cache from NetSuite saved search `1324335`.
4. Wait for the dashboard to report that staffing data refreshed.

Large NetSuite reports can take several minutes.

### Refresh Calendar Data Later

Use this when the dashboard says the token expired, calendar data is missing, or a consultant shows **Graph refresh needed**:

1. Click **Open token refresh**.
2. Save a fresh Graph token.
3. Return to the dashboard.
4. Click **Refresh selected via token**.
5. Reopen or refresh the inline drawer in SCOUT.

Use exact Oracle email addresses when manually refreshing calendar data. Email mismatch is the most common cause of missing calendar data.

## Basic Staffing Workflow

1. Open the SCR in NetSuite.
2. Click **SCOUT**.
3. Review **Request Context**.
4. Choose **Direct Staffing**, **AMO Staffing**, or **Combined Staffing**.
5. Select product skills, industry, and optional filters.
6. Click the tab's search button.
7. Review candidate cards.
8. Use **View Cal** or the inline drawer to inspect calendar and workload.
9. Click **Staff** on the selected SC.
10. Complete the staffing dialog.
11. Let SCOUT update and save the SCR.

## Request Context

Review the pinned Request Context area before searching.

It can show:

- Customer location.
- Industry family.
- Onsite or remote/travel signal.
- Lead SC warning when another SCR on the same opportunity already has Lead SC set.
- Previous SC history, when enabled.
- Customer license lookup for AMO requests, when enabled.
- Previous SC on the same deal.
- Debug panels when debug mode is enabled.

## Direct Staffing

Use **Direct Staffing** for standard Direct SC staffing.

Core controls:

| Control | Use |
| --- | --- |
| Module Detection | Finds module/product signals in request details. |
| Products Demonstrated | Selects NetSuite products to write back when staffing. |
| Product Skills Search | Adds product skill requirements for candidate matching. |
| Industry | Adds optional industry skill context. |
| CPA | Adds CPA as an additional skill signal. |
| SC Industry filter | Limits candidates by SC industry group. |
| SC Region filter | Limits candidates by staffing region. |
| Sort Priority | Changes ranking weight across industry, skills, and availability. |
| Skills Match | Uses ANY or ALL logic for selected product skills. |
| Limit search to My Team | Restricts results to configured team members. |
| Limit to same state/province | Narrows or prioritizes customer geography. |

At least one meaningful search signal is required, such as product skill, industry, or CPA.

## AMO Staffing

Use **AMO Staffing** for AMO requests.

AMO has the same core search controls as Direct Staffing plus **AMO Deliverable**.

When staffing AMO:

- Select the AMO deliverable before staffing whenever possible.
- Template-backed deliverables can update request details with the correct guidance.
- If the deliverable is blank, SCOUT shows a warning before continuing.

## Combined Staffing

Use **Combined Staffing** when you want one search across Direct and AMO candidates.

To enable it:

1. Open SCOUT settings.
2. Turn on **Combine Direct and AMO staffing search**.
3. Save settings.
4. Refresh the SCR page.

Combined search uses one set of filters across both groups. AMO cards still use the AMO deliverable selector when staffing an AMO SC.

## Candidate Cards

Candidate cards can show:

- Consultant name and roster link.
- Manager.
- Direct/AMO indicator.
- Vertical, tier, region, and location badges.
- Product skill and industry rating tags.
- Ranking percentage and match bar.
- **View Cal** button.
- **Staff** button.
- Multi-calendar checkbox.

Use the ranking as a decision signal, not the entire decision. Calendar fit, workload, account context, geography, and manager judgment still matter.

## Calendar Dashboard

The SCOUT 2.0 dashboard opens from **View Cal**, **View All Calendars**, or multi-select calendar buttons.

Dashboard header controls:

| Control | Use |
| --- | --- |
| Refresh Staffing Data | Refresh workload data from NetSuite saved search `1324335`. |
| Refresh selected via token | Refresh Outlook calendar data for the selected consultant or current dashboard scope. |
| Open token refresh | Open the calendar refresh page to save a Microsoft Graph token. |

Dashboard views can include:

- Staffing recommendation context.
- Candidate availability cards.
- Calendar load bars.
- Mini calendar strips.
- Protected-window conflicts.
- Availability table.
- Alternate slots.
- Weekly availability.
- Workload/load details.

If calendar data is not loaded for a consultant, refresh via token before treating the person as available.

## Inline Calendar Drawer

When enabled, the inline drawer keeps calendar review inside SCOUT.

Use it to:

- Review a candidate's calendar and workload without leaving the SCR.
- Refresh calendars for displayed consultants.
- Open selected consultants in the full dashboard.
- See stale or missing calendar data prompts.

If SCOUT shows **Load Calendar Data** or **Refresh Calendar Data**, follow the prompt. If the drawer says no saved Graph token is available, open the calendar refresh page once after saving a token so the drawer can bridge it back to NetSuite.

## Staffing an SC

Click **Staff** on the selected candidate card.

For Direct staffing, SCOUT can:

- Set the request status to staffed.
- Assign the selected SC.
- Set Lead SC based on the dialog toggle.
- Add a SCOUT hashtag.
- Add generated request detail notes.
- Add optional request detail addendum.
- Set manager and staffing notes.
- Add engagement notes template text.
- Sync selected products to the SCR.

For AMO staffing, SCOUT also syncs the AMO deliverable and any deliverable template text.

If the SCR is not already in edit mode, SCOUT can open edit mode, apply the pending action, and save. If a date field is active, auto-save may pause so you can finish the date entry.

## On Hold and Cancel

Use **On Hold** from Request Context when the SCR should pause.

SCOUT can:

- Set the SCR status to On Hold.
- Assign the request to the current user.
- Add a SCOUT hashtag.
- Prompt for SCM staffing notes.
- Open edit mode and save if needed.

Use **Cancel** when the SCR should be cancelled.

SCOUT can:

- Set the request to a cancelled status.
- Adjust lead staffing state according to the workflow.
- Prepend cancellation notes.
- Add a SCOUT hashtag.
- Prompt for notes.
- Open edit mode and save if needed.

## GPT Assist

SCOUT's built-in GPT Assist is a prompt builder.

To use it:

1. Enable **GPT Assist** in settings.
2. Click **Ask AI Agent**.
3. Review and edit the staffing context.
4. Copy the generated prompt or open ChatGPT.
5. Use the prompt with the required source-of-truth data.

GPT Assist does not staff anyone, update NetSuite, send Slack messages, or book calendar time by itself.

The optional **SCOUT GPT Staffing Fit Assistant** is a separate userscript. It requires an OpenAI API key configured from the Tampermonkey menu.

## Previous SC History and Customer License

These panels are optional and lazy loaded.

- Previous SC History is not queried until the panel is opened.
- Customer License Lookup is mostly useful for AMO and is not queried until opened.
- Turn on Debug Mode only when you need to troubleshoot parsing or lookup behavior.

## Recommended Daily Rhythm

1. Use IQUEUE or a saved search to choose the SCR.
2. Open the SCR and launch SCOUT.
3. Review Request Context, especially lead warning and travel/location.
4. Choose Direct, AMO, or Combined Staffing.
5. Search with product skills, industry, and region filters.
6. Check calendar and workload using the dashboard or inline drawer.
7. Staff the best-fit SC.
8. Confirm the SCR saved cleanly.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| SCOUT button does not appear | Confirm Tampermonkey is enabled, SCOUT is installed, and you are on a NetSuite SCR record page. Refresh the page. |
| View Cal buttons are missing | Enable **Calendar Integration** in settings and refresh the SCR page. |
| Inline drawer warning appears | Install or enable the SCOUT 2.0 drawer helper, then refresh. |
| Dashboard says no saved Graph token | Click **Open token refresh**, save a token, then return to the dashboard. |
| Dashboard says token expired | Save a fresh token from the calendar refresh page. |
| Calendar says Graph refresh needed | Click **Refresh selected via token** or **Refresh Calendars** in the drawer. |
| Workload data is stale or missing | Click **Refresh Staffing Data** and keep the dashboard open until it completes. |
| One consultant's calendar does not load | Verify the consultant's exact Oracle email. |
| Search returns no results | Add product skill, industry, or CPA. Loosen filters. Try ANY instead of ALL. |
| Combined tab is missing | Enable **Combine Direct and AMO staffing search** in settings and refresh. |
| AMO staffing warns about deliverable | Select an AMO deliverable or intentionally continue without one. |
| My Team is incomplete | Add team members or managers in settings, save, and refresh. |
| Auto-save pauses | Finish the active date field or manual edit, then save. |
| Debug information is missing | Enable Debug Mode, reproduce the issue, then review History Debug or License Debug. |

## Quick Reference

| Need | Action |
| --- | --- |
| Install SCOUT 2.0 | Install SCOUT, drawer helper, and staffing load bridge. |
| Enable calendars | Settings -> Enable Calendar Integration. |
| Enable inline calendar | Settings -> Enable Inline Calendar Drawer. |
| Refresh calendar token | Dashboard -> Open token refresh. |
| Refresh selected calendars | Dashboard -> Refresh selected via token. |
| Refresh workload | Dashboard -> Refresh Staffing Data. |
| Search Direct SCs | Direct Staffing tab -> select skills/industry -> Search Skills. |
| Search AMO SCs | AMO Staffing tab -> select deliverable and skills -> Search AMO SCs. |
| Search both groups | Enable Combined Staffing -> Combined Staffing tab -> Search Combined SCs. |
| Staff an SC | Candidate card -> Staff -> complete dialog. |
| Put request on hold | Request Context -> On Hold. |
| Cancel request | Request Context -> Cancel. |
| Build GPT prompt | Enable GPT Assist -> Ask AI Agent. |

