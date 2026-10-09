# Verification

## Scope

The user story is: portfolio project card → project dashboard route → same-origin anonymous source snapshot → intersecting filters → recalculated metrics, charts, and record views.

## Completed checks

- Production Vite build succeeds with all React components and chart imports.
- Seven analytics regression tests reconcile headline figures to the source repositories, validate loan outcome denominators, preserve one-order category grain, check every SaaS customer/MRR bridge, preserve cohort censoring, and restore the full population when a filter returns to All.
- Six DOM integration tests exercise all four dashboard routes, acquisition-channel and date filters, intersecting order filters, SaaS period/plan filtering and cohort cells, credit-grade deep dives, record search/sorting/pagination, source-dialog controls, and graceful handling of malformed dates and unknown projects.
- DOM integration tests isolate chart rendering with explicit component mocks. They verify dashboard state and controls; they do not establish visual chart acceptance.
- Responsive CSS covers desktop, tablet and phone widths; wide tables scroll within their containers. Navigation, controls, source dialogs, reduced motion, focus states and accessible labels are included.
- The downloadable resume contains the four showcased projects with source-reconciled figures. Its one-page PDF was rendered and visually checked for readable text, spacing, and complete content.

## Browser review limitation

This environment could not download a usable Playwright Chromium archive. The available remote browser could not reach the local preview (`ERR_CONNECTION_REFUSED`); loopback requests from a separate command were refused too. As a result, actual browser rendering, chart hover behavior, viewport screenshots, and animation performance were **not visually verified** here. Source calculations and DOM interactions were verified as stated above.

After deploying on Vercel, inspect the homepage and every dashboard at normal and phone widths. Confirm chart marks, axis labels and tooltips, filter-reset behavior, direct-route refreshes, CSV downloads, and the resume download against the deployed build. The repository is prepared for deployment; no Vercel deployment was created in this task because the user chose to upload it themselves.
