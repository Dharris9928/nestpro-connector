import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Building2, MapPin, DollarSign, Users, Plus, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProspectCompany {
  apolloId: string;
  companyName: string;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  keywords: string[];
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  employees: number | null;
  employeeRange: string | null;
  revenue: number | null;
  revenueRange: string | null;
  foundedYear: number | null;
  yearsRange: string | null;
  description: string | null;
  logoUrl: string | null;
  technologies: string[];
  buyingIntentStrength: string;
  buyingIntentTopics: string[];
  socialMediaUrls: {
    facebook: string | null;
    twitter: string | null;
    linkedin: string | null;
  };
}

export function ApolloCompanyProspecting() {
  const { toast } = useToast();
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<Set<string>>(new Set());
  const [companies, setCompanies] = useState<ProspectCompany[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  
  // Search filters
  const [keywords, setKeywords] = useState<string[]>(['home builder', 'construction']);
  const [keywordInput, setKeywordInput] = useState('');
  const [employeeRange, setEmployeeRange] = useState('all');
  const [revenueRange, setRevenueRange] = useState('all');
  const [states, setStates] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState('');
  const [buyingIntentStrength, setBuyingIntentStrength] = useState('all');

  const addKeyword = () => {
    if (keywordInput && !keywords.includes(keywordInput)) {
      setKeywords([...keywords, keywordInput]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const addState = () => {
    if (stateInput && !states.includes(stateInput.toUpperCase())) {
      setStates([...states, stateInput.toUpperCase()]);
      setStateInput('');
    }
  };

  const removeState = (state: string) => {
    setStates(states.filter(s => s !== state));
  };

  const searchCompanies = async () => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('apollo-company-search', {
        body: {
          keywords,
          employeeRange: employeeRange && employeeRange !== 'all' ? employeeRange : undefined,
          revenueRange: revenueRange && revenueRange !== 'all' ? revenueRange : undefined,
          states: states.length > 0 ? states : undefined,
          buyingIntentStrength: buyingIntentStrength && buyingIntentStrength !== 'all' ? buyingIntentStrength : undefined,
          page: 1
        }
      });

      if (error) throw error;

      setCompanies(data.companies || []);
      setSelectedCompanies(new Set());
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.companies?.length || 0} companies matching your criteria`,
      });
    } catch (error: any) {
      console.error('Company search error:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search companies',
        variant: 'destructive'
      });
    } finally {
      setSearching(false);
    }
  };

  const toggleCompanySelection = (apolloId: string) => {
    const newSelected = new Set(selectedCompanies);
    if (newSelected.has(apolloId)) {
      newSelected.delete(apolloId);
    } else {
      newSelected.add(apolloId);
    }
    setSelectedCompanies(newSelected);
  };

  const importCompany = async (company: ProspectCompany) => {
    setImporting(new Set([company.apolloId]));
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('companies').insert({
        company_name: company.companyName,
        website_url: company.websiteUrl,
        linkedin_company_url: company.linkedinUrl,
        primary_phone: company.phone,
        city: company.city,
        state: company.state,
        total_employees: company.employees,
        total_employees_range: company.employeeRange,
        annual_revenue_range: company.revenueRange,
        years_in_business: company.foundedYear ? new Date().getFullYear() - company.foundedYear : null,
        years_in_business_range: company.yearsRange,
        industry_type: company.keywords.some(k => k.toLowerCase().includes('builder')) ? 'Builder' : 'Contractor',
        status: 'Lead',
        notes: company.description,
        facebook_url: company.socialMediaUrls.facebook,
        buying_intent_strength: company.buyingIntentStrength !== 'none' ? company.buyingIntentStrength : null,
        buying_intent_topics: company.buyingIntentTopics.length > 0 ? company.buyingIntentTopics : null,
        buying_intent_last_detected: company.buyingIntentStrength !== 'none' ? new Date().toISOString() : null,
        created_by: user.user?.id
      });

      if (error) throw error;

      toast({
        title: 'Company Imported',
        description: `${company.companyName} has been added to your CRM`,
      });

      // Remove from list
      setCompanies(companies.filter(c => c.apolloId !== company.apolloId));
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import company',
        variant: 'destructive'
      });
    } finally {
      setImporting(new Set());
    }
  };

  const importSelected = async () => {
    const selected = companies.filter(c => selectedCompanies.has(c.apolloId));
    if (selected.length === 0) return;

    setImporting(new Set(selectedCompanies));
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const records = selected.map(company => ({
        company_name: company.companyName,
        website_url: company.websiteUrl,
        linkedin_company_url: company.linkedinUrl,
        primary_phone: company.phone,
        city: company.city,
        state: company.state,
        total_employees: company.employees,
        total_employees_range: company.employeeRange,
        annual_revenue_range: company.revenueRange,
        years_in_business: company.foundedYear ? new Date().getFullYear() - company.foundedYear : null,
        years_in_business_range: company.yearsRange,
        industry_type: company.keywords.some(k => k.toLowerCase().includes('builder')) ? 'Builder' : 'Contractor',
        status: 'Lead',
        notes: company.description,
        facebook_url: company.socialMediaUrls.facebook,
        buying_intent_strength: company.buyingIntentStrength !== 'none' ? company.buyingIntentStrength : null,
        buying_intent_topics: company.buyingIntentTopics.length > 0 ? company.buyingIntentTopics : null,
        buying_intent_last_detected: company.buyingIntentStrength !== 'none' ? new Date().toISOString() : null,
        created_by: user.user?.id
      }));

      const { error } = await supabase.from('companies').insert(records);

      if (error) throw error;

      toast({
        title: 'Companies Imported',
        description: `${selected.length} companies have been added to your CRM`,
      });

      // Remove imported from list
      setCompanies(companies.filter(c => !selectedCompanies.has(c.apolloId)));
      setSelectedCompanies(new Set());
    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import companies',
        variant: 'destructive'
      });
    } finally {
      setImporting(new Set());
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Company Prospecting Filters
          </CardTitle>
          <CardDescription>
            Search Apollo's database for companies matching your ideal customer profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="keywords" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="size">Company Size</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="intent">🎯 Buying Intent</TabsTrigger>
            </TabsList>

            <TabsContent value="keywords" className="space-y-4">
              <div>
                <Label>Industry Keywords</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., home builder, contractor"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                  />
                  <Button onClick={addKeyword} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="size" className="space-y-4">
              <div>
                <Label>Employee Count</Label>
                <Select value={employeeRange} onValueChange={setEmployeeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any size</SelectItem>
                    <SelectItem value="1,10">1-10</SelectItem>
                    <SelectItem value="11,50">11-50</SelectItem>
                    <SelectItem value="51,200">51-200</SelectItem>
                    <SelectItem value="201,500">201-500</SelectItem>
                    <SelectItem value="501,1000">501-1,000</SelectItem>
                    <SelectItem value="1001,null">1,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <div>
                <Label>Target States</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="e.g., TX, CA, FL"
                    value={stateInput}
                    onChange={(e) => setStateInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && addState()}
                    maxLength={2}
                  />
                  <Button onClick={addState} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {states.map((state) => (
                    <Badge key={state} variant="secondary" className="cursor-pointer" onClick={() => removeState(state)}>
                      {state} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <div>
                <Label>Annual Revenue</Label>
                <Select value={revenueRange} onValueChange={setRevenueRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any revenue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any revenue</SelectItem>
                    <SelectItem value="1M-10M">$1M - $10M</SelectItem>
                    <SelectItem value="10M-50M">$10M - $50M</SelectItem>
                    <SelectItem value="50M-100M">$50M - $100M</SelectItem>
                    <SelectItem value="100M+">$100M+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="intent" className="space-y-4">
              <div>
                <Label>Buying Intent Strength</Label>
                <Select value={buyingIntentStrength} onValueChange={setBuyingIntentStrength}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any intent level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any intent level</SelectItem>
                    <SelectItem value="high">🔥 High - Actively researching</SelectItem>
                    <SelectItem value="medium">⚡ Medium - Showing interest</SelectItem>
                    <SelectItem value="low">💡 Low - Early signals</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Filter companies by their buying intent signals from Apollo
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={searchCompanies} disabled={searching || keywords.length === 0} size="lg" className="w-full">
            <Search className={`h-4 w-4 mr-2 ${searching ? 'animate-pulse' : ''}`} />
            {searching ? 'Searching Apollo...' : 'Search Companies'}
          </Button>
        </CardContent>
      </Card>

      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results ({companies.length})</CardTitle>
                <CardDescription>Select companies to import into your CRM</CardDescription>
              </div>
              {selectedCompanies.size > 0 && (
                <Button onClick={importSelected} disabled={importing.size > 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Import {selectedCompanies.size} Selected
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {companies.map((company) => (
                <div key={company.apolloId} className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={selectedCompanies.has(company.apolloId)}
                    onCheckedChange={() => toggleCompanySelection(company.apolloId)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{company.companyName}</h3>
                      {company.buyingIntentStrength !== 'none' && (
                        <Badge variant="default" className="text-xs">
                          {company.buyingIntentStrength === 'high' && '🔥 High Intent'}
                          {company.buyingIntentStrength === 'medium' && '⚡ Medium Intent'}
                          {company.buyingIntentStrength === 'low' && '💡 Low Intent'}
                        </Badge>
                      )}
                      {company.websiteUrl && (
                        <a href={company.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>

                    {company.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{company.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {company.city && company.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {company.city}, {company.state}
                        </span>
                      )}
                      {company.employeeRange && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {company.employeeRange} employees
                        </span>
                      )}
                      {company.revenueRange && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {company.revenueRange}
                        </span>
                      )}
                    </div>

                    {company.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {company.keywords.slice(0, 5).map((keyword, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => importCompany(company)}
                    disabled={importing.has(company.apolloId)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {importing.has(company.apolloId) ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}