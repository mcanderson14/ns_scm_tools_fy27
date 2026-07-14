# SCOUT and IQUEUE User Guide

This guide covers the day-to-day use of SCOUT and IQUEUE for managing SC Requests in NetSuite.

It is based on the local tool versions in this workspace:

| Tool | Local version referenced | Primary use |
| --- | --- | --- |
| SCOUT | 27.0.26 | Work an individual SC Request record, find qualified SCs, check calendars, and staff the request. |
| IQUEUE | 27.0.51 | Triage SCR queue search results, filter routed work, take ownership, redirect/cross-staff, and open SCRs for staffing. |

## Which Tool Should I Use?

Use IQUEUE when you are managing queue volume:

- Reviewing Requested or On Hold SCRs.
- Filtering by industry group, region, request type, GTM mapping, owner, or SLA.
- Taking ownership of requests.
- Redirecting or cross-staffing requests to another industry or manager.
- Opening the right SCR record to staff.

Use SCOUT when you are inside one SCR and ready to work the request:

- Reviewing request context.
- Finding qualified Direct, AMO, or combined SC candidates.
- Checking consultant calendars and workload.
- Staffing an SC.
- Putting an SCR on hold or cancelling it.
- Using GPT Assist to prepare a staffing recommendation prompt.

The common workflow is: use IQUEUE to find and triage the right request, click **Staff SCR**, then use SCOUT on the SCR page to find and staff the consultant.

## Prerequisites

- NetSuite access to SC Request records and SCR queue saved searches.
- Tampermonkey or an equivalent userscript manager installed and enabled.
- Pop-ups allowed for NetSuite, Outlook, ChatGPT, and the GitHub Pages dashboard if you use calendar, email, or GPT features.
- For calendar and email-adjacent features, refresh your Microsoft/Graph token when the tool shows a token warning or opens the refresh page.

## Installation Guide

Install the production scripts through Tampermonkey. The normal manager rollout should install the core scripts first, then the helper scripts that match the features the team will use.

General installation steps:

1. Install and enable Tampermonkey in Chrome or Edge.
2. Open each userscript install URL below.
3. Tampermonkey should open an install screen. Click **Install**.
4. Open the Tampermonkey dashboard and confirm the script is enabled.
5. Refresh any open NetSuite, dashboard, or calendar refresh tabs after installing or updating scripts.
6. Allow pop-ups for NetSuite, `github.io`, Outlook, and ChatGPT if the browser blocks helper tabs.

### Recommended Production Scripts

Install these for the standard SCOUT and IQUEUE experience.

| Install order | Script | Required? | Install URL | Runs on | Setup after install |
| --- | --- | --- | --- | --- | --- |
| 1 | SCOUT | Yes | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scr-staffing-helper.user.js` | NetSuite SCR record pages | Open an SCR, click **SCOUT**, open settings, and configure calendar/GPT/team options. |
| 2 | IQUEUE | Yes | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/IQUEUE/netsuite-scr-search-helper.user.js` | NetSuite SCR saved search result pages and calendar refresh page | Open Requested or On Hold queue. Use Options -> Refresh Mapping JSONs if mappings look stale. |
| 3 | SCOUT Inline Calendar Drawer | Recommended for calendar users | Preferred: use **Install drawer helper** inside SCOUT settings. Direct helper URL used by SCOUT: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js`. Local script source reviewed for this guide: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scout-calendar-inline-drawer.user.js` | NetSuite SCR pages, staffing dashboard, calendar refresh page | Enable **Inline Calendar Drawer** in SCOUT settings, then refresh the SCR page. |
| 4 | SCOUT Staffing Load Cache Bridge | Recommended for workload users | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scout-staffing-load-cache.user.js` | NetSuite, staffing dashboard, saved search pages | Open the dashboard and click **Refresh Staffing Data** to cache workload data from saved search `1324335`. |
| 5 | SCOUT Industry Skills Heat Map | Recommended for managers doing skills review | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/scout-industry-skills-heatmap.user.js` | NetSuite saved search `1326590` | Open saved search `1326590`; the heat map appears above the results. |

### Optional or Specialized Scripts

Install these only when the rollout calls for them.

