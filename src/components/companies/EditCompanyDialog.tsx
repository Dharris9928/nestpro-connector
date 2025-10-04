import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { updateCompany } from '@/lib/companies/updateCompany';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users } from 'lucide-react';
import { DigitalEngagementSection } from './DigitalEngagementSection';
import { EnrichCompanyButton } from './EnrichCompanyButton';
import { EnrichmentHistory } from './EnrichmentHistory';
import { AIInsightsPanel } from './AIInsightsPanel';
import { DataQualityIndicator } from './DataQualityIndicator';
import { ApolloContactRecommendations } from './ApolloContactRecommendations';
import { CommunicationsTab } from './CommunicationsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BUILDER_SEGMENTS, 
  CONTRACTOR_SEGMENTS,
  ENERGY_IMPLEMENTER_SEGMENTS,
  ENGINEER_ARCHITECT_SEGMENTS,
  STATUSES, 
  US_STATES,
  ANNUAL_REVENUE_RANGES,
  PRICE_POINT_CATEGORIES,
  SERVICE_AREA_TYPES,
  REVENUE_GROWTH_TRENDS,
  PROFITABILITY_LEVELS,
  FINANCIAL_HEALTH_RATINGS,
  INDUSTRY_SPECIALTIES
} from './formOptions';

interface EditCompanyDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
  companyId: string;
}

