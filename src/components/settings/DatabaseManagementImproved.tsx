import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Database, Shield, FileText, Settings, Server, Building2, Users, Activity, AlertCircle } from "lucide-react";

interface TableInfo {
  table_name: string;
}

interface TableMetadata {
  name: string;
  description: string;
  module: string;
  usedIn: string[];
  icon: any;
}

// Table organization metadata
const tableMetadata: Record<string, TableMetadata> = {
  // CRM Data
  companies: {
    name: "companies",
    description: "Main company records with all business information",
    module: "CRM Data",
    usedIn: ["Companies Page", "Dashboard", "Reports"],
    icon: Building2,
  },
  companies_decrypted: {
    name: "companies_decrypted",
    description: "View with decrypted PII fields for authorized users",
    module: "CRM Data",
    usedIn: ["Company Detail View", "Protected Fields"],
    icon: Building2,
  },
  companies_financial_masked: {
    name: "companies_financial_masked",
    description: "Financial data view with role-based masking",
    module: "CRM Data",
    usedIn: ["Financial Reports", "Analytics"],
    icon: Building2,
  },
  contacts: {
    name: "contacts",
    description: "Contact records with encrypted PII",
    module: "CRM Data",
    usedIn: ["Contacts Page", "Company Details", "Communications"],
    icon: Users,
  },
  contacts_masked: {
    name: "contacts_masked",
    description: "Contact view with masked sensitive fields",
    module: "CRM Data",
    usedIn: ["Contact Lists", "Search Results"],
    icon: Users,
  },
  opportunities: {
    name: "opportunities",
    description: "Sales opportunities and pipeline",
    module: "CRM Data",
    usedIn: ["Opportunities Page", "Kanban View", "Calendar"],
    icon: Activity,
  },
  activities: {
    name: "activities",
    description: "Activity tracking and task management",
    module: "CRM Data",
    usedIn: ["Activities Page", "Timeline View"],
    icon: Activity,
  },
  communications: {
    name: "communications",
    description: "Communication logs and history",
    module: "CRM Data",
    usedIn: ["Communications Page", "Activity Feed"],
    icon: Activity,
  },
  
  // Security & Access Control
  profiles: {
    name: "profiles",
    description: "User profiles with approval and account status",
    module: "Security",
    usedIn: ["Auth", "User Management", "Settings"],
    icon: Shield,
  },
  user_roles: {
    name: "user_roles",
    description: "Role assignments (admin, sales_manager, sales_rep, read_only)",
    module: "Security",
    usedIn: ["Authorization", "RLS Policies"],
    icon: Shield,
  },
  record_access_requests: {
    name: "record_access_requests",
    description: "Access request workflow for restricted records",
    module: "Security",
    usedIn: ["Request Access Buttons", "Access Approvals"],
    icon: Shield,
  },
  record_access_approvals: {
    name: "record_access_approvals",
    description: "Granted access with optional expiration dates",
    module: "Security",
    usedIn: ["Access Management", "Expiration Monitoring"],
    icon: Shield,
  },
  field_permissions: {
    name: "field_permissions",
    description: "Field-level access control rules",
    module: "Security",
    usedIn: ["Protected Fields", "Data Masking"],
    icon: Shield,
  },
  user_sessions: {
    name: "user_sessions",
    description: "Active user session tracking",
    module: "Security",
    usedIn: ["Session Monitor", "Forced Logout"],
    icon: Shield,
  },
  user_mfa_status: {
    name: "user_mfa_status",
    description: "Multi-factor authentication enrollment status",
    module: "Security",
    usedIn: ["MFA Settings", "Security Enforcement"],
    icon: Shield,
  },
  
  // Audit & Compliance
  audit_logs: {
    name: "audit_logs",
    description: "Comprehensive audit trail of all table changes",
    module: "Audit",
    usedIn: ["Audit Viewer", "Compliance Reports"],
    icon: FileText,
  },
  contact_access_logs: {
    name: "contact_access_logs",
    description: "Contact view and access tracking",
    module: "Audit",
    usedIn: ["Access Monitoring", "Security Audits"],
    icon: FileText,
  },
  field_access_audit_log: {
    name: "field_access_audit_log",
    description: "Field-level access attempt logging",
    module: "Audit",
    usedIn: ["Field Access Monitoring"],
    icon: FileText,
  },
  auth_events_log: {
    name: "auth_events_log",
    description: "Login, logout, and authentication events",
    module: "Audit",
    usedIn: ["Security Dashboard", "Auth Monitoring"],
    icon: FileText,
  },
  export_logs: {
    name: "export_logs",
    description: "Data export tracking and watermarking",
    module: "Audit",
    usedIn: ["Export Management", "Data Movement Tracking"],
    icon: FileText,
  },
  export_approval_requests: {
    name: "export_approval_requests",
    description: "Approval workflow for large exports",
    module: "Audit",
    usedIn: ["Export Approvals", "Quota Management"],
    icon: FileText,
  },
  bulk_access_alerts: {
    name: "bulk_access_alerts",
    description: "Suspicious activity and bulk access detection",
    module: "Audit",
    usedIn: ["Security Alerts", "Pattern Monitoring"],
    icon: FileText,
  },
  account_status_changes: {
    name: "account_status_changes",
    description: "User status change audit trail",
    module: "Audit",
    usedIn: ["User Management", "Compliance"],
    icon: FileText,
  },
  
  // Business Configuration
  scoring_configuration: {
    name: "scoring_configuration",
    description: "Lead scoring rules and point values",
    module: "Configuration",
    usedIn: ["Lead Scoring", "Score Calculation"],
    icon: Settings,
  },
  enrichment_logs: {
    name: "enrichment_logs",
    description: "Data enrichment history and results",
    module: "Configuration",
    usedIn: ["Enrichment Features", "Data Quality"],
    icon: Settings,
  },
  ai_usage_logs: {
    name: "ai_usage_logs",
    description: "AI feature usage and token tracking",
    module: "Configuration",
    usedIn: ["AI Features", "Usage Analytics"],
    icon: Settings,
  },
  team_memberships: {
    name: "team_memberships",
    description: "Manager-rep team relationships",
    module: "Configuration",
    usedIn: ["Team Management", "Territory Assignment"],
    icon: Settings,
  },
  sales_representatives: {
    name: "sales_representatives",
    description: "External sales representative data",
    module: "Configuration",
    usedIn: ["Sales Rep Management"],
    icon: Settings,
  },
  
  // System & Infrastructure
  allowed_email_domains: {
    name: "allowed_email_domains",
    description: "Whitelisted email domains for signup",
    module: "System",
    usedIn: ["Signup Validation", "Domain Management"],
    icon: Server,
  },
  blocked_signup_attempts: {
    name: "blocked_signup_attempts",
    description: "Rejected signup attempts log",
    module: "System",
    usedIn: ["Security Monitoring", "Domain Blocking"],
    icon: Server,
  },
  password_reset_codes: {
    name: "password_reset_codes",
    description: "Password reset token management",
    module: "System",
    usedIn: ["Password Reset Flow"],
    icon: Server,
  },
  compliance_documents: {
    name: "compliance_documents",
    description: "Privacy policies and terms of service",
    module: "System",
    usedIn: ["Legal Pages", "Consent Management"],
    icon: Server,
  },
  user_consents: {
    name: "user_consents",
    description: "User consent tracking (GDPR)",
    module: "System",
    usedIn: ["Privacy Compliance", "Consent UI"],
    icon: Server,
  },
  security_incidents: {
    name: "security_incidents",
    description: "Security incident tracking and response",
    module: "System",
    usedIn: ["Incident Management", "Security Dashboard"],
    icon: Server,
  },
  vendor_risk_assessments: {
    name: "vendor_risk_assessments",
    description: "Third-party vendor security reviews",
    module: "System",
    usedIn: ["Vendor Management", "Risk Dashboard"],
    icon: Server,
  },
};