| Script | Install URL | Use when | Setup notes |
| --- | --- | --- | --- |
| SCOUT GPT Staffing Fit Assistant | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/scout-gpt-staffing-fit.user.js` | You want an in-SCOUT GPT chat panel that reviews staffing fit, calendar pressure, and skills. | Use the Tampermonkey menu command **SCOUT GPT: set OpenAI API key**. Optional menu commands also set model and calendar data URL. |
| NetSuite SC Roster Calendar Refresh Launcher | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/main/netsuite-sc-roster-calendar-refresh.user.js` | You still use the local roster calendar refresh console from saved search `1311451`. | This script points to a local file path in the source. Use only if that local console exists for your machine or rollout. |
| SCOUT ZERO | `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/zero/scout-zero.user.js` | You need a stripped-down fallback that only selects and staffs an SC. | Do not run SCOUT ZERO alongside full SCOUT unless you intentionally want both panels. Disable one to avoid confusion. |
| SCOUT GPT Staffing Prompt Launcher | No production download URL in the local prototype file. | Prototype/custom GPT workflows only. | Use only if your rollout owner gives you the exact script or Custom GPT URL. |

### Scripts Not Normally Installed

Do not install these for the standard production rollout:

- `scr-staffing-helper.user.js.work`: local working copy of SCOUT.
- `scout-calendar-inline-drawer-test.user.js`: test-only drawer helper.
- Any testing-channel SCOUT script unless your rollout owner explicitly asks you to use early-adopter/testing updates.

### Verify Installation

After installing:

1. Open a NetSuite SCR record. Confirm the floating **SCOUT** button appears.
2. Open SCOUT settings. Confirm **Enable Calendar Integration**, **Enable Inline Calendar Drawer**, and the other setting toggles are visible.
3. Open the Requested SCR queue saved search. Confirm the IQUEUE portlet appears.
4. Open NetSuite saved search `1326590` if you installed the heat map. Confirm the heat map appears above the table.
5. Open the staffing dashboard from a **View Cal** button. Confirm the dashboard opens and shows refresh controls.
6. In Tampermonkey, confirm every intended script is enabled and not duplicated.

### Updating Scripts

Tampermonkey can detect updates from the `@updateURL` values in the scripts. You can also update manually:

1. Open the script install URL again.
2. Click **Update** or **Reinstall** in Tampermonkey.
3. Refresh NetSuite and dashboard tabs.
4. In SCOUT or IQUEUE, use built-in update checks when available.

If a user has both a testing script and production script enabled, disable the testing script unless they are intentionally on the testing channel.

## SCOUT Calendar Integration Setup

SCOUT calendar integration uses three pieces:

- SCOUT opens the staffing dashboard from **View Cal** buttons.
- The Inline Calendar Drawer helper lets calendar/workload details appear inside SCOUT.
- The Staffing Load Cache Bridge refreshes workload data from NetSuite saved search `1324335`.

Useful calendar URLs:

| Page | URL | Best way to open it |
| --- | --- | --- |
| SCOUT staffing dashboard | `https://mcanderson14.github.io/ns_scm_tools_fy27/SCOUT/2.0/staffing-dashboard.html` | Use **View Cal** from SCOUT so consultant, date, and filter context are included. |
| Calendar refresh page | `https://mcanderson14.github.io/ns_scm_tools_fy27/calendar-refresh.html` | Use **Open token refresh** from the dashboard or **Load Calendar Data** from the drawer. |
| Root staffing dashboard used by some helpers | `https://mcanderson14.github.io/ns_scm_tools_fy27/staffing-dashboard.html` | Use only if your rollout or helper opens this path. |

### One-Time Calendar Setup

1. Install SCOUT.
2. Install the SCOUT Inline Calendar Drawer helper.
3. Install the SCOUT Staffing Load Cache Bridge.
4. Open a NetSuite SCR and click **SCOUT**.
5. Open SCOUT settings.
6. Turn on **Enable Calendar Integration**.
7. Turn on **Enable Inline Calendar Drawer** if your rollout uses the drawer.
8. Click **Save Settings**.
9. Refresh the SCR page.

If SCOUT says the drawer helper is not active, click **Install drawer helper** from SCOUT settings, install it in Tampermonkey, then refresh the SCR page.

### Refresh Calendar Token and Calendar Data

Calendar availability depends on a saved Microsoft Graph token and local browser cache.

Use this flow when setting up a browser for the first time, when the token expires, or when SCOUT says calendar data is missing or stale:

