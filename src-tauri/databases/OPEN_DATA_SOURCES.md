# OpenFoot Manager Android — Open Football Data Sources

The Android edition only bundles/imports football data whose licence permits redistribution.

## Approved sources

### openfootball/players
- Repository: https://github.com/openfootball/players
- Licence: CC0-1.0 / public domain
- Intended fields: player name, broad position, height, date of birth, birthplace/national context where supplied.

### openfootball/football.json
- Repository: https://github.com/openfootball/football.json
- Licence: CC0-1.0 / public domain
- Intended fields: competition names, club/team names, fixtures/results and season structure.

## Rules

- Do not copy proprietary Football Manager, EA/FC, Transfermarkt or other restricted databases into this repository.
- Do not bundle copyrighted club crests or player photographs without an explicit redistribution licence.
- Keep imported source provenance in generated database metadata.
- Game-specific ability/potential ratings are simulation values produced by OpenFoot Manager and are not copied from proprietary games.
- Prefer stable source IDs where available; otherwise generate deterministic IDs from source + canonical name + DOB.

## Android database roadmap

1. Import CC0 player identity/bio records.
2. Import CC0 club and competition identities.
3. Resolve players to clubs only where an approved source provides that relationship.
4. Generate OFM-specific football attributes, contracts and valuations separately.
5. Bundle a compact Android starter world and retain optional larger world packages.
6. Validate database -> new career -> team selection -> save/load in ARM64 CI builds.