export function DatabaseManagementImproved() {
  const [selectedModule, setSelectedModule] = useState<string>("CRM Data");

  // Fetch all tables
  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables-list"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_table_list");
      if (error) throw error;
      return data as TableInfo[];
    },
  });

  // Group tables by module
  const tablesByModule = tables?.reduce((acc, table) => {
    const metadata = tableMetadata[table.table_name];
    const module = metadata?.module || "Other";
    
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push({
      ...table,
      ...metadata,
    });
    return acc;
  }, {} as Record<string, any[]>);

  const modules = [
    { name: "CRM Data", icon: Building2, color: "text-blue-500" },
    { name: "Security", icon: Shield, color: "text-red-500" },
    { name: "Audit", icon: FileText, color: "text-yellow-500" },
    { name: "Configuration", icon: Settings, color: "text-green-500" },
    { name: "System", icon: Server, color: "text-gray-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Management
        </CardTitle>
        <CardDescription>
          Organized view of database tables by functional module
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 mb-6">
          {modules.map((module) => (
            <button
              key={module.name}
              onClick={() => setSelectedModule(module.name)}
              className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                selectedModule === module.name
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <module.icon className={`h-6 w-6 ${module.color}`} />
              <span className="text-sm font-medium">{module.name}</span>
              {tablesByModule && (
                <Badge variant="secondary" className="text-xs">
                  {tablesByModule[module.name]?.length || 0} tables
                </Badge>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tables...</p>
        ) : (
          <ScrollArea className="h-[600px]">
            {tablesByModule && tablesByModule[selectedModule] ? (
              <Accordion type="single" collapsible className="w-full">
                {tablesByModule[selectedModule].map((table: any) => (
                  <AccordionItem key={table.table_name} value={table.table_name}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-3 w-full">
                        {table.icon && <table.icon className="h-4 w-4" />}
                        <div className="flex-1 text-left">
                          <p className="font-medium">{table.table_name}</p>
                          {table.description && (
                            <p className="text-sm text-muted-foreground">{table.description}</p>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-7">
                        {table.usedIn && table.usedIn.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Used In:</p>
                            <div className="flex flex-wrap gap-2">
                              {table.usedIn.map((location: string) => (
                                <Badge key={location} variant="outline">
                                  {location}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {!table.description && !table.usedIn && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="h-4 w-4 mt-0.5" />
                            <p>No metadata available for this table</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tables found in this module
                </p>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}