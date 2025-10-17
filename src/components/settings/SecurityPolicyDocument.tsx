import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Database, UserCheck, FileText, Lock, AlertTriangle, Download } from "lucide-react";

export function SecurityPolicyDocument() {
  const lastReviewed = new Date().toLocaleDateString();
  const version = "3.0";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Policy Documentation
            </CardTitle>
            <CardDescription>
              Comprehensive overview of the 4-layer security model
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge variant="outline">Version {version}</Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Last reviewed: {lastReviewed}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Executive Summary</h3>
          <p className="text-sm text-muted-foreground">
            This CRM implements a layered security model that balances usability with data protection. 
            The system allows sales representatives to discover and request access to records while 
            protecting sensitive information through field-level permissions and comprehensive audit trails.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {/* Layer 1: Row-Level Security */}
          <AccordionItem value="layer-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Layer 1: Row-Level Security (RLS)
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm">
                RLS policies control which records users can see based on their role and ownership.
              </p>
              <div className="space-y-2">
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium text-sm">Admin & Sales Managers</p>
                  <p className="text-sm text-muted-foreground">Can view all records across the system</p>
                </div>
                <div className="border-l-2 border-blue-500 pl-3">
                  <p className="font-medium text-sm">Sales Representatives</p>
                  <p className="text-sm text-muted-foreground">Can view records they created or are assigned to</p>
                </div>
                <div className="border-l-2 border-gray-500 pl-3">
                  <p className="font-medium text-sm">Read-Only Users</p>
                  <p className="text-sm text-muted-foreground">Can view records they created (no editing)</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Key Tables:</strong> companies, contacts, opportunities, activities, communications
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Layer 2: Field-Level Permissions */}
          <AccordionItem value="layer-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Layer 2: Field-Level Permissions
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm">
                Field permissions control what data users can see within records they have access to.
              </p>
              <div className="space-y-2">
                <div className="bg-destructive/10 p-3 rounded">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    PII Fields (Protected)
                  </p>
                  <ul className="text-sm text-muted-foreground ml-6 mt-1 list-disc">
                    <li>Email addresses → Masked as "a***@domain.***"</li>
                    <li>Phone numbers → Masked as "(***) ***-1234"</li>
                    <li>Mobile numbers → Masked as "(***) ***-5678"</li>
                  </ul>
                </div>
                <div className="bg-yellow-500/10 p-3 rounded">
                  <p className="font-medium text-sm">Financial Data (Restricted)</p>
                  <p className="text-sm text-muted-foreground">
                    Annual revenue, financial health ratings → Requires sales_manager or admin role
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Table:</strong> field_permissions defines minimum role required per field
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Layer 3: Access Request Workflow */}
          <AccordionItem value="layer-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Layer 3: Access Request Workflow
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm">
                Users can request access to records they don't own through a managed approval process.
              </p>
              <div className="space-y-2">
                <div className="border p-3 rounded">
                  <p className="font-medium text-sm">Request Process</p>
                  <ol className="text-sm text-muted-foreground ml-6 mt-1 list-decimal">
                    <li>User sees record name but PII is masked</li>
                    <li>Clicks "Request Access" and provides justification</li>
                    <li>Request goes to admins/managers for review</li>
                    <li>Approver grants access with optional expiration date</li>
                    <li>User receives notification and can access full data</li>
                  </ol>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Tables:</strong> record_access_requests, record_access_approvals
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Layer 4: Account Status Controls */}
          <AccordionItem value="layer-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Layer 4: Account Status Controls
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm">
                User account status provides administrative control over system access.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Active</Badge>
                  <span className="text-sm">Full system access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Suspended</Badge>
                  <span className="text-sm">Temporary block (violates policy)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Deactivated</Badge>
                  <span className="text-sm">Permanent block (employee departure)</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                All status changes logged in account_status_changes table
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Audit Trail */}
          <AccordionItem value="audit">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Comprehensive Audit Trail
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm">
                All sensitive operations are logged for compliance and security monitoring.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border p-2 rounded">
                  <p className="font-medium text-sm">Access Logs</p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc">
                    <li>contact_access_logs</li>
                    <li>field_access_audit_log</li>
                    <li>auth_events_log</li>
                  </ul>
                </div>
                <div className="border p-2 rounded">
                  <p className="font-medium text-sm">Change Tracking</p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc">
                    <li>audit_logs (all table changes)</li>
                    <li>account_status_changes</li>
                    <li>approval_audit_log</li>
                  </ul>
                </div>
                <div className="border p-2 rounded">
                  <p className="font-medium text-sm">Data Movement</p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc">
                    <li>export_logs</li>
                    <li>export_approval_requests</li>
                    <li>sync_logs</li>
                  </ul>
                </div>
                <div className="border p-2 rounded">
                  <p className="font-medium text-sm">Security Alerts</p>
                  <ul className="text-xs text-muted-foreground ml-4 list-disc">
                    <li>bulk_access_alerts</li>
                    <li>security_incidents</li>
                    <li>rate_limit_tracking</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Compliance */}
          <AccordionItem value="compliance">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Compliance & Risk Mitigation
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                <div className="bg-green-500/10 p-3 rounded">
                  <p className="font-medium text-sm">GDPR Compliance</p>
                  <ul className="text-sm text-muted-foreground ml-6 list-disc">
                    <li>PII fields encrypted at rest</li>
                    <li>User consent tracked in user_consents table</li>
                    <li>Right to erasure supported via deletion requests</li>
                    <li>Data export available via export_user_data function</li>
                  </ul>
                </div>
                <div className="bg-blue-500/10 p-3 rounded">
                  <p className="font-medium text-sm">Risk Mitigation</p>
                  <ul className="text-sm text-muted-foreground ml-6 list-disc">
                    <li><strong>Insider Threats:</strong> Field masking + access requests prevent unauthorized PII access</li>
                    <li><strong>Privilege Escalation:</strong> Roles stored in separate table with RLS</li>
                    <li><strong>Data Exfiltration:</strong> Export quotas + approval workflow for large exports</li>
                    <li><strong>Session Hijacking:</strong> Session monitoring + forced logouts</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex items-center gap-2 pt-4">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export as PDF
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            View Full Documentation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}