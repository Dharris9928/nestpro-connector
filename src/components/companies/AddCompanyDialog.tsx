import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createCompany } from '@/lib/companies/createCompany';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users } from 'lucide-react';

interface AddCompanyDialogProps {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCompanyDialog({ open, onClose, onOpenChange, onSuccess }: AddCompanyDialogProps) {
  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Basic Info
  const [companyName, setCompanyName] = useState('');
  const [industryType, setIndustryType] = useState<'Builder' | 'Contractor'>('Builder');
  const [segment, setSegment] = useState('');
  const [status, setStatus] = useState('Lead');
  
  // Parent-Subsidiary Relationship
  const [companyType, setCompanyType] = useState<'standalone' | 'parent' | 'subsidiary'>('standalone');
  const [parentCompanyId, setParentCompanyId] = useState('');
  const [parentCompanies, setParentCompanies] = useState<any[]>([]);
  
  // Contractor Specialty (only for contractors)
  const [contractorSpecialty, setContractorSpecialty] = useState('');
  
  // Business Metrics (For Scoring)
  const [annualVolume, setAnnualVolume] = useState('');
  const [annualRevenueRange, setAnnualRevenueRange] = useState('');
  const [totalEmployees, setTotalEmployees] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  
  // Location (For Scoring)
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  
  // Contact Info
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  
  // Digital Presence (For Scoring)
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState('');
  
  // Other
  const [notes, setNotes] = useState('');

  // Builder-specific fields
  const [averageHomePrice, setAverageHomePrice] = useState('');
  const [priceCategoryState, setPriceCategoryState] = useState('');

  // Contractor-specific fields
  const [serviceAreaType, setServiceAreaType] = useState('');
  const [maintenancePercentage, setMaintenancePercentage] = useState('');
  const [emergencyPercentage, setEmergencyPercentage] = useState('');

  // Load parent companies when dialog opens
  useEffect(() => {
    if (open) {
      loadParentCompanies();
    }
  }, [open]);

  const loadParentCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, company_type')
        .or('company_type.eq.parent,company_type.eq.standalone')
        .order('company_name');

      if (error) throw error;
      setParentCompanies(data || []);
    } catch (error) {
      console.error('Error loading parent companies:', error);
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
        
        // Business Metrics
        annual_volume: annualVolume ? parseInt(annualVolume) : undefined,
        annual_revenue_range: annualRevenueRange || undefined,
        total_employees: totalEmployees ? parseInt(totalEmployees) : undefined,
        years_in_business: yearsInBusiness ? parseInt(yearsInBusiness) : undefined,
        
        // Location
        address_line1: addressLine1 || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        
        // Contact
        primary_phone: primaryPhone || undefined,
        primary_email: primaryEmail || undefined,
        
        // Digital
        website_url: websiteUrl || undefined,
        linkedin_company_url: linkedinCompanyUrl || undefined,
        
        // Builder-specific
        average_home_price: industryType === 'Builder' && averageHomePrice 
          ? parseInt(averageHomePrice) 
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
        
        // Other
        notes: notes || undefined
      } as any;

      // Add segment based on industry type
      if (industryType === 'Builder') {
        companyData.builder_segment = segment || undefined;
      } else {
        companyData.contractor_segment = segment || undefined;
      }

      await createCompany(companyData);

      toast({
        title: 'Success',
        description: 'Company created and scored automatically'
      });

      onSuccess();
      handleClose();
      
      // Reset form
      setCompanyName('');
      setIndustryType('Builder');
      setSegment('');
      setStatus('Lead');
      setAnnualVolume('');
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

  const resetForm = () => {
    setCompanyName('');
    setIndustryType('Builder');
    setSegment('');
    setCompanyType('standalone');
    setParentCompanyId('');
    setContractorSpecialty('');
    setAnnualVolume('');
    setAnnualRevenueRange('');
    setTotalEmployees('');
    setYearsInBusiness('');
    setAddressLine1('');
    setCity('');
    setState('');
    setZip('');
    setPrimaryPhone('');
    setPrimaryEmail('');
    setWebsiteUrl('');
    setLinkedinCompanyUrl('');
    setNotes('');
    setAverageHomePrice('');
    setPriceCategoryState('');
    setServiceAreaType('');
    setMaintenancePercentage('');
    setEmergencyPercentage('');
  };

  const BUILDER_SEGMENTS = [
    { value: 'production_tract', label: 'Production/Tract Builders' },
    { value: 'regional_mid_volume', label: 'Regional Mid-Volume Builders' },
    { value: 'spec_home', label: 'Spec Home Builders' },
    { value: 'luxury_custom', label: 'Luxury Custom Builders' },
    { value: 'multi_family', label: 'Multi-Family Developers' },
    { value: 'affordable_housing', label: 'Affordable Housing Builders' },
    { value: 'active_adult', label: 'Active Adult/55+ Specialists' }
  ];

  const CONTRACTOR_SEGMENTS = [
    { value: 'smart_home_champions', label: 'Smart Home Champions' },
    { value: 'customer_experience', label: 'Customer Experience Innovators' },
    { value: 'high_volume', label: 'High-Volume Installers' },
    { value: 'premium_specialists', label: 'Premium Service Specialists' },
    { value: 'regional_growth', label: 'Regional Growth Contractors' },
    { value: 'specialty_integrators', label: 'Specialty HVAC Integrators' },
    { value: 'traditionalists', label: 'Service-First Traditionalists' },
    { value: 'emergency_repair', label: 'Emergency/Repair Specialists' }
  ];

  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
        </DialogHeader>

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
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Premier Builders Inc."
                />
              </div>

