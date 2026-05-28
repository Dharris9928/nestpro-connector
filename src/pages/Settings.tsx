import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Merge, Search, Database, Shield, Lock, FileCheck, Activity, Settings as SettingsIcon, Briefcase, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserManagement } from "@/components/settings/UserManagement";
import { UserApprovalPanel } from "@/components/settings/UserApprovalPanel";
import { DeletionApprovalPanel } from "@/components/settings/DeletionApprovalPanel";
import { ApprovalAuditLog } from "@/components/settings/ApprovalAuditLog";
import { SecurityDashboard } from "@/components/settings/SecurityDashboard";
import { BusinessContextSettings } from "@/components/settings/BusinessContextSettings";
import { SalesRepManagement } from "@/components/settings/SalesRepManagement";
import { MergeCompaniesDialog } from "@/components/settings/MergeCompaniesDialog";
import { DuplicateDetectionDialog } from "@/components/settings/DuplicateDetectionDialog";
import { AccessReviewDashboard } from "@/components/settings/AccessReviewDashboard";
import { InactiveUserDetection } from "@/components/settings/InactiveUserDetection";
import { RoleExpirationManager } from "@/components/settings/RoleExpirationManager";
import { VulnerabilityDashboard } from "@/components/settings/VulnerabilityDashboard";
import { SecurityPatchManager } from "@/components/settings/SecurityPatchManager";
import { SecurityTestingLog } from "@/components/settings/SecurityTestingLog";
import { SOC2ComplianceDashboard } from "@/components/settings/SOC2ComplianceDashboard";
import { AllowedDomainsManager } from "@/components/settings/domain/AllowedDomainsManager";
import { BlockedSignupsViewer } from "@/components/settings/domain/BlockedSignupsViewer";
import { EncryptionManager } from "@/components/settings/encryption/EncryptionManager";
import { EncryptionSetupGuide } from "@/components/settings/encryption/EncryptionSetupGuide";
import { EncryptionUsageGuide } from "@/components/settings/encryption/EncryptionUsageGuide";
import { EncryptionDashboard } from "@/components/settings/encryption/EncryptionDashboard";
import { ConsentManagement } from "@/components/settings/gdpr/ConsentManagement";
import { DataExportRequest } from "@/components/settings/gdpr/DataExportRequest";
import { PIIInventoryDashboard } from "@/components/settings/gdpr/PIIInventoryDashboard";
import { RightToBeForgotten } from "@/components/settings/gdpr/RightToBeForgotten";
import { SecurityGrowthTracker } from "@/components/settings/SecurityGrowthTracker";
import { ComplianceDocumentsDashboard } from "@/components/settings/ComplianceDocumentsDashboard";
import { DataWarehouseSync } from "@/components/settings/DataWarehouseSync";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ImportExportActivityLog } from "@/components/help/ImportExportActivityLog";
import { EnrichmentErrorLog } from "@/components/help/EnrichmentErrorLog";
import { useUserRole } from "@/hooks/useUserRole";
import { MFAManagement } from "@/components/settings/MFAManagement";
import { AuthEventsLog } from "@/components/settings/audit/AuthEventsLog";
import { ComprehensiveAuditViewer } from "@/components/settings/audit/ComprehensiveAuditViewer";
import { ImportExportLogsViewer } from "@/components/settings/audit/ImportExportLogsViewer";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { ApprovalAuditViewer } from "@/components/settings/audit/ApprovalAuditViewer";
import { ContactAccessLogsViewer } from "@/components/settings/audit/ContactAccessLogsViewer";
import { AutomationKillSwitch } from "@/components/settings/AutomationKillSwitch";
import { AccessRequestsPanel } from '@/components/settings/AccessRequestsPanel';
import { FieldPermissionsManager } from '@/components/settings/FieldPermissionsManager';
import { FieldAccessAuditLog } from '@/components/settings/FieldAccessAuditLog';
import { DatabaseManagement } from '@/components/settings/DatabaseManagement';
import { SecurityPolicyDocument } from "@/components/settings/SecurityPolicyDocument";
import { AccessPatternMonitor } from "@/components/settings/AccessPatternMonitor";
import { AccessExpirationManager } from "@/components/settings/AccessExpirationManager";
import { DatabaseManagementImproved } from "@/components/settings/DatabaseManagementImproved";
import { AIErrorHelper } from "@/components/settings/AIErrorHelper";
import { UserImpersonation } from "@/components/settings/UserImpersonation";
import { UploadLogViewer } from "@/components/settings/UploadLogViewer";

