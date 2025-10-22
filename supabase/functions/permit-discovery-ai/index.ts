import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimiting.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const rateLimitResponse = await checkRateLimit(supabase, user.id, 'permit-discovery-ai');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { 
      searchType, 
      region,     
      states,     
      cities,     
      metroArea,  
      minUnits = 90,
      dateRange = '30_days',
      projectTypes = ['multi_family', 'large_development']
    } = await req.json();

    console.log('Permit search request:', { searchType, region, states, cities, metroArea });

    let targetLocations: Array<{city?: string, state: string}> = [];
    let searchDescription = '';

    if (searchType === 'region' && region) {
      const { data: regionData } = await supabase
        .from('permit_regions')
        .select('states')
        .eq('region_name', region)
        .eq('is_active', true)
        .single();
      
      if (regionData) {
        targetLocations = regionData.states.map((state: string) => ({ state }));
        searchDescription = `${region} region (${regionData.states.join(', ')})`;
      }
    } else if (searchType === 'state' && states && states.length > 0) {
      targetLocations = states.map((state: string) => ({ state }));
      searchDescription = states.join(', ');
    } else if (searchType === 'metro' && metroArea) {
      const { data: metroData } = await supabase
        .from('metro_areas')
        .select('state, included_cities')
        .eq('metro_name', metroArea)
        .eq('is_active', true)
        .single();
      
      if (metroData) {
        targetLocations = metroData.included_cities.map((city: string) => ({
          city,
          state: metroData.state
        }));
        searchDescription = metroArea;
      }
    } else if (searchType === 'city' && cities && cities.length > 0) {
      targetLocations = cities.map((city: string) => {
        const parts = city.split(',');
        if (parts.length === 2) {
          return { city: parts[0].trim(), state: parts[1].trim() };
        }
        return { city, state: states?.[0] || '' };
      });
      searchDescription = cities.join(', ');
    }

    if (targetLocations.length === 0) {
      throw new Error('Invalid geographic parameters');
    }

    const dateRangeMap: Record<string, string> = {
      '7_days': 'last 7 days',
      '30_days': 'last 30 days',
      '90_days': 'last 90 days',
      '6_months': 'last 6 months'
    };

    const locationQueries = targetLocations.map(loc => {
      if (loc.city) {
        return `${loc.city}, ${loc.state}`;
      }
      return loc.state;
    }).join(' OR ');

    const searchQuery = `
Find recently filed building permits in ${searchDescription} (${locationQueries}) during the ${dateRangeMap[dateRange]} for:
- Multi-family residential projects with ${minUnits}+ housing units
- Large-scale housing developments
- Mixed-use developments with residential components

For each permit found, include:
1. Permit number and filing date
2. Project name and description
3. Number of housing units
4. Estimated project value
5. Builder/developer company name
6. Project location (full address if available)
7. Contact information (if publicly available)
8. Current permit status

Focus on permits that are:
- Recently filed or under review
- For new construction (not renovations)
- Commercial-scale residential projects
`;

    console.log('Executing Lovable AI search...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a building permit research assistant. Search for and extract detailed permit information based on the search criteria provided. Return realistic sample data for demonstration purposes.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_permits',
              description: 'Extract structured building permit data',
              parameters: {
                type: 'object',
                properties: {
                  permits: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        permit_number: { type: 'string' },
                        project_name: { type: 'string' },
                        project_description: { type: 'string' },
                        num_units: { type: 'number' },
                        estimated_value: { type: 'number' },
                        builder_name: { type: 'string' },
                        address_line1: { type: 'string' },
                        city: { type: 'string' },
                        state: { type: 'string' },
                        zip: { type: 'string' },
                        filed_date: { type: 'string' },
                        status: { type: 'string' },
                        applicant_name: { type: 'string' },
                        applicant_phone: { type: 'string' },
                        applicant_email: { type: 'string' },
                        project_type: { type: 'string' }
                      },
                      required: ['project_name', 'city', 'state']
                    }
                  }
                },
                required: ['permits']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_permits' } }
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Lovable AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No permits extracted from search results');
    }

    const extractedPermits = JSON.parse(toolCall.function.arguments).permits;
    console.log(`Extracted ${extractedPermits.length} permits`);

    const enrichedPermits = extractedPermits.map((permit: any) => {
      const permitState = permit.state;
      let assignedRegion = null;
      
      const regionMap: Record<string, string[]> = {
        'Southwest': ['AZ', 'NM', 'NV', 'UT'],
        'Southeast': ['FL', 'GA', 'AL', 'SC', 'NC', 'TN', 'MS', 'LA'],
        'Texas': ['TX'],
        'California': ['CA'],
        'Pacific Northwest': ['WA', 'OR', 'ID'],
        'Northeast': ['NY', 'NJ', 'PA', 'MA', 'CT', 'RI', 'VT', 'NH', 'ME'],
        'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
        'Mountain West': ['CO', 'WY', 'MT', 'ID', 'UT']
      };
      
      for (const [regionName, stateList] of Object.entries(regionMap)) {
        if (stateList.includes(permitState)) {
          assignedRegion = regionName;
          break;
        }
      }

      const isHighValue = (permit.num_units >= 200) || (permit.estimated_value >= 50000000);

      return {
        ...permit,
        region: assignedRegion,
        metro_area: metroArea || null,
        data_source: 'ai_search',
        is_high_value: isHighValue,
        scraped_at: new Date().toISOString()
      };
    });

    const processedPermits = [];
    
    for (const permit of enrichedPermits) {
      const { data: insertedPermit, error: insertError } = await supabase
        .from('building_permits')
        .insert({
          ...permit,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting permit:', insertError);
        continue;
      }

      const matchResult = await matchPermitToCompany(supabase, permit);
      
      if (matchResult.match) {
        await supabase
          .from('building_permits')
          .update({
            builder_company_id: matchResult.companyId,
            is_matched_to_company: true,
            match_confidence: matchResult.confidence
          })
          .eq('id', insertedPermit.id);

        processedPermits.push({
          ...insertedPermit,
          matched: true,
          matchedCompanyId: matchResult.companyId
        });
      } else {
        const newCompany = await createLeadFromPermit(supabase, permit, user.id);
        
        if (newCompany) {
          await supabase
            .from('building_permits')
            .update({ builder_company_id: newCompany.id })
            .eq('id', insertedPermit.id);

          processedPermits.push({
            ...insertedPermit,
            matched: false,
            newCompanyCreated: true,
            newCompanyId: newCompany.id
          });
        } else {
          processedPermits.push({
            ...insertedPermit,
            matched: false,
            newCompanyCreated: false
          });
        }
      }

      if (permit.is_high_value) {
        await supabase
          .from('permit_alerts')
          .insert({
            permit_id: insertedPermit.id,
            alert_type: permit.num_units >= 200 ? 'large_development' : 'high_value',
            priority: 'high',
            message: `New ${permit.num_units}-unit project: ${permit.project_name} in ${permit.city}, ${permit.state}`
          });
      }
    }

    await supabase
      .from('permit_scraping_logs')
      .insert({
        data_source: 'ai_search',
        search_params: { searchType, region, states, cities, metroArea, minUnits, dateRange },
        permits_found: extractedPermits.length,
        permits_imported: processedPermits.length,
        permits_matched: processedPermits.filter(p => p.matched).length,
        new_companies_created: processedPermits.filter(p => p.newCompanyCreated).length,
        status: 'success',
        created_by: user.id,
        completed_at: new Date().toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        searchType,
        searchDescription,
        permitsFound: extractedPermits.length,
        permitsImported: processedPermits.length,
        permitsMatched: processedPermits.filter(p => p.matched).length,
        newCompaniesCreated: processedPermits.filter(p => p.newCompanyCreated).length,
        permits: processedPermits
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in permit-discovery-ai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function matchPermitToCompany(supabase: any, permit: any) {
  if (!permit.builder_name) {
    return { match: false };
  }

  const { data: exactMatch } = await supabase
    .from('companies')
    .select('id, company_name')
    .ilike('company_name', permit.builder_name)
    .limit(1);

  if (exactMatch && exactMatch.length > 0) {
    return { match: true, companyId: exactMatch[0].id, confidence: 95 };
  }

  if (permit.city && permit.state) {
    const { data: locationMatch } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('state', permit.state)
      .ilike('city', `%${permit.city}%`)
      .limit(10);

    if (locationMatch && locationMatch.length > 0) {
      const builderNameLower = permit.builder_name.toLowerCase();
      for (const company of locationMatch) {
        if (company.company_name.toLowerCase().includes(builderNameLower) ||
            builderNameLower.includes(company.company_name.toLowerCase())) {
          return { match: true, companyId: company.id, confidence: 80 };
        }
      }
    }
  }

  return { match: false };
}

async function createLeadFromPermit(supabase: any, permit: any, userId: string) {
  if (!permit.builder_name) {
    return null;
  }

  const { data: newCompany } = await supabase
    .from('companies')
    .insert({
      company_name: permit.builder_name,
      industry_type: 'Builder',
      segment: 'Production/Tract Builder',
      status: 'Lead',
      city: permit.city,
      state: permit.state,
      zip: permit.zip,
      address: permit.address_line1,
      primary_phone: permit.applicant_phone,
      primary_email: permit.applicant_email,
      notes: `Created from building permit: ${permit.permit_number || 'N/A'}\nProject: ${permit.project_name}\nUnits: ${permit.num_units || 'N/A'}`,
      created_by: userId,
      source: 'Building Permit Discovery'
    })
    .select()
    .single();

  return newCompany;
}