              <div>
                <Label htmlFor="industry_type">
                  Industry Type <span className="text-destructive">*</span>
                </Label>
                <Select value={industryType} onValueChange={(v: any) => setIndustryType(v)}>
                  <SelectTrigger id="industry_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Builder">Builder</SelectItem>
                    <SelectItem value="Contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="segment">Segment</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger id="segment">
                    <SelectValue placeholder="Auto-assigned or select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(industryType === 'Builder' ? BUILDER_SEGMENTS : CONTRACTOR_SEGMENTS).map(seg => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Engaged">Engaged</SelectItem>
                    <SelectItem value="Pilot">Pilot</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 1.5: COMPANY STRUCTURE & CONTRACTOR SPECIALTY */}
          <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-sm uppercase text-orange-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company Structure & Details
            </h3>
            
            <div className="space-y-4">
              {/* Company Type Selection */}
              <div>
                <Label>Company Type</Label>
                <RadioGroup value={companyType} onValueChange={(v: any) => setCompanyType(v)}>
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
                  <Select value={parentCompanyId} onValueChange={setParentCompanyId} required>
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
                <div className="bg-background p-3 rounded border border-orange-300">
                  <Label htmlFor="contractor_specialty" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contractor Specialty / Trade
                  </Label>
                  <Input
                    id="contractor_specialty"
                    value={contractorSpecialty}
                    onChange={(e) => setContractorSpecialty(e.target.value)}
                    placeholder="e.g., HVAC Installation & Repair, Smart Home Integration, Emergency HVAC Services"
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe this contractor's primary specialty or trade (e.g., "Residential HVAC and Smart Thermostats")
                  </p>
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
                <Label htmlFor="annual_volume">Annual Volume</Label>
                <Input
                  id="annual_volume"
                  type="number"
                  value={annualVolume}
                  onChange={(e) => setAnnualVolume(e.target.value)}
                  placeholder={industryType === 'Builder' ? 'Homes per year' : 'Service calls per year'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {industryType === 'Builder' 
                    ? 'Number of homes built annually' 
                    : 'Number of service calls annually'}
                </p>
              </div>

              <div>
                <Label htmlFor="revenue_range">Annual Revenue Range</Label>
                <Select value={annualRevenueRange} onValueChange={setAnnualRevenueRange}>
                  <SelectTrigger id="revenue_range">
                    <SelectValue placeholder="Select range..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<$500K">Less than $500K</SelectItem>
                    <SelectItem value="$500K-$999K">$500K - $999K</SelectItem>
                    <SelectItem value="$1M-$2.9M">$1M - $2.9M</SelectItem>
                    <SelectItem value="$3M-$5.9M">$3M - $5.9M</SelectItem>
                    <SelectItem value="$6M-$10M">$6M - $10M</SelectItem>
                    <SelectItem value="$10M+">$10M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="total_employees">Total Employees</Label>
                <Input
                  id="total_employees"
                  type="number"
                  value={totalEmployees}
                  onChange={(e) => setTotalEmployees(e.target.value)}
                  placeholder="Number of employees"
                />
              </div>

              <div>
                <Label htmlFor="years_in_business">Years in Business</Label>
                <Input
                  id="years_in_business"
                  type="number"
                  value={yearsInBusiness}
                  onChange={(e) => setYearsInBusiness(e.target.value)}
                  placeholder="How many years?"
                />
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
                    <Label htmlFor="average_home_price">Average Home Price</Label>
                    <Input
                      id="average_home_price"
                      type="number"
                      value={averageHomePrice}
                      onChange={(e) => setAverageHomePrice(e.target.value)}
                      placeholder="e.g., 450000"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Average price of homes built (affects price point scoring)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="price_category">Price Point Category</Label>
                    <Select value={priceCategoryState} onValueChange={setPriceCategoryState}>
                      <SelectTrigger id="price_category">
                        <SelectValue placeholder="Auto-calculated or select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Entry-level">Entry-level (Under $250K)</SelectItem>
                        <SelectItem value="Mid-range">Mid-range ($250K-$500K)</SelectItem>
                        <SelectItem value="Luxury">Luxury ($500K-$1M)</SelectItem>
                        <SelectItem value="Ultra-luxury">Ultra-luxury ($1M+)</SelectItem>
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
                    <Select value={serviceAreaType} onValueChange={setServiceAreaType}>
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
                      onChange={(e) => setMaintenancePercentage(e.target.value)}
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
                      onChange={(e) => setEmergencyPercentage(e.target.value)}
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
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                />
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Select value={state} onValueChange={setState}>
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
                  onChange={(e) => setZip(e.target.value)}
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
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="email">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: DIGITAL PRESENCE */}
          <div className="space-y-4 bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold text-sm uppercase text-purple-700 dark:text-purple-400 flex items-center gap-2">
              <span className="text-lg">🌐</span> Digital Presence
              <span className="text-xs font-normal normal-case text-purple-600 dark:text-purple-500">
                (Used for digital engagement scoring - adds up to 30 points)
              </span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn Company Page</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={linkedinCompanyUrl}
                  onChange={(e) => setLinkedinCompanyUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/example"
                />
              </div>
            </div>
          </div>

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
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about this company..."
                rows={4}
              />
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex justify-between items-center pt-4 border-t bg-muted/50 -mx-6 px-6 py-4 -mb-6">
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <span className="text-lg">ℹ️</span>
              <span>Lead score will be calculated automatically when you save</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving & Calculating Score...' : 'Save Company'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
