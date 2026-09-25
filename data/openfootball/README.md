# Open football source snapshots

This directory is the staging area for reviewed, redistribution-compatible football data used by the Android database build.

Policy:
- OpenFootball player/club/fixture identities: CC0/public domain.
- Real player OFM ratings are calculated from compatible open performance statistics; proprietary FM/EA ratings are never copied.
- Generated/newgen players use the seeded generation model only.
- Every imported real player must retain provenance and the `real-performance-v1` rating method.
- Source snapshots should record source URL/repository, season, retrieval date and license before being promoted into a bundled database.

Run `node scripts/import-openfootball.mjs <normalized-source.json>` and then `node scripts/validate-real-database.mjs src-tauri/databases/openfootball-2026-27.json`.
