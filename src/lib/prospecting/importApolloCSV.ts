import { supabase } from '@/integrations/supabase/client';
import { createCompany } from '@/lib/companies/createCompany';
import { createContact } from '@/lib/contacts/createContact';

export interface ApolloImportRow {
  [key: string]: any;
}

export interface CompanyWithContacts {
  companyData: any;
  contacts: any[];
}

export interface ImportResult {
  companiesCreated: number;
  contactsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
  companiesWithErrors: Set<string>;
}

/**
 * Detect industry type from company data
 */
export function detectIndustryType(row: ApolloImportRow): 'Builder' | 'Contractor' {
  const searchText = [
    row['Company'] || '',
    row['Organization Name'] || '',
    row['Industry'] || '',
    row['Keywords'] || ''
  ].join(' ').toLowerCase();

  // Builder keywords
  const builderKeywords = ['builder', 'homes', 'construction', 'development', 'housing', 'real estate'];
  const contractorKeywords = ['hvac', 'plumbing', 'electrical', 'contractor', 'heating', 'cooling', 'air conditioning'];

  const hasBuilderKeyword = builderKeywords.some(keyword => searchText.includes(keyword));
  const hasContractorKeyword = contractorKeywords.some(keyword => searchText.includes(keyword));

  // If both or neither, default to Contractor (as it's more common in the data)
  if (hasBuilderKeyword && !hasContractorKeyword) return 'Builder';
  return 'Contractor';
}

/**
 * Map Apollo CSV column to CRM field
 */
export function getApolloFieldMapping(): Record<string, string> {
  return {
    // Company fields
    'Company': 'company_name',
    'Organization Name': 'company_name',
    'Website': 'website_url',
    'Company Website': 'website_url',
    'Industry': 'industry',
    'Company LinkedIn Url': 'linkedin_company_url',
    '# Employees': 'total_employees',
    'Company Size': 'employee_range',
    'Employee Count': 'total_employees',
    'Revenue Range': 'annual_revenue_range',
    'Estimated Revenue': 'annual_revenue_range',
    'City': 'city',
    'State': 'state',
    'Country': 'country',
    'Phone': 'primary_phone',
    'Company Phone': 'primary_phone',
    
    // Contact fields
    'First Name': 'first_name',
    'Last Name': 'last_name',
    'Title': 'title',
    'Job Title': 'title',
    'Email': 'email',
    'Person Linkedin Url': 'linkedin_url',
    'Mobile Phone': 'phone',
    'Direct Phone': 'phone',
    'Contact Phone': 'phone',
    'Seniority': 'seniority'
  };
}

/**
 * Parse employee range to format expected by CRM
 */
function parseEmployeeRange(value: string): string | null {
  if (!value) return null;
  
  const rangeMap: Record<string, string> = {
    '1-10': '1-10',
    '11-50': '11-50',
    '51-200': '51-200',
    '201-500': '201-500',
    '501-1000': '501-1000',
    '1001-5000': '1001-5000',
    '5001-10000': '5001-10000',
    '10000+': '10000+'
  };

  // Try exact match
  if (rangeMap[value]) return rangeMap[value];

  // Try to extract numbers
  const match = value.match(/(\d+)/g);
  if (match && match.length > 0) {
    const num = parseInt(match[0]);
    if (num <= 10) return '1-10';
    if (num <= 50) return '11-50';
    if (num <= 200) return '51-200';
    if (num <= 500) return '201-500';
    if (num <= 1000) return '501-1000';
    if (num <= 5000) return '1001-5000';
    if (num <= 10000) return '5001-10000';
    return '10000+';
  }

  return null;
}

/**
 * Parse revenue range to format expected by CRM
 */
function parseRevenueRange(value: string): string | null {
  if (!value) return null;

  const normalized = value.toLowerCase().replace(/[,$]/g, '');
  
  // Extract numbers
  const match = normalized.match(/(\d+)([mk])?/);
  if (!match) return null;

  let amount = parseInt(match[1]);
  const unit = match[2];

  if (unit === 'k') amount = amount / 1000; // Convert to millions
  if (unit === 'm') amount = amount; // Already in millions

  if (amount < 1) return '<$1M';
  if (amount < 2) return '$1M-$1.9M';
  if (amount < 5) return '$2M-$4M';
  if (amount < 10) return '$5M-$9M';
  if (amount < 25) return '$10M-$24M';
  if (amount < 50) return '$25M-$49M';
  if (amount < 100) return '$50M-$99M';
  return '$100M+';
}

