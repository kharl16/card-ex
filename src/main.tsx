import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Clear a stored sign-in whose server session no longer exists ("Session not found"),
// so pages stop loading as a ghost user and the person can sign in again.
supabase.auth.getSession().then(async ({ data }) => {
  if (!data.session) return;
  const { error } = await supabase.auth.getUser();
  if (error && (error.status === 403 || error.status === 401 || /session/i.test(error.message))) {
    await supabase.auth.signOut({ scope: "local" });
    const path = window.location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/workspace")) {
      window.location.replace(`/auth?redirect=${encodeURIComponent(path)}`);
    }
  }
});

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
    window.setTimeout(() => splash.remove(), 1000);
  }, wait);
}