1. From a SCOUT result card, click **View Cal**, or open the staffing dashboard from a multi-calendar button.
2. On the dashboard, click **Open token refresh**.
3. On the calendar refresh page, sign in or authorize Microsoft Graph if prompted.
4. Save the token on the refresh page.
5. Return to the staffing dashboard.
6. Click **Refresh selected via token** to load calendar data for the selected or filtered consultants.
7. Wait for the dashboard to show **Graph refresh complete**.
8. Return to the SCR page and refresh SCOUT or reopen the calendar drawer.

The dashboard refresh is scoped to the selected consultant, selected SCs, or current dashboard filter. Use exact Oracle email addresses when manually refreshing calendars; email mismatches are the most common cause of missing calendar data.

### Refresh Workload Data

Workload data is separate from Outlook calendar data.

1. Open the staffing dashboard from SCOUT.
2. Click **Refresh Staffing Data**.
3. Keep the page open while the cache rebuilds from NetSuite saved search `1324335`.
4. Wait for the dashboard to show that staffing data refreshed.

Large reports can take several minutes. The cache is local to the browser profile.

### Using the Inline Drawer

When the drawer helper is installed and enabled:

1. Run a SCOUT staffing search.
2. Click a calendar button or inline calendar action on a candidate card.
3. If the drawer says **Load Calendar Data** or **Refresh Calendar Data**, click it.
4. Use **Refresh Calendars** inside the drawer when the saved token is available and you need fresh data for the displayed consultants.
5. Use **Open selected in dashboard** when you want the full dashboard view.

The inline drawer can read calendar cache and token bridge data after you open the dashboard or calendar refresh page once in the same browser.

### Calendar Troubleshooting

| Issue | What to do |
| --- | --- |
| View Cal buttons do not appear | Turn on **Enable Calendar Integration** in SCOUT settings and refresh the SCR page. |
| SCOUT says drawer helper is not active | Install or enable the SCOUT Inline Calendar Drawer helper, then refresh the SCR page. |
| Dashboard says no saved Graph token | Click **Open token refresh**, save a fresh token, then return to the dashboard. |
| Dashboard says token expired | Open token refresh again and save a fresh token. |
| Calendar says Graph refresh needed | Click **Refresh selected via token** on the dashboard or **Refresh Calendars** in the drawer. |
| Workload is missing or stale | Click **Refresh Staffing Data** on the dashboard and keep the page open. |
| One consultant does not load | Verify the consultant's exact Oracle email in the roster/search data. |
| Data works in one browser but not another | Calendar and workload caches are local to the browser profile; repeat setup in the new browser. |

## Safety Notes

- SCOUT and IQUEUE can write to NetSuite fields when you click action buttons such as **Staff**, **Take Ownership**, **On Hold**, **Cancel**, or cross-staff routing buttons.
- Email features open Outlook or mailto drafts. They do not send messages automatically. Review and send manually.
- GPT Assist opens or copies a prompt. It does not make a staffing decision by itself.
- When SCOUT opens a record in edit mode to complete an action, let it finish saving before changing fields manually.

# SCOUT User Guide

## What SCOUT Does

SCOUT stands for SC Operations Utility Tool. It runs on NetSuite SC Request record pages and helps an SC Manager move from request review to staffing.

SCOUT can:

- Show key SCR context in a side panel.
- Search Direct staffing candidates.
- Search AMO staffing candidates.
- Search Direct and AMO candidates together when combined search is enabled.
- Match candidates by product skills, industry skills, region, location, manager/team, and availability priority.
- Open individual or grouped calendar views.
- Staff selected SCs into the SCR.
- Add staffing notes and request detail addenda.
- Put a request on hold or cancel it.
- Build an AI staffing-assist prompt for ChatGPT.

## Where SCOUT Appears

SCOUT appears on NetSuite SC Request record pages. Look for a floating **SCOUT** button on the page.

To open it:

1. Open a NetSuite SC Request record.
2. Click the **SCOUT** floating button.
3. Use the side panel to review context, search, and staff.

The panel includes:

- A header with version, settings, feedback, and close controls.
- A pinned Request Context area.
- Search tabs for staffing workflows.
- Results cards after you run a search.

## Basic SCOUT Workflow

1. Open the SCR in NetSuite.
2. Open the SCOUT side panel.
3. Review **Request Context**.
4. Choose the right staffing tab:
   - **Direct Staffing** for Direct SC staffing.
   - **AMO Staffing** for AMO requests.
   - **Combined Staffing** if you want Direct and AMO candidates in one search.
