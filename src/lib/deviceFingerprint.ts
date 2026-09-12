/**
 * Device fingerprinting for trusted-device enforcement.
 *
 * v2 (stable): the identity is anchored on a persistent random token stored in
 * BOTH localStorage and a long-lived cookie, combined only with signals that do
 * NOT change when the browser auto-updates (browser family + OS family).
 *
 * Volatile signals from v1 (full user-agent string incl. version, screen size,
 * colour depth, timezone, language, canvas hash) are deliberately excluded —
 * they changed on every browser update and forced a new email code.
 *
 * A legacy v1 hash is still computed so the server can silently migrate an
 * already-trusted device instead of re-challenging the user once.
 */

const DEVICE_TOKEN_KEY = "tagex_device_token_v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 730; // 2 years

function readCookieToken(): string | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)tagex_device_token=([a-f0-9]{32,})/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function writeCookieToken(token: string) {
  try {
    document.cookie = `tagex_device_token=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${
      location.protocol === "https:" ? "; Secure" : ""
    }`;
  } catch {
    /* cookies blocked */
  }
}

function getOrCreateDeviceToken(): string {
  let token: string | null = null;
  try {
    token = localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    /* storage blocked */
  }

  // Cookie acts as a backup when site data / localStorage was cleared.
  if (!token) token = readCookieToken();

  if (!token) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } catch {
    /* storage blocked */
  }
  writeCookieToken(token);

  return token;
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = "#069";
    ctx.fillText("tagex.app device fingerprint 🔒", 2, 2);
    return canvas.toDataURL().slice(-64);
  } catch {
    return "canvas-error";
  }
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface DeviceFingerprint {
  hash: string;
  /** v1 hash — sent so the server can migrate an existing trusted device. */
  legacyHash: string;
  label: string;
  userAgent: string;
}

/** Browser family only, without the version number (survives auto-updates). */
function browserFamily(ua: string): string {
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/SamsungBrowser\//.test(ua)) return "samsung";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

/** OS family only, without the version number. */
function osFamily(ua: string, platform: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mac/.test(platform) || /Mac OS X/.test(ua)) return "macos";
  if (/Win/.test(platform) || /Windows/.test(ua)) return "windows";
  if (/Linux/.test(platform) || /Linux/.test(ua)) return "linux";
  return "other";
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  const token = getOrCreateDeviceToken();
  const ua = navigator.userAgent;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "unknown";

  // Stable v2 signature.
  const hash = await sha256(["v2", token, browserFamily(ua), osFamily(ua, platform)].join("|"));

  // Legacy v1 signature (volatile) — for one-time server-side migration.
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const legacyHash = await sha256(
    [token, ua, screen, tz, lang, platform, getCanvasFingerprint()].join("|"),
  );

  return {
    hash,
    legacyHash,
    label: generateDeviceLabel(ua, platform),
    userAgent: ua,
  };
}

function generateDeviceLabel(ua: string, platform: string): string {
  let device = "Unknown device";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  else if (/Mac/.test(platform)) device = "Mac";
  else if (/Win/.test(platform)) device = "Windows PC";
  else if (/Linux/.test(platform)) device = "Linux PC";

  let browser = "browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";

  return `${device} · ${browser}`;
}

/** Clear local device token — used on "sign out everywhere" to force fresh fingerprint. */
export function clearDeviceToken() {
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = "tagex_device_token=; path=/; max-age=0; SameSite=Lax";
  } catch {
    /* ignore */
  }
}
