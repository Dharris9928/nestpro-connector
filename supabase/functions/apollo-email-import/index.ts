import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApolloEmailActivity {
  id: string;
  emailer_campaign_id?: string;
  emailer_campaign_name?: string;
  emailer_step_id?: string;
  emailer_step_position?: number;
  emailer_template_id?: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  contact_id?: string;
  contact?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    title?: string;
    organization_name?: string;
    organization?: {
      id: string;
      name?: string;
      website_url?: string;
    };
  };
  account_id?: string;
  account?: {
    id: string;
    name?: string;
    domain?: string;
  };
  status?: string;
  sent_at?: string;
  created_at?: string;
  completed_at?: string;
  opened_at?: string;
  clicked_at?: string;
  replied_at?: string;
  bounced_at?: string;
  email_status?: string;
  // Additional fields from Apollo API
  replied?: boolean;
  bounce?: boolean;
  spam_blocked?: boolean;
  failed_at?: string;
  campaign_name?: string;
}

interface ApolloContact {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  organization_name?: string;
  organization?: {
    id: string;
    name?: string;
    website_url?: string;
  };
  account_id?: string;
  account?: {
    id: string;
    name?: string;
    domain?: string;
  };
}

type ApolloPagination = {
  page?: number;
  per_page?: number;
  total_entries?: number;
  total_pages?: number;
};

