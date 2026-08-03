# Frontend Wireframes

## 1. Scope and design principles

These low-fidelity wireframes document the current route families and the planned Phase 5 additions. They are layout specifications, not pixel-perfect redesigns.

Principles:

- Safety and uncertainty notices appear before consequential actions.
- Public cards contain limited fields and no report photograph.
- Reporter and admin actions remain role-separated.
- Contact disclosure appears only after recipient acceptance.
- Desktop layouts collapse into one-column mobile flows.
- Phase 5 image-quality and modality information is explanatory, not identity-oriented.

## 2. Route map

~~~mermaid
flowchart LR
    Public["Public shell"]
    Reporter["Reporter portal"]
    Admin["Admin portal"]

    Public --> Home["/"]
    Public --> Search["/search"]
    Public --> Browse["/browse"]
    Public --> Missing["/report/missing"]
    Public --> Unidentified["/report/unidentified"]
    Public --> Track["/track"]
    Public --> About["/about"]
    Public --> Contact["/contact"]
    Public --> Login["/login"]
    Public --> Register["/register"]
    Public --> AdminLogin["/admin/login"]

    Reporter --> Dashboard["/reporter/dashboard"]
    Reporter --> MyReports["/reporter/my-reports"]
    Reporter --> Recommendations["/reporter/recommendations"]
    Reporter --> Requests["/reporter/connection-requests"]
    Reporter --> Profile["/reporter/profile"]

    Admin --> AdminDashboard["/admin/dashboard"]
    Admin --> Manage["/admin/manage"]
    Admin --> Staff["/admin/staff"]
~~~

## 3. Public shell and home

~~~text
+--------------------------------------------------------------------------------+
| HumTrace AI | Home Search Browse Report Track About Contact | Sign in          |
+--------------------------------------------------------------------------------+
| SAFETY NOTICE: Possible recommendations require human review and mutual consent |
+--------------------------------------------------------------------------------+
|                         HUMTRACE AI                                             |
| Privacy-preserving missing and unidentified person reporting                   |
| [Report Missing Person] [Report Unidentified Person] [Smart Search]             |
+--------------------------------------+-----------------------------------------+
| How it works                         | Privacy commitments                     |
| 1. Submit report                     | - Private report images                 |
| 2. Human content review              | - Limited public fields                 |
| 3. Review possible recommendations   | - Recipient-controlled contact          |
+--------------------------------------+-----------------------------------------+
| Emergency and public-service contact references                                |
+--------------------------------------------------------------------------------+
~~~

Mobile:

~~~text
+---------------------------+
| HumTrace AI          [Menu]|
+---------------------------+
| Safety notice              |
+---------------------------+
| HUMTRACE AI                |
| Short purpose statement    |
| [Report Missing]           |
| [Report Unidentified]      |
| [Smart Search]             |
+---------------------------+
| How it works               |
+---------------------------+
| Privacy commitments        |
+---------------------------+
~~~

## 4. Smart Search

### Current Phase 5 engineering UI

~~~text
+--------------------------------------------------------------------------------+
| Smart Search                                                                   |
| Use a photograph, descriptive details, or both. Human review is required.      |
+--------------------------------------------------------------------------------+
| Photograph [Choose file]   JPG/PNG/WEBP, max 5 MB, request-scoped and discarded|
+--------------------------------------+-----------------------------------------+
| Age          [__________]             | Gender        [select]                  |
| Height       [__________]             | Weight        [__________]              |
| Region       [select____]             | Location      [____________________]    |
| Description  [______________________________________________________________]  |
| Clothing     [______________________________________________________________]  |
| Features     [______________________________________________________________]  |
+--------------------------------------------------------------------------------+
| [Search for possible recommendations]                                          |
+--------------------------------------------------------------------------------+
| Notice / validation outcome                                                    |
| Result cards: case ID, type, age, gender, region, safe description, explanation|
+--------------------------------------------------------------------------------+
~~~

### Phase 5 processing and limitation states

~~~text
+--------------------------------------------------------------------------------+
| AI PROCESSING NOTICE                                                           |
| Search image and query vectors are request-scoped and discarded after search.  |
| [Learn about limitations]                                                      |
+--------------------------------------------------------------------------------+
| Input quality                                                                  |
| Image: Suitable / Limited / Unavailable     Text: Available / Not supplied      |
+--------------------------------------------------------------------------------+
| Possible recommendation card                                                   |
| Case UI-2026-0001 | Region | Approx. age | Human review required               |
| Why shown: [Visual appearance] [Description] [Age/height]                       |
| Limitations: low lighting reduced image contribution                           |
| [View safe case details] [Dismiss]                                             |
+--------------------------------------------------------------------------------+
~~~

## 5. Report wizard

~~~text
+--------------------------------------------------------------------------------+
| Report a Missing Person / Unidentified Person                                  |
| Step 1 of 4: Person and location                                               |
+--------------------------------------------------------------------------------+
| Progress: [1 Person/location]--[2 Description/photo]                            |
|           --[3 Reporter/permissions]--[4 Review/submit]                         |
+--------------------------------------------------------------------------------+
| Context-specific form fields                                                   |
| [__________________________________________________________________________]   |
|                                                                                |
| Validation message area                                                        |
+--------------------------------------------------------------------------------+
| [Back]                                                        [Save and Next]  |
+--------------------------------------------------------------------------------+
~~~

Reporter/permissions step:

~~~text
+--------------------------------------------------------------------------------+
| Photograph and AI-assisted processing                                          |
| [Local preview of the selected image]                                           |
|                                                                                |
| [ ] I confirm I am authorized to submit this photograph.                       |
| [ ] I understand automated similarity can produce incorrect suggestions.       |
| [ ] Allow approved local visual/text processing for this active report.         |
|                                                                                |
| Retention summary and withdrawal effect                                        |
| [Read processing and retention details]                                        |
+--------------------------------------------------------------------------------+
~~~

