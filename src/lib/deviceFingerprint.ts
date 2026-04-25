/**
 * Device fingerprinting for one-device-per-account enforcement.
 * Combines stable browser/OS signals + a persistent random token in localStorage.
 * Stored hashed (SHA-256) on the server so reading the DB never reveals the raw value.
 */

const DEVICE_TOKEN_KEY = "tagex_device_token_v1";

function getOrCreateDeviceToken(): string {
  try {
    let token = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
    return token;
  } catch {
    // Private mode / storage blocked → generate ephemeral token (will be treated as new device every time)
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
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
  label: string;
  userAgent: string;
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  const token = getOrCreateDeviceToken();
  const ua = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "unknown";
  const canvas = getCanvasFingerprint();

  const raw = [token, ua, screen, tz, lang, platform, canvas].join("|");
  const hash = await sha256(raw);

  return {
    hash,
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
    // ignore
  }
}