function toNumber(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apolloApiKeyRaw = Deno.env.get("APOLLO_API_KEY");
    const apolloApiKey = apolloApiKeyRaw?.trim();
    if (!apolloApiKey) {
      throw new Error("Apollo API key not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const {
      action,
      page = 1,
      perPage = 100,
      dateFrom,
      dateTo,
      sequenceId,
    } = body;

    if (action === "fetch-sequences") {
      console.log("Fetching Apollo email sequences...");

      const url = new URL("https://api.apollo.io/api/v1/emailer_campaigns/search");
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", String(perPage));

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          accept: "application/json",
          "X-Api-Key": apolloApiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Apollo sequences API error:", response.status, errorText);
        throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Found ${data.emailer_campaigns?.length || 0} sequences`);

      return new Response(
        JSON.stringify({
          success: true,
          sequences: data.emailer_campaigns || [],
          pagination: data.pagination,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "fetch-emails") {
      console.log("Fetching Apollo sent emails...");

      const maxPages = 50;

      const fetchEmailPage = async (pageNumber: number) => {
        const url = new URL("https://api.apollo.io/api/v1/emailer_messages/search");
        url.searchParams.set("page", String(pageNumber));
        url.searchParams.set("per_page", String(perPage));

        if (dateFrom || dateTo) {
          url.searchParams.set("emailer_message_date_range_mode", "completed_at");
          if (dateFrom) url.searchParams.set("emailerMessageDateRange[min]", dateFrom);
          if (dateTo) url.searchParams.set("emailerMessageDateRange[max]", dateTo);
        }

        if (sequenceId) {
          url.searchParams.append("emailer_campaign_ids[]", sequenceId);
        }

        console.log(`Fetching email page ${pageNumber}`);

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            accept: "application/json",
            "X-Api-Key": apolloApiKey,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Apollo emails API error:", response.status, errorText);
          throw new Error(`Apollo API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const emails: ApolloEmailActivity[] = data.emailer_messages || [];
        const pagination: ApolloPagination | undefined = data.pagination;

        console.log(`Page ${pageNumber}: Found ${emails.length} emails`);

        // Log sample structure on first page
        if (emails.length > 0 && pageNumber === 1) {
          const sample = emails[0];
          console.log("Sample email keys:", Object.keys(sample));
          console.log("contact_id:", sample.contact_id);
          console.log("account_id:", sample.account_id);
        }

        return { emails, pagination };
      };

      // Fetch contacts by IDs in batches
      const fetchContacts = async (contactIds: string[]): Promise<Map<string, ApolloContact>> => {
        const contactMap = new Map<string, ApolloContact>();
        if (contactIds.length === 0) return contactMap;

        // Apollo's people/match endpoint allows fetching by IDs
        const batchSize = 100;
        for (let i = 0; i < contactIds.length; i += batchSize) {
          const batch = contactIds.slice(i, i + batchSize);
          
          try {
            const response = await fetch("https://api.apollo.io/api/v1/contacts/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                accept: "application/json",
                "X-Api-Key": apolloApiKey,
              },
              body: JSON.stringify({
                contact_ids: batch,
                per_page: batchSize,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const contacts: ApolloContact[] = data.contacts || [];
              console.log(`Fetched ${contacts.length} contacts for batch ${Math.floor(i/batchSize) + 1}`);
              
              for (const contact of contacts) {
                contactMap.set(contact.id, contact);
              }
            } else {
              console.error("Failed to fetch contacts batch:", response.status);
            }
          } catch (error) {
            console.error("Error fetching contacts:", error);
          }
        }

        return contactMap;
      };

      // Collect all emails
      const allEmails: ApolloEmailActivity[] = [];
      const seenIds = new Set<string>();

      const startingPage = Math.max(1, Number(page) || 1);
      const first = await fetchEmailPage(startingPage);

      for (const e of first.emails) {
        if (!seenIds.has(e.id)) {
          seenIds.add(e.id);
          allEmails.push(e);
        }
      }

      const totalEntriesFromApi = toNumber(first.pagination?.total_entries);
      const totalPagesFromApi = toNumber(first.pagination?.total_pages);

      let currentPage = startingPage;
      let pagesFetched = 1;

      while (pagesFetched < maxPages) {
        if (totalPagesFromApi && currentPage >= totalPagesFromApi) {
          break;
        }

        const nextPage = currentPage + 1;
        const next = await fetchEmailPage(nextPage);

        if (!next.emails.length) {
          break;
        }

        let newCount = 0;
        for (const e of next.emails) {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id);
            allEmails.push(e);
            newCount += 1;
          }
        }

        if (newCount === 0) {
          console.log(`Page ${nextPage} contained no new email IDs; stopping pagination.`);
          break;
        }

        currentPage = nextPage;
        pagesFetched += 1;

        if (next.emails.length < perPage) {
          break;
        }
      }

      console.log(`Total emails fetched: ${allEmails.length}`);

      // Collect unique contact IDs
      const contactIds = [...new Set(
        allEmails
          .map(e => e.contact_id)
          .filter((id): id is string => !!id)
      )];

      console.log(`Found ${contactIds.length} unique contact IDs to fetch`);

      // Fetch contact details
      const contactMap = await fetchContacts(contactIds);
      console.log(`Successfully fetched ${contactMap.size} contact details`);

      const totalCount = totalEntriesFromApi ?? allEmails.length;

      // Transform emails with enriched contact data
      // Map Apollo status values to our normalized status
      const deriveEmailStatus = (email: ApolloEmailActivity): string => {
        // Check boolean flags first (these are the most reliable)
        if (email.bounce) return 'bounced';
        if (email.spam_blocked) return 'spam_blocked';
        if (email.replied) return 'replied';
        
        // Check status string
        const status = (email.status || email.email_status || '').toLowerCase();
        if (status === 'bounced' || status === 'bounce') return 'bounced';
        if (status === 'replied' || status === 'reply') return 'replied';
        if (status === 'clicked' || status === 'click') return 'clicked';
        if (status === 'opened' || status === 'open') return 'opened';
        if (status === 'spam_blocked' || status === 'spam blocked') return 'spam_blocked';
        if (status === 'unsubscribed') return 'unsubscribed';
        
        // If completed_at exists, it was sent/delivered
        if (email.completed_at || email.sent_at) return 'delivered';
        
        return 'pending';
      };

      const transformedEmails = allEmails.map((email) => {
        const contact = email.contact_id ? contactMap.get(email.contact_id) : null;
        const derivedStatus = deriveEmailStatus(email);
        
        return {
          apolloId: email.id,
          sequenceId: email.emailer_campaign_id,
          sequenceName: email.emailer_campaign_name || email.campaign_name,
          stepPosition: email.emailer_step_position,
          subject: email.subject,
          bodyText: email.body_text,
          bodyHtml: email.body_html,
          status: derivedStatus,
          rawStatus: email.status,
          sentAt: email.completed_at || email.sent_at,
          openedAt: email.opened_at,
          clickedAt: email.clicked_at,
          repliedAt: email.replied_at || (email.replied ? email.completed_at : null),
          bouncedAt: email.bounced_at || (email.bounce ? email.completed_at : null),
          spamBlocked: email.spam_blocked,
          contact: contact
            ? {
                apolloId: contact.id,
                firstName: contact.first_name,
                lastName: contact.last_name,
                email: contact.email,
                title: contact.title,
                companyName: contact.organization_name || contact.organization?.name || contact.account?.name,
                companyDomain: contact.organization?.website_url || contact.account?.domain,
              }
            : email.contact
            ? {
                apolloId: email.contact.id,
                firstName: email.contact.first_name,
                lastName: email.contact.last_name,
                email: email.contact.email,
                title: email.contact.title,
                companyName: email.contact.organization_name || email.contact.organization?.name,
                companyDomain: email.contact.organization?.website_url,
              }
            : null,
          company: contact?.account
            ? {
                apolloId: contact.account.id,
                name: contact.account.name,
                domain: contact.account.domain,
              }
            : email.account
            ? {
                apolloId: email.account.id,
                name: email.account.name,
                domain: email.account.domain,
              }
            : null,
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          emails: transformedEmails,
          totalCount,
          pagination: {
            page: startingPage,
            per_page: perPage,
            total_entries: totalCount,
            total_pages: totalPagesFromApi ?? null,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Apollo email import error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Import failed",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