Public image preview remains excluded until a separately reviewed authorization design exists.

## 6. Browse and tracking

~~~text
+--------------------------------------------------------------------------------+
| Browse Public Cases                                                            |
| [Search_________] [Type____] [Region____] [Status____]                          |
+--------------------------------------------------------------------------------+
| Case card             | Case card              | Case card                      |
| Case ID               | Case ID                | Case ID                        |
| Type / age / gender   | Type / age / gender    | Type / age / gender            |
| Broad region / date   | Broad region / date    | Broad region / date            |
| Safe description      | Safe description       | Safe description               |
| [View details]        | [View details]         | [View details]                 |
+--------------------------------------------------------------------------------+
~~~

~~~text
+--------------------------------------------------------------------------------+
| Track a Case                                                                   |
| Case ID [MP-YYYY-NNNN________________] [Track]                                  |
+--------------------------------------------------------------------------------+
| Case ID | Type | Safe status | Created | Last update                            |
| Timeline                                                                       |
| o Report submitted                                                             |
| o Human content review                                                         |
| o Public status update                                                         |
+--------------------------------------------------------------------------------+
~~~

## 7. Reporter dashboard and reports

~~~text
+----------------------+---------------------------------------------------------+
| Reporter navigation  | My Dashboard                                            |
| - My Cases           | [My reports count] [Recommendations count]              |
| - Case Reports       |                                                         |
| - Recommendations    | Recent report activity                                  |
| - Contact Requests   | [Case] [Status] [Visibility] [Open]                     |
| - Profile            |                                                         |
+----------------------+---------------------------------------------------------+
~~~

~~~text
+----------------------+---------------------------------------------------------+
| Reporter navigation  | My Cases                                                |
|                      | [Search] [Status] [Type]                                 |
|                      |                                                         |
|                      | Case card                                                |
|                      | ID, safe details, status, visibility                     |
|                      | [Edit] [Close] [Archive] or [Reopen for Review]          |
|                      | Possible recommendations count                           |
+----------------------+---------------------------------------------------------+
~~~

Phase 5 processing state on an owned report:

~~~text
| AI assistance: Pending / Available / Limited / Disabled                         |
| Last processed: date | Model policy version | [View limitations]               |
| [Withdraw processing permission]                                                |
~~~

## 8. Reporter recommendations

~~~text
+----------------------+---------------------------------------------------------+
| Reporter navigation  | Possible Recommendations                                |
|                      | Suggestions require human review.                        |
|                      |                                                         |
|                      | Source case MP-... -> Related case UI-...                |
|                      | Similarity label and contributing attributes             |
|                      | Explanation and limitations                              |
|                      | [Mark viewed] [Dismiss] [Request contact]                |
|                      |                                                         |
|                      | Request-contact panel                                    |
|                      | Reason [____________________________________]             |
|                      | Contact remains hidden until recipient acceptance.       |
|                      | [Send request]                                           |
+----------------------+---------------------------------------------------------+
~~~

Phase 5 feedback additions:

~~~text
| [Dismiss] reason: [Not relevant / Poor image / Details conflict / Other]        |
| [Suppress this suggestion] [Flag a quality problem]                             |
~~~

## 9. Contact requests

~~~text
+----------------------+---------------------------------------------------------+
| Reporter navigation  | Contact Requests                                        |
|                      | [Incoming] [Outgoing]                                    |
|                      |                                                         |
|                      | Related case | Reason | Date | Status                    |
|                      | Incoming pending: [Accept] [Decline]                     |
|                      | Outgoing pending: [Cancel]                               |
|                      | Accepted: contact method and value                       |
|                      | Otherwise: Contact hidden                               |
+----------------------+---------------------------------------------------------+
~~~

## 10. Admin dashboard and manage

~~~text
+----------------------+---------------------------------------------------------+
| Admin navigation     | Admin Dashboard                                         |
| - Dashboard          | Moderation-only notice                                  |
| - Manage             | [Users] [Reports] [Recommendations] [Requests]          |
| - Admin Staff        |                                                         |
|                      | Reports by region | Reports by month | Recent audit      |
+----------------------+---------------------------------------------------------+
~~~

~~~text
+----------------------+---------------------------------------------------------+
| Admin navigation     | Manage                                                  |
|                      | [Reports] [Recommendations] [Users] [Audit] [Settings]  |
|                      |                                                         |
|                      | Reports: review/public/hide/archive controls             |
|                      | Recommendations: quality/status view only                |
|                      | Users: activate/deactivate                               |
|                      | Audit: safe event table                                  |
|                      | Settings: switches and thresholds                        |
+----------------------+---------------------------------------------------------+
~~~

Phase 5 operations additions:

~~~text
| AI Operations                                                                  |
| Overall AI assistance [Enabled/Disabled] [Disable immediately]                  |
| Text model [status/version] | Visual model [status/version]                    |
| Face-region capability [Disabled unless separately approved]                   |
| Queue health | Failed safe jobs | Retention tasks | Evaluation approval        |
| Admin can pause models and review quality incidents, not determine identity.   |
~~~

## 11. Responsive behavior

- Side navigation becomes a labeled menu on narrow screens.
- Multi-column forms and cards become one column.
- Primary action follows the content; secondary actions wrap below.
- Data tables use stacked labeled rows rather than horizontal scrolling where practical.
- Notices appear before result and contact actions on every viewport.
- Phase 5 explanations stay visible and are not hidden in hover-only UI.
