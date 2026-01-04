import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CardEditor from "./pages/CardEditor";
import PublicCard from "./pages/PublicCard";
import SharedCard from "./pages/SharedCard";
import CarouselSharePage from "./pages/CarouselSharePage";
import AdminCards from "./pages/AdminCards";
import AdminDataTools from "./pages/AdminDataTools";
import AdminReferrals from "./pages/AdminReferrals";
import AdminDesignPatcher from "./pages/AdminDesignPatcher";
import Gallery from "./pages/Gallery";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import BillingSuccess from "./pages/BillingSuccess";
import Tools from "./pages/Tools";
import ResourcesHub from "./pages/ResourcesHub";
import RequireAuth from "./components/auth/RequireAuth";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
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
        <Route
          path="/billing/:cardId"
          element={
            <PageTransition>
              <RequireAuth>
                <Billing />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/billing/:cardId/success"
          element={
            <PageTransition>
              <RequireAuth>
                <BillingSuccess />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route path="/c/:slug" element={<PageTransition><PublicCard /></PageTransition>} />
        <Route path="/c/:slug/share/:carouselKind" element={<PageTransition><CarouselSharePage /></PageTransition>} />
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
          path="/admin/referrals"
          element={
            <PageTransition>
              <RequireAuth>
                <AdminReferrals />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/admin/design-patcher"
          element={
            <PageTransition>
              <RequireAuth>
                <AdminDesignPatcher />
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
        <Route
          path="/tools"
          element={
            <PageTransition>
              <RequireAuth>
                <Tools />
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/resources"
          element={
            <PageTransition>
              <RequireAuth>
                <ResourcesHub />
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
      <AuthProvider>
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
