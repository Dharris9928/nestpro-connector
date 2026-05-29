import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { verifyCronRequest } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authError = verifyCronRequest(req, corsHeaders);
  if (authError) return authError;

  try {
    const apolloApiKey = Deno.env.get("APOLLO_API_KEY")?.trim();
    if (!apolloApiKey) {
      throw new Error("Apollo API key not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting automated Apollo email import...");

    // Get last import date
    const { data: lastImport } = await supabase
      .from('import_export_logs')
      .select('created_at')
      .eq('activity_type', 'import')
      .eq('table_name', 'company_communications')
      .ilike('notes', '%apollo%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const dateFrom = lastImport?.created_at 
      ? new Date(lastImport.created_at).toISOString().split('T')[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Default: 7 days ago
    
    const dateTo = new Date().toISOString().split('T')[0];

    console.log(`Fetching emails from ${dateFrom} to ${dateTo}`);

    // Fetch emails from Apollo
    const emailUrl = new URL("https://api.apollo.io/api/v1/emailer_messages/search");
    emailUrl.searchParams.set("page", "1");
    emailUrl.searchParams.set("per_page", "100");
    emailUrl.searchParams.set("emailer_message_date_range_mode", "completed_at");
    emailUrl.searchParams.set("emailerMessageDateRange[min]", dateFrom);
    emailUrl.searchParams.set("emailerMessageDateRange[max]", dateTo);

    const allEmails: any[] = [];
    const seenIds = new Set<string>();
    let currentPage = 1;
    const maxPages = 10;

    while (currentPage <= maxPages) {
      emailUrl.searchParams.set("page", String(currentPage));
      
      const response = await fetch(emailUrl.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          accept: "application/json",
          "X-Api-Key": apolloApiKey,
        },
      });

      if (!response.ok) {
        console.error(`Apollo API error on page ${currentPage}:`, response.status);
        break;
      }

      const data = await response.json();
      const emails = data.emailer_messages || [];
      
      if (emails.length === 0) break;

      for (const email of emails) {
        if (!seenIds.has(email.id)) {
          seenIds.add(email.id);
          allEmails.push(email);
        }
      }

      if (emails.length < 100) break;
      currentPage++;
    }

    console.log(`Fetched ${allEmails.length} emails from Apollo`);

    // Check which are already imported
    const apolloIds = allEmails.map(e => e.id);
    const { data: existing } = await supabase
      .from('apollo_email_activities')
      .select('apollo_activity_id')
      .in('apollo_activity_id', apolloIds);

    const existingIds = new Set((existing || []).map(e => e.apollo_activity_id));
    const newEmails = allEmails.filter(e => !existingIds.has(e.id));

    console.log(`Found ${newEmails.length} new emails to import`);

    if (newEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No new emails to import", imported: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contacts for new emails
    const contactIds = [...new Set(newEmails.map(e => e.contact_id).filter(Boolean))];
    const contactMap = new Map<string, any>();

    if (contactIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < contactIds.length; i += batchSize) {
        const batch = contactIds.slice(i, i + batchSize);
        const response = await fetch("https://api.apollo.io/api/v1/contacts/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apolloApiKey,
          },
          body: JSON.stringify({ contact_ids: batch, per_page: batchSize }),
        });

        if (response.ok) {
          const data = await response.json();
          for (const contact of data.contacts || []) {
            contactMap.set(contact.id, contact);
          }
        }
      }
    }

    console.log(`Fetched ${contactMap.size} contacts`);

    // Import emails
    let imported = 0;
    let companiesCreated = 0;
    let contactsCreated = 0;
    const errors: string[] = [];
    const companyCache = new Map<string, string>();
    const contactCache = new Map<string, string>();

    for (const email of newEmails) {
      try {
        const contact = contactMap.get(email.contact_id);
        const companyName = contact?.organization_name || email.campaign_name || 'Unknown Company';
        const contactEmail = contact?.email || email.to_email;

        // Get or create company
        let companyId = companyCache.get(companyName);
        if (!companyId) {
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .ilike('company_name', companyName)
            .limit(1)
            .maybeSingle();

          if (existingCompany) {
            companyId = existingCompany.id;
          } else {
            const { data: newCompany, error: companyError } = await supabase
              .from('companies')
              .insert({
                company_name: companyName,
                website: contact?.organization?.website_url,
                status: 'Lead',
                data_source: 'Apollo Import (Automated)',
              })
              .select('id')
              .single();

          if (companyError) throw companyError;
            companyId = newCompany.id;
            companiesCreated++;
          }
          companyCache.set(companyName, companyId!);
        }

        // Get or create contact
        let contactId: string | null = null;
        if (contactEmail) {
          contactId = contactCache.get(contactEmail) || null;
          if (!contactId) {
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('email', contactEmail)
              .limit(1)
              .maybeSingle();

            if (existingContact) {
              contactId = existingContact.id;
            } else {
              const { data: newContact, error: contactError } = await supabase
                .from('contacts')
                .insert({
                  company_id: companyId,
                  first_name: contact?.first_name || '',
                  last_name: contact?.last_name || '',
                  email: contactEmail,
                  title: contact?.title,
                })
                .select('id')
                .single();

              if (contactError) throw contactError;
              contactId = newContact.id;
              contactsCreated++;
            }
            if (contactId) {
              contactCache.set(contactEmail, contactId);
            }
          }
        }

        // Insert apollo_email_activity
        await supabase.from('apollo_email_activities').insert({
          apollo_activity_id: email.id,
          activity_type: 'email',
          activity_date: email.completed_at || email.created_at,
          company_id: companyId,
          contact_id: contactId,
          subject: email.subject,
          content: email.body_text,
          status: email.status,
          sent_at: email.completed_at,
          sequence_name: email.campaign_name,
          apollo_contact_email: contactEmail,
          created_by: '00000000-0000-0000-0000-000000000000', // System user
        });

        imported++;
      } catch (err) {
        errors.push(`Email ${email.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Log the import
    await supabase.from('import_export_logs').insert({
      activity_type: 'import',
      table_name: 'company_communications',
      records_count: imported,
      notes: `Automated Apollo import: ${imported} emails, ${companiesCreated} companies, ${contactsCreated} contacts`,
    });

    console.log(`Import complete: ${imported} emails, ${companiesCreated} companies, ${contactsCreated} contacts`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        companiesCreated,
        contactsCreated,
        errors: errors.slice(0, 10), // Limit error list
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Automated import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
