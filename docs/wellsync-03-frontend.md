# 03 — Frontend: React Dashboard

This document specifies the `frontend/` React application completely. The frontend contains no business logic — every value shown is fetched from the FastAPI backend (02-backend.md §7); this file only governs presentation, navigation, and client-side state.

---

## 1. Frontend Goals

**UX principles:** This is an operations dashboard for field/reservoir engineers and managers, not a consumer app — clarity and trustworthiness of numbers matter more than visual flourish. Every recommendation must show its confidence/basis, never a bare number presented as certain.

**Design philosophy:** "Industrial control-room" aesthetic — dense, data-forward, status-color-coded, dark-mode-first (matches typical ops-room/SCADA-adjacent screens and reduces eye strain for engineers monitoring dashboards for long periods), but fully usable in light mode too (toggle, not a hard requirement to build first).

**Accessibility:** Full keyboard navigation; role-based UI must never rely on color alone to convey status (icons + text labels accompany every status badge).

**Responsiveness:** Desktop-first (primary use case is a monitoring workstation / large office monitor), but must remain usable on a laptop screen down to 1280px — no mobile-specific layout required for the hackathon scope (this is not a field-mobile app).

**Performance goals:** Dashboard views load within 1s on typical demo data volume; charts re-render smoothly on parameter-slider interaction in the CSS Optimizer (debounced API calls, not one call per pixel of slider movement).

**Browser support:** Modern evergreen browsers (Chrome/Edge/Firefox) — no legacy IE support needed.

---

## 2. Technology Stack

| Technology | Used For | Why |
|---|---|---|
| React 18 + TypeScript (Vite) | SPA framework | Fast dev loop, strong typing against the FastAPI OpenAPI contract |
| React Router | Client-side routing | Standard, well-documented |
| TanStack Query (React Query) | Server-state fetching/caching | Handles loading/error/refetch states declaratively for every API call — exactly the pattern this data-heavy dashboard needs |
| Zustand | Lightweight global client state | Auth/session state, active role, UI preferences (theme) — simpler than Redux for this app's modest global-state needs |
| Recharts | Charts (time-series, forecast, KPI trends) | React-native, sufficient chart types with minimal boilerplate |
| TailwindCSS | Styling | Fast, consistent utility-based styling across many dense dashboard screens |
| Axios (with an interceptor for JWT refresh) | HTTP client | Simple interceptor-based auto-refresh of expiring access tokens |
| `react-hook-form` + `zod` | Forms + validation | Type-safe form validation matching backend Pydantic schemas one-to-one |

---

## 3. Project Structure

(See 01-overview.md §8 for the full tree; this file governs `frontend/src/`.)

---

## 4. Design System

**Color palette:**
| Token | Hex (dark mode) | Use |
|---|---|---|
| `--bg-primary` | `#0F1419` | App background |
| `--bg-panel` | `#1A2028` | Cards/panels |
| `--bg-elevated` | `#242C36` | Inputs, table row hover |
| `--text-primary` | `#E8ECEF` | Primary text |
| `--text-secondary` | `#8A96A3` | Secondary/labels |
| `--accent-blue` | `#3B82F6` | Primary actions, active nav |
| `--status-normal` | `#22C55E` | Normal/approved/low-risk |
| `--status-warning` | `#F59E0B` | Warning/medium-risk/uncertain |
| `--status-critical` | `#EF4444` | Critical/fluid-pound/high-risk/rejected |
| `--border` | `#2E3742` | 1px borders throughout |

**Typography:** Inter (UI text) at 13px base / 12px secondary / 20px page titles / 16px section headers. Monospace (system monospace stack) for all numeric KPI values (SOR, SPM, stress, risk score) so digits align cleanly in tables and don't jitter as live-simulated values update.

**Spacing:** 4px base unit; 8/16/24/32px standard gaps; 16px panel padding.

**Border radius:** 8px cards/inputs/buttons.

**Shadows:** subtle single-layer shadow on modals and the sticky top nav only; flat elsewhere.

**Icons:** `lucide-react` icon set (small, tree-shakeable, no network dependency).