export function EditCompanyDialog({ open, onClose, onOpenChange, onSuccess, companyId }: EditCompanyDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const handleClose = () => {
    if (hasUnsavedChanges && !showCloseWarning) {
      setShowCloseWarning(true);
      return;
    }
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
    setShowCloseWarning(false);
    setHasUnsavedChanges(false);
  };
  
  const confirmClose = () => {
    setShowCloseWarning(false);
    setHasUnsavedChanges(false);
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  // Track any field change
  const markChanged = () => {
    if (!isInitialLoad) setHasUnsavedChanges(true);
  };
  
  // Basic Info
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState<'Builder' | 'Contractor' | 'Energy Implementer' | 'Engineer/Architect'>('Builder');
  const [segment, setSegment] = useState('');
  const [status, setStatus] = useState('Lead');
  const [industrySpecialties, setIndustrySpecialties] = useState<string[]>([]);
  
  // Parent-Subsidiary Relationship
  const [companyType, setCompanyType] = useState<'standalone' | 'parent' | 'subsidiary'>('standalone');
  const [parentCompanyId, setParentCompanyId] = useState('');
  const [parentCompanies, setParentCompanies] = useState<any[]>([]);
  
  // Contractor Specialty (only for contractors)
  const [contractorSpecialty, setContractorSpecialty] = useState('');
  const [nestProId, setNestProId] = useState('');
  
  // Business Metrics (For Scoring) - NOW USING RANGES
  const [annualVolumeRange, setAnnualVolumeRange] = useState('');
  const [annualRevenueRange, setAnnualRevenueRange] = useState('');
  const [totalEmployeesRange, setTotalEmployeesRange] = useState('');
  const [yearsInBusinessRange, setYearsInBusinessRange] = useState('');
  
  // Location (For Scoring)
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  // Contact Info
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  
  // Digital Presence (For Scoring) - ENHANCED
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [websiteQuality, setWebsiteQuality] = useState('');
  const [websiteHasSmartContent, setWebsiteHasSmartContent] = useState(false);
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState('');
  const [linkedinActivityLevel, setLinkedinActivityLevel] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [technologyAdoptionLevel, setTechnologyAdoptionLevel] = useState('');
  const [nestInstallationVolume, setNestInstallationVolume] = useState('');
  const [offersSmartThermostats, setOffersSmartThermostats] = useState(false);
  const [offersSmartSecurity, setOffersSmartSecurity] = useState(false);
  const [offersHomeAutomation, setOffersHomeAutomation] = useState(false);
  
  // Other
  const [notes, setNotes] = useState('');

  // Builder-specific fields - NOW USING RANGE
  const [averageHomePriceRange, setAverageHomePriceRange] = useState('');
  const [priceCategoryState, setPriceCategoryState] = useState('');

  // Contractor-specific fields
  const [serviceAreaType, setServiceAreaType] = useState('');
  const [maintenancePercentage, setMaintenancePercentage] = useState('');
  const [emergencyPercentage, setEmergencyPercentage] = useState('');

  // Financial Stability Indicators
  const [revenueGrowthTrend, setRevenueGrowthTrend] = useState('');
  const [profitabilityLevel, setProfitabilityLevel] = useState('');
  const [financialHealthRating, setFinancialHealthRating] = useState('');
  
  // Financial Stability Rubric (15-point binary system)
  const [revenueGrowthIndicators, setRevenueGrowthIndicators] = useState(false);
  const [multipleActiveProjects, setMultipleActiveProjects] = useState(false);
  const [industryAwardsRecognition, setIndustryAwardsRecognition] = useState(false);
  const [positiveReviewsReputation, setPositiveReviewsReputation] = useState(false);

  useEffect(() => {
    if (open && companyId) {
      loadCompanyData();
      loadParentCompanies();
    }
  }, [open, companyId]);

  const loadParentCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, company_type')
        .or('company_type.eq.parent,company_type.eq.standalone')
        .neq('id', companyId) // Exclude current company
        .order('company_name');

      if (error) throw error;
      setParentCompanies(data || []);
    } catch (error) {
      console.error('Error loading parent companies:', error);
    }
  };

  const loadCompanyData = async () => {
    setLoading(true);
    setIsInitialLoad(true);
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      // Reset unsaved changes when loading fresh data
      setHasUnsavedChanges(false);

      // Populate all form fields with existing data
      setCompanyName(company.company_name || '');
      setIndustryType(company.industry_type as 'Builder' | 'Contractor' || 'Builder');
      
      // Get segment (unified field)
      setSegment(company.segment || '');
      
      setStatus(company.status || 'Lead');
      
      // Parent-Subsidiary Relationship
      setCompanyType((company.company_type as 'standalone' | 'parent' | 'subsidiary') || 'standalone');
      setParentCompanyId(company.parent_company_id || '');
      
      // Contractor Specialty
      setContractorSpecialty(company.contractor_specialty || '');
      setNestProId(company.nest_pro_partner_id || '');
      
      setAnnualVolumeRange(company.annual_volume_range || '');
      setAnnualRevenueRange(company.annual_revenue_range || '');
      setTotalEmployeesRange(company.total_employees_range || '');
      setYearsInBusinessRange(company.years_in_business_range || '');
      setAddressLine1(company.address_line1 || '');
      setCity(company.city || '');
      setState(company.state || '');
      setZip(company.zip || '');
      setPrimaryPhone(company.primary_phone || '');
      setPrimaryEmail(company.primary_email || '');
      setWebsiteUrl(company.website_url || '');
      setLinkedinCompanyUrl(company.linkedin_company_url || '');
      setWebsiteQuality(company.website_quality || '');
      setWebsiteHasSmartContent(!!company.website_has_smart_home_content);
      setLinkedinActivityLevel(company.linkedin_activity_level || '');
      setFacebookUrl(company.facebook_url || '');
      setInstagramUrl(company.instagram_url || '');
      setYoutubeUrl(company.youtube_url || '');
      setTechnologyAdoptionLevel(company.technology_adoption_level || '');
      setNestInstallationVolume(company.nest_installation_volume_range || '');
      setOffersSmartThermostats(!!company.offers_smart_thermostats);
      setOffersSmartSecurity(!!company.offers_smart_security);
      setOffersHomeAutomation(!!company.offers_home_automation);
      setNotes(company.notes || '');
      
      // Builder-specific fields
      const companyAny = company as any;
      setAverageHomePriceRange(companyAny.average_home_price_range || '');
      setPriceCategoryState(companyAny.price_point_category || '');
      
      // Contractor-specific fields
      setServiceAreaType(companyAny.service_area_type || '');
      setMaintenancePercentage(companyAny.maintenance_contract_percentage?.toString() || '');
      setEmergencyPercentage(companyAny.emergency_service_percentage?.toString() || '');
      
      // Financial Stability Indicators
      setRevenueGrowthTrend(companyAny.revenue_growth_trend || '');
      setProfitabilityLevel(companyAny.profitability_level || '');
      setFinancialHealthRating(companyAny.financial_health_rating || '');
      setRevenueGrowthIndicators(companyAny.revenue_growth_indicators || false);
      setMultipleActiveProjects(companyAny.multiple_active_projects || false);
      setIndustryAwardsRecognition(companyAny.industry_awards_recognition || false);
      setPositiveReviewsReputation(companyAny.positive_reviews_reputation || false);
      
      // Industry Specialties
      setIndustrySpecialties(companyAny.industry_specialties || []);
    } catch (error: any) {
      console.error('Error loading company:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      // Small delay to ensure all state updates complete before allowing change tracking
      setTimeout(() => setIsInitialLoad(false), 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const companyData: any = {
        company_name: companyName,
        industry_type: industryType,
        status: status as any,
        
        // Parent-Subsidiary Relationship
        company_type: companyType,
        parent_company_id: companyType === 'subsidiary' ? parentCompanyId || null : null,
        is_parent_company: companyType === 'parent',
        
        // Contractor Specialty (only saved if contractor)
        contractor_specialty: industryType === 'Contractor' ? contractorSpecialty || null : null,
        nest_pro_partner_id: nestProId || undefined,
        
        // Business Metrics - NOW USING RANGES
        annual_volume_range: annualVolumeRange || undefined,
        annual_revenue_range: annualRevenueRange || undefined,
        total_employees_range: totalEmployeesRange || undefined,
        years_in_business_range: yearsInBusinessRange || undefined,
        
        // Location
        address_line1: addressLine1 || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        
        // Contact
        primary_phone: primaryPhone || undefined,
        primary_email: primaryEmail || undefined,
        
        // Digital - ENHANCED
        website_url: websiteUrl || undefined,
        website_quality: websiteQuality || undefined,
        website_has_smart_home_content: websiteHasSmartContent,
        linkedin_company_url: linkedinCompanyUrl || undefined,
        linkedin_activity_level: linkedinActivityLevel || undefined,
        facebook_url: facebookUrl || undefined,
        instagram_url: instagramUrl || undefined,
        youtube_url: youtubeUrl || undefined,
        technology_adoption_level: technologyAdoptionLevel || undefined,
        nest_installation_volume_range: nestInstallationVolume || undefined,
        offers_smart_thermostats: offersSmartThermostats,
        offers_smart_security: offersSmartSecurity,
        offers_home_automation: offersHomeAutomation,
        
        // Industry Specialties
        industry_specialties: industrySpecialties.length > 0 ? industrySpecialties : undefined,
        
        // Builder-specific - NOW USING RANGE
        average_home_price_range: industryType === 'Builder' 
          ? averageHomePriceRange || undefined 
          : undefined,
        price_point_category: industryType === 'Builder' 
          ? priceCategoryState || undefined 
          : undefined,
        
        // Contractor-specific
        service_area_type: industryType === 'Contractor' 
          ? serviceAreaType || undefined 
          : undefined,
        maintenance_contract_percentage: industryType === 'Contractor' && maintenancePercentage
          ? parseInt(maintenancePercentage)
          : undefined,
        emergency_service_percentage: industryType === 'Contractor' && emergencyPercentage
          ? parseInt(emergencyPercentage)
          : undefined,
        
        // Financial Stability Indicators
        revenue_growth_trend: revenueGrowthTrend || undefined,
        profitability_level: profitabilityLevel || undefined,
        financial_health_rating: financialHealthRating || undefined,
        revenue_growth_indicators: revenueGrowthIndicators,
        multiple_active_projects: multipleActiveProjects,
        industry_awards_recognition: industryAwardsRecognition,
        positive_reviews_reputation: positiveReviewsReputation,
        
        // Other
        notes: notes || undefined
      } as any;

      // Add segment (unified for both Builder and Contractor)
      companyData.segment = segment || undefined;

      await updateCompany(companyId, companyData);

      toast({
        title: 'Success',
        description: 'Company updated and score recalculated'
      });

      setHasUnsavedChanges(false);
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Company</DialogTitle>
            <EnrichCompanyButton 
              companyId={companyId} 
              onComplete={() => loadCompanyData()} 
            />
          </div>
        </DialogHeader>

        <Tabs defaultValue="form" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="form">Company Details</TabsTrigger>
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="contacts">Find Contacts</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="history">Enrichment Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="form">
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="company_name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  required
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (!isInitialLoad) setHasUnsavedChanges(true);
                  }}
                  placeholder="Premier Builders Inc."
                />
              </div>

              <div>
                <Label htmlFor="industry_type">
                  Company Type <span className="text-destructive">*</span>
                </Label>
                <Select value={industryType} onValueChange={(v: any) => {
                  setIndustryType(v);
                  if (!isInitialLoad) setHasUnsavedChanges(true);
                }}>
                  <SelectTrigger id="industry_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Builder">Builder</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                    <SelectItem value="Energy Implementer">Energy Implementer</SelectItem>
                    <SelectItem value="Engineer/Architect">Engineer/Architect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="segment">Segment</Label>
                <Select value={segment} onValueChange={(v) => {
                  setSegment(v);
                  markChanged();
                }}>
                  <SelectTrigger id="segment">
                    <SelectValue placeholder="Auto-assigned or select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(industryType === 'Builder' ? BUILDER_SEGMENTS : 
                      industryType === 'Contractor' ? CONTRACTOR_SEGMENTS :
                      industryType === 'Energy Implementer' ? ENERGY_IMPLEMENTER_SEGMENTS :
                      ENGINEER_ARCHITECT_SEGMENTS).map(seg => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => {
                  setStatus(v);
                  markChanged();
                }}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Industry Type</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {INDUSTRY_SPECIALTIES.map((specialty) => (
                    <div key={specialty.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-${specialty.value}`}
                        checked={industrySpecialties.includes(specialty.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setIndustrySpecialties([...industrySpecialties, specialty.value]);
                          } else {
                            setIndustrySpecialties(industrySpecialties.filter(s => s !== specialty.value));
                          }
                          markChanged();
                        }}
                      />
                      <label
                        htmlFor={`edit-${specialty.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {specialty.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1.5: COMPANY STRUCTURE & CONTRACTOR SPECIALTY */}
          <div className="space-y-4 bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <h3 className="font-semibold text-sm uppercase text-orange-700 dark:text-orange-400 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Structure & Details
            </h3>
            
            <div className="space-y-4">
              {/* Company Type Selection */}
              <div>
                <Label>Company Type</Label>
                <RadioGroup value={companyType} onValueChange={(v: any) => {
                  setCompanyType(v);
                  markChanged();
                }}>
                  <div className="flex flex-col space-y-2 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="standalone" id="standalone" />
                      <span className="text-sm">
                        <strong>Standalone Company</strong> - Independent company with no parent or subsidiaries
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="parent" id="parent" />
                      <span className="text-sm">
                        <strong>Parent Company</strong> - Has subsidiary companies/divisions
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <RadioGroupItem value="subsidiary" id="subsidiary" />
                      <span className="text-sm">
                        <strong>Subsidiary/Division</strong> - Part of a larger parent company
                      </span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Parent Company Selector (only shows if subsidiary) */}
              {companyType === 'subsidiary' && (
                <div>
                  <Label htmlFor="parent_company">
                    Parent Company <span className="text-red-500">*</span>
                  </Label>
                  <Select value={parentCompanyId} onValueChange={(v) => {
                    setParentCompanyId(v);
                    markChanged();
                  }} required>
                    <SelectTrigger id="parent_company">
                      <SelectValue placeholder="Select parent company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parentCompanies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.company_name}
                          {company.company_type === 'parent' && (
                            <span className="text-xs text-muted-foreground ml-2">(Parent)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select the parent company this division belongs to
                  </p>
                </div>
              )}

              {/* Contractor Specialty (only shows for contractors) */}
              {industryType === 'Contractor' && (
                <div className="space-y-3">
                  <div className="bg-background p-3 rounded border border-orange-300 dark:border-orange-700">
                    <Label htmlFor="contractor_specialty" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contractor Specialty / Trade
                    </Label>
                    <Input
                      id="contractor_specialty"
                      value={contractorSpecialty}
                      onChange={(e) => {
                        setContractorSpecialty(e.target.value);
                        markChanged();
                      }}
                      placeholder="e.g., HVAC Installation & Repair, Smart Home Integration, Emergency HVAC Services"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe this contractor's primary specialty or trade (e.g., "Residential HVAC and Smart Thermostats")
                    </p>
                  </div>

                  <div className="bg-background p-3 rounded border border-orange-300 dark:border-orange-700">
                    <Label htmlFor="nest_pro_id">
                      Nest Pro ID
                    </Label>
                    <Input
                      id="nest_pro_id"
                      value={nestProId}
                      onChange={(e) => {
                        setNestProId(e.target.value);
                        markChanged();
                      }}
                      placeholder="Enter Nest Pro Partner ID"
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nest Pro Partner identification number if applicable
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: BUSINESS METRICS */}
          <div className="space-y-4 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-sm uppercase text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <span className="text-lg">📊</span> Business Metrics
              <span className="text-xs font-normal normal-case text-blue-600 dark:text-blue-500">
                (Used for lead scoring - affects Priority Tier)
              </span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="annual_volume_range">
                  Annual Volume {industryType === 'Builder' ? '(Homes Built)' : '(Service Calls)'} <span className="text-red-500">*</span>
                </Label>
                <Select value={annualVolumeRange} onValueChange={(v) => {
                  setAnnualVolumeRange(v);
                  markChanged();
                }}>
                  <SelectTrigger id="annual_volume_range">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {industryType === 'Builder' ? (
                      <>
                        <SelectItem value="1,000+">1,000+ homes/year (15 pts) - Major builder</SelectItem>
                        <SelectItem value="500-999">500-999 homes/year (14 pts) - Large production</SelectItem>
                        <SelectItem value="250-499">250-499 homes/year (13 pts) - Production</SelectItem>
                        <SelectItem value="100-249">100-249 homes/year (12 pts) - Regional production</SelectItem>
                        <SelectItem value="50-99">50-99 homes/year (10 pts) - Regional mid-volume</SelectItem>
                        <SelectItem value="25-49">25-49 homes/year (8 pts) - Small to mid-volume</SelectItem>
                        <SelectItem value="10-24">10-24 homes/year (6 pts) - Spec home</SelectItem>
                        <SelectItem value="5-9">5-9 homes/year (4 pts) - Small custom</SelectItem>
                        <SelectItem value="1-4">1-4 homes/year (2 pts) - Very small</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="10,000+">10,000+ calls/year (12 pts) - Very high volume</SelectItem>
                        <SelectItem value="5,000-9,999">5,000-9,999 calls/year (11 pts) - High volume</SelectItem>
                        <SelectItem value="3,000-4,999">3,000-4,999 calls/year (10 pts) - High volume</SelectItem>
                        <SelectItem value="2,000-2,999">2,000-2,999 calls/year (9 pts) - Medium-high</SelectItem>
                        <SelectItem value="1,500-1,999">1,500-1,999 calls/year (8 pts) - Medium-high</SelectItem>
                        <SelectItem value="1,000-1,499">1,000-1,499 calls/year (7 pts) - Medium</SelectItem>
                        <SelectItem value="750-999">750-999 calls/year (6 pts) - Medium</SelectItem>
                        <SelectItem value="500-749">500-749 calls/year (5 pts) - Small-medium</SelectItem>
                        <SelectItem value="250-499">250-499 calls/year (4 pts) - Small-medium</SelectItem>
                        <SelectItem value="100-249">100-249 calls/year (3 pts) - Small</SelectItem>
                        <SelectItem value="<100">&lt;100 calls/year (1 pt) - Very small</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-blue-600 mt-1">
                  📈 Select the range that best fits annual {industryType === 'Builder' ? 'home completions' : 'service calls'}
                </p>
              </div>

              <div>
                <Label htmlFor="revenue_range">
                  Annual Revenue Range
                  {industryType === 'Contractor' && (
                    <span className="ml-2 text-blue-600 text-xs">
                      📈 Affects revenue score (0-12 pts)
                    </span>
                  )}
                </Label>
                <Select value={annualRevenueRange} onValueChange={(v) => {
                  setAnnualRevenueRange(v);
                  markChanged();
                }}>
                  <SelectTrigger id="revenue_range">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {industryType === 'Contractor' ? (
                      <>
                        <SelectItem value="$50M+">$50M+ (12 pts) - Very large</SelectItem>
                        <SelectItem value="$25M-$49M">$25M-$49M (11 pts) - Large</SelectItem>
                        <SelectItem value="$10M-$24M">$10M-$24M (10 pts) - Large</SelectItem>
                        <SelectItem value="$5M-$9M">$5M-$9M (8 pts) - Medium-large</SelectItem>
                        <SelectItem value="$2M-$4M">$2M-$4M (6 pts) - Medium</SelectItem>
                        <SelectItem value="$1M-$1.9M">$1M-$1.9M (4 pts) - Small-medium</SelectItem>
                        <SelectItem value="<$1M">&lt;$1M (2 pts) - Small</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="$100M+">$100M+ (12 pts) - Major national</SelectItem>
                        <SelectItem value="$50M-$99M">$50M-$99M (11 pts) - Large production</SelectItem>
                        <SelectItem value="$25M-$49M">$25M-$49M (10 pts) - Large regional</SelectItem>
                        <SelectItem value="$10M-$24M">$10M-$24M (8 pts) - Regional</SelectItem>
                        <SelectItem value="$5M-$9M">$5M-$9M (6 pts) - Small-medium</SelectItem>
                        <SelectItem value="$2M-$4M">$2M-$4M (4 pts) - Small</SelectItem>
                        <SelectItem value="<$2M">&lt;$2M (2 pts) - Very small</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600 mt-1">
                  {industryType === 'Contractor' 
                    ? 'Higher revenue = higher scoring potential'
                    : 'Revenue used for general business assessment'}
                </p>
              </div>

              <div>
                <Label htmlFor="employees_range">Total Employees</Label>
                <Select value={totalEmployeesRange} onValueChange={(v) => {
                  setTotalEmployeesRange(v);
                  markChanged();
                }}>
                  <SelectTrigger id="employees_range">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="500+">500+ employees</SelectItem>
                    <SelectItem value="250-499">250-499 employees</SelectItem>
                    <SelectItem value="100-249">100-249 employees</SelectItem>
                    <SelectItem value="50-99">50-99 employees</SelectItem>
                    <SelectItem value="25-49">25-49 employees</SelectItem>
                    <SelectItem value="10-24">10-24 employees</SelectItem>
                    <SelectItem value="5-9">5-9 employees</SelectItem>
                    <SelectItem value="1-4">1-4 employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="years_range">Years in Business</Label>
                <Select value={yearsInBusinessRange} onValueChange={(v) => {
                  setYearsInBusinessRange(v);
                  markChanged();
                }}>
                  <SelectTrigger id="years_range">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30+">30+ years</SelectItem>
                    <SelectItem value="20-29">20-29 years</SelectItem>
                    <SelectItem value="15-19">15-19 years</SelectItem>
                    <SelectItem value="10-14">10-14 years</SelectItem>
                    <SelectItem value="6-9">6-9 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="0-2">0-2 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* FINANCIAL STABILITY INDICATORS */}
            <div className="mt-4 pt-4 border-t border-blue-300 space-y-4">
              <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                💰 Financial Stability Indicators
                <span className="text-xs font-normal text-blue-600 dark:text-blue-500">(Affects stability score)</span>
              </h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="revenue_growth">Revenue Growth Trend</Label>
                  <Select value={revenueGrowthTrend} onValueChange={(v) => {
                    setRevenueGrowthTrend(v);
                    markChanged();
                  }}>
                    <SelectTrigger id="revenue_growth">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REVENUE_GROWTH_TRENDS.map(trend => (
                        <SelectItem key={trend.value} value={trend.value}>
                          {trend.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="profitability">Profitability Level</Label>
                  <Select value={profitabilityLevel} onValueChange={(v) => {
                    setProfitabilityLevel(v);
                    markChanged();
                  }}>
                    <SelectTrigger id="profitability">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFITABILITY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="financial_health">Financial Health Rating</Label>
                  <Select value={financialHealthRating} onValueChange={(v) => {
                    setFinancialHealthRating(v);
                    markChanged();
                  }}>
                    <SelectTrigger id="financial_health">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCIAL_HEALTH_RATINGS.map(rating => (
                        <SelectItem key={rating.value} value={rating.value}>
                          {rating.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* FINANCIAL STABILITY RUBRIC (15-POINT BINARY SYSTEM) */}
            <div className="mt-4 pt-4 border-t border-green-300 space-y-4">
              <h4 className="font-medium text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                ✅ Financial Stability Rubric
                <span className="text-xs font-normal text-green-600 dark:text-green-500">(15-point binary scoring)</span>
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <input
                    type="checkbox"
                    id="revenue_growth_indicators"
                    checked={revenueGrowthIndicators}
                    onChange={(e) => {
                      setRevenueGrowthIndicators(e.target.checked);
                      markChanged();
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="revenue_growth_indicators" className="font-medium cursor-pointer">
                      Revenue Growth Indicators (5 pts)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expansion, new markets, increased production capacity
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <input
                    type="checkbox"
                    id="multiple_active_projects"
                    checked={multipleActiveProjects}
                    onChange={(e) => {
                      setMultipleActiveProjects(e.target.checked);
                      markChanged();
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="multiple_active_projects" className="font-medium cursor-pointer">
                      Multiple Active Projects (5 pts)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Multiple active communities/projects simultaneously
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <input
                    type="checkbox"
                    id="industry_awards_recognition"
                    checked={industryAwardsRecognition}
                    onChange={(e) => {
                      setIndustryAwardsRecognition(e.target.checked);
                      markChanged();
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="industry_awards_recognition" className="font-medium cursor-pointer">
                      Industry Awards/Recognition (3 pts)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Builder awards, national rankings, certifications
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <input
                    type="checkbox"
                    id="positive_reviews_reputation"
                    checked={positiveReviewsReputation}
                    onChange={(e) => {
                      setPositiveReviewsReputation(e.target.checked);
                      markChanged();
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="positive_reviews_reputation" className="font-medium cursor-pointer">
                      Positive Reviews/Reputation (2 pts)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      BBB A- or higher, 4+ stars average, strong testimonials
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                <strong>Total Score: {(revenueGrowthIndicators ? 5 : 0) + (multipleActiveProjects ? 5 : 0) + (industryAwardsRecognition ? 3 : 0) + (positiveReviewsReputation ? 2 : 0)}/15 points</strong>
              </div>
            </div>

            {/* BUILDER-SPECIFIC FIELDS */}
            {industryType === 'Builder' && (
              <div className="mt-4 pt-4 border-t border-blue-300 space-y-4">
                <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">
                  Builder-Specific Metrics (Used in Scoring)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home_price_range">
                      Average Home Price <span className="text-red-500">*</span>
                    </Label>
                    <Select value={averageHomePriceRange} onValueChange={(v) => {
                      setAverageHomePriceRange(v);
                      markChanged();
                    }}>
                      <SelectTrigger id="home_price_range">
                        <SelectValue placeholder="Select price range..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="$3M+">$3M+ (15 pts) - Ultra luxury</SelectItem>
                        <SelectItem value="$2M-$2.99M">$2M-$2.99M (14 pts) - Ultra luxury</SelectItem>
                        <SelectItem value="$1.5M-$1.99M">$1.5M-$1.99M (13 pts) - Luxury high</SelectItem>
                        <SelectItem value="$1M-$1.49M">$1M-$1.49M (12 pts) - Luxury</SelectItem>
                        <SelectItem value="$800K-$999K">$800K-$999K (11 pts) - Premium high</SelectItem>
                        <SelectItem value="$600K-$799K">$600K-$799K (10 pts) - Premium</SelectItem>
                        <SelectItem value="$500K-$599K">$500K-$599K (9 pts) - Move-up high</SelectItem>
                        <SelectItem value="$400K-$499K">$400K-$499K (8 pts) - Move-up</SelectItem>
                        <SelectItem value="$300K-$399K">$300K-$399K (7 pts) - Mid-range high</SelectItem>
                        <SelectItem value="$250K-$299K">$250K-$299K (6 pts) - Mid-range</SelectItem>
                        <SelectItem value="$200K-$249K">$200K-$249K (4 pts) - Entry-level</SelectItem>
                        <SelectItem value="$150K-$199K">$150K-$199K (3 pts) - Entry low</SelectItem>
                        <SelectItem value="<$150K">&lt;$150K (2 pts) - Very affordable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="price_category">Price Point Category</Label>
                    <Select value={priceCategoryState} onValueChange={(v) => {
                      setPriceCategoryState(v);
                      markChanged();
                    }}>
                      <SelectTrigger id="price_category">
                        <SelectValue placeholder="Auto-calculated or select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_POINT_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* CONTRACTOR-SPECIFIC FIELDS */}
            {industryType === 'Contractor' && (
              <div className="mt-4 pt-4 border-t border-blue-300 space-y-4">
                <h4 className="font-medium text-sm text-blue-800 dark:text-blue-300">
                  Contractor-Specific Metrics (Used in Scoring)
                </h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service_area">Service Area Type</Label>
                    <Select value={serviceAreaType} onValueChange={(v) => {
                      setServiceAreaType(v);
                      markChanged();
                    }}>
                      <SelectTrigger id="service_area">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">Local (City/County)</SelectItem>
                        <SelectItem value="Regional">Regional (Multi-county)</SelectItem>
                        <SelectItem value="Multi-state">Multi-state</SelectItem>
                        <SelectItem value="National">National</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="maintenance_pct">Maintenance Contracts %</Label>
                    <Input
                      id="maintenance_pct"
                      type="number"
                      min="0"
                      max="100"
                      value={maintenancePercentage}
                      onChange={(e) => {
                        setMaintenancePercentage(e.target.value);
                        markChanged();
                      }}
                      placeholder="e.g., 30"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      % of business from recurring contracts
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="emergency_pct">Emergency Service %</Label>
                    <Input
                      id="emergency_pct"
                      type="number"
                      min="0"
                      max="100"
                      value={emergencyPercentage}
                      onChange={(e) => {
                        setEmergencyPercentage(e.target.value);
                        markChanged();
                      }}
                      placeholder="e.g., 20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      % of business from emergency calls
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: LOCATION */}
          <div className="space-y-4 bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold text-sm uppercase text-green-700 dark:text-green-400 flex items-center gap-2">
              <span className="text-lg">📍</span> Location
              <span className="text-xs font-normal normal-case text-green-600 dark:text-green-500">
                (City affects geographic scoring - certain markets get higher scores)
              </span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={addressLine1}
                  onChange={(e) => {
                    setAddressLine1(e.target.value);
                    markChanged();
                  }}
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    markChanged();
                  }}
                  placeholder="Austin"
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Select value={state} onValueChange={(v) => {
                  setState(v);
                  markChanged();
                }}>
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="zip">Zip Code</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value);
                    markChanged();
                  }}
                  placeholder="78701"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: CONTACT INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
              Contact Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Primary Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => {
                    setPrimaryPhone(e.target.value);
                    markChanged();
                  }}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="email">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => {
                    setPrimaryEmail(e.target.value);
                    markChanged();
                  }}
                  placeholder="contact@company.com"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: DIGITAL ENGAGEMENT */}
          <DigitalEngagementSection
            industryType={industryType}
            websiteUrl={websiteUrl}
            onWebsiteUrlChange={(v) => { setWebsiteUrl(v); markChanged(); }}
            websiteQuality={websiteQuality}
            onWebsiteQualityChange={(v) => { setWebsiteQuality(v); markChanged(); }}
            websiteHasSmartContent={websiteHasSmartContent}
            onWebsiteHasSmartContentChange={(v) => { setWebsiteHasSmartContent(v); markChanged(); }}
            linkedinUrl={linkedinCompanyUrl}
            onLinkedinUrlChange={(v) => { setLinkedinCompanyUrl(v); markChanged(); }}
            linkedinActivityLevel={linkedinActivityLevel}
            onLinkedinActivityLevelChange={(v) => { setLinkedinActivityLevel(v); markChanged(); }}
            facebookUrl={facebookUrl}
            onFacebookUrlChange={(v) => { setFacebookUrl(v); markChanged(); }}
            instagramUrl={instagramUrl}
            onInstagramUrlChange={(v) => { setInstagramUrl(v); markChanged(); }}
            youtubeUrl={youtubeUrl}
            onYoutubeUrlChange={(v) => { setYoutubeUrl(v); markChanged(); }}
            technologyAdoptionLevel={technologyAdoptionLevel}
            onTechnologyAdoptionLevelChange={(v) => { setTechnologyAdoptionLevel(v); markChanged(); }}
            nestInstallationVolume={nestInstallationVolume}
            onNestInstallationVolumeChange={(v) => { setNestInstallationVolume(v); markChanged(); }}
            offersSmartThermostats={offersSmartThermostats}
            onOffersSmartThermostatsChange={(v) => { setOffersSmartThermostats(v); markChanged(); }}
            offersSmartSecurity={offersSmartSecurity}
            onOffersSmartSecurityChange={(v) => { setOffersSmartSecurity(v); markChanged(); }}
            offersHomeAutomation={offersHomeAutomation}
            onOffersHomeAutomationChange={(v) => { setOffersHomeAutomation(v); markChanged(); }}
          />

          {/* SECTION 6: NOTES */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-2">
              Additional Notes
            </h3>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  markChanged();
                }}
                placeholder="Any additional information about this company..."
                rows={4}
              />
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex justify-between items-center pt-4 border-t bg-muted/50 -mx-6 px-6 py-4 -mb-6">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <span className="text-lg">ℹ️</span>
              <span>Lead score will be recalculated if scoring fields changed</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving & Recalculating...' : 'Update Company'}
              </Button>
            </div>
          </div>
        </form>
      </TabsContent>
      
      <TabsContent value="quality" className="space-y-4">
        <DataQualityIndicator 
          company={{
            company_name: companyName,
            website_url: websiteUrl,
            primary_phone: primaryPhone,
            primary_email: primaryEmail,
            annual_volume: annualVolumeRange ? parseInt(annualVolumeRange.split('-')[0]) || null : null,
            annual_revenue_range: annualRevenueRange,
            average_home_price: averageHomePriceRange ? parseInt(averageHomePriceRange.split('-')[0]) || null : null,
            linkedin_company_url: linkedinCompanyUrl,
            industry_type: industryType,
            segment,
            status
          }}
        />
      </TabsContent>
      
      <TabsContent value="insights" className="space-y-4">
        <AIInsightsPanel companyId={companyId} />
      </TabsContent>
      
      <TabsContent value="contacts" className="space-y-4">
        <ApolloContactRecommendations 
          companyId={companyId}
          companyName={companyName}
          websiteUrl={websiteUrl}
          onContactAdded={() => {
            toast({
              title: 'Contact Added',
              description: 'The contact has been successfully added to your database',
            });
          }}
        />
      </TabsContent>
      
      <TabsContent value="communications" className="space-y-4">
        <CommunicationsTab companyId={companyId} />
      </TabsContent>
      
      <TabsContent value="history" className="space-y-4">
        <EnrichmentHistory companyId={companyId} />
      </TabsContent>
    </Tabs>
      </DialogContent>
    </Dialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you close this dialog. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseWarning(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
