This release improves risk prioritization, vulnerability context quality, and dashboard usability for security and operations teams.

## What's changed

- Fixed: Stale risk and CVE states after acknowledge and re-check flows.
- Fixed: End-of-life date matching for older version lines.
- Fixed: CVE detection reliability for edge naming and version scenarios.
- Fixed: AI enrichment fallback behavior for timeout, quota, and retry failure paths.
- Added: BPT (Business Priority Threat), an internal score combining technical severity, threat intelligence, and business context.
- Added: EPSS and CISA KEV enrichment signals in vulnerability prioritization.
- Added: Optional AI CVE enrichment as a complementary stage after standard source checks and CVE API enrichment.
- Added: Changed: Lifecycle handling now clearly distinguishes up-to-date, outdated, and end-of-life states.
- Added: Changed: Dashboard and admin table layouts are more compact and consistent.
- Added: Changed: Default rows-per-page setting now applies across dashboard, items, users, and logs.
- Added: AI provider configuration improvements including multi-provider support and advanced runtime controls.
- Added: Super admin prompt template support for AI enrichment customization.
