import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText } from "lucide-react";
import { UserManagement } from "@/components/settings/UserManagement";
import { UserApprovalPanel } from "@/components/settings/UserApprovalPanel";
import { DeletionApprovalPanel } from "@/components/settings/DeletionApprovalPanel";
import { ApprovalAuditLog } from "@/components/settings/ApprovalAuditLog";
import { SecurityDashboard } from "@/components/settings/SecurityDashboard";
import { BusinessContextSettings } from "@/components/settings/BusinessContextSettings";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ImportExportActivityLog } from "@/components/help/ImportExportActivityLog";
import { EnrichmentErrorLog } from "@/components/help/EnrichmentErrorLog";
const Settings = () => {
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

      <div className="grid gap-6">
        <BusinessContextSettings />
        
        <SecurityDashboard />

        {/* System Activity Logs Section */}
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
        
        <UserApprovalPanel />
        
        <DeletionApprovalPanel />
        
        <UserManagement />
        
        <ApprovalAuditLog />
        
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
      </div>
    </div>
  );
};

export default Settings;
