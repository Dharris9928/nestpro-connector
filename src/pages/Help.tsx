import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EnrichmentErrorLog } from '@/components/help/EnrichmentErrorLog';
import { ImportExportActivityLog } from '@/components/help/ImportExportActivityLog';
import { AIUsageLog } from '@/components/help/AIUsageLog';
import { SystemDiagnostics } from '@/components/help/SystemDiagnostics';
import {
  Search, 
  Building2, 
  Users, 
  Activity, 
  Brain, 
  Target, 
  BarChart3, 
  Settings, 
  Shield, 
  Star,
  TrendingUp,
  Filter,
  Download,
  Upload,
  Zap,
  Award,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('getting-started');

  // Version information
  const documentVersion = "3.0";
  const lastUpdated = "2025-10-16";

  const sections = [
    { value: 'getting-started', label: 'Getting Started', keywords: 'welcome quick start guide roles overview' },
    { value: 'companies', label: 'Companies', keywords: 'companies management lead scoring filters bulk actions enrichment segments recommendations apollo perspective limited view' },
    { value: 'contacts', label: 'Contacts', keywords: 'contacts management decision makers influencers contact scoring import csv apollo' },
    { value: 'communications', label: 'Communications', keywords: 'communications ai generated emails call scripts linkedin messages outreach' },
    { value: 'prospecting', label: 'Prospecting', keywords: 'prospecting apollo search csv import segments recommendations' },
    { value: 'activities', label: 'Activities', keywords: 'activities outreach types outcomes sequences calendar' },
    { value: 'ai-features', label: 'AI Features', keywords: 'ai features scoring prioritization outreach strategy batch usage logs' },
    { value: 'reports', label: 'Reports', keywords: 'reports analytics scoring breakdown distribution segment performance enrichment' },
    { value: 'settings', label: 'Settings', keywords: 'settings user management security dashboard deletion approval integrations business context access controls audit logs encryption data warehouse sync bigquery suspension deactivation database management field permissions' },
    { value: 'activity-logs', label: 'Activity Logs', keywords: 'logs import export enrichment ai usage monitoring tracking' },
    { value: 'diagnostics', label: 'System Diagnostics', keywords: 'diagnostics system test debug troubleshooting edge functions database webhook authentication' },
  ];

  const matches = searchQuery.trim().length > 0
    ? sections.filter(s =>
        (s.label + ' ' + s.keywords).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Help & User Guide</h1>
            <div className="text-right">
              <Badge variant="outline">v{documentVersion}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Updated: {lastUpdated}</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-2">
            Complete guide to using the Nest Connector System
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {searchQuery.trim().length > 0 && (
        <Card className="max-w-3xl mt-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Search Results</CardTitle>
              <CardDescription>Jump to matching sections</CardDescription>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSearchQuery('')}>Clear</Button>
          </CardHeader>
          <CardContent>
            {matches.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {matches.map((s) => (
                  <Button key={s.value} variant="outline" size="sm" onClick={() => setActiveTab(s.value)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matches found. Try different keywords.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap justify-start gap-1">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="ai-features">AI Features</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity-logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Getting Started Tab */}
        <TabsContent value="getting-started" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Welcome to Nest Connector System
              </CardTitle>
              <CardDescription>
                Your complete CRM solution for managing construction industry relationships
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">What is Nest Connector System?</h3>
                  <p className="text-muted-foreground">
                    Nest Connector System is a specialized CRM designed for the construction industry. 
                    It helps you manage relationships with builders and contractors, track outreach activities, 
                    and prioritize leads based on intelligent scoring algorithms.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Key Capabilities</h3>
                  <div className="grid md:grid-cols-2 gap-4 mt-3">
                    <div className="flex gap-3">
                      <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">Company Management</p>
                        <p className="text-sm text-muted-foreground">Track builders and contractors with intelligent lead scoring</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Users className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">Contact Tracking</p>
                        <p className="text-sm text-muted-foreground">Manage decision makers and influencers</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Target className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">Prospecting Tools</p>
                        <p className="text-sm text-muted-foreground">Find and import new prospects via Apollo integration</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-medium">AI-Powered Insights</p>
                        <p className="text-sm text-muted-foreground">Automated scoring and outreach recommendations</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">User Roles</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Admin</Badge>
                      <p className="text-sm text-muted-foreground">Full system access, user management, security controls</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Sales Manager</Badge>
                      <p className="text-sm text-muted-foreground">Manage companies, contacts, activities, and view reports</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Sales Rep</Badge>
                      <p className="text-sm text-muted-foreground">Create activities, manage assigned companies</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Read Only</Badge>
                      <p className="text-sm text-muted-foreground">View-only access to dashboard and reports</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="step-1">
                  <AccordionTrigger>Step 1: Add Your First Company</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Navigate to the Companies page and click "Add Company"</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Enter company name and basic information</li>
                      <li>Select company type (Builder or Contractor)</li>
                      <li>Add location and market segment details</li>
                      <li>The system will automatically calculate an initial lead score</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-2">
                  <AccordionTrigger>Step 2: Add Contacts</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Add key decision makers and influencers for each company</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Click on a company to view details</li>
                      <li>Add contacts with their role and decision tier</li>
                      <li>Track LinkedIn profiles for engagement scoring</li>
                      <li>Contact scoring affects overall company priority</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-3">
                  <AccordionTrigger>Step 3: Track Activities</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Log all outreach activities to maintain comprehensive records</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Record calls, emails, meetings, and site visits</li>
                      <li>Track activity outcomes (Completed, No Answer, Follow-up, etc.)</li>
                      <li>Schedule follow-up activities</li>
                      <li>Activities influence engagement scoring</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="step-4">
                  <AccordionTrigger>Step 4: Use Prospecting Tools</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    <p>Find new prospects that match your ideal customer profile</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Use Apollo integration to search for companies</li>
                      <li>Filter by segment, location, and size</li>
                      <li>Import prospects directly into your CRM</li>
                      <li>Enrich company data with external information</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Companies Management
              </CardTitle>
              <CardDescription>
                Complete guide to managing companies in your CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="add-company">
                  <AccordionTrigger>Adding & Editing Companies</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Required Fields</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Company Name:</strong> Official business name</li>
                        <li><strong>Type:</strong> Builder or Contractor</li>
                        <li><strong>Status:</strong> Active, Prospect, or Inactive</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Optional But Recommended</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Address and location details</li>
                        <li>Website and social media links</li>
                        <li>Annual revenue and employee count</li>
                        <li>Market segment and product category</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="lead-scoring">
                  <AccordionTrigger>Understanding Lead Scores & Priority Tiers</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Priority Tiers</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-500">P1</Badge>
                          <span className="text-sm">Score 70-100 - Highest priority, immediate action needed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-500">P2</Badge>
                          <span className="text-sm">Score 40-69 - Medium priority, regular follow-up</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">P3</Badge>
                          <span className="text-sm">Score 0-39 - Lower priority, periodic check-ins</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Scoring Factors</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Company Size:</strong> Revenue and employee count</li>
                        <li><strong>Market Segment:</strong> Target segment alignment</li>
                        <li><strong>Engagement:</strong> Recent activities and responsiveness</li>
                        <li><strong>Contact Quality:</strong> Decision maker access</li>
                        <li><strong>Relationship Strength:</strong> Historical interactions</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="filters">
                  <AccordionTrigger>Using Filters & Saved Filters</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Filter companies by multiple criteria to focus on specific segments</p>
                    <div>
                      <h4 className="font-medium mb-2">Available Filters</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Company Type (Builder/Contractor)</li>
                        <li>Priority Tier (P1/P2/P3)</li>
                        <li>Status (Active/Prospect/Inactive)</li>
                        <li>Market Segment</li>
                        <li>Product Category</li>
                        <li>Revenue Range</li>
                        <li>Location/State</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Saving Filters</h4>
                      <p className="text-sm text-muted-foreground">
                        Save frequently used filter combinations for quick access. 
                        Great for segment-specific campaigns or territory management.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="bulk-actions">
                  <AccordionTrigger>Bulk Actions & Export</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Bulk Operations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Select multiple companies using checkboxes</li>
                        <li>Update status for all selected companies</li>
                        <li>Assign to specific sales representatives</li>
                        <li>Add tags or categories in bulk</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Export Options</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Export to CSV for analysis in Excel</li>
                        <li>Export to XLSX with formatting</li>
                        <li>Include filtered results only</li>
                        <li>Customize which columns to export</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="enrichment">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      Data Enrichment
                      <Badge variant="outline" className="text-xs">Enhanced</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Enhance company records with multiple external data sources in a multi-tier enrichment flow</p>
                    <div>
                      <h4 className="font-medium mb-2">Enrichment Tiers (Sequential)</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li><strong>Apollo:</strong> First attempts to fetch accurate business metrics (revenue, employees, location)</li>
                        <li><strong>Lovable AI (Gemini):</strong> Comprehensive AI analysis of company website, LinkedIn, and online presence</li>
                        <li><strong>Claude:</strong> Deep enrichment fallback if Gemini fails or for detailed analysis</li>
                        <li><strong>Perplexity:</strong> Final fallback using real-time web search to fill remaining blank fields</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What Gets Enriched</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Company size (employees, revenue ranges)</li>
                        <li>Contact information (phone, website, social media URLs)</li>
                        <li>Financial indicators (growth trends, profitability)</li>
                        <li>Digital presence (website quality, LinkedIn activity, reviews)</li>
                        <li>Technology adoption level and smart home readiness</li>
                        <li>Market positioning and competitive advantages</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Using Enrichment</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Click "Enrich" button on any company record</li>
                        <li>Review preview of data before applying changes</li>
                        <li>System prevents overwriting existing accurate data</li>
                        <li>View enrichment history and confidence scores</li>
                        <li>AI-generated rationale explains why a segment was assigned</li>
                        <li>Data quality indicators show field completeness</li>
                        <li>Automatic lead score recalculation after enrichment</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Smart Enrichment Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>System identifies companies that would benefit from enrichment</li>
                        <li>Prioritizes P1 and P2 tier companies with missing data</li>
                        <li>Shows enrichment score based on priority and data gaps</li>
                        <li>One-click enrichment for recommended companies</li>
                        <li>Access via "Smart Recommendations" panel on Companies page</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Contacts Management
              </CardTitle>
              <CardDescription>
                Track and manage your professional relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="add-contact">
                  <AccordionTrigger>Adding Contacts</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Essential Information</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Full Name:</strong> First and last name</li>
                        <li><strong>Company:</strong> Link to company record</li>
                        <li><strong>Title/Role:</strong> Job title and responsibilities</li>
                        <li><strong>Email & Phone:</strong> Primary contact methods</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Decision Tier</h4>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge variant="default">Decision Maker</Badge>
                          <span className="text-sm">C-level, owners, final approval authority</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary">Influencer</Badge>
                          <span className="text-sm">Department heads, key stakeholders</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline">Gatekeeper</Badge>
                          <span className="text-sm">Assistants, coordinators, initial contacts</span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="linkedin-tracking">
                  <AccordionTrigger>LinkedIn Integration & Scoring</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Track LinkedIn profiles to monitor engagement and professional activity</p>
                    <div>
                      <h4 className="font-medium mb-2">Benefits of LinkedIn Tracking</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Monitor profile views and engagement</li>
                        <li>Track job changes and promotions</li>
                        <li>Identify content they share or interact with</li>
                        <li>Improves contact scoring based on activity</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Contact Scoring Impact</h4>
                      <p className="text-sm text-muted-foreground">
                        Contact scores contribute to overall company priority. Having multiple 
                        decision makers with active LinkedIn profiles significantly boosts company score.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact-activities">
                  <AccordionTrigger>Contact-Specific Activities</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Track all interactions with individual contacts</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>View activity history for each contact</li>
                      <li>Last contact date prominently displayed</li>
                      <li>See upcoming scheduled follow-ups</li>
                      <li>Track response rates and engagement patterns</li>
                      <li>Identify "warm" vs "cold" contacts</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="apollo-contact-import">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      Apollo Contact Import
                      <Badge variant="outline" className="text-xs">New</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Import contacts and their associated companies directly from Apollo CSV exports on the Contacts page</p>
                    <div>
                      <h4 className="font-medium mb-2">How to Import Apollo Contacts</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>In Apollo.io, search for contacts and export as CSV</li>
                        <li>Navigate to Contacts page in the CRM</li>
                        <li>Click "Import from Apollo" button</li>
                        <li>Upload your Apollo contacts CSV file</li>
                        <li>Review the preview showing contacts and companies</li>
                        <li>Click Import to add them to your CRM</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Smart Import Features</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Automatic company creation:</strong> Creates companies automatically if they don't exist</li>
                        <li><strong>Duplicate prevention:</strong> Skips contacts and companies that already exist (based on name and email)</li>
                        <li><strong>Phone number cleaning:</strong> Handles quoted and formatted phone numbers</li>
                        <li><strong>State normalization:</strong> Converts full state names to abbreviations</li>
                        <li><strong>Employee count parsing:</strong> Properly handles formatted numbers (e.g., "1,000" → 1000)</li>
                        <li><strong>Complete data mapping:</strong> Maps Apollo fields (address, city, state, phone) to company records</li>
                        <li><strong>Batch processing:</strong> Import hundreds of contacts at once</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Imported Contact Data</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>First and last names</li>
                        <li>Job titles and roles</li>
                        <li>Email addresses and phone numbers</li>
                        <li>LinkedIn profile URLs</li>
                        <li>LinkedIn connections count</li>
                        <li>Decision tier classification</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Imported Company Data</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Company name and website</li>
                        <li>Complete address (street, city, state, zip)</li>
                        <li>Company phone number</li>
                        <li>LinkedIn company URL</li>
                        <li>Employee count</li>
                        <li>Industry type (auto-detected as Builder or Contractor)</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Note:</strong> Companies are automatically linked to contacts during import. Lead scoring is calculated immediately after import to help you prioritize follow-ups.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Communications Management
              </CardTitle>
              <CardDescription>
                AI-powered communication generation and management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="overview">
                  <AccordionTrigger>Communication Features Overview</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p>The Communications hub allows you to generate and manage AI-powered outreach materials tailored to specific companies and contacts.</p>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Communication Types:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Emails:</strong> Professional sales emails with subject lines and body content</li>
                        <li><strong>Call Scripts:</strong> Structured talking points for phone conversations</li>
                        <li><strong>LinkedIn Messages:</strong> Brief, professional connection requests and messages</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="generation">
                  <AccordionTrigger>Generating Communications</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p>Create personalized communications using AI that factors in company data, contact information, and your business context.</p>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Generation Process:</h4>
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>Click "New Communication" button</li>
                        <li>Select target company from dropdown</li>
                        <li>Optionally select specific contact (or leave for general messaging)</li>
                        <li>Choose communication type (email, call script, or LinkedIn message)</li>
                        <li>Add business context (optional but recommended)</li>
                        <li>Describe outreach purpose (required - what you're reaching out about)</li>
                        <li>Add previous conversation context if applicable</li>
                        <li>Select AI model (Gemini 2.5 Flash recommended)</li>
                        <li>Click "Generate" and AI will create your communication</li>
                      </ol>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Tip:</strong> The more context you provide (business description, outreach purpose), the more targeted and effective your communications will be.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="management">
                  <AccordionTrigger>Managing Communications</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Features:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Copy to Clipboard:</strong> Quickly copy communication content</li>
                        <li><strong>Mark as Attempted:</strong> Track when you've used a communication</li>
                        <li><strong>Active/Inactive Status:</strong> Mark conversations as active or inactive</li>
                        <li><strong>Filtering:</strong> Filter by industry, status, communication type, and conversation status</li>
                        <li><strong>Search:</strong> Search across companies, contacts, subject, and content</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="business-context">
                  <AccordionTrigger>Business Context Settings</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p>Administrators can configure permanent business context in Settings that automatically informs all AI-generated communications.</p>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Business Context Fields:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Business Description:</strong> What your company does</li>
                        <li><strong>Team Mission:</strong> Your goals and objectives</li>
                        <li><strong>Value Proposition:</strong> What makes you unique</li>
                        <li><strong>Target Customers:</strong> Your ideal customer profile</li>
                        <li><strong>Products/Services:</strong> What you offer</li>
                        <li><strong>Communication Guidelines:</strong> Tone, style, key messages</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        <strong>Admin Only:</strong> Only administrators can edit business context settings. These settings help the AI understand your business and generate consistent, on-brand communications.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prospecting Tab */}
        <TabsContent value="prospecting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Prospecting Dashboard
              </CardTitle>
              <CardDescription>
                Find and import new prospects with Apollo integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="apollo-search">
                  <AccordionTrigger>Using Apollo Company Search</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Search Criteria</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Industry:</strong> Construction, home building, contracting</li>
                        <li><strong>Company Size:</strong> Employee count ranges</li>
                        <li><strong>Revenue:</strong> Annual revenue brackets</li>
                        <li><strong>Location:</strong> State, city, or region</li>
                        <li><strong>Keywords:</strong> Specific terms in company description</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Importing Results</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Review search results before importing</li>
                        <li>Select specific companies to add to CRM</li>
                        <li>System automatically enriches imported companies</li>
                        <li>Prevents duplicate entries</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="apollo-csv-import">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      Apollo CSV Import
                      <Badge variant="outline" className="text-xs">New</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Import companies and contacts directly from Apollo CSV exports</p>
                    <div>
                      <h4 className="font-medium mb-2">How to Use Apollo CSV Import</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>In Apollo.io, search for companies and select them</li>
                        <li>Export your selection as CSV</li>
                        <li>Click "Import CSV" button on Prospecting Dashboard</li>
                        <li>Upload your Apollo CSV file</li>
                        <li>Review the preview showing companies and contacts</li>
                        <li>Click Import to add them to your CRM</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Smart Import Features</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Auto-detection:</strong> Automatically detects Builder vs Contractor company type</li>
                        <li><strong>Contact linking:</strong> Associates contacts with their companies automatically</li>
                        <li><strong>Duplicate prevention:</strong> Skips companies and contacts that already exist</li>
                        <li><strong>Data mapping:</strong> Maps Apollo fields to CRM fields automatically</li>
                        <li><strong>Batch processing:</strong> Import hundreds of companies at once</li>
                        <li><strong>Instant scoring:</strong> Lead scores calculated immediately after import</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What Data Gets Imported</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Company names, websites, and LinkedIn URLs</li>
                        <li>Location data (city, state)</li>
                        <li>Employee counts and revenue ranges</li>
                        <li>Contact names, titles, emails, and LinkedIn profiles</li>
                        <li>Phone numbers for companies and contacts</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="segments">
                  <AccordionTrigger>Market Segments</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Pre-defined segments help target specific market categories</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <h4 className="font-medium mb-2">Builder Segments</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Production Builders</li>
                          <li>Semi-Custom Builders</li>
                          <li>Custom Builders</li>
                          <li>Multi-Family</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Contractor Segments</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Plumbing</li>
                          <li>HVAC</li>
                          <li>Electrical</li>
                          <li>General Contractor</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="recommendations">
                  <AccordionTrigger>Smart Recommendations</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">System analyzes your best customers and recommends similar prospects</p>
                    <div>
                      <h4 className="font-medium mb-2">Recommendation Factors</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Similar industry and segment</li>
                        <li>Comparable company size</li>
                        <li>Same geographic region</li>
                        <li>Similar technology stack or practices</li>
                        <li>Based on your most successful customers</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Activities & Outreach
              </CardTitle>
              <CardDescription>
                Track all customer interactions and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="activity-types">
                  <AccordionTrigger>Activity Types</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Badge variant="outline">Call</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Phone calls, voicemails, conference calls</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Badge variant="outline">Email</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Email outreach, campaigns, newsletters</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Badge variant="outline">Meeting</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">In-person or virtual meetings, presentations</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Badge variant="outline">Site Visit</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Job site visits, facility tours, demonstrations</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Badge variant="outline">Task</Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground">Follow-up tasks, document preparation, research</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="outcomes">
                  <AccordionTrigger>Activity Outcomes</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <strong>Completed:</strong>
                        <span className="text-sm text-muted-foreground">Successful interaction, positive outcome</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <strong>No Answer:</strong>
                        <span className="text-sm text-muted-foreground">Unable to reach contact, needs follow-up</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <strong>Follow-up:</strong>
                        <span className="text-sm text-muted-foreground">Needs additional action or information</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <strong>Interested:</strong>
                        <span className="text-sm text-muted-foreground">Expressed interest, hot lead</span>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="sequences">
                  <AccordionTrigger>Outreach Sequences</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Create automated follow-up sequences for consistent outreach</p>
                    <div>
                      <h4 className="font-medium mb-2">Sequence Benefits</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Ensures consistent follow-up cadence</li>
                        <li>Automates reminder creation</li>
                        <li>Tracks sequence completion rates</li>
                        <li>A/B test different approaches</li>
                        <li>Improves response rates through persistence</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="calendar">
                  <AccordionTrigger>Calendar View</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Visualize all activities and scheduled follow-ups in calendar format</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>See daily, weekly, or monthly activity schedule</li>
                      <li>Color-coded by activity type</li>
                      <li>Click to view or edit activity details</li>
                      <li>Drag and drop to reschedule</li>
                      <li>Identify gaps in outreach coverage</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Features Tab */}
        <TabsContent value="ai-features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI-Powered Features
              </CardTitle>
              <CardDescription>
                Leverage artificial intelligence for smarter decision making
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="ai-scoring">
                  <AccordionTrigger>AI Contact Scoring</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Advanced machine learning analyzes contact profiles to predict engagement likelihood
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">What It Analyzes</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Job title and seniority level</li>
                        <li>LinkedIn activity and engagement</li>
                        <li>Company role and influence</li>
                        <li>Past interaction history</li>
                        <li>Response patterns and timing</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Using the Scores</h4>
                      <p className="text-sm text-muted-foreground">
                        AI scores help prioritize which contacts to reach out to first. 
                        Higher scores indicate better chances of engagement and conversion.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="lead-prioritization">
                  <AccordionTrigger>AI Lead Prioritization</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Automatically ranks companies by conversion probability and revenue potential
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Prioritization Factors</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Historical deal size and close rates</li>
                        <li>Similar customer success patterns</li>
                        <li>Buying signals and intent data</li>
                        <li>Competitive landscape positioning</li>
                        <li>Timing and market conditions</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="outreach-strategy">
                  <AccordionTrigger>AI Outreach Strategy</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Get personalized recommendations for how to approach each prospect
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Strategy Components</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Best time to contact based on response patterns</li>
                        <li>Recommended communication channel (email vs call)</li>
                        <li>Personalized messaging suggestions</li>
                        <li>Ideal follow-up cadence</li>
                        <li>Pain points and value propositions to emphasize</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="batch-ai">
                  <AccordionTrigger>Batch AI Processing</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Process multiple records simultaneously for efficient analysis
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Run AI scoring on all contacts at once</li>
                      <li>Recalculate priorities after data updates</li>
                      <li>Batch generate outreach strategies</li>
                      <li>Schedule overnight processing for large datasets</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Reports & Analytics
              </CardTitle>
              <CardDescription>
                Gain insights from your sales and outreach data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="scoring-breakdown">
                  <AccordionTrigger>Scoring Breakdown Report</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Understand how scores are distributed across your database
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Key Metrics</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Total companies by priority tier (P1, P2, P3)</li>
                        <li>Average score by company type</li>
                        <li>Score distribution histogram</li>
                        <li>Trending up/down over time</li>
                        <li>Segment performance comparison</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact-scoring">
                  <AccordionTrigger>Contact Scoring Report</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Analyze individual contact quality and engagement levels</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Contacts by decision tier</li>
                      <li>Average score by role/title</li>
                      <li>LinkedIn engagement rates</li>
                      <li>Response rate by contact type</li>
                      <li>Identify high-value contacts</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="activity-reports">
                  <AccordionTrigger>Activity Reports</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Track outreach performance and team productivity</p>
                    <div>
                      <h4 className="font-medium mb-2">Available Reports</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Activities by type and outcome</li>
                        <li>Response rates by channel</li>
                        <li>Average time to response</li>
                        <li>Activities per sales rep</li>
                        <li>Conversion funnel analysis</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="dashboard-metrics">
                  <AccordionTrigger>Dashboard Metrics</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Real-time overview of key performance indicators</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <h4 className="font-medium mb-2">Pipeline Metrics</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Total active companies</li>
                          <li>New prospects this week</li>
                          <li>Priority distribution</li>
                          <li>Win rate trends</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Engagement Metrics</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Activities completed today</li>
                          <li>Upcoming follow-ups</li>
                          <li>Response rates</li>
                          <li>Hot leads requiring attention</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Settings & Administration
              </CardTitle>
              <CardDescription>
                System configuration and security controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="user-management">
                  <AccordionTrigger>User Management (Admin Only)</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Manage user access and permissions</p>
                    <div>
                      <h4 className="font-medium mb-2">User Approval Workflow</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>New user registrations require admin approval</li>
                        <li>Review user details before granting access</li>
                        <li>Assign appropriate role based on responsibilities</li>
                        <li>Approve or reject with optional notes</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Managing Existing Users</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View all active users and their roles</li>
                        <li>Change user roles as needed</li>
                        <li>Suspend or deactivate user access</li>
                        <li>Audit user activity and changes</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security">
                  <AccordionTrigger>Security Dashboard</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">Monitor security events and potential threats</p>
                    <div>
                      <h4 className="font-medium mb-2">Security Monitoring</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Track failed login attempts</li>
                        <li>Monitor bulk data access patterns</li>
                        <li>Detect unusual activity spikes</li>
                        <li>Review security audit logs</li>
                        <li>Get alerts for suspicious behavior</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Access Controls</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Role-based permissions enforcement</li>
                        <li>Row-level security policies</li>
                        <li>Rate limiting on sensitive operations</li>
                        <li>Automatic threat mitigation</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-freeze">
                  <AccordionTrigger>Data Freeze Workflow</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Secure employee data when someone leaves the organization
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">How It Works</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Admin initiates data freeze for departing employee</li>
                        <li>User immediately loses write/delete permissions</li>
                        <li>User retains read-only access temporarily</li>
                        <li>Audit log captures all freeze actions</li>
                        <li>Admin can fully deactivate when appropriate</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Use Cases</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Employee resignation or termination</li>
                        <li>Extended leave of absence</li>
                        <li>Temporary suspension pending investigation</li>
                        <li>Contractor engagement completion</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="deletion-approval">
                  <AccordionTrigger>Deletion Approval Process</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      All deletion requests require admin approval for data protection
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Why Deletion Approval?</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Prevents accidental data loss</li>
                        <li>Protects against malicious deletions</li>
                        <li>Maintains data audit trail</li>
                        <li>Enables recovery of mistakenly deleted records</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Admin Review Process</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>User submits deletion request with reason</li>
                        <li>Admin receives notification</li>
                        <li>Admin reviews record and justification</li>
                        <li>Admin approves or rejects with feedback</li>
                        <li>Audit log preserves complete history</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="access-controls">
                  <AccordionTrigger>Access Controls & Audit Logs</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Comprehensive monitoring and logging of sensitive data access
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Contact Access Logging</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Every contact view is automatically logged with timestamp</li>
                        <li>Track who accessed which contacts and when</li>
                        <li>IP addresses recorded for security audits</li>
                        <li>Export operations are specially flagged</li>
                        <li>Full audit trail for compliance requirements</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Bulk Access Detection</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Automatic alerts for unusual access patterns</li>
                        <li>Threshold: 50+ contacts in 10 minutes triggers alert</li>
                        <li>Admins notified of potential data exfiltration</li>
                        <li>Review and investigate suspicious activity</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Approval Audit Trail</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Complete history of user approval status changes</li>
                        <li>Who approved/rejected and when</li>
                        <li>Status transitions tracked with timestamps</li>
                        <li>Notes and reasons preserved</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="encryption">
                  <AccordionTrigger>Data Encryption</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Enterprise-grade encryption for sensitive contact information
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">What Gets Encrypted</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Contact email addresses</li>
                        <li>Phone numbers (work and mobile)</li>
                        <li>All personally identifiable information (PII)</li>
                        <li>Encrypted at rest in the database</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">How It Works</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>AES-256 encryption algorithm</li>
                        <li>Encryption keys stored securely in vault</li>
                        <li>Automatic decryption when authorized users access data</li>
                        <li>Version tracking for key rotation</li>
                        <li>Migration tools for updating encryption</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Admin Controls (Admin Only)</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Monitor encryption status and coverage</li>
                        <li>Run batch encryption migrations</li>
                        <li>Audit encryption operations</li>
                        <li>Setup and configure production encryption keys</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data-warehouse">
                  <AccordionTrigger>Data Warehouse Sync</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Automated synchronization with external data warehouse (BigQuery)
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Overview</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Automatically sync your CRM data to BigQuery for advanced analytics, reporting, and data science use cases.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Real-time or scheduled data synchronization</li>
                        <li>Configurable sync frequency</li>
                        <li>Selective table synchronization</li>
                        <li>Error handling and retry logic</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Setup Requirements (Admin Only)</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Create Google Cloud project and BigQuery dataset</li>
                        <li>Create service account with BigQuery permissions</li>
                        <li>Add service account credentials to system secrets</li>
                        <li>Configure sync settings in Settings → Data Warehouse</li>
                        <li>Enable automatic sync or trigger manual syncs</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">What Gets Synced</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Companies table with all enrichment data</li>
                        <li>Contacts table (encrypted fields handled securely)</li>
                        <li>Activities and communications history</li>
                        <li>Scoring details and AI insights</li>
                        <li>Configurable to include/exclude specific tables</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Monitoring & Logs</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View sync history with timestamps</li>
                        <li>Track success/failure rates</li>
                        <li>Review error details for troubleshooting</li>
                        <li>Monitor data freshness</li>
                        <li>Automatic log cleanup (90-day retention)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="field-permissions">
                  <AccordionTrigger>Field-Level Permissions & Access Requests</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Control access to sensitive data with field-level security and approval workflows
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">How It Works</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Sensitive fields (emails, phones, addresses) are protected by role requirements</li>
                        <li>Users see masked data unless they have sufficient permissions</li>
                        <li>Protected fields show with an eye icon and "Request Access" button</li>
                        <li>Sales reps can request access to specific records they need</li>
                        <li>Managers/admins review and approve/reject access requests</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Limited "All Records" View</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Sales reps and read-only users can now see all companies in the system with limited details:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>View company names, status, and basic info across all records</li>
                        <li>Sensitive fields are masked until access is granted</li>
                        <li>Request access to view full company profiles</li>
                        <li>Switch perspectives: My Records, Assigned to Me, My Team, All Records</li>
                        <li>Helps collaboration while maintaining data security</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Access Request Workflow</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>User finds a company/contact they need access to</li>
                        <li>Clicks "Request Access" button on protected field</li>
                        <li>Provides justification for access request</li>
                        <li>Manager/admin receives notification</li>
                        <li>Manager reviews request and approves/rejects with notes</li>
                        <li>Upon approval, user gains temporary or permanent access</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="database-management">
                  <AccordionTrigger>Database Management (Admin Only)</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm">
                      Admins can manage database tables directly from the UI without backend code changes
                    </p>
                    <div>
                      <h4 className="font-medium mb-2">Available Operations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li><strong>Create Tables:</strong> Define new tables with custom columns and types</li>
                        <li><strong>View Structure:</strong> Inspect existing table schemas and column definitions</li>
                        <li><strong>Modify Tables:</strong> Execute SQL to alter table structures</li>
                        <li><strong>Delete Tables:</strong> Remove tables (with confirmation prompt)</li>
                        <li><strong>SQL Editor:</strong> Run custom SQL queries directly</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Security Features</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Admin-only access enforced at API level</li>
                        <li>All operations logged in audit trail</li>
                        <li>Automatic RLS policies created for new tables</li>
                        <li>Confirmation required for destructive operations</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Creating Tables</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Navigate to Settings → Data → Database Management</li>
                        <li>Click "Create Table" and enter table name</li>
                        <li>Add columns with name, type, and nullable settings</li>
                        <li>Default columns (id, created_at) included automatically</li>
                        <li>RLS policy created to restrict access to admins</li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="integrations">
                  <AccordionTrigger>Integrations</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-2">Apollo.io Integration</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Configure Apollo API key to enable prospecting features
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Company and contact search</li>
                        <li>Data enrichment</li>
                        <li>Recommendation engine</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Future Integrations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Email marketing platforms</li>
                        <li>Calendar sync</li>
                        <li>Communication tools (Slack, Teams)</li>
                        <li>Document storage (Google Drive, Dropbox)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Security Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Strong Passwords:</strong> Use unique, complex passwords with mix of characters</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Regular Reviews:</strong> Periodically review user access and permissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Monitor Activity:</strong> Check security dashboard regularly for anomalies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Prompt Offboarding:</strong> Immediately freeze access for departing employees</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm"><strong>Data Backups:</strong> Regular automated backups protect against data loss</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="activity-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                System Activity Logs
              </CardTitle>
              <CardDescription>
                Monitor and track all system activities including AI usage, imports, exports, and enrichments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Activity logs help you track usage patterns, monitor costs, troubleshoot issues, and ensure data quality across all system operations.
              </p>
            </CardContent>
          </Card>

          <AIUsageLog />
          
          <Card>
            <CardHeader>
              <CardTitle>Import/Export Activity Log</CardTitle>
              <CardDescription>
                View all data import and export operations. Click on any activity to expand and see detailed error information 
                for failed records, including the specific reason each record failed. This helps identify and resolve data quality issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportExportActivityLog />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Enrichment Activity Log</CardTitle>
              <CardDescription>
                Monitor all enrichment operations. Track which companies were successfully enriched and investigate 
                any failures to understand data source limitations or connectivity issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnrichmentErrorLog />
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <SystemDiagnostics />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>How often are lead scores recalculated?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Lead scores are automatically recalculated when relevant data changes (new activities, 
                  contact updates, enrichment data). You can also manually trigger recalculation for all 
                  companies or specific segments from the Reports page.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2">
              <AccordionTrigger>Can I customize the scoring criteria?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  The scoring algorithm is designed based on construction industry best practices. 
                  While the core algorithm isn't customizable through the UI, contact your system 
                  administrator to discuss custom weighting for your specific business needs.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3">
              <AccordionTrigger>How do I export my data?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  From the Companies or Contacts page, use the Export button in the toolbar. 
                  You can export filtered results to CSV or XLSX format. Select which columns 
                  to include in the export dialog.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4">
              <AccordionTrigger>What happens if I delete a company by mistake?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Deletion requests require admin approval before being executed. If you submitted 
                  a deletion request by mistake, contact your admin immediately to reject it. Once 
                  approved and deleted, recovery may not be possible.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5">
              <AccordionTrigger>How do I get access to AI features?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  AI features are available to all users based on their role permissions. Sales Managers 
                  and Admins have full access to AI scoring and recommendations. If you don't see AI 
                  features, check with your admin about your role permissions.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6">
              <AccordionTrigger>Can I import existing customer data?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Yes! Use the Import function on the Companies page to upload CSV files with your 
                  existing customer data. The system will map fields and validate data before importing. 
                  It will also detect and prevent duplicate entries. After importing, check the Activity Logs 
                  section to see detailed results including any errors for records that failed to import.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-import-errors">
              <AccordionTrigger>How do I view detailed import errors?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground mb-2">
                  After importing data, detailed error information is available in the System Activity Logs 
                  section at the bottom of this Help page. Here's how to access it:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Scroll to the "System Activity Logs" section</li>
                  <li>Find your recent import in the Import/Export Activity Log</li>
                  <li>Click on the error summary to expand and see detailed errors</li>
                  <li>Each failed record shows the specific reason for failure</li>
                  <li>Use this information to fix data issues and re-import if needed</li>
                </ol>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-7">
              <AccordionTrigger>How do I reset my password?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Use the "Forgot Password" link on the login page. You'll receive an email with 
                  instructions to reset your password. Make sure to check your spam folder if you 
                  don't see the email within a few minutes.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-8">
              <AccordionTrigger>Is my data secure?</AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  Yes. The system implements enterprise-grade security including encryption, 
                  row-level security policies, role-based access control, rate limiting, and 
                  comprehensive audit logging. All data is backed up regularly and stored securely.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold">Need Additional Help?</h3>
            <p className="text-sm text-muted-foreground">
              Contact your system administrator or reach out to support for personalized assistance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
