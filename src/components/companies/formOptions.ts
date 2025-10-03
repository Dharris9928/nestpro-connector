// components/companies/formOptions.ts

export const INDUSTRY_TYPES = [
  { value: 'Builder', label: 'Builder' },
  { value: 'Contractor', label: 'Contractor' },
  { value: 'CI/Security', label: 'CI/Security' }
];

export const BUILDER_SEGMENTS = [
  { value: 'production_tract', label: 'Production/Tract' },
  { value: 'regional_mid_volume', label: 'Regional Mid-Volume' },
  { value: 'spec_home', label: 'Spec Home' },
  { value: 'luxury_custom', label: 'Luxury Custom' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'affordable_housing', label: 'Affordable Housing' },
  { value: 'active_adult', label: 'Active Adult/55+' }
];

export const CONTRACTOR_SEGMENTS = [
  { value: 'smart_home_champions', label: 'Smart Home Champions' },
  { value: 'customer_experience', label: 'Customer Experience Innovators' },
  { value: 'high_volume', label: 'High-Volume Installers' },
  { value: 'premium_specialists', label: 'Premium Specialists' },
  { value: 'regional_growth', label: 'Regional Growth' },
  { value: 'specialty_integrators', label: 'Specialty Integrators' },
  { value: 'traditionalists', label: 'Service-First Traditionalists' },
  { value: 'emergency_repair', label: 'Emergency/Repair Specialists' }
];

export const CI_SECURITY_SEGMENTS = [
  { value: 'enterprise_integrators', label: 'Enterprise Integrators' },
  { value: 'residential_security', label: 'Residential Security Specialists' },
  { value: 'commercial_security', label: 'Commercial Security' },
  { value: 'access_control', label: 'Access Control Specialists' },
  { value: 'surveillance_experts', label: 'Surveillance Experts' },
  { value: 'smart_building', label: 'Smart Building Integrators' },
  { value: 'managed_services', label: 'Managed Security Services' }
];

export const STATUSES = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Pilot', label: 'Pilot' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Lost', label: 'Lost' }
];

export const COMPANY_TYPES = [
  { value: 'standalone', label: 'Standalone Company', description: 'Independent company with no parent or subsidiaries' },
  { value: 'parent', label: 'Parent Company', description: 'Has subsidiary companies/divisions' },
  { value: 'subsidiary', label: 'Subsidiary/Division', description: 'Part of a larger parent company' }
];

export const PRICE_POINT_CATEGORIES = [
  { value: 'entry_level', label: 'Entry Level (<$250K)' },
  { value: 'move_up', label: 'Move-Up ($250K-$500K)' },
  { value: 'premium', label: 'Premium ($500K-$1M)' },
  { value: 'luxury', label: 'Luxury ($1M+)' }
];

export const SERVICE_AREA_TYPES = [
  { value: 'local', label: 'Local (Single City)' },
  { value: 'metro', label: 'Metro Area' },
  { value: 'regional', label: 'Regional (Multi-County)' },
  { value: 'multi_state', label: 'Multi-State' }
];

export const ANNUAL_REVENUE_RANGES = [
  { value: '<$500K', label: 'Less than $500K' },
  { value: '$500K-$999K', label: '$500K - $999K' },
  { value: '$1M-$2.9M', label: '$1M - $2.9M' },
  { value: '$3M-$5.9M', label: '$3M - $5.9M' },
  { value: '$6M-$10M', label: '$6M - $10M' },
  { value: '$10M+', label: '$10M+' }
];

export const REVENUE_GROWTH_TRENDS = [
  { value: 'High Growth 20%+', label: 'High Growth (20%+ annually)' },
  { value: 'Moderate Growth 10-20%', label: 'Moderate Growth (10-20% annually)' },
  { value: 'Stable 0-10%', label: 'Stable (0-10% annually)' },
  { value: 'Declining', label: 'Declining' },
  { value: 'Unknown', label: 'Unknown' }
];

export const PROFITABILITY_LEVELS = [
  { value: 'Highly Profitable', label: 'Highly Profitable (15%+ margin)' },
  { value: 'Profitable', label: 'Profitable (5-15% margin)' },
  { value: 'Break-even', label: 'Break-even (0-5% margin)' },
  { value: 'Struggling', label: 'Struggling (negative margin)' },
  { value: 'Unknown', label: 'Unknown' }
];

export const FINANCIAL_HEALTH_RATINGS = [
  { value: 'Excellent', label: 'Excellent (Strong financials, low debt)' },
  { value: 'Good', label: 'Good (Healthy financials)' },
  { value: 'Fair', label: 'Fair (Manageable debt, stable)' },
  { value: 'At Risk', label: 'At Risk (High debt, cash flow issues)' },
  { value: 'Unknown', label: 'Unknown' }
];

export const PARTNER_RELATIONSHIP_STATUSES = [
  { value: 'Matched', label: 'Matched' },
  { value: 'Introduced', label: 'Introduced' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' }
];
