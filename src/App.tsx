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

    // Global stealth click listener for 'Sarkari Sewayojan'
    const handleGlobalClick = (e: MouseEvent) => {
      if (isAdmin) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore interactive controls
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'A' || 
        target.tagName === 'SELECT' ||
        target.closest('a') || 
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.isContentEditable
      ) {
        return;
      }

      // Check caret range to find exact clicked text character/word
      let range: Range | null = null;
      if ((document as any).caretRangeFromPoint) {
        range = (document as any).caretRangeFromPoint(e.clientX, e.clientY);
      } else if ((e as any).rangeParent) {
        range = document.createRange();
        range.setStart((e as any).rangeParent, (e as any).rangeOffset);
      }

      if (!range || !range.startContainer || range.startContainer.nodeType !== Node.TEXT_NODE) {
        // Fallback for single elements containing exactly the name
        const elementText = (target.innerText || target.textContent || '').trim().toLowerCase();
        if (elementText === 'sarkari sewayojan' || elementText === 'sarkarisewayojan') {
          window.open(window.location.origin, '_blank');
        }
        return;
      }

      const textNode = range.startContainer;
      const text = textNode.textContent || '';
      const offset = range.startOffset;

      const targets = [/sarkari\s+sewayojan/gi, /sarkarisewayojan/gi];
      let matched = false;

      for (const regex of targets) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const start = match.index;
          const end = start + match[0].length;
          // Allow small 2-char margin for accuracy on various screen densities
          if (offset >= start - 2 && offset <= end + 2) {
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (matched) {
        window.open(window.location.origin, '_blank');
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
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
