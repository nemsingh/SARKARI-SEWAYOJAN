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
  }, [location.pathname, location.search]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <style>{`
        /* Apply desktop constraints ONLY if the device has a precise mouse (laptops/computers).
           This ensures mobile phones (even in "Desktop Site" mode) stay full width. */
        @media (min-width: 1024px) and (pointer: fine) {
          body {
            background-color: #e2e8f0 !important; /* solid background separating the site */
            background-image: none !important;
          }
          html.dark body {
            background-color: #020617 !important;
          }
          html.theme-bhagwa body {
            background-color: #ffedd5 !important;
          }
          #desktop-layout-wrapper {
            max-width: 1200px;
            margin: 0 auto;
            box-shadow: 0 0 20px rgba(0,0,0,0.2);
            position: relative;
            min-height: 100vh;
            background-color: var(--background);
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
          }
        }
      `}</style>
      <div id="desktop-layout-wrapper">
        {children}
      </div>
    </>
  );
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
