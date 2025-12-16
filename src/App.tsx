import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ImpersonationBanner } from "./components/common/ImpersonationBanner";
import { RealtimeQueryInvalidator } from "@/components/common/RealtimeQueryInvalidator";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Contacts from "./pages/Contacts";
import Opportunities from "./pages/Opportunities";
import Activities from "./pages/Activities";
import Reports from "./pages/Reports";
import AIFeatures from "./pages/AIFeatures";
import ProspectingDashboard from "./pages/ProspectingDashboard";
import Communications from "./pages/Communications";
import BuildingPermits from "./pages/BuildingPermits";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Presentation from "./pages/Presentation";
import PresentationView from "./pages/PresentationView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RealtimeQueryInvalidator />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ImpersonationBanner />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
