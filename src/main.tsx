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
  // Reveal the app as soon as it is ready; the backdrop clears and stops blocking
  // touches immediately while the gentle caption finishes over the opening app.
  const wait = Math.max(0, 1400 - performance.now());
  window.setTimeout(() => {
    splash.classList.add("cx-hide");
    window.setTimeout(() => splash.remove(), 1900);
  }, wait);
}