5. Select relevant products, product skills, industry, and filters.
6. Click the search button.
7. Review candidate cards and calendar availability.
8. Click **Staff** on the selected SC.
9. Confirm notes, addenda, lead SC setting, and AMO deliverable if applicable.
10. Let SCOUT update and save the SCR.

## Request Context

The pinned Request Context section gives you a fast read on the SCR before searching.

It can show:

- Customer location.
- Industry family.
- Onsite or remote/travel context.
- Lead SC warnings when another SCR on the same opportunity already has Lead SC set.
- Previous SC history, when enabled.
- Customer license lookup for AMO requests, when enabled.
- Previous SC on the same deal.
- Debug panels, when debug mode is enabled.

Use this area first. It helps avoid staffing against the wrong geography, missing a lead SC conflict, or overlooking prior account context.

## Settings

Open SCOUT settings from the gear icon in the panel header.

Common settings:

| Setting | Use it for |
| --- | --- |
| Calendar Dashboard | Shared dashboard used by **View Cal** and multi-calendar views. |
| Enable Calendar Integration | Shows or hides calendar buttons on candidate cards. |
| Enable Inline Calendar Drawer | Uses the separate inline drawer helper instead of opening only external dashboard tabs. |
| Enable GPT Assist | Shows the AI staffing assist card and prompt builder. |
| Combine Direct and AMO staffing search | Enables the **Combined Staffing** tab. |
| Enable Debug Mode | Shows diagnostic panels such as history and license debug. |
| Enable Previous SC History | Allows lazy lookup of previous SC history. |
| Enable Customer License Lookup | Allows AMO customer license lookup when relevant. |
| Slack Feedback Webhook URL | Supports Bug / Idea feedback from the panel. |
| Comment Initials | Initials used in generated notes where applicable. |
| Additional My Team Members | Adds specific people to your My Team view. |
| Additional Managers | Adds manager/team relationships to My Team filtering. |
| Additional AMO Deliverables | Adds local deliverable options for AMO staffing. |

After changing settings, click **Save Settings**.

## My Team

The **My Team** card shows team members tied to your manager relationship and any additional team members configured in settings.

Use it when:

- You want to quickly review your own team.
- You want to staff someone you already know is appropriate.
- You want to limit searches to your team.

Click **Refresh** if team data looks stale.

## Requested SC and Quick Lookup

If a requested SC is present on the SCR, SCOUT can surface that person as a candidate card.

Use **Quick SC lookup** when you already have someone in mind:

1. Type a first or last name.
2. Click search or press Enter.
3. Review the matching SC card.
4. Use **View Cal** or **Staff** from the card.

## Direct Staffing Tab

Use **Direct Staffing** for standard Direct staffing.

Primary controls:

| Control | What it does |
| --- | --- |
| Module Detection | Finds product/module signals in request details and lets you select them quickly. |
| Products Demonstrated | Selects NetSuite products to write back to the SCR when staffing. |
| Product Skills Search | Adds product skills used for candidate matching. |
| Industry | Adds an optional industry signal. |
| CPA | Adds CPA as an additional skill requirement. |
| SC Industry filter | Limits results to selected SC industry groups. |
| SC Region filter | Limits results to selected SC staffing regions. |
| Sort Priority | Controls how SCOUT weighs industry, skills, and availability. |
| Skills Match | Uses ANY or ALL logic for selected skills. |
| Limit search to My Team | Restricts results to your team configuration. |
| Limit to same state/province | Prioritizes or restricts by customer geography. |

At least one meaningful search signal is required, such as product skill, industry, or CPA.

## AMO Staffing Tab

Use **AMO Staffing** for AMO requests.

It includes the same core skill and filter controls as Direct Staffing, plus an **AMO Deliverable** selector.

AMO deliverables matter because template-backed deliverables can update request details with the right guidance. If you try to staff an AMO SC without a deliverable, SCOUT shows a warning so you can either select one or continue intentionally.

## Combined Staffing Tab

Use **Combined Staffing** when you want one search across Direct and AMO candidates.

This tab is available only when **Combine Direct and AMO staffing search** is enabled in settings.

Important behavior:

- One search uses shared filters across Direct and AMO candidates.
- AMO candidate cards still depend on the AMO deliverable selector when staffing.
- SCOUT merges results and ranks each person by the best available match.

