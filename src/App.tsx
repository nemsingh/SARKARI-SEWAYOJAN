import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import CategoryMore from "./pages/CategoryMore";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DmcaPolicy from "./pages/DmcaPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import ContactUs from "./pages/ContactUs";
import FactCheckingPolicy from "./pages/FactCheckingPolicy";
import NotFound from "./pages/NotFound";
import FloatingSocialButtons from "./components/FloatingSocialButtons";

const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminPostEditor = React.lazy(() => import("./pages/AdminPostEditor"));
const AdminExcelFullscreen = React.lazy(() => import("./pages/AdminExcelFullscreen"));

const queryClient = new QueryClient();

// A layout wrapper that restricts max width on desktop ONLY for the public website
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-vikaskumar');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    // Manage Google Translate state based on `lang` query param
    const params = new URLSearchParams(location.search);
    const isLangHi = params.get('lang') === 'hi';
    const hasHiCookie = document.cookie.includes('googtrans=/en/hi');

    if (isLangHi && !hasHiCookie) {
      document.cookie = 'googtrans=/en/hi; path=/';
      document.cookie = `googtrans=/en/hi; path=/; domain=${window.location.hostname}`;
      window.location.reload();
    } else if (!isLangHi && hasHiCookie) {
      document.cookie = 'googtrans=/en/en; path=/';
      document.cookie = `googtrans=/en/en; path=/; domain=${window.location.hostname}`;
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
      window.location.reload();
    }
    
    if (isAdmin) {
      document.body.classList.add('is-admin-route');
    } else {
      document.body.classList.remove('is-admin-route');
    }
  }, [location.pathname, location.search, isAdmin]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Index />} />
              <Route path="/post/:slug" element={<PostDetail />} />
              <Route path="/category/:name" element={<CategoryMore />} />
              <Route path="/admin-vikaskumar" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/post/:id" element={<AdminPostEditor />} />
              <Route path="/admin/excel-fullscreen" element={<AdminExcelFullscreen />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/dmca-policy" element={<DmcaPolicy />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="/contact-us" element={<ContactUs />} />
              <Route path="/fact-checking-policy" element={<FactCheckingPolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <FloatingSocialButtons />
          </AppLayout>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