/**
 * Group Apollo rows by company
 */
export function groupByCompany(rows: ApolloImportRow[]): CompanyWithContacts[] {
  const companiesMap = new Map<string, CompanyWithContacts>();

  rows.forEach(row => {
    const companyName = row['Company'] || row['Organization Name'];
    if (!companyName) return;

    const companyKey = companyName.toLowerCase().trim();

    if (!companiesMap.has(companyKey)) {
      // Create company entry
      const industryType = detectIndustryType(row);
      const employeeRange = parseEmployeeRange(row['Company Size'] || row['# Employees'] || '');
      const revenueRange = parseRevenueRange(row['Revenue Range'] || row['Estimated Revenue'] || '');

      companiesMap.set(companyKey, {
        companyData: {
          company_name: companyName,
          website_url: row['Website'] || row['Company Website'] || null,
          industry_type: industryType,
          linkedin_company_url: row['Company LinkedIn Url'] || null,
          total_employees_range: employeeRange,
          annual_revenue_range: revenueRange,
          city: row['City'] || null,
          state: row['State'] || null,
          primary_phone: row['Company Phone'] || row['Phone'] || null,
          status: 'Lead'
        },
        contacts: []
      });
    }

    // Add contact if exists
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    const email = row['Email'];

    if (firstName || lastName || email) {
      companiesMap.get(companyKey)!.contacts.push({
        first_name: firstName || '',
        last_name: lastName || '',
        title: row['Title'] || row['Job Title'] || null,
        email: email || null,
        phone: row['Mobile Phone'] || row['Direct Phone'] || row['Contact Phone'] || null,
        linkedin_url: row['Person Linkedin Url'] || null
      });
    }
  });

  return Array.from(companiesMap.values());
}

/**
 * Check if company already exists
 */
async function findExistingCompany(companyName: string, websiteUrl?: string): Promise<string | null> {
  let query = supabase
    .from('companies')
    .select('id')
    .ilike('company_name', companyName);

  if (websiteUrl) {
    query = query.or(`website_url.ilike.%${websiteUrl}%`);
  }

  const { data } = await query.maybeSingle();
  return data?.id || null;
}

/**
 * Check if contact already exists
 */
async function findExistingContact(
  companyId: string,
  email?: string,
  firstName?: string,
  lastName?: string
): Promise<boolean> {
  if (email) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('company_id', companyId)
      .ilike('email', email)
      .maybeSingle();
    
    if (data) return true;
  }

  if (firstName && lastName) {
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('company_id', companyId)
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .maybeSingle();
    
    if (data) return true;
  }

  return false;
}

/**
 * Import companies and contacts from Apollo CSV
 */
export async function importApolloData(
  groupedData: CompanyWithContacts[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const results: ImportResult = {
    companiesCreated: 0,
    contactsCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
    companiesWithErrors: new Set<string>()
  };

  for (let i = 0; i < groupedData.length; i++) {
    const { companyData, contacts } = groupedData[i];
    
    try {
      // Check for duplicate company
      const existingCompanyId = await findExistingCompany(
        companyData.company_name,
        companyData.website_url
      );

      let companyId: string;

      if (existingCompanyId) {
        companyId = existingCompanyId;
        results.duplicatesSkipped++;
      } else {
        // Create new company
        const newCompany = await createCompany(companyData);
        companyId = newCompany.id;
        results.companiesCreated++;
      }

      // Create contacts
      for (const contactData of contacts) {
        if (!contactData.first_name && !contactData.last_name && !contactData.email) {
          continue; // Skip empty contacts
        }

        try {
          // Check for duplicate contact
          const contactExists = await findExistingContact(
            companyId,
            contactData.email,
            contactData.first_name,
            contactData.last_name
          );

          if (!contactExists) {
            await createContact({
              ...contactData,
              company_id: companyId
            });
            results.contactsCreated++;
          } else {
            results.duplicatesSkipped++;
          }
        } catch (contactError: any) {
          results.errors.push(
            `Contact "${contactData.first_name} ${contactData.last_name}": ${contactError.message}`
          );
        }
      }
    } catch (error: any) {
      results.errors.push(`Company "${companyData.company_name}": ${error.message}`);
      results.companiesWithErrors.add(companyData.company_name);
    }

    if (onProgress) {
      onProgress(i + 1, groupedData.length);
    }
  }

  return results;
}
