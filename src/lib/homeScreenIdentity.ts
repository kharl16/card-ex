// Scopes "Add to Home Screen" per page: the installed icon opens the page it was added from.
let blobUrl: string | null = null;

export function setHomeScreenIdentity(name: string, shortName: string, startPath: string) {
  if (typeof document === "undefined") return;
  const origin = window.location.origin;
  const manifest = {
    id: startPath,
    name,
    short_name: shortName,
    start_url: origin + startPath,
    scope: origin + "/",
    display: "standalone",
    background_color: "#010309",
    theme_color: "#010309",
    icons: [
      { src: origin + "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: origin + "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: origin + "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  link.href = blobUrl;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "apple-mobile-web-app-title";
    document.head.appendChild(meta);
  }
  meta.content = shortName;
}