## Search Results

Each candidate card can show:

- Consultant name and roster link.
- Manager.
- Vertical, tier, region, and location badges.
- Skill tags.
- Industry rating tag.
- Rank percentage and match bar.
- **View Cal** button, when calendar integration is enabled.
- **Staff** button.
- Multi-calendar checkbox.

Industry and skill ratings generally read as:

| Rating | Meaning |
| --- | --- |
| SME | Strongest match. |
| Experienced | Solid match. |
| Ramping | Developing experience. |
| No Experience | No mapped experience. |

Use rank as a signal, not as the entire decision. Calendar fit, customer context, region, industry nuance, and workload still matter.

## Calendar Views

When calendar integration is enabled, result cards include **View Cal**.

Calendar behavior:

- **View Cal** opens the staffing dashboard for one consultant.
- Selecting multiple result checkboxes lets you open calendars for several consultants together.
- **View All Calendars** opens one combined dashboard view for visible results.
- The dashboard date uses the anticipated customer meeting date first, then Date Needed if no meeting date exists.

If the inline drawer helper is installed and enabled, calendar context can appear inline from SCOUT cards. If it is missing, SCOUT may show a warning and offer the helper install link.

## GPT Assist

When enabled, GPT Assist appears as an AI staffing assist card.

Use it to build a structured staffing recommendation prompt:

1. Open **Ask AI Agent**.
2. Confirm industry, sub-industry, customer location, staffing region, skills, product skills, date needed, and request details.
3. Review the generated prompt.
4. Copy the prompt or open ChatGPT.
5. Use the prompt with the required source-of-truth tools and data.

GPT Assist is a prompt builder. It does not automatically staff anyone, update NetSuite, send Slack messages, or book calendar time.

## Staffing an SC

Click **Staff** on the candidate card you want to assign.

For Direct staffing, SCOUT can:

- Set the request status to staffed.
- Assign the selected SC.
- Set Lead SC according to the dialog toggle.
- Add a SCOUT hashtag.
- Add request detail notes such as who was staffed and by which manager.
- Add optional request detail addenda.
- Set manager notes and staffing popup notes.
- Add engagement notes template text.
- Sync selected products to the SCR.

For AMO staffing, SCOUT also handles the selected AMO deliverable and any associated template text.

If the record is not already in edit mode, SCOUT can open edit mode, apply the pending action, and save. If a date field is active, auto-save may pause so you can finish the date entry cleanly.

## Lead SC Warnings

If another active SCR on the same opportunity already has Lead SC set, SCOUT shows a warning in Request Context.

Before staffing:

- Check whether this SCR should be the lead.
- Review the **Assign as Lead SC** toggle in the staffing dialog.
- Avoid unintentionally creating multiple lead SCs for the same opportunity.

## On Hold

Use **On Hold** from the Request Context area when the request should pause instead of being staffed.

SCOUT can:

- Set the SCR status to On Hold.
- Assign the request to the current user.
- Add a SCOUT hashtag.
- Prompt for SCM staffing notes.
- Open edit mode and save if needed.

## Cancel

Use **Cancel** when the SCR should be cancelled.

SCOUT can:

- Set the request to a cancelled status.
- Clear or adjust lead staffing state as needed by the workflow.
- Prepend cancellation notes.
- Add a SCOUT hashtag.
- Prompt for notes.
- Open edit mode and save if needed.

Use cancellation carefully because it changes the request lifecycle.

## Previous SC History

If enabled, Previous SC History is lazy loaded. NetSuite is not queried until you open or click the history panel.

Use it to check:

- Who has previously worked with the account.
- Whether the same opportunity already has relevant SC history.
- Whether a previously engaged SC should be considered again.

If results look blank, confirm the setting is enabled and check debug mode if needed.

## Customer License Lookup

Customer License Lookup is most relevant for AMO requests.

If enabled, SCOUT can look up license context lazily when the panel is opened. Use it to understand customer footprint before staffing AMO work.

## Industry Skills Heat Map

The optional SCOUT Industry Skills Heat Map runs from the industry skills saved search and helps managers review coverage.

Use it for:

- Reviewing SC strength by industry family and subgroup.
- Finding coverage gaps.
- Preparing one-on-one coaching notes.
- Exporting industry skill views to CSV.

Rating scale:

