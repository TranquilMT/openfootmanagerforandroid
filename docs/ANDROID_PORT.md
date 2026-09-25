# Openfoot Manager for Android

This fork is converting Openfoot Manager into a touch-first Android application while preserving the Rust simulation core and desktop compatibility.

## Phase 1 — Android bootstrap

The first milestone is deliberately infrastructure-first. Gameplay systems are not rewritten until the existing simulation can run reliably on Android.

### Baseline

- Upstream development branch: `develop`
- Android development branch: `android/phase-1-bootstrap`
- Frontend: React + TypeScript + Vite
- Native shell: Tauri 2
- Simulation/backend: Rust workspace
- Persistence: SQLite

### Phase 1 goals

- [ ] Verify the existing web frontend build.
- [ ] Verify the complete Rust workspace on the Android-compatible dependency graph.
- [ ] Initialize the Tauri Android project.
- [ ] Target ARM64 (`aarch64-linux-android`) first.
- [ ] Produce a debug APK that reaches the existing application UI.
- [ ] Verify Tauri IPC calls reach the Rust backend.
- [ ] Verify creation, loading and saving of a career database in Android app storage.
- [ ] Verify pause/resume does not corrupt an active career.
- [ ] Add Android back-navigation handling.
- [ ] Add safe-area and touch-target foundations without redesigning gameplay yet.
- [ ] Add CI validation for the Android build.

## Build strategy

Android is treated as another presentation/runtime target for the existing game rather than a rewrite. The Rust simulation, domain, engine and database crates remain authoritative. React remains the primary UI. Platform-specific code should be isolated behind small adapters.

## Architecture target

```text
React / TypeScript mobile UI
          |
      Tauri IPC
          |
Rust application commands
          |
 domain + engine + ofm_core
          |
       SQLite
```

## Rules for the port

1. Keep the desktop build working while Android support is introduced.
2. Do not fork simulation rules merely to make the mobile UI easier.
3. Keep saves platform-neutral where practical.
4. Prefer responsive/touch adaptations over duplicate mobile pages.
5. Use Android application storage for mutable saves and generated assets.
6. Do not ship debug consoles or developer overlays in production builds.
7. Establish a reproducible APK build before large UI or gameplay changes.

## Planned phases

### Phase 2 — Mobile shell

Responsive navigation, safe areas, portrait/landscape handling, Android back behavior, touch sizing, loading states and lifecycle integration.

### Phase 3 — Core management UX

Mobile-first dashboard, inbox, squad, player profiles, transfers, scouting, staff, training, finances and competition screens.

### Phase 4 — Tactics

Touch-first formation editor, drag/drop players, roles, team instructions, substitutions and matchday tactical changes.

### Phase 5 — Match presentation

Build a visual 2D match presentation driven by the existing simulation events. The simulation remains authoritative; visualization consumes match state/events.

### Phase 6 — Android polish

Haptics, notifications, adaptive icon/splash, performance profiling, autosave hardening, tablets/foldables and release signing.

### Phase 7 — Release engineering

Signed APK/AAB, migration/regression testing, source distribution and GPL compliance documentation.
