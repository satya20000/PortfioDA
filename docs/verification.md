# Verification

## Scope

The user story is: immersive, responsive portfolio → project dashboard route → same-origin anonymous source snapshot → intersecting filters → recalculated metrics, charts, and record views.

## Completed checks

- Production Vite build succeeds with all React components and chart imports.
- Seven analytics regression tests reconcile headline figures to the source repositories, validate loan outcome denominators, preserve one-order category grain, check every SaaS customer/MRR bridge, preserve cohort censoring, and restore the full population when a filter returns to All.
- Six DOM integration tests exercise all four dashboard routes, acquisition-channel and date filters, intersecting order filters, SaaS period/plan filtering and cohort cells, credit-grade deep dives, record search/sorting/pagination, source-dialog controls, and graceful handling of malformed dates and unknown projects.
- DOM integration tests isolate chart rendering with explicit component mocks. They verify dashboard state and controls; they do not establish visual chart acceptance.
- Responsive CSS covers desktop, tablet and phone widths; wide tables scroll within their containers. Navigation, controls, source dialogs, reduced motion, focus states and accessible labels are included.
- The downloadable resume contains the four showcased projects with source-reconciled figures. Its one-page PDF was rendered and visually checked for readable text, spacing, and complete content.

## Browser verification

The redesigned portfolio was checked locally with Playwright and Chromium 153. The browser and local Vite server ran in the same process environment. These checks used the actual canvas, SVG previews, dashboard code, datasets, and Recharts components.

- The desktop and touch-emulated phone layouts were rendered and visually reviewed, including the hero, project showcase, navigation, about, approach, and contact sections.
- There was no horizontal document overflow at 1440, 1024, 768, 390, 360, or 320 pixels. All 12 project headline figures were visible inside their masks at desktop and small-phone widths.
- The particle canvas animated, stopped after pausing, changed shape while paused, and preserved the pause preference after reload. Device-level reduced motion disabled the canvas drawing loop and the tool marquee.
- Keyboard navigation through a project preview reached its first and last source observations. Calendar spacing preserves gaps in the monthly source series.
- The mobile menu isolated covered content from focus, closed with Escape, restored the menu control's focus, and unlocked page content after following a section link.
- Each of the four Explore dashboard links loaded its dashboard and real chart marks. A filter changed the KPI population on every dashboard, and Reset restored it. Source dialogs opened and closed with Escape; the CSV export produced a downloadable file.
- No uncaught browser runtime errors occurred during these flows.

Captured homepage views: [desktop](screenshots/homepage.png) and [phone](screenshots/homepage-mobile.png).

## Deployment boundary

These checks use browser device emulation; they do not establish physical-device GPU performance or a live hosting audit. After deploying on Vercel, check direct-route refreshes, resume downloads, chart tooltips, and asset loading against the deployed build. No Vercel deployment was created because the user chose to deploy it themselves.
