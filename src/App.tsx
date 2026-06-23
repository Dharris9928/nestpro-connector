import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ImpersonationBanner } from "./components/common/ImpersonationBanner";
import { RealtimeQueryInvalidator } from "@/components/common/RealtimeQueryInvalidator";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for code splitting - reduces initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Companies = lazy(() => import("./pages/Companies"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Activities = lazy(() => import("./pages/Activities"));
const Reports = lazy(() => import("./pages/Reports"));
const AIFeatures = lazy(() => import("./pages/AIFeatures"));
const ProspectingDashboard = lazy(() => import("./pages/ProspectingDashboard"));
const Communications = lazy(() => import("./pages/Communications"));
const BuildingPermits = lazy(() => import("./pages/BuildingPermits"));
const Settings = lazy(() => import("./pages/Settings"));
const Help = lazy(() => import("./pages/Help"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Presentation = lazy(() => import("./pages/Presentation"));
const PresentationView = lazy(() => import("./pages/PresentationView"));
const PipelineAnalytics = lazy(() => import("./pages/PipelineAnalytics"));
const JobQuotes = lazy(() => import("./pages/JobQuotes"));
const PurgeCandidates = lazy(() => import("./pages/PurgeCandidates"));

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="space-y-4 w-full max-w-md p-8">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RealtimeQueryInvalidator />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ImpersonationBanner />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/companies"
              element={
                <AppLayout>
                  <Companies />
                </AppLayout>
              }
            />
            <Route
              path="/contacts"
              element={
                <AppLayout>
                  <Contacts />
                </AppLayout>
              }
            />
            <Route
              path="/opportunities"
              element={
                <AppLayout>
                  <Opportunities />
                </AppLayout>
              }
            />
            <Route
              path="/communications"
              element={
                <AppLayout>
                  <Communications />
                </AppLayout>
              }
            />
            <Route
              path="/activities"
              element={
                <AppLayout>
                  <Activities />
                </AppLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <AppLayout>
                  <Reports />
                </AppLayout>
              }
            />
            <Route
              path="/ai-features"
              element={
                <AppLayout>
                  <AIFeatures />
                </AppLayout>
              }
            />
            <Route
              path="/prospecting"
              element={
                <AppLayout>
                  <ProspectingDashboard />
                </AppLayout>
              }
            />
            <Route
              path="/permits"
              element={
                <AppLayout>
                  <BuildingPermits />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />
            <Route
              path="/help"
              element={
                <AppLayout>
                  <Help />
                </AppLayout>
              }
            />
            <Route
              path="/notifications"
              element={
                <AppLayout>
                  <Notifications />
                </AppLayout>
              }
            />
            <Route
              path="/presentation"
              element={
                <AppLayout>
                  <Presentation />
                </AppLayout>
              }
            />
            <Route path="/present/:token" element={<PresentationView />} />
            <Route
              path="/pipeline-analytics"
              element={
                <AppLayout>
                  <PipelineAnalytics />
                </AppLayout>
              }
            />
            <Route
              path="/job-quotes"
              element={
                <AppLayout>
                  <JobQuotes />
                </AppLayout>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
