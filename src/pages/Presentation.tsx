import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Eye, Edit, Ban, Upload } from 'lucide-react';
import { SlidePreviewCarousel } from '@/components/presentations/SlidePreviewCarousel';
import { PresentationTable } from '@/components/presentations/PresentationTable';
import { AISlideBuilder } from '@/components/presentations/AISlideBuilder';
import { PresentationAnalytics } from '@/components/presentations/PresentationAnalytics';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Use the bundled worker from the package
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function Presentation() {
  const navigate = useNavigate();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [outline, setOutline] = useState(`Google Nest Pro Channel Development - Leadership Team Presentation

DESIGN REQUIREMENTS:
- Use Google brand colors (Google Blue #4285F4, Google Red #EA4335, Google Yellow #FBBC04, Google Green #34A853)
- Make slides visually dynamic with charts, graphs, and data visualizations
- Use bold typography and clear hierarchies
- Include icons and visual elements
- Professional, modern, clean design
- High contrast for readability

SLIDE 1: TITLE SLIDE
Title: Google Nest Pro Channel Development
Subtitle: Q1 2025 Leadership Team Presentation
Background: Modern Google Nest branded design with gradient

SLIDE 2: PRESENTATION PURPOSE
Title: What We're Covering Today
Bullets:
- Review of channel development infrastructure built since August
- Validation results from 5 strategic test campaigns
- Proposal for team-wide operational adoption
- Strategic input needed on Q1 direction

SLIDE 3: THE CHALLENGE
Title: The Market Opportunity We're Addressing
Split into 3 columns with icons:
Column 1: 17,000+ Residential Builders (7 segments)
Column 2: 60,000+ Professional Contractors (5 trades, 8 segments)
Column 3: 77,000+ Total Addressable Market
Visual: Large numbers with icons

SLIDE 4: THE PROBLEM WE SOLVED
Title: Manual Processes = Lost Opportunity
4 pain points with X icons:
- No CRM handles dual-industry complexity
- Manual research: 30-45 minutes per lead
- No systematic segmentation at scale
- Inconsistent follow-up and partner handoffs
Visual: Red X marks, problem-focused

SLIDE 5: THE SOLUTION - SYSTEM OVERVIEW
Title: Custom Channel Development System
3 components with icons:
1. AI-Powered CRM (2 min vs 30-45 min per lead)
2. Apollo.ai Integration (systematic outreach)
3. Systematic Segmentation (15 categories)
Visual: Process flow diagram

SLIDE 6: AI-POWERED LEAD SCORING
Title: Industry-Specific Scoring (0-100 Points)
Visual bar chart showing:
- Firmographic: 50 pts (Volume, Price, Geography, Stability)
- Digital Engagement: 30 pts (Website, LinkedIn, Tech Adoption)
- Contact Quality: 20 pts (Decision Authority, LinkedIn Pro)
Auto-assignment tiers: P1 (80-100), P2 (60-79), P3 (40-59)

SLIDE 7: EFFICIENCY GAINS
Title: 10x Efficiency Improvement
Before/After comparison:
BEFORE: 30-45 min per lead, 20-30 leads/week/person, manual tracking
AFTER: 2 min per lead, 200+ leads/week/person, 100% systematic follow-up
Visual: Large "10X" with arrows showing improvement

SLIDE 8: MULTI-VIEW PIPELINE
Title: Complete Pipeline Management
5 view types with icons:
- Grid View: Data entry & bulk editing
- Kanban View: Lead → Contacted → Engaged → Pilot → Active
- Calendar View: Activity scheduling
- Gallery View: Visual company cards
- List View: Parent company hierarchies

SLIDE 9: VALIDATION - TEST CAMPAIGNS
Title: 60% Response Rate (3x Industry Standard)
5 campaigns launched in past 45 days:
✓ Buzzuto - Engaged
✓ SmartAC.com - Active discussions
✗ Toll Brothers - Fast "No" (proprietary platform)
⏳ Fisher Brothers - Pending
⏳ Lennar Homes - Pending
Visual: 60% vs 18-23% industry benchmark (large comparison)

SLIDE 10: KEY CAMPAIGN INSIGHTS
Title: What We Learned
3 key takeaways with icons:
1. Segmentation quality drives engagement (60% vs 18-23%)
2. Fast "No" is valuable (Toll Brothers: 1 week vs 3+ months)
3. P1 scoring accurately identifies high-fit prospects
Visual: Checkmarks and data points

SLIDE 11: SEGMENTATION BREAKDOWN
Title: 15 Market Segments
Left column - 7 Builder Segments:
- Production/Tract (40% priority)
- Regional Mid-Volume (25%)
- Spec Home (15%)
- Luxury Custom (8%)
- Multi-Family (7%)
- Affordable Housing (3%)
- Active Adult/55+ (2%)

Right column - 8 Contractor Segments:
- Smart Home Champions (30%)
- Customer Experience Innovators (25%)
- High-Volume Installers (20%)
- Premium Service Specialists (10%)
- Regional Growth (8%)
- Multi-System Integrators (4%)
- Traditional Service Leaders (3%)
- Emergency/Reactive Specialists (15%)

SLIDE 12: THE OPERATIONAL FLOW
Title: 6-Stage Systematic Process
Visual process flow:
Stage 1: Lead Identification & AI Enrichment (2 min)
Stage 2: Automated Scoring & Segmentation (0-100 pts)
Stage 3: Targeted Outreach via Apollo.ai (multi-touch sequences)
Stage 4: Internal Handoff to ASM/RSM/SPM (complete context)
Stage 5: Partner Coordination (pilot programs)
Stage 6: Success Tracking & Optimization (continuous improvement)

SLIDE 13: STAGE 1 - AI ENRICHMENT
Title: Lead Identification & Enrichment (2 Minutes)
Data sources with icons:
- LinkedIn Sales Navigator
- Building permit data
- Trade associations (NAHB, ACCA, ESA)
- Nest Pro partner referrals
- Existing Nest Pro database (60,000 contractors)
Output: Fully enriched company profile with preliminary score

SLIDE 14: STAGE 2 - SCORING & SEGMENTATION
Title: Automated Intelligence
Scoring breakdown visual:
- Firmographic (50): Volume + Revenue + Geography + Stability
- Digital Engagement (30): Website + LinkedIn + Tech Adoption
- Contact Quality (20): Decision Authority + LinkedIn Pro
Priority Tiers: P1 (80-100), P2 (60-79), P3 (40-59)
Segment Assignment: 1 of 15 categories

SLIDE 15: STAGE 3 - MULTI-TOUCH SEQUENCES
Title: Apollo.ai Outreach Campaigns
Example sequence timeline (Days 1-15):
Day 1: Email (competitor comparison)
Day 3: LinkedIn connection
Day 5: Case study email
Day 8: Phone call
Day 10: LinkedIn message
Day 15: Limited offer email
Tracking: Opens, clicks, replies, A/B testing

SLIDE 16: STAGE 4 - INTERNAL HANDOFF
Title: ASM/RSM/SPM Role Matching
3 tiers with geographic criteria:
ASM: Territory-based (1-3 states)
RSM: Multi-state regional (3+ states, cross-territory)
SPM: National/Multi-regional (national coverage)
Handoff package: Complete profile + engagement history + recommendations

SLIDE 17: SALES OPPORTUNITY CRITERIA
Title: Pipeline Entry Requirements
2 key criteria with icons:
1. Sales Confidence: ≥60%
2. Lead Time Windows:
   - ≤500 units: 90-day window
   - 501-1,000 units: 120-day window
   - 1,000+ units: 180-day window
Visual: Timeline graphic

SLIDE 18: STAGE 5 - PARTNER COORDINATION
Title: ASM/RSM/SPM Responsibilities
4 focus areas:
- Relationship Development (demos, pilots, training)
- Nest Pro Partner Matching (geographic + capability)
- Pilot Program Coordination (scope, metrics, monitoring)
- Implementation Support (certification, tracking)
CRM Support: Kanban, Calendar, Activity logging

SLIDE 19: STAGE 6 - SUCCESS TRACKING
Title: Continuous Optimization
5 metric categories:
- Pipeline Metrics (conversion rates by segment)
- Engagement Metrics (open, click, reply rates)
- Ecosystem Adoption (installations, product mix)
- Segmentation Validation (algorithm refinement)
- Campaign Performance (A/B test winners)

SLIDE 20: CROSS-FUNCTIONAL OPPORTUNITY
Title: Google Search Benefits for Contractors
The opportunity with Google icon:
Current Problem: $50-$200 per lead via Google Ads
Potential Solution: "Google Certified" badge on Business Profile
Benefits:
- Visual trust signal in search results
- Preferential search placement
- Reduced ad spend (25-50% savings = $12-$100/lead)
Status: Need your guidance to explore feasibility

SLIDE 21: Q1 DIRECTION - YOUR INPUT NEEDED
Title: Proposed Q1 Goals
5 objectives with icons:
1. Scale from 5 to 100 campaigns (20-30 engaged leads)
2. Validate segmentation across all 15 segments
3. Build messaging & enablement library
4. Formalize internal handoff processes
5. ROI case study formalization (3-5 success stories)
Visual: Question marks indicating need for input

SLIDE 22: WHAT I NEED FROM YOU
Title: Strategic Input Required
5 questions with thought bubbles:
- Which segments should I prioritize first?
- Which geographies to focus on?
- What segment-specific insights from your markets?
- What case study examples do you have?
- What information do you need in handoffs?

SLIDE 23: 12-18 MONTH VISION
Title: Long-Term Roadmap
Timeline visual:
Q2 2025: 500 active campaigns, automation Phase 1
Q3 2025: Pilot program standardization, partner mapping
Q4 2025: Full market coverage (~77,000 companies enriched)
2026: Predictive analytics, ecosystem expansion tracking

SLIDE 24: THE PROPOSAL - TEAM ADOPTION
Title: What I'm Asking
4 requests with checkboxes:
1. Adopt this operational flow as our standard approach
2. Test the system in your segments/territories (10-20 P1 leads)
3. Contribute to messaging & case study development
4. Optional: Connect me to Google Search team

SLIDE 25: WHY THIS MATTERS
Title: The Opportunity Window
3 compelling reasons:
- 77,000 addressable companies (first-mover advantage closing)
- Proven approach works (60% response rate, fast qualification)
- Can scale systematically (10x efficiency, complete handoff context)
But need YOUR expertise to refine and optimize

SLIDE 26: NEXT STEPS
Title: Implementation Timeline
This Week:
- Feedback on Q1 direction
- Connections to partners with success stories
- Initial thoughts on pilot approach

Q1 2025:
- Scale to 100 campaigns
- Build messaging library
- Formalize case studies
- Pilot team adoption

Q2 2025:
- Full team rollout (500 campaigns)
- Automated handoff suggestions
- Partner ecosystem coordination

SLIDE 27: DISCUSSION & QUESTIONS
Title: Open Floor - Your Input
5 discussion topics:
- What am I missing?
- What concerns about adoption?
- Segment-specific insights for Q1?
- Who has best success stories?
- Other cross-functional opportunities?
Visual: Open dialogue graphic

SLIDE 28: THANK YOU
Title: Let's Build This Together
Subtitle: Questions & Discussion
Background: Google Nest branded design
Include contact info or next steps`);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [savedPresentationId, setSavedPresentationId] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [redesignInstruction, setRedesignInstruction] = useState('');
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not admin
  if (!roleLoading && roleData?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    setIsPdfUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }

      setOutline(fullText.trim());
      
      toast({
        title: 'PDF loaded!',
        description: `Extracted text from ${pdf.numPages} pages`,
      });
    } catch (error: any) {
      console.error('PDF upload error:', error);
      toast({
        title: 'PDF extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsPdfUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerateSlides = async () => {
    if (!outline.trim()) {
      toast({
        title: 'Outline required',
        description: 'Please paste your presentation outline',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-presentation', {
        body: { outline },
      });

      if (error) throw error;

      setGeneratedSlides(data.slides);
      setConversation(data.conversation);
      
      toast({
        title: 'Slides generated!',
        description: `Created ${data.slides.length} slides with Google branding`,
      });
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePresentation = async () => {
    if (generatedSlides.length === 0) {
      toast({
        title: 'No slides to save',
        description: 'Generate slides first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const title = generatedSlides[0]?.title || 'Untitled Presentation';
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('presentations')
        .insert({
          title,
          slides: generatedSlides,
          ai_conversation: conversation,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedPresentationId(data.id);
      const link = `${window.location.origin}/present/${data.token}`;
      setShareableLink(link);

      toast({
        title: 'Presentation saved!',
        description: 'Shareable link generated (expires in 14 days)',
      });
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRedesign = async () => {
    if (!redesignInstruction.trim()) {
      toast({
        title: 'Instruction required',
        description: 'Please provide instructions for redesigning the presentation',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Regenerate from scratch with new instructions
      const fullPrompt = `${outline}\n\nREDESIGN INSTRUCTIONS:\n${redesignInstruction}\n\nPlease regenerate the entire presentation from the beginning with these new instructions in mind.`;
      
      const { data, error } = await supabase.functions.invoke('ai-generate-presentation', {
        body: { outline: fullPrompt },
      });

      if (error) throw error;

      setGeneratedSlides(data.slides);
      setConversation(data.conversation);
      setRedesignInstruction(''); // Clear the instruction field
      
      toast({
        title: 'Presentation redesigned!',
        description: `Regenerated ${data.slides.length} slides with your new instructions`,
      });
    } catch (error: any) {
      console.error('Redesign error:', error);
      toast({
        title: 'Redesign failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: 'Link copied!',
      description: 'Shareable presentation link copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-google">Presentation Manager</h1>
        <p className="text-muted-foreground">Create and manage AI-powered presentations with Google branding</p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="manage">Manage Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-google">AI Slide Generator</CardTitle>
              <CardDescription>Paste your outline and let AI create Google-branded slides</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPdfUploading}
                    className="font-google"
                  >
                    {isPdfUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload PDF
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Or paste your outline below
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </div>

              <Textarea
                placeholder="Paste your presentation outline here...&#10;&#10;Example:&#10;Title: Q4 Sales Performance&#10;&#10;Section 1: Overview&#10;- Key metrics&#10;- Team achievements&#10;&#10;Section 2: Results&#10;- Revenue growth&#10;- New customers"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                className="min-h-[200px] font-google"
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateSlides} 
                  disabled={isGenerating || !outline.trim()}
                  className="font-google"
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Slides with AI
                </Button>

                {generatedSlides.length > 0 && (
                  <Button 
                    onClick={handleSavePresentation}
                    variant="secondary"
                    className="font-google"
                  >
                    Save & Get Link
                  </Button>
                )}
              </div>

              {generatedSlides.length > 0 && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold font-google">Redesign Presentation</h3>
                  </div>
                  <Textarea
                    placeholder="Enter instructions to redesign the presentation from scratch...&#10;&#10;Examples:&#10;- Make it more visual with charts and graphs&#10;- Use a darker color scheme&#10;- Simplify the content and focus on key points&#10;- Add more data visualizations&#10;- Make slides more engaging with storytelling"
                    value={redesignInstruction}
                    onChange={(e) => setRedesignInstruction(e.target.value)}
                    className="min-h-[100px] font-google"
                  />
                  <Button 
                    onClick={handleRedesign}
                    disabled={isGenerating || !redesignInstruction.trim()}
                    variant="outline"
                    className="font-google"
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Redesign from Start
                  </Button>
                </div>
              )}

              {shareableLink && (
                <Card className="bg-muted">
                  <CardContent className="pt-6 space-y-2">
                    <p className="text-sm font-medium font-google">Shareable Link (expires in 14 days):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-background border rounded-md font-google"
                      />
                      <Button size="sm" variant="outline" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {generatedSlides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-google">Preview ({generatedSlides.length} slides)</CardTitle>
              </CardHeader>
              <CardContent>
                <SlidePreviewCarousel slides={generatedSlides} />
              </CardContent>
            </Card>
          )}

          {savedPresentationId && (
            <AISlideBuilder 
              presentationId={savedPresentationId}
              onSlidesUpdated={setGeneratedSlides}
            />
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <PresentationTable />
          <PresentationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}