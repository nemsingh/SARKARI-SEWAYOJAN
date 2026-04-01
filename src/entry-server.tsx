import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from './pages/Index';
import PostDetail from './pages/PostDetail';
import CategoryMore from './pages/CategoryMore';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DmcaPolicy from './pages/DmcaPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import ContactUs from './pages/ContactUs';
import NotFound from './pages/NotFound';

export function render(url: string, data: any) {
  const queryClient = new QueryClient();
  
  // Inject data into global object for SSR
  (global as any).__INITIAL_DATA__ = data;

  const html = ReactDOMServer.renderToString(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StaticRouter location={url}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/category/:name" element={<CategoryMore />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/dmca-policy" element={<DmcaPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
            <Route path="/contact-us" element={<ContactUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </StaticRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
  
  return html;
}
