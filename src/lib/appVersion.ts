/** Android nightly build identity shown to players. */
export const APP_VERSION = __APP_VERSION__;
export const APP_CHANNEL = __APP_CHANNEL__;
export const APP_COMMIT = __APP_COMMIT__;
export const APP_BUILD_DATE = __APP_BUILD_DATE__;

export const IS_STABLE_BUILD = APP_CHANNEL === "stable";

/**
 * CI exposes the GitHub Actions run number to Vite where available.  During
 * local development we deliberately fall back to the app version rather than
 * hiding the identity completely.
 */
declare const __APP_BUILD_NUMBER__: string | undefined;

function buildNumber(): string | null {
  try {
    const value = typeof __APP_BUILD_NUMBER__ === "undefined" ? "" : String(__APP_BUILD_NUMBER__).trim();
    return /^\d+$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

/** Player-facing identity. Android nightlies use the CI build number. */
export function formatAppVersion(): string {
  if (IS_STABLE_BUILD) return `v${APP_VERSION}`;

  const number = buildNumber();
  if (number) return `Build #${number} • Nightly`;

  const commit = APP_COMMIT === "unknown" ? "" : ` • ${APP_COMMIT}`;
  return `${APP_CHANNEL === "nightly" ? "Nightly" : APP_CHANNEL}${commit}`;
}
