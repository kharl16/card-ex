import { useEffect, useState } from "react";

export type VideoProgress = {
  id: string;
  title: string;
  thumbnail?: string | null;
  videoUrl?: string | null;
  sourceType?: string | null;
  category?: string | null;
  currentTime: number;
  duration: number;
  percent: number; // 0-100
  lastPlayedAt: number;
  completed?: boolean;
};

const KEY = "cardex:videoProgress:v1";
const EVT = "cardex:videoProgress:updated";

function read(): Record<string, VideoProgress> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function write(data: Record<string, VideoProgress>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(EVT));
  } catch {
    // ignore quota
  }
}

export function getProgress(id: string): VideoProgress | undefined {
  return read()[id];
}

export function listProgress(): VideoProgress[] {
  return Object.values(read()).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

export function recordProgress(
  id: string,
  patch: Partial<VideoProgress> & { title: string },
) {
  const all = read();
  const prev: VideoProgress =
    all[id] ||
    {
      id,
      title: patch.title,
      currentTime: 0,
      duration: 0,
      percent: 0,
      lastPlayedAt: Date.now(),
    };
  const next: VideoProgress = {
    ...prev,
    ...patch,
    id,
    lastPlayedAt: Date.now(),
  };
  if (next.duration > 0) {
    next.percent = Math.min(
      100,
      Math.max(0, Math.round((next.currentTime / next.duration) * 100)),
    );
    if (next.percent >= 95) next.completed = true;
  }
  all[id] = next;
  write(all);
}

export function removeProgress(id: string) {
  const all = read();
  delete all[id];
  write(all);
}

export function markCompleted(id: string) {
  const all = read();
  if (!all[id]) return;
  all[id].completed = true;
  all[id].percent = 100;
  all[id].lastPlayedAt = Date.now();
  write(all);
}

export function useProgressList(): VideoProgress[] {
  const [list, setList] = useState<VideoProgress[]>(() => listProgress());
  useEffect(() => {
    const h = () => setList(listProgress());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return list;
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^"&?\/\s]{11})/,
  );
  return match ? match[1] : null;
}

export function buildResumeUrl(
  videoUrl: string,
  currentTime: number,
): string {
  const sec = Math.max(0, Math.floor(currentTime));
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) return `https://youtu.be/${ytId}${sec > 0 ? `?t=${sec}s` : ""}`;
  if (sec <= 0) return videoUrl;
  try {
    const u = new URL(videoUrl);
    u.searchParams.set("t", String(sec));
    return u.toString();
  } catch {
    return videoUrl;
  }
}

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(day / 365);
  return `${yr}y ago`;
}

export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
