import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

  const filterContent = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Help & User Guide</h1>
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

      <Tabs defaultValue="getting-started" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="prospecting">Prospecting</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="ai-features">AI Features</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
                        <li>Data quality indicators show field completeness</li>
                        <li>Automatic lead score recalculation after enrichment</li>
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
                        <li><strong>Auto-detection:</strong> Automatically detects Builder vs Contractor industry type</li>
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
                  It will also detect and prevent duplicate entries.
                </p>
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
