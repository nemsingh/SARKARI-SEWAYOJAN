import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import Index from "./pages/Index";
import PostDetail from "./pages/PostDetail";
import CategoryMore from "./pages/CategoryMore";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const AdminLogin = React.lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminPostEditor = React.lazy(() => import("./pages/AdminPostEditor"));
const AdminExcelFullscreen = React.lazy(() => import("./pages/AdminExcelFullscreen"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/post/:slug" element={<PostDetail />} />
            <Route path="/category/:name" element={<CategoryMore />} />
            <Route path="/admin-vikaskumar" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/post/:id" element={<AdminPostEditor />} />
            <Route path="/admin/excel-fullscreen" element={<AdminExcelFullscreen />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
