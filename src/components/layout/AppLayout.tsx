import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { SessionTimeoutWarning } from "@/components/settings/SessionTimeoutWarning";
import { NotificationBell } from "./NotificationBell";
import { SessionTimeoutContext } from "@/contexts/SessionTimeoutContext";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const { showWarning, timeRemaining, extendSession, handleTimeout, pauseTimeout, resumeTimeout, isPaused } = useSessionMonitor();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        } else {
          // Check approval status when user logs in
          setTimeout(() => {
            checkApprovalStatus(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      } else {
        checkApprovalStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkApprovalStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', userId)
      .single();
    
    if (!error && data) {
      setApprovalStatus(data.approval_status);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to login...</div>
      </div>
    );
  }

  // Show pending approval message
  if (approvalStatus === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">⏳</div>
          <h1 className="text-2xl font-bold">Account Pending Approval</h1>
          <p className="text-muted-foreground">
            Your account is awaiting admin approval. You'll be able to access the system once an administrator reviews and approves your registration.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Show rejected message
  if (approvalStatus === 'rejected') {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">❌</div>
          <h1 className="text-2xl font-bold">Account Not Approved</h1>
          <p className="text-muted-foreground">
            Your account registration was not approved. Please contact your administrator for more information.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <SessionTimeoutContext.Provider value={{ pauseTimeout, resumeTimeout, isPaused }}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center justify-end px-4 bg-card">
              <div className="flex items-center gap-2">
                <NotificationBell />
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      <SessionTimeoutWarning
        open={showWarning}
        timeRemaining={timeRemaining}
        onExtend={extendSession}
        onTimeout={handleTimeout}
      />
    </SessionTimeoutContext.Provider>
  );
}
