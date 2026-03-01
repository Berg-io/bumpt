This patch release fixes a Community build compatibility issue introduced in v0.2.0 and improves release stability.

## What's changed

- Fixed: Community Docker build no longer fails when CVE enrichment imports AI helpers.
- Fixed: Added a compatible `enrichCveWithAI` stub export so Community builds succeed without Pro-only AI modules.