| Rating | Meaning |
| --- | --- |
| 0 | No Knowledge |
| 1 | Familiar |
| 2 | Working |
| 3 | Strong |

## SCOUT Troubleshooting

| Issue | What to check |
| --- | --- |
| SCOUT button does not appear | Confirm Tampermonkey is enabled, the SCOUT script is installed, and you are on a NetSuite SCR record page. Refresh the page. |
| Search returns no results | Add at least one product skill, industry, or additional skill. Loosen filters. Try ANY instead of ALL. |
| View Cal is missing | Enable Calendar Integration in settings and confirm the consultant has usable calendar identity data. |
| Inline calendar does not open | Install and enable the SCOUT Inline Calendar Drawer helper. |
| AMO staffing warns about deliverable | Select an AMO deliverable or intentionally continue without one. |
| My Team looks incomplete | Add team members or managers in settings, then refresh My Team. |
| Products are not written to the SCR | Confirm Products Demonstrated selections and let SCOUT complete the edit/save cycle. |
| Auto-save pauses | Finish the active date field or manual edit, then save. |
| History or license lookup is blank | Confirm the feature is enabled, open the panel to trigger lazy load, and use debug mode if needed. |

# IQUEUE User Guide

## What IQUEUE Does

IQUEUE adds an SCR queue portlet to NetSuite SCR queue saved searches. It is designed for queue triage and request routing.

IQUEUE can:

- Show Requested and On Hold SCR queues.
- Filter queue rows by routing, geography, request type, GTM mapping, ownership, and returned field text.
- Highlight SLA-aged work.
- Show SCR cards with assignment, opportunity, company, and request details.
- Take SCM ownership.
- Save staffing notes.
- Email sales for more information.
- Redirect requests back to sales.
- Cross-staff requests to another industry family or manager.
- Open SCRs for staffing in NetSuite.

## Where IQUEUE Appears

IQUEUE runs on NetSuite SCR saved search result pages.

Primary queue links referenced by the local script:

| Queue | Saved search ID |
| --- | --- |
| Requested / Active Queue | 1303392 |
| On Hold | 1317304 |

When the saved search results page loads, IQUEUE adds a queue portlet with filters, queue controls, and request cards.

## Basic IQUEUE Workflow

1. Open the Requested or On Hold SCR queue.
2. Wait for IQUEUE to load the portlet.
3. Choose **Requested** or **On Hold** from the queue navigation buttons.
4. Apply filters from left to right.
5. Review the oldest or highest-priority cards first.
6. Use card actions such as **Staff SCR**, **Take Ownership**, notes, email, or cross-staff routing.
7. Open the SCR and complete staffing in SCOUT when appropriate.

IQUEUE sorts normal results oldest submitted first. SLA Hotlist prioritizes rows past SLA before normal age sorting.

## Header Controls

The IQUEUE header includes:

| Control | Use |
| --- | --- |
| Requested | Opens or switches to the active Requested queue. |
| On Hold | Opens or switches to the On Hold queue. |
| Gear / Options | Opens options, mapping status, mapping explorer, refresh, and update controls. |
| Maximize / Restore | Expands or restores the portlet view. |
| Refresh | Refreshes the full NetSuite page. |

## Options Panel

Open the gear icon for:

- Show or hide Enterprise / Tiger Opps.
- Mapping JSON status.
- Mapping JSON Explorer.
- Refresh Mapping JSONs.
- Check for IQUEUE updates.

Use this panel when routing looks wrong, mapping data seems stale, or you want to verify which mapping rule is being applied.

## Filters

Best practice: apply filters from left to right. Start broad, then narrow.

Common filters:

| Filter | Use it for |
| --- | --- |
| SC Industry Group | Queue ownership by industry group. |
| SC Staffing Region | Staffing region overrides and routing. |
| Request Type | Direct, AMO, Technology COE, AI Innovation, and other routed request types. |
| FY27 GTM Industry | GTM-based industry mapping. |
| FY27 GTM Industry Subgroup | More specific GTM mapping. |
| Sales Region | Sales geography filtering. |
| Sales Vertical | Vertical filtering. |
| Regional Director | People-based queue filtering. |
| Regional VP | People-based queue filtering. |
| Industry Leader / AVP | People-based queue filtering. |
| Assigned to me | Rows assigned to you in NetSuite or explicit SCM ownership. |
| Review unmapped | Finds rows that need mapping review. |
| SLA Hotlist | Shows rows past SLA first. |
| Search Returned Fields | Searches within returned row fields. |

