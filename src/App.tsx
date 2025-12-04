import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CardEditor from "./pages/CardEditor";
import PublicCard from "./pages/PublicCard";
import SharedCard from "./pages/SharedCard";
import AdminCards from "./pages/AdminCards";
import AdminDataTools from "./pages/AdminDataTools";
import Gallery from "./pages/Gallery";
import Analytics from "./pages/Analytics";
import RequireAuth from "./components/auth/RequireAuth";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />
        <Route path="/auth/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/cards/:id/edit"
          element={
            <PageTransition>
              <RequireAuth>
                <CardEditor />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/cards/:id/analytics"
          element={
            <PageTransition>
              <RequireAuth>
                <Analytics />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route path="/c/:slug" element={<PageTransition><PublicCard /></PageTransition>} />
        <Route path="/s/:code" element={<PageTransition><SharedCard /></PageTransition>} />
        {/* Custom slug route - must be after all other routes except catch-all */}
        <Route path="/:customSlug" element={<PageTransition><PublicCard customSlug={true} /></PageTransition>} />
        <Route
          path="/admin/cards"
          element={
            <PageTransition>
              <RequireAuth>
                <AdminCards />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/admin/data-tools"
          element={
            <PageTransition>
              <RequireAuth>
                <AdminDataTools />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/gallery"
          element={
            <PageTransition>
              <RequireAuth>
                <Gallery />
              </RequireAuth>
            </PageTransition>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
