import { Home, Building2, Users, Activity, BarChart3, Brain, Target, Settings, LogOut, HelpCircle, MessageSquare, DollarSign, FileText, Presentation, TrendingUp, ClipboardList } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Companies", url: "/companies", icon: Building2 },
  { title: "Contacts", url: "/contacts", icon: Users },
  { title: "Opportunities", url: "/opportunities", icon: DollarSign },
  { title: "Job Quotes", url: "/job-quotes", icon: ClipboardList },
  { title: "Communications", url: "/communications", icon: MessageSquare },
  { title: "Activities", url: "/activities", icon: Activity },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Pipeline Analytics", url: "/pipeline-analytics", icon: TrendingUp },
  { title: "AI Features", url: "/ai-features", icon: Brain },
  { title: "Presentations", url: "/presentation", icon: Presentation },
  { title: "Prospecting", url: "/prospecting", icon: Target },
  { title: "Building Permits", url: "/permits", icon: FileText },
  { title: "Help", url: "/help", icon: HelpCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="none">
      <SidebarContent>
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sidebar-primary rounded-lg">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-sidebar-foreground">Nest Pro</h2>
              <p className="text-xs text-sidebar-foreground/70">Nest Connector System</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4 border-t border-sidebar-border">
          <SidebarMenuButton onClick={handleLogout} className="w-full hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </SidebarMenuButton>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