The best starting filters are usually:

- SC Industry Group.
- SC Staffing Region.
- Request Type.
- FY27 GTM Industry and Subgroup.
- Search Returned Fields.

## SCM Owner Logic

Some users have Products SCM owner controls. These controls are useful when you need to combine normal queue filters with ownership.

| Owner logic | Meaning |
| --- | --- |
| OR | Show rows matching the queue filters plus rows owned by the selected SCM owner. |
| AND | Show only rows matching the queue filters and the selected SCM owner. |

Common examples:

| Goal | Recommended settings |
| --- | --- |
| Only your owned SCRs | Owner logic = AND, SCM Owner = Me, no other filters. |
| Products South plus anything owned by you | Owner logic = OR, SC Industry Group = Products, Region = South, SCM Owner = Me. |
| Your exact filtered slice | Owner logic = AND, select your queue filters, SCM Owner = Me. |

The **Hide outside my groups** owner scope hides cards outside your mapped SCM groups. If owned cards disappear unexpectedly, check this setting.

## Reading an IQUEUE Card

Each card represents one SCR returned by the saved search.

Card header:

- SCR number or prefix.
- Opportunity.
- Company.
- Badges such as redirected, AI request, GTM subgroup, Enterprise/Tiger, or SLA passed.
- **Copy link** action.
- **Staff SCR** action.

Industry and assignment section:

- Request Type.
- SC Industry Group.
- FY27 GTM Industry.
- FY27 GTM Industry Subgroup.
- Sales Region.
- SC Staffing Region.
- SCM Owner.
- Assigned To.
- Cross-Vertical status.

SC request details:

- Submitted date.
- SCR age.
- Date Needed.
- Travel.
- Deliverable.
- Request Details.

Opportunity section:

- Opportunity record.
- Expected close date.
- Projected ARR and ACV.
- Sales rep.
- Regional Director.
- Regional VP.
- Industry Leader / AVP.
- Sales tier.
- Sales region and vertical.

Company section:

- Company name.
- Website.
- LinkedIn.
- Company size.
- Annual revenue.
- Billing city and state.
- ZIP code.
- Prospect region.
- Lead source.
- Lead fit.
- Alliance.

Staffing notes section:

- Cross-industry staffing controls.
- SCM staffing notes editor.
- Email and redirect actions where available.

## Card Actions

### Staff SCR

Click **Staff SCR** to open the SCR record in NetSuite. Use SCOUT from there to search and staff the consultant.

### Copy Link

Copies a clean SCR link for sharing or follow-up.

### Take Ownership

Use **Take Ownership** when you are taking responsibility for the request.

IQUEUE can:

- Add an explicit SCM owner hashtag.
- Add an ownership note if staffing notes are blank.
- Save the updated note and ownership tag.

### Save Staffing Notes

Use the staffing notes editor to record queue triage, ownership, sales follow-up, or routing context.

Click **Save notes** after editing.

### Email Sales

Use **Email Sales** when more information is needed from the sales team.

IQUEUE attempts to resolve the Sales Rep and Regional Director, then opens an Outlook or mailto draft. Review and send manually.

### Redirect to Sales

Use **Redirect to sales** when the request should go back to sales for cleanup or additional detail.

IQUEUE can:

- Prompt for required message body.
- Add a redirect-related hashtag.
- Assign the SCR back to the Sales Rep where possible.
- Open the SCR.
- Open an email draft to the Sales Rep with Regional Director copied where available.

Review the NetSuite changes and email draft before sending.

## Cross-Industry Staffing

Cross-industry staffing is used when an SCR belongs with another industry family or specialized team.

Common targets include:

- Products.
- Construction.
- EPM.
- Tech COE.
- SCAI.
- Health and Hospitality.

When you select a target, IQUEUE opens a routing modal.

Required fields typically include:

- Why the request is being redirected.
- Additional information for the receiving team.

Optional fields may include:

- Specific SC requested.
- Email notification draft for the receiving SC Manager.

You can route to an industry queue or to a specific SC Manager when available.

Routing can:

- Save a redirect note to staffing notes.
- Save route tags to hashtags.
- Try to set the Cross-Vertical flag.
- Open an email notification draft.

Special routing notes:

