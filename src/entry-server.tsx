import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from './pages/Index';
import PostDetail from './pages/PostDetail';
import CategoryMore from './pages/CategoryMore';
import PrivacyPolicy from './pages/PrivacyPolicy';

export function render(url: string, data: any) {
  const queryClient = new QueryClient();
  
  // Inject data into global object for SSR
  (global as any).__INITIAL_DATA__ = data;

  let component;
  if (url === '/') {
    component = <Index />;
  } else if (url.startsWith('/post/')) {
    component = <PostDetail />;
  } else if (url.startsWith('/category/')) {
    component = <CategoryMore />;
  } else if (url === '/privacy-policy') {
    component = <PrivacyPolicy />;
  } else {
    component = <div>Not Found</div>;
  }

  const html = ReactDOMServer.renderToString(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StaticRouter location={url}>
          {component}
        </StaticRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
  
  return html;
}