const Settings = () => {
  const { data: userData } = useUserRole();
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const builderSegments = [
    { name: "Production/Tract Builders", priority: "40%", description: "100-1,000+ homes annually" },
    { name: "Regional Mid-Volume Builders", priority: "25%", description: "25-100 homes annually" },
    { name: "Spec Home Builders", priority: "15%", description: "10-50 homes annually" },
    { name: "Luxury Custom Builders", priority: "8%", description: "5-25 homes annually, $1M-$10M+" },
    { name: "Multi-Family Developers", priority: "7%", description: "50-500+ units" },
    { name: "Affordable Housing Builders", priority: "3%", description: "20-100 units annually" },
    { name: "Active Adult/55+ Specialists", priority: "2%", description: "50-200 homes annually" },
  ];

  const contractorSegments = [
    { name: "Smart Home Champions", priority: "30%", description: "20+ Nest installs annually" },
    { name: "Customer Experience Innovators", priority: "25%", description: "High retention, premium service" },
    { name: "High-Volume Installers", priority: "20%", description: "100+ installs annually" },
    { name: "Emergency/Repair Specialists", priority: "15%", description: "60%+ emergency/reactive" },
    { name: "Premium Service Specialists", priority: "10%", description: "$2,500-$10,000+ tickets" },
    { name: "Regional Growth Contractors", priority: "8%", description: "25-75 installs, 20%+ YoY growth" },
    { name: "Specialty HVAC Integrators", priority: "4%", description: "Building automation, technical" },
    { name: "Service-First Traditionalists", priority: "3%", description: "15+ years, loyal customer base" },
  ];

  const statuses = [
    { name: "Lead", color: "bg-status-lead", description: "Initial prospect identification" },
    { name: "Contacted", color: "bg-status-contacted", description: "First outreach completed" },
    { name: "Engaged", color: "bg-status-engaged", description: "Active communication" },
    { name: "Pilot", color: "bg-status-pilot", description: "Testing program in progress" },
    { name: "Active", color: "bg-status-active", description: "Current customer" },
    { name: "Inactive", color: "bg-status-inactive", description: "No recent activity" },
    { name: "Lost", color: "bg-status-lost", description: "Deal closed - lost" },
  ];

  const priorityTiers = [
    { name: "P1: 80-100", color: "bg-priority-p1", description: "High-touch sequence" },
    { name: "P2: 60-79", color: "bg-priority-p2", description: "Standard sequence" },
    { name: "P3: 40-59", color: "bg-priority-p3", description: "Nurture sequence" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          View and understand your CRM configuration
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Builder Segments</CardTitle>
            </div>
            <CardDescription>
              7 segments prioritized by market opportunity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {builderSegments.map((segment, index) => (
              <div key={index}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">{segment.name}</Label>
                      <Badge variant="secondary">{segment.priority} Priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{segment.description}</p>
                  </div>
                </div>
                {index < builderSegments.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Contractor Segments</CardTitle>
            </div>
            <CardDescription>
              8 segments based on service model and growth trajectory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractorSegments.map((segment, index) => (
              <div key={index}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base font-medium">{segment.name}</Label>
                      <Badge variant="secondary">{segment.priority} Priority</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{segment.description}</p>
                  </div>
                </div>
                {index < contractorSegments.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Status Values</CardTitle>
            <CardDescription>
              Sales pipeline stages for tracking company progression
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {statuses.map((status, index) => (
              <div key={index}>
                <div className="flex items-center gap-3">
                  <Badge className={status.color}>{status.name}</Badge>
                  <span className="text-sm text-muted-foreground">{status.description}</span>
                </div>
                {index < statuses.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Tiers</CardTitle>
            <CardDescription>
              Lead scoring thresholds for outreach prioritization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priorityTiers.map((tier, index) => (
              <div key={index}>
                <div className="flex items-center gap-3">
                  <Badge className={tier.color + " text-white"}>{tier.name}</Badge>
                  <span className="text-sm text-muted-foreground">{tier.description}</span>
                </div>
                {index < priorityTiers.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notification Preferences</CardTitle>
            </div>
            <CardDescription>
              Manage your notification settings and delivery preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* AI Error Helper */}
        <AIErrorHelper />

        {/* Automation Kill Switch (admin-only, self-gates) */}
        <AutomationKillSwitch />

        {/* Admin Impersonation Tool */}
        {userData?.role === 'admin' && <UserImpersonation />}
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <AccessPatternMonitor />
          <AccessExpirationManager />
          <AccessRequestsPanel />
          <MFAManagement />
          <SecurityDashboard />
          <FieldPermissionsManager />
          <FieldAccessAuditLog />
          
          {userData?.role === 'admin' && (
            <>
              <SecurityGrowthTracker />
              <AllowedDomainsManager />
              <BlockedSignupsViewer />
              
              {/* Security Audit Logs */}
              <AuthEventsLog />
              <ComprehensiveAuditViewer />
              <ContactAccessLogsViewer />
              <ImportExportLogsViewer />
              <ApprovalAuditViewer />
            </>
          )}
          
          {userData?.hasElevatedAccess && (
            <>
              <AccessReviewDashboard />
              <RoleExpirationManager />
              <InactiveUserDetection />
            </>
          )}
          
          {userData?.role === 'admin' && (
            <>
              <VulnerabilityDashboard />
              <SecurityPatchManager />
              <SecurityTestingLog />
            </>
          )}
        </TabsContent>

        {/* Compliance Settings */}
        <TabsContent value="compliance" className="space-y-6 mt-6">
          <ConsentManagement />
          <DataExportRequest />
          <RightToBeForgotten />
          
          {userData?.role === 'admin' && (
            <>
              <PIIInventoryDashboard />
              <ComplianceDocumentsDashboard />
              <EncryptionDashboard />
              <EncryptionManager />
              <EncryptionSetupGuide />
              <EncryptionUsageGuide />
              <SOC2ComplianceDashboard />
            </>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6 mt-6">
          <SecurityPolicyDocument />
        </TabsContent>

        {/* User Management Settings */}
        <TabsContent value="users" className="space-y-6 mt-6">
          {/* Consolidated user management: Pending Invites + Pending Sign-Ups with role assignment */}
          <UserManagement />
          <TeamManagement />
          <DeletionApprovalPanel />
          <ApprovalAuditLog />
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <CardTitle>Sales Rep Database</CardTitle>
              </div>
              <CardDescription>Manage external sales personnel</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesRepManagement />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Management Settings */}
        <TabsContent value="data" className="space-y-6 mt-6">
          {userData?.role === 'admin' && (
            <>
              <DatabaseManagementImproved />
              
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Merge className="h-5 w-5 text-primary" />
                    <CardTitle>Admin Tools</CardTitle>
                  </div>
                  <CardDescription>Advanced administrative functions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Find Duplicate Companies</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Detect potential duplicate company records using intelligent fuzzy matching. Searches are logged with timestamps for audit purposes.
                      </p>
                      <Button onClick={() => setIsDuplicateDialogOpen(true)} variant="outline">
                        <Search className="h-4 w-4 mr-2" />
                        Find Duplicates
                      </Button>
                    </div>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Merge Company Profiles</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Combine duplicate company profiles by transferring all contacts, activities, and data from one company to another.
                      </p>
                      <Button onClick={() => setIsMergeDialogOpen(true)} variant="outline">
                        <Merge className="h-4 w-4 mr-2" />
                        Merge Companies
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Upload Log - Batch Tracking & Rollback */}
              <UploadLogViewer />
              
              <DataWarehouseSync />
            </>
          )}
        </TabsContent>

        {/* Activity Logs */}
        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>System Activity Logs</CardTitle>
              </div>
              <CardDescription>Imports, exports, and enrichment activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImportExportActivityLog />
              <EnrichmentErrorLog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MergeCompaniesDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        onSuccess={() => {
          // Data will automatically refresh via realtime subscriptions
        }}
      />

      <DuplicateDetectionDialog
        open={isDuplicateDialogOpen}
        onOpenChange={setIsDuplicateDialogOpen}
      />
    </div>
  );
};

export default Settings;
