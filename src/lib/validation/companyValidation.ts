// lib/validation/companyValidation.ts

export function validateCompanyData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.company_name || data.company_name.trim() === '') {
    errors.push('Company name is required');
  }
  
  if (!data.industry_type) {
    errors.push('Industry type is required');
  } else if (!['Builder', 'Contractor'].includes(data.industry_type)) {
    errors.push('Industry type must be "Builder" or "Contractor"');
  }
  
  if (!data.state) {
    errors.push('State is required');
  } else if (!/^[A-Z]{2}$/.test(data.state)) {
    errors.push('State must be a 2-letter code (e.g., TX, CA)');
  }
  
  // Segment validation
  if (data.segment) {
    const validBuilderSegments = [
      'production_tract', 'regional_mid_volume', 'spec_home', 
      'luxury_custom', 'multi_family', 'affordable_housing', 'active_adult'
    ];
    const validContractorSegments = [
      'smart_home_champions', 'customer_experience', 'high_volume',
      'premium_specialists', 'regional_growth', 'specialty_integrators',
      'traditionalists', 'emergency_repair'
    ];
    
    if (data.industry_type === 'Builder' && !validBuilderSegments.includes(data.segment)) {
      errors.push(`Invalid builder segment: ${data.segment}`);
    }
    if (data.industry_type === 'Contractor' && !validContractorSegments.includes(data.segment)) {
      errors.push(`Invalid contractor segment: ${data.segment}`);
    }
  }
  
  // Status validation
  if (data.status) {
    const validStatuses = ['Lead', 'Contacted', 'Engaged', 'Pilot', 'Active', 'Inactive', 'Lost'];
    if (!validStatuses.includes(data.status)) {
      errors.push(`Invalid status: ${data.status}`);
    }
  }
  
  // Company type validation
  if (data.company_type) {
    const validTypes = ['standalone', 'parent', 'subsidiary'];
    if (!validTypes.includes(data.company_type)) {
      errors.push(`Invalid company type: ${data.company_type}`);
    }
  }
  
  // Priority tier validation
  if (data.priority_tier) {
    const validTiers = ['P1', 'P2', 'P3', 'Unscored'];
    if (!validTiers.includes(data.priority_tier)) {
      errors.push(`Invalid priority tier: ${data.priority_tier}`);
    }
  }
  
  // Revenue range validation
  if (data.annual_revenue_range) {
    const validRanges = ['<$500K', '$500K-$999K', '$1M-$2.9M', '$3M-$5.9M', '$6M-$10M', '$10M+'];
    if (!validRanges.includes(data.annual_revenue_range)) {
      errors.push(`Invalid revenue range: ${data.annual_revenue_range}`);
    }
  }
  
  // Price point validation
  if (data.price_point_category) {
    const validCategories = ['entry_level', 'move_up', 'premium', 'luxury'];
    if (!validCategories.includes(data.price_point_category)) {
      errors.push(`Invalid price point category: ${data.price_point_category}`);
    }
  }
  
  // Service area validation
  if (data.service_area_type) {
    const validTypes = ['local', 'metro', 'regional', 'multi_state'];
    if (!validTypes.includes(data.service_area_type)) {
      errors.push(`Invalid service area type: ${data.service_area_type}`);
    }
  }
  
  // Segment confidence validation
  if (data.segment_confidence) {
    const validConfidences = ['High', 'Medium', 'Low'];
    if (!validConfidences.includes(data.segment_confidence)) {
      errors.push(`Invalid segment confidence: ${data.segment_confidence}`);
    }
  }
  
  // Partner relationship status validation
  if (data.partner_relationship_status) {
    const validStatuses = ['Matched', 'Introduced', 'Active', 'Inactive'];
    if (!validStatuses.includes(data.partner_relationship_status)) {
      errors.push(`Invalid partner relationship status: ${data.partner_relationship_status}`);
    }
  }
  
  // Percentage validations
  if (data.maintenance_contract_percentage !== null && data.maintenance_contract_percentage !== undefined) {
    const val = parseInt(data.maintenance_contract_percentage);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push('Maintenance contract percentage must be between 0 and 100');
    }
  }
  
  if (data.emergency_service_percentage !== null && data.emergency_service_percentage !== undefined) {
    const val = parseInt(data.emergency_service_percentage);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push('Emergency service percentage must be between 0 and 100');
    }
  }
  
  // Score validation
  if (data.lead_score !== null && data.lead_score !== undefined) {
    const score = parseInt(data.lead_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push('Lead score must be between 0 and 100');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