**Components:**
- **Buttons:** Primary (`--accent-blue` fill), Secondary (outline), Destructive (`--status-critical` outline for Reject actions) — always paired with a text label, never icon-only for consequential actions (Approve/Reject).
- **Inputs/sliders:** parameter sliders in the CSS Optimizer show the live numeric value; text inputs show inline `zod` validation errors below the field.
- **Cards:** used for the Digital Twin State summary, KPI tiles, each candidate optimization result.
- **Tables:** used for well list, alerts, rod-failure leaderboard, run history — sortable columns, zebra striping, status badges in-line.
- **Modals:** used only for destructive confirmations (Reject with reason, Delete/deactivate a user) — routine flows stay in-page.
- **Toasts:** bottom-right; success auto-dismiss 4s, errors persist until dismissed.
- **Badges:** status pills using the palette above — always icon + text (e.g., a triangle-warning icon + "Fluid Pound"), never color alone.
- **Navigation:** persistent left sidebar (Field Overview, Wells, CSS Optimizer, SRP Diagnostics, Alerts, Reports, Admin — Admin only visible to the `admin` role), collapsible on smaller widths.
- **Loading states:** skeleton cards/rows for any fetch >200ms (React Query's `isLoading`); never a full-page blocking spinner for in-page navigation.
- **Empty states:** explicit, e.g., Alerts empty → "No active alerts — all monitored wells are within normal parameters," with a subtle positive tone (this is good news, and should read as such, not as a generic "nothing here").
- **Error states:** every data-dependent panel has its own error boundary showing the backend's `message` field with a Retry button, isolated so one panel's failure doesn't blank the whole page.

---

## 5. Pages

### 5.1 Login (`pages/Login.tsx`)
- **Purpose:** Authenticate.
- **Route:** `/login`
- **Layout:** centered card, email + password, WellSync branding.
- **API calls:** `POST /auth/login`.
- **Loading:** button shows spinner during request.
- **Error:** inline "Incorrect email or password" on 401, never a generic unhandled error screen.
- **Navigation:** on success → redirect to `/` (Field Overview), storing tokens via Zustand auth store + Axios interceptor setup.

### 5.2 Field Overview (`pages/FieldOverview.tsx`)
- **Purpose:** Landing dashboard — field-wide status and KPIs. Home route for all roles (content varies by role).
- **Route:** `/`
- **Layout:** top KPI tile row (field-wide SOR trend, energy/bbl trend, active alert count, high-risk well count) + well list table below, each row showing name, status badge, latest classification, risk band.
- **Components:** `KpiTile`, `WellListTable`.
- **Data required:** `GET /wells` (paginated), field-wide KPI aggregation endpoint.
- **API calls:** `GET /wells?page=&page_size=`, `GET /reports/field-summary?format=json&period_days=90`.
- **Loading:** skeleton KPI tiles + skeleton table rows.
- **Error:** per-panel error boundary (KPI tiles and table fail independently).
- **Empty:** "No wells configured yet" (Admin-only CTA to add a well, shown only to `admin` role).
- **User actions:** click a well row → navigate to Well Detail; sort/filter table.
- **Responsive:** KPI tiles wrap from 4-across to 2-across below 1400px.

### 5.3 Well Detail / Digital Twin (`pages/WellDetail.tsx`)
- **Purpose:** The core per-well screen — full Digital Twin State.
- **Route:** `/wells/:wellId`
- **Layout:** header (well name, status, API gravity, reservoir temp baseline) → three-panel body: Reservoir/CSS summary card (left), Dynamometer/SRP summary card (center, embeds the `DynoCardChart`), Rod-Failure Risk card (right) → pending recommendations list below, each with Approve/Reject actions (role-gated: `reservoir_engineer` for CSS recs, `field_engineer` for SRP recs, `admin` for either).
- **Components:** `ReservoirSummaryCard`, `DynoCardChart`, `RiskScoreCard`, `RecommendationList`.
- **Data required:** `GET /wells/{id}/state`.
- **API calls:** `GET /wells/{id}/state`; `POST /optimization-runs/{id}/approve`; `POST /optimization-runs/{id}/reject`.
- **Loading:** skeleton for all three panels on initial load; React Query background-refetch (every 15s, matching the backend's debounce window) keeps it live without a manual refresh.
- **Error:** `WELL_NOT_FOUND` → redirect to Field Overview with a toast; transient fetch error → panel-level error with Retry.
- **Empty:** if a well has no cycles/cards yet (newly onboarded) → "No production data yet for this well" placeholder in each panel.
- **User actions:** Approve/Reject recommendation (role-gated — button hidden entirely, not just disabled, for the wrong role, since a disabled-but-visible button implies false capability); navigate to CSS Optimizer or SRP Diagnostics for deeper action via panel "Optimize →" links.
- **Responsive:** three-panel layout stacks to single column below 1300px.

### 5.4 CSS Optimizer (`pages/CssOptimizer.tsx`)
- **Purpose:** Reservoir Engineer's cycle-planning workspace.
- **Route:** `/wells/:wellId/css-optimizer`
- **Role:** `reservoir_engineer`, `admin` (route-guarded; other roles redirected with a toast explaining the restriction).
- **Layout:** left = parameter-range sliders (steam volume, soak time, min recovery target) + "Run Optimization" button; right = reservoir/production forecast chart + a ranked candidate results table (top 5 by SOR), each row expandable to show the predicted SRP impact.
- **Components:** `ParamRangeSlider`, `ForecastChart`, `CandidateResultsTable`.
- **Data required:** `POST /css/optimize/{wellId}` (on demand, not on load — this is a compute-triggered action, not a passive fetch).
- **API calls:** `POST /css/optimize/{wellId}`, `POST /css/cycles/{wellId}/plan`.
- **Loading:** "Running optimization…" progress state (optimizer search may take a few seconds) shown in the results panel, not blocking the sliders.
- **Error:** `NO_FEASIBLE_CANDIDATE` → shown inline in the results panel with a suggestion to widen the range, not a toast (this is a substantive result the user needs to act on, not a transient notification); `INSUFFICIENT_HISTORY` warning shown as a persistent info banner above the results, not hidden.
- **Empty:** before first "Run Optimization" click, results panel shows "Adjust parameters and run optimization to see recommendations."
- **User actions:** adjust sliders, run optimization, expand a candidate for detail, "Plan This Cycle" (saves via `/css/cycles/plan`).
- **Navigation:** "Plan This Cycle" success → toast + link to the new cycle in Well Detail.
- **Responsive:** two-column collapses to stacked below 1300px.

### 5.5 SRP Diagnostics (`pages/SrpDiagnostics.tsx`)
- **Purpose:** Field Engineer's dynamometer-card review and SPM recommendation workspace.
- **Route:** `/wells/:wellId/srp-diagnostics`
- **Role:** `field_engineer`, `admin`.
- **Layout:** left = card history list (sortable by time, filterable by classification); right = selected card's `DynoCardChart` (load-vs-position plot) with classification badge + confidence, plus a "Get SPM Recommendation" button and its result panel.
- **Components:** `DynoCardHistoryList`, `DynoCardChart`, `SpmRecommendationPanel`.
- **Data required:** `GET /srp/dyno-cards/{wellId}?limit=`.
- **API calls:** `GET /srp/dyno-cards/{wellId}`, `POST /srp/optimize/{wellId}`, approve/reject as in Well Detail.
- **Loading:** skeleton list + chart placeholder.
- **Error:** `NO_SAFE_RECOMMENDATION` shown as a clearly distinct amber/red banner ("Flagged for mechanical review") rather than a generic error — this is a meaningful engineering signal, not a failure.
- **Empty:** "No dynamometer cards recorded yet for this well."
- **User actions:** select a card, request recommendation, approve/reject.
- **Responsive:** two-column collapses to stacked below 1300px.

### 5.6 Alerts (`pages/Alerts.tsx`)
- **Purpose:** Field-wide alert feed.
- **Route:** `/alerts`
- **Layout:** filterable table (severity, acknowledged/unacknowledged, well), each row expandable to the triggering condition, with an "Acknowledge" action.
- **API calls:** `GET /alerts`, `POST /alerts/{id}/acknowledge`.
- **Empty:** the positive-tone empty state described in §4.

### 5.7 Reports (`pages/Reports.tsx`)
- **Purpose:** Field-wide KPI trends and exportable reports.
- **Route:** `/reports`
- **Role:** `ops_manager`, `admin` (others redirected).
- **Layout:** period selector, trend charts (SOR, energy/bbl, rod-failure count), rod-failure risk leaderboard table, Export (PDF/CSV) buttons.
- **API calls:** `GET /reports/field-summary`.

### 5.8 Admin (`pages/Admin.tsx`)
- **Purpose:** User management + data-source configuration (the Journey-4 ingestion-swap demo screen).
- **Route:** `/admin`
- **Role:** `admin` only.
- **Layout:** tabs — "Users" (list/create/deactivate), "Data Sources" (current source indicator + switch-to-CSV-import form), "Alert Thresholds" (configurable numeric thresholds).
- **API calls:** `POST /admin/users`, `POST /admin/ingestion/source`.
- **Error:** `CSV_SCHEMA_INVALID` shown inline with the specific row number from the backend — critical for the live import demo to be debuggable on the spot if the sample file needs adjustment.

---

## 6. Complete User Flows

**Flow — Field Engineer daily review → approve SRP change:**
```
Login → Field Overview (well BGW-003 shows a warning badge)
→ click BGW-003 → Well Detail
→ SRP panel shows "Fluid Pound, 87% confidence"
→ click "Optimize →" → SRP Diagnostics
→ select the latest card → "Get SPM Recommendation"
→ review predicted fillage + rod-stress check
→ Approve → toast confirmation → return to Well Detail, panel now shows the approved recommendation logged
```

**Flow — Reservoir Engineer plans next CSS cycle:**
```
Login → Field Overview → select a well due for a cycle → Well Detail → "Optimize →" (CSS panel) → CSS Optimizer
→ adjust steam volume / soak time ranges → Run Optimization
→ review ranked candidates + forecast chart → expand top candidate to see predicted SRP impact
→ Plan This Cycle → toast confirmation → cycle appears as "planned" in Well Detail
```

**Flow — Admin demonstrates CSV import (Q&A demo):**
```
Login as Admin → Admin → Data Sources tab
→ shows current source = "Simulated Field Data"
→ upload sample_historian_export.csv → switch source
→ navigate to Well Detail for the affected well → identical panel rendering, now sourced from the imported file
```

---

## 7. Component Architecture

| Component | Props | State | Behavior | API Dependencies | Accessibility |
|---|---|---|---|---|---|
| `WellListTable` | `wells: WellSummary[]`, `onSelect` | sort column | sortable/filterable rows, status badge per row | `GET /wells` (via parent) | full keyboard row navigation |
| `DynoCardChart` | `points: {position, load}[]`, `classification`, `confidence` | none (controlled) | Recharts line/area chart of the closed load-position loop; badge overlay for classification+confidence | none directly (data passed from parent) | chart paired with a text summary ("Classified: Fluid Pound, 87% confidence") for screen readers |
| `ParamRangeSlider` | `label, min, max, step, value, onChange` | current range | dual-handle range slider with live numeric display | none | full keyboard control (arrow keys), labeled via `<label htmlFor>` |
| `CandidateResultsTable` | `candidates: CssCandidate[]`, `onPlan` | expanded row id | expandable rows showing predicted SRP impact | `POST /css/cycles/plan` (via parent callback) | expandable rows keyboard-toggleable (Enter/Space) |
| `RecommendationList` | `recommendations: OptimizationRun[]`, `onApprove, onReject`, `userRole` | none | role-gated Approve/Reject buttons (hidden, not disabled, for wrong role) | `POST /optimization-runs/{id}/approve\|reject` | buttons have full text labels, not icon-only |
| `RiskScoreCard` | `score: number`, `band: string`, `factors: string[]` | none | colored badge (icon+text) + a short factor breakdown | none | band conveyed via icon+text, never color alone |
| `KpiTile` | `label, value, trend, format` | none | monospace numeric display with trend arrow | none | trend direction announced in text ("up 3% from last period"), not just an arrow glyph |

---

## 8. State Management

- **Global state (Zustand):** auth tokens + current user/role, active theme (dark/light), sidebar collapsed/expanded.
- **Server state (React Query):** every API-fetched entity (`wells`, `well state`, `dyno cards`, `alerts`, `reports`) — cached with sensible `staleTime` per entity (e.g., `wells` list 30s, `well state` 15s matching the backend debounce, `reports` 60s), automatic background refetch, and built-in loading/error states consumed directly by each page.
- **Local state:** form inputs (CSS Optimizer sliders before submission, Admin forms) via `react-hook-form`.
- **Form state:** validated client-side with `zod` schemas mirrored from the backend Pydantic schemas (kept in sync manually — documented as a maintenance point in the Technical Report), plus authoritative server-side validation on submit.
- **Authentication state:** Zustand store holds `{accessToken, refreshToken, user, role}`; Axios request interceptor attaches the bearer token; response interceptor auto-refreshes on a 401 with a valid refresh token, retrying the original request once.
- **Cache strategy:** React Query's cache is the single source of truth for server data — no duplicate manual state mirrors of fetched data anywhere in components.
- **Loading/error states:** owned per-query by React Query (`isLoading`, `isError`, `error`) and rendered by the specific panel/component that owns that query, never a single global loading gate.

---

## 9. API Integration

| Feature | Page | API | Method | Request | Response | UI Behavior |
|---|---|---|---|---|---|---|
| Login | Login | `/auth/login` | POST | email, password | tokens + role | redirect to `/` on success, inline error on 401 |
| Well list | Field Overview | `/wells` | GET | page, page_size | paginated wells | table populates, skeleton while loading |
| Field KPIs | Field Overview | `/reports/field-summary` | GET | format=json, period_days | SOR/energy/risk trends | KPI tiles populate |
| Digital Twin state | Well Detail | `/wells/{id}/state` | GET | — | full state object | three panels populate; background refetch every 15s |
| CSS optimize | CSS Optimizer | `/css/optimize/{id}` | POST | ranges + min_recovery | ranked candidates | results table + forecast chart populate |
| Plan cycle | CSS Optimizer | `/css/cycles/{id}/plan` | POST | chosen candidate | created cycle | toast + navigate link |
| Dyno cards list | SRP Diagnostics | `/srp/dyno-cards/{id}` | GET | limit | card list | history list populates |
| SRP optimize | SRP Diagnostics | `/srp/optimize/{id}` | POST | — | recommendation | recommendation panel populates or shows `NO_SAFE_RECOMMENDATION` banner |
| Approve/reject | Well Detail, SRP Diagnostics | `/optimization-runs/{id}/approve\|reject` | POST | reason (reject only) | status | list item updates status badge |
| Alerts list | Alerts | `/alerts` | GET | severity, acknowledged filters | alert list | table populates |
| Acknowledge alert | Alerts | `/alerts/{id}/acknowledge` | POST | — | timestamp | row updates, moves to acknowledged filter |
| Field report export | Reports | `/reports/field-summary` | GET | format=pdf/csv | file | browser download triggered |
| Ingestion source switch | Admin | `/admin/ingestion/source` | POST | source_type, csv file | confirmation | banner updates active source; `CSV_SCHEMA_INVALID` shown inline with row number on failure |

---

## 10. UX Details

- **Micro-interactions:** status badges have a brief color-transition (200ms) on change, so a classification flipping from "Normal" to "Fluid Pound" during a live demo is visually legible, not just a re-rendered label.
- **Animations/transitions:** page navigation is instant (no slide/fade) — this is a data tool, not a marketing site; only the badge-transition and skeleton-to-content fade (150ms) are used.
- **Loading skeletons:** used for every panel with a fetch >200ms; never a full-page spinner that blocks unrelated panels.
- **Progress indicators:** determinate for CSV import (upload progress); indeterminate for CSS optimization run (search duration varies).
- **Confirmation dialogs:** required for Reject (with reason field) and for any destructive Admin action (deactivate user, switch ingestion source away from a currently-active one mid-demo).
- **Toast messages:** success (approval logged, cycle planned, report exported), warnings (insufficient history, uncertain classification), errors (fetch failures) — styled per §4 status colors, always icon + text.
- **Error recovery:** every error state (panel-level or page-level) includes a Retry action; role-restricted pages show a clear "You don't have access to this page" message with a link back to Field Overview, not a blank/broken screen.
- **Optimistic updates:** alert acknowledgment updates the UI immediately (low-risk, easily reversible by re-fetch); Approve/Reject actions wait for server confirmation before updating status (higher-stakes, must reflect true backend state — consistent with the same principle applied in the FSOC project's Live Tracking screen).

---

## 11. Responsive Design

| Breakpoint | Behavior |
|---|---|
| ≥1600px | Full multi-column layouts (Field Overview 4-across KPI tiles, Well Detail 3-panel row) |
| 1300–1599px | Default as designed in §5 |
| 1280–1299px | Well Detail's 3-panel row and CSS/SRP two-column layouts stack to single column; sidebar auto-collapses to icon-only |
| <1280px | Not officially supported for this release — a minimum-width notice is shown rather than a broken cramped layout, consistent with this being a workstation/office-monitor tool, not a mobile app |

---

## 12. Accessibility

- **Keyboard navigation:** full tab order through sidebar, tables (row navigation), sliders, and all action buttons.
- **Focus management:** navigating to a new page moves focus to that page's `<h1>` heading.
- **ARIA:** status badges carry `role="status"` with a text `aria-label` matching the visible label (e.g., "Fluid Pound, 87 percent confidence"); charts (`DynoCardChart`, `ForecastChart`) each have an adjacent visually-hidden text summary of the key takeaway for screen readers.
- **Contrast:** all palette text/background pairs verified ≥4.5:1 (WCAG AA) in both dark and light themes.
- **Screen-reader behavior:** new alerts and classification changes are announced via an ARIA live region on the Well Detail and Alerts pages.
- **Form labels:** every input/slider has a real associated `<label>`, never placeholder-only labeling.
- **Error announcements:** form validation errors are associated with their field via `aria-describedby`.

---

## 13. Performance

- **Lazy loading:** route-based code splitting (`React.lazy` + `Suspense`) per page — CSS Optimizer and Admin (heavier, less-frequently-visited pages) are not in the initial bundle.
- **Code splitting:** Recharts and the CSV-parsing preview logic are loaded only on the pages that use them.
- **Image optimization:** N/A (no large static images — icon set only).
- **API caching:** handled by React Query per §8; list endpoints use backend pagination rather than fetching entire tables client-side.
- **Rendering strategy:** tables use virtualization (`@tanstack/react-virtual`) only if the well/card list grows large in a real deployment — not needed at hackathon demo data volume, but noted as the documented scaling point.
- **Bundle considerations:** Vite's production build with tree-shaking; Tailwind's JIT mode keeps CSS bundle minimal despite the large utility surface used across many dense screens.

---

## 14. Demo Mode

- **Demo accounts:** four pre-seeded accounts, one per role (`admin@wellsync.demo`, `reservoir@wellsync.demo`, `field@wellsync.demo`, `ops@wellsync.demo`), all documented in the User Manual with a shared demo password — no self-signup needed for the event.
- **Demo data:** the 6 seeded wells (02-backend.md §14), with BGW-003 (fluid pound + high risk) and BGW-005 (rich CSS history) as the two wells used in the rehearsed demo script.
- **Fast flows:** a "Jump to Demo Well" shortcut on Field Overview (visible in a `DEMO_MODE` env flag build) that navigates directly to BGW-003's Well Detail, skipping manual table search under time pressure.
- **Stable fallback states:** the Field Data Simulator runs on a fixed seed in demo builds, so the exact same fluid-pound card and risk score appear every time the app is restarted — critical for a repeatable, rehearsed demo.
- **Mock mode if APIs fail:** not applicable (no external third-party APIs); if the backend itself is unreachable, the app shows a clear full-page "Cannot reach WellSync server" state with a Retry button rather than a silent blank screen — this is the one case a page-level (not panel-level) error state is appropriate, since nothing can render without the backend.
- **Visualizations that communicate impact immediately:** the `DynoCardChart`'s visible "backward-C" collapse shape next to its classification badge is the single clearest judge-legible proof point — no verbal explanation should be strictly necessary to see that something is visually wrong with that card.

---

## 15. Frontend Testing

- **Component tests (Vitest + React Testing Library):** `KpiTile` renders correct trend direction/color; `ParamRangeSlider` clamps to min/max and calls `onChange` correctly; `RecommendationList` hides Approve/Reject for the wrong role and shows them for the correct role; `DynoCardChart` renders the classification badge text matching the passed prop.
- **Integration tests:** CSS Optimizer flow — adjusting sliders and clicking "Run Optimization" calls the mocked API with correct params and renders the returned candidates; SRP Diagnostics flow — `NO_SAFE_RECOMMENDATION` response renders the distinct amber/red banner, not a generic error toast.
- **E2E tests (Playwright):** full "Field Engineer daily review → approve SRP change" flow (§6) against a running backend + seeded demo data; full "Admin CSV import" flow, asserting the Well Detail panel re-renders correctly after the source switch.
- **Accessibility tests:** automated `axe-core` scan on every page in CI-less local test runs; manual keyboard-only walkthrough of both rehearsed demo flows signed off before Phase 5.
