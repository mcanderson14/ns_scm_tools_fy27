# SCOUT Quick Start

One-page daily workflow for staffing one SCR in SCOUT 2.0.

## Purpose

Use SCOUT when you are inside a NetSuite SC Request and need to staff it.

- Review request context.
- Search Direct, AMO, or Combined candidate pools.
- Check calendar and workload.
- Staff the best-fit SC.
- Put the request on hold or cancel it when appropriate.

## Preflight

| Need | Check |
| --- | --- |
| Browser | Tampermonkey enabled in Chrome or Edge. |
| Script | SCOUT userscript `27.2.0+` installed: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scr-staffing-helper.user.js` |
| Optional drawer | Install the SCOUT 2.0 drawer helper from SCOUT settings or `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/2.0/scout-calendar-inline-drawer.user.js` |
| Optional workload | Install Staffing Load Cache Bridge: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/SCOUT/scout-staffing-load-cache.user.js` |
| Settings | Enable Calendar Integration before using **View Cal**. |

## Daily Workflow

1. Open the SCR in NetSuite.
2. Click the floating **SCOUT** button.
3. Review **Request Context**: customer, location, travel, lead warning, and history.
4. Choose **Direct Staffing**, **AMO Staffing**, or **Combined Staffing**.
5. Select product skills, industry, and optional filters.
6. Click the search button for the tab.
7. Review candidate cards and ranking signals.
8. Click **View Cal** or open the inline drawer to check calendar and workload.
9. Click **Staff** on the selected SC.
10. Complete notes, addendum, Lead SC setting, and AMO deliverable if needed.
11. Let SCOUT update and save the SCR.

## Must-Know Settings

| Setting | Use |
| --- | --- |
| Enable Calendar Integration | Shows **View Cal** buttons. |
| Enable Inline Calendar Drawer | Shows inline calendar/workload cards inside SCOUT. |
| Combine Direct and AMO staffing search | Adds the **Combined Staffing** tab. |
| Enable GPT Assist | Shows **Ask AI Agent** prompt builder. |
| Additional My Team Members | Adds dotted-line or backup team members. |
| Additional Managers | Adds extra manager/team relationships. |
| Enable Debug Mode | Use only for troubleshooting. |

## Calendar Flow

| Need | Action |
| --- | --- |
| Open dashboard | Candidate card -> **View Cal**. |
| Save token | Dashboard -> **Open token refresh**. |
| Refresh calendar | Dashboard -> **Refresh selected via token**. |
| Refresh workload | Dashboard -> **Refresh Staffing Data**. |
| Use drawer | Enable Inline Calendar Drawer, then open calendar from a candidate card. |

Calendar and workload caches are local to the browser profile. Repeat setup when switching browsers or machines.

## Search Tips

| Need | Action |
| --- | --- |
| Standard staffing | Use Direct Staffing. |
| AMO request | Use AMO Staffing and select AMO Deliverable before staffing. |
| Compare Direct and AMO | Enable and use Combined Staffing. |
| Search by product skill | Use Product Skills Search and select up to 4 skills. |
| Search by industry | Select Industry or SC Industry filters. |
| Search your team | Enable Limit search to My Team. |
| Loosen results | Try Skills Match = ANY and remove narrow filters. |

## Troubleshooting

| Issue | Fix |
| --- | --- |
| No SCOUT button | Confirm Tampermonkey is enabled and you are on an SCR record page. |
| No results | Add product skill, industry, or CPA. Loosen filters. |
| No View Cal | Enable Calendar Integration and refresh the SCR page. |
| Drawer inactive | Install or enable the SCOUT 2.0 drawer helper. |
| Stale workload | Click **Refresh Staffing Data** and keep dashboard open. |
| Calendar missing | Open token refresh, save token, then refresh selected via token. |
| AMO deliverable warning | Select deliverable or intentionally continue without one. |
| Auto-save pauses | Finish active date/manual field, then save. |

## Best Habit

Use SCOUT to make the staffing decision, then confirm the SCR saved cleanly before leaving the page.

