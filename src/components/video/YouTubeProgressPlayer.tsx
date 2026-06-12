import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Props {
  videoId: string;
  startSeconds?: number;
  onProgress: (currentTime: number, duration: number, ended: boolean) => void;
}

let apiPromise: Promise<any> | null = null;

function loadYouTubeAPI(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(s);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll);
        resolve(window.YT);
      }
    }, 150);
  });
  return apiPromise;
}

export default function YouTubeProgressPlayer({ videoId, startSeconds = 0, onProgress }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeAPI().then((YT) => {
      if (cancelled || !hostRef.current) return;
      // YT replaces the host node; create a child so we don't lose the parent ref
      const mount = document.createElement("div");
      mount.className = "w-full h-full";
      hostRef.current.appendChild(mount);

      const report = (ended: boolean) => {
        const p = playerRef.current;
        if (!p?.getCurrentTime || !p?.getDuration) return;
        const ct = p.getCurrentTime();
        const dur = p.getDuration();
        if (dur > 0) onProgress(ct, dur, ended);
      };

      playerRef.current = new YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          start: Math.max(0, Math.floor(startSeconds || 0)),
        },
        events: {
          onReady: () => {
            intervalRef.current = window.setInterval(() => report(false), 4000);
          },
          onStateChange: (e: any) => {
            const ended = e.data === YT.PlayerState.ENDED;
            report(ended);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      const p = playerRef.current;
      try {
        const ct = p?.getCurrentTime?.() ?? 0;
        const dur = p?.getDuration?.() ?? 0;
        if (dur > 0) onProgress(ct, dur, false);
      } catch {
        // ignore
      }
      try {
        p?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return <div ref={hostRef} className="w-full h-full" />;
}
