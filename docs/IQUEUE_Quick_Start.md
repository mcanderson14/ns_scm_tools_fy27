# IQUEUE Quick Start

One-page daily workflow for SCR queue triage and routing.

## Purpose

Use IQUEUE to manage queue volume before opening an SCR for staffing.

- Triage Requested and On Hold SCRs.
- Filter to the right queue slice.
- Review oldest and SLA-aged requests first.
- Take ownership, add notes, ask sales for detail, redirect, or cross-staff.
- Click **Staff SCR** when the request is ready to work in SCOUT.

## Preflight

| Need | Check |
| --- | --- |
| Browser | Tampermonkey enabled in Chrome or Edge. |
| Script | IQUEUE installed: `https://github.com/mcanderson14/ns_scm_tools_fy27/raw/refs/heads/main/IQUEUE/netsuite-scr-search-helper.user.js` |
| NetSuite | Access to Requested and On Hold SCR saved searches. |
| Pop-ups | Allow NetSuite and Outlook/mailto pop-ups for email drafts and SCR links. |
| Mappings | If routing looks stale, use Options -> Refresh Mapping JSONs. |

## Daily Workflow

1. Open the Requested queue.
2. Switch to **On Hold** only when working paused requests.
3. Apply filters left to right: industry, region, request type, ownership, then text search.
4. Enable **SLA Hotlist** when you need past-SLA work first.
5. Review the oldest submitted cards first.
6. Click **Take Ownership** when you are actively working the SCR.
7. Add or update staffing notes.
8. Choose the right action: **Staff SCR**, email sales, redirect to sales, or cross-staff.
9. If staffing, click **Staff SCR** and finish the work in SCOUT.

## Must-Know Filters

| Filter | Use |
| --- | --- |
| SC Industry Group | Primary queue ownership slice. |
| SC Staffing Region | Regional staffing/routing slice. |
| Request Type | Direct, AMO, Tech COE, AI Innovation, and special routing. |
| Owner logic = AND | Show rows matching filters and selected SCM owner. |
| Owner logic = OR | Show normal queue rows plus selected SCM owner's rows. |
| SCM Owner = Me | Finds work owned by you. |
| SLA Hotlist | Prioritizes requests past SLA. |
| Review unmapped | Finds rows that may need routing/mapping review. |
| Search Returned Fields | Finds text across returned queue fields. |

## Common Actions

| Action | When to use it |
| --- | --- |
| Staff SCR | Request is ready to open and staff in SCOUT. |
| Take Ownership | You are now responsible for the SCR. |
| Save notes | Record triage, sales follow-up, routing, or staffing context. |
| Email Sales | Need more information before staffing. Opens a draft only. |
| Redirect to sales | Request needs sales cleanup before SCM can staff. |
| Cross-staff | Request belongs with another industry family or manager. |
| Copy link | Share a clean SCR link for follow-up. |

## Fast Recipes

| Goal | Settings |
| --- | --- |
| My owned work | Owner logic = AND, SCM Owner = Me, clear other filters. |
| My queue plus owned redirects | Normal filters, Owner logic = OR, SCM Owner = Me. |
| One queue slice | SC Industry Group + SC Staffing Region + Request Type. |
| Aging work | Enable SLA Hotlist. |
| Mapping cleanup | Enable Review unmapped or open Mapping Explorer. |
| Hide unrelated work | Use Hide outside my groups where available. |

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Too many cards | Check Owner logic. Use AND to narrow. |
| Owned cards missing | Check SCM Owner = Me and Hide outside my groups. |
| Routing looks wrong | Open Mapping Explorer and refresh mappings. |
| Email draft blocked | Allow pop-ups and confirm Outlook/mailto handling. |
| Cross-staff target rejected | Confirm Request Type requirements for Tech COE or SCAI. |
| IQUEUE missing | Confirm Tampermonkey is enabled and you are on an SCR saved search result page. |

## Best Habit

Use IQUEUE to choose and cleanly route the work. Use SCOUT to make the staffing decision.

