import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Fade out the welcome splash once the app is up (kept briefly so the caption is readable).
const splash = document.getElementById("cx-splash");
if (splash) {
  const shownFor = performance.now();
  const wait = Math.max(0, 1400 - shownFor);
  window.setTimeout(() => {
    splash.classList.add("cx-hide");
    window.setTimeout(() => splash.remove(), 700);
  }, wait);
}