- Tech COE routing expects Request Type = Technology COE.
- SCAI routing expects Request Type = AI Innovation.
- AI Innovation stays in normal SC Industry routing until redirected to SCAI.
- Request Type routing wins for special teams such as Tech COE.

## Mapping Explorer

Use Mapping Explorer from the Options panel when you need to understand routing.

Available mapping views can include:

- GTM to SC Industry.
- Region Mapping.
- SCM Relationships.
- Products Territories.
- Authorized Managers.

Use **Refresh Mapping JSONs** if mappings look stale.

## Useful IQUEUE Recipes

| Task | How to do it |
| --- | --- |
| Daily queue triage | Open Requested, choose SC Industry Group and SC Staffing Region, review oldest submitted first. |
| My owned SCRs | Owner logic = AND, SCM Owner = Me, clear other filters. |
| Normal queue plus owned redirects | Apply normal filters, Owner logic = OR, SCM Owner = Me. |
| Review one queue slice | Select SC Industry Group, Region, and Request Type. |
| Aging work | Enable SLA Hotlist and review past-SLA cards first. |
| Unmapped review | Enable Review unmapped. |
| Hide unrelated groups | Use Hide outside my groups. |
| Check a specific SCM queue | Select SCM Owner or View SCM queue if available. |
| Investigate routing | Open Mapping Explorer and compare GTM, region, owner, and request type mappings. |

## IQUEUE Troubleshooting

| Issue | What to check |
| --- | --- |
| Too many cards appear | Check Owner logic. OR intentionally expands results. Use AND to narrow. |
| Owned cards are missing | Check SCM Owner = Me and Hide outside my groups. |
| Routing looks wrong | Open Mapping Explorer, refresh mappings, and check Request Type routing. |
| Products SCM controls are missing | You may not be in the authorized managers mapping or on the expected queue/search. |
| Email draft does not open | Allow pop-ups and confirm Outlook/mailto handling in the browser. |
| Cross-staff target is rejected | Confirm Request Type requirements, especially Tech COE and SCAI. |
| SLA Hotlist order looks different | SLA Hotlist puts past-SLA rows first, then sorts by age. |
| Mapping status is stale | Use Refresh Mapping JSONs from Options. |
| Update appears available | Use Check for IQUEUE Update, then refresh NetSuite after updating the userscript. |

# Recommended Daily Operating Rhythm

1. Start in IQUEUE Requested.
2. Filter to your queue or ownership scope.
3. Review SLA Hotlist and oldest submitted requests.
4. Take ownership when you are actively working an SCR.
5. Use cross-staff or redirect actions when the request belongs elsewhere.
6. Click **Staff SCR** for the request you are ready to staff.
7. In SCOUT, review Request Context.
8. Search Direct, AMO, or Combined candidates.
9. Check calendars and workload.
10. Staff the chosen SC and confirm the SCR saves cleanly.

# Quick Reference

## SCOUT Quick Reference

| Need | Action |
| --- | --- |
| Find Direct SC | Open Direct Staffing, choose product skills/industry, search. |
| Find AMO SC | Open AMO Staffing, choose deliverable and skills, search. |
| Search Direct and AMO together | Enable Combined Staffing in settings, then use Combined Staffing tab. |
| Check availability | Use View Cal or multi-select calendars. |
| Staff someone | Click Staff on the candidate card and complete the dialog. |
| Put request on hold | Use On Hold in Request Context. |
| Cancel request | Use Cancel in Request Context. |
| Build AI staffing prompt | Enable GPT Assist, then use Ask AI Agent. |
| Add team members | Settings -> Additional My Team Members or Additional Managers. |

## IQUEUE Quick Reference

| Need | Action |
| --- | --- |
| Work active queue | Open Requested queue. |
| Work paused requests | Open On Hold queue. |
| Filter queue | Use industry, region, request type, GTM, people, and returned-field filters. |
| Find owned work | Owner logic = AND, SCM Owner = Me. |
| Include owned work with normal queue | Owner logic = OR, SCM Owner = Me. |
| Review aging work | Enable SLA Hotlist. |
| Find mapping issues | Enable Review unmapped or open Mapping Explorer. |
| Take responsibility | Click Take Ownership. |
| Open request to staff | Click Staff SCR, then use SCOUT. |
| Cross-staff | Use target routing buttons in the Staffing Notes section. |
| Ask sales for more info | Use Email Sales or Redirect to sales. |
