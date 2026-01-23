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
  open_count?: number;
  clicked_at?: string;
  click_count?: number;
  replied_at?: string;
  reply_count?: number;
  bounced_at?: string;
  email_status?: string;
  // Additional fields from Apollo API
  replied?: boolean;
  bounce?: boolean;
  spam_blocked?: boolean;
  failed_at?: string;
  campaign_name?: string;
  recipients?: Array<Record<string, unknown>>;
  emailer_message_stats?: Array<{
    status?: string;
    emailer_message_status?: string;
    status_changed_at?: string;
  }>;
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
      maxPages: requestedMaxPages,
      skipEngagementFetch = false, // Skip individual email fetches for faster response
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

      // Use requested max pages or default to 10 for faster response (can paginate on client)
      const maxPages = Math.min(requestedMaxPages || 10, 50);

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

        // Log sample structure on first page (avoid logging PII)
        if (emails.length > 0 && pageNumber === 1) {
          const sample = emails[0];
          console.log("Sample email keys:", Object.keys(sample));
          console.log("Sample email status fields:", {
            status: sample.status,
            email_status: sample.email_status,
            replied: sample.replied,
            bounce: sample.bounce,
            spam_blocked: sample.spam_blocked,
            opened_at: sample.opened_at,
            open_count: sample.open_count,
            clicked_at: sample.clicked_at,
            click_count: sample.click_count,
          });

          // Log emailer_message_stats which contains engagement data
          const statsArray = (sample as unknown as Record<string, unknown>)?.emailer_message_stats;
          if (Array.isArray(statsArray) && statsArray.length > 0) {
            console.log("Sample emailer_message_stats count:", statsArray.length);
            console.log("Sample emailer_message_stats[0]:", JSON.stringify(statsArray[0], null, 2));
          } else {
            console.log("No emailer_message_stats found in sample email");
          }

          console.log("contact_id:", sample.contact_id);
          console.log("account_id:", sample.account_id);
        }

        return { emails, pagination };
      };

      // Fetch email activities (opens/clicks/replies) from Apollo's activities endpoint
      type EmailEngagement = {
        openCount: number;
        clickCount: number;
        replyCount: number;
        openedAt?: string;
        clickedAt?: string;
        repliedAt?: string;
      };
      
      const fetchEmailActivities = async (emailIds: string[]): Promise<Map<string, EmailEngagement>> => {
        const engagementMap = new Map<string, EmailEngagement>();
        if (emailIds.length === 0) return engagementMap;

        console.log(`Fetching activities for ${emailIds.length} emails...`);
        
        // Try the activities endpoint for email engagement
        try {
          // Apollo's activity tracking endpoint
          const batchSize = 50;
          
          for (let i = 0; i < emailIds.length; i += batchSize) {
            const batch = emailIds.slice(i, i + batchSize);
            
            // Query activities for each email message
            for (const emailId of batch) {
              try {
                const activityUrl = new URL(`https://api.apollo.io/api/v1/emailer_messages/${emailId}`);
                
                const response = await fetch(activityUrl.toString(), {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    accept: "application/json",
                    "X-Api-Key": apolloApiKey,
                  },
                });

                if (response.ok) {
                  const data = await response.json();
                  const msg = data.emailer_message;
                  
                  if (msg) {
                    const engagement: EmailEngagement = {
                      openCount: msg.open_count ?? msg.opens ?? 0,
                      clickCount: msg.click_count ?? msg.clicks ?? 0,
                      replyCount: msg.reply_count ?? (msg.replied ? 1 : 0),
                      openedAt: msg.opened_at || msg.first_opened_at,
                      clickedAt: msg.clicked_at || msg.first_clicked_at,
                      repliedAt: msg.replied_at || (msg.replied ? msg.completed_at : undefined),
                    };
                    
                    // Log first successful fetch for debugging
                    if (engagementMap.size === 0 && (engagement.openCount > 0 || engagement.clickCount > 0)) {
                      console.log("Sample engagement data from individual fetch:", engagement);
                    }
                    
                    engagementMap.set(emailId, engagement);
                  }
                }
              } catch (err) {
                // Individual email fetch failed, continue
              }
            }
          }
          
          console.log(`Fetched engagement for ${engagementMap.size} emails`);
        } catch (error) {
          console.error("Error fetching email activities:", error);
        }

        return engagementMap;
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

      // Fetch engagement data for emails (opens/clicks/replies) from individual email endpoints
      // This is optional and can be skipped for faster initial load
      let engagementMap = new Map<string, EmailEngagement>();
      if (!skipEngagementFetch) {
        const emailIds = allEmails.map(e => e.id);
        engagementMap = await fetchEmailActivities(emailIds);
        console.log(`Successfully fetched engagement for ${engagementMap.size} emails`);
      } else {
        console.log("Skipping engagement fetch for faster response");
      }

      const totalCount = totalEntriesFromApi ?? allEmails.length;

      // Transform emails with enriched contact data
      // Map Apollo status values to our normalized status

      type Engagement = {
        openCount: number;
        clickCount: number;
        replyCount: number;
        openedAt?: string;
        clickedAt?: string;
        repliedAt?: string;
      };

      // Derive engagement from emailer_message_stats array AND recipients array (Apollo's engagement tracking)
      const deriveEngagementFromStats = (email: ApolloEmailActivity): Engagement => {
        const result: Engagement = {
          openCount: 0,
          clickCount: 0,
          replyCount: 0,
        };

        // Check emailer_message_stats array
        const stats = email.emailer_message_stats;
        if (stats && Array.isArray(stats)) {
          for (const stat of stats) {
            const status = (stat?.status || stat?.emailer_message_status || '').toLowerCase();
            
            if (status.includes('opened') || status.includes('open')) {
              result.openCount++;
              if (!result.openedAt && stat.status_changed_at) {
                result.openedAt = stat.status_changed_at;
              }
            }
            
            if (status.includes('clicked') || status.includes('click')) {
              result.clickCount++;
              if (!result.clickedAt && stat.status_changed_at) {
                result.clickedAt = stat.status_changed_at;
              }
            }
            
            if (status.includes('replied') || status.includes('reply')) {
              result.replyCount++;
              if (!result.repliedAt && stat.status_changed_at) {
                result.repliedAt = stat.status_changed_at;
              }
            }
          }
        }

        // Also check the recipients array - Apollo often puts engagement data there
        const recipients = email.recipients;
        if (recipients && Array.isArray(recipients)) {
          for (const recipient of recipients) {
            const rec = recipient as Record<string, unknown>;
            
            // Check for opens in recipient
            if (rec.opened_at || rec.email_opened_at) {
              result.openCount++;
              if (!result.openedAt) {
                result.openedAt = (rec.opened_at || rec.email_opened_at) as string;
              }
            }
            
            // Check open_count on recipient
            const recOpenCount = toNumber(rec.open_count);
            if (recOpenCount && recOpenCount > 0) {
              result.openCount = Math.max(result.openCount, recOpenCount);
            }
            
            // Check for clicks in recipient
            if (rec.clicked_at || rec.email_clicked_at) {
              result.clickCount++;
              if (!result.clickedAt) {
                result.clickedAt = (rec.clicked_at || rec.email_clicked_at) as string;
              }
            }
            
            // Check click_count on recipient
            const recClickCount = toNumber(rec.click_count);
            if (recClickCount && recClickCount > 0) {
              result.clickCount = Math.max(result.clickCount, recClickCount);
            }
            
            // Check for replies in recipient
            if (rec.replied_at || rec.email_replied_at) {
              result.replyCount++;
              if (!result.repliedAt) {
                result.repliedAt = (rec.replied_at || rec.email_replied_at) as string;
              }
            }
          }
        }

        return result;
      };

      const deriveEmailStatus = (email: ApolloEmailActivity, engagement: { openCount: number; clickCount: number; replyCount: number }) => {
        const status = (email.status || email.email_status || '').toLowerCase().trim();

        // Failure / special states first
        if (email.bounce || status === 'bounced' || status === 'bounce' || !!email.bounced_at) return 'bounced';
        if (email.spam_blocked || status === 'spam_blocked' || status === 'spam blocked') return 'spam_blocked';
        if (status === 'unsubscribed') return 'unsubscribed';
        if (!!email.failed_at || status === 'failed' || status === 'error') return 'failed';

        // Engagement states (most to least advanced) - these take priority
        const hasReply = email.replied || !!email.replied_at || (email.reply_count ?? 0) > 0 || engagement.replyCount > 0 || status === 'replied' || status === 'reply';
        const hasClick = !!email.clicked_at || (email.click_count ?? 0) > 0 || engagement.clickCount > 0 || status === 'clicked' || status === 'click';
        const hasOpen = !!email.opened_at || (email.open_count ?? 0) > 0 || engagement.openCount > 0 || status === 'opened' || status === 'open';

        if (hasReply) return 'replied';
        if (hasClick) return 'clicked';
        if (hasOpen) return 'opened';

        // Check if email was delivered/sent (completed) but not opened = "not_opened" in Apollo terms
        const wasDelivered = email.completed_at || email.sent_at || status === 'sent' || status === 'delivered' || status === 'active';
        
        if (wasDelivered) {
          // Apollo calls delivered-but-not-opened emails as "not_opened"
          // We map this to 'not_opened' status to match Apollo's breakdown
          return 'not_opened';
        }

        // Pre-send states
        if (status === 'scheduled' || status === 'queued' || status === 'paused') return 'scheduled';
        if (status === 'draft' || status === 'pending' || status === 'not_sent') return 'draft';

        // Default to draft if nothing else matches (no send timestamp)
        return 'draft';
      };

      const transformedEmails = allEmails.map((email) => {
        const contact = email.contact_id ? contactMap.get(email.contact_id) : null;

        // Get engagement from stats parsing
        const statsEngagement = deriveEngagementFromStats(email);
        
        // Get engagement from individual email fetch (more reliable)
        const fetchedEngagement = engagementMap.get(email.id);
        
        // Merge engagement data, preferring fetched data
        const engagement = {
          openCount: Math.max(statsEngagement.openCount, fetchedEngagement?.openCount ?? 0),
          clickCount: Math.max(statsEngagement.clickCount, fetchedEngagement?.clickCount ?? 0),
          replyCount: Math.max(statsEngagement.replyCount, fetchedEngagement?.replyCount ?? 0),
          openedAt: fetchedEngagement?.openedAt || statsEngagement.openedAt,
          clickedAt: fetchedEngagement?.clickedAt || statsEngagement.clickedAt,
          repliedAt: fetchedEngagement?.repliedAt || statsEngagement.repliedAt,
        };
        
        const derivedStatus = deriveEmailStatus(email, engagement);

        // Apollo returns empty HTML shells for scheduled/draft emails or when content needs dynamic assembly
        // Check if bodyHtml is essentially empty (just an empty HTML shell)
        const isEmptyHtml = (html: string | undefined): boolean => {
          if (!html) return true;
          const stripped = html.replace(/<[^>]*>/g, '').trim();
          return stripped.length === 0;
        };
        
        // Use bodyText as fallback if bodyHtml is empty, or indicate content is pending
        const rawRecord = email as unknown as Record<string, unknown>;
        const bodyHtmlLoaded = rawRecord.body_html_loaded !== false;
        const needsDynamicAssemble = rawRecord.needs_dynamic_assemble === true;
        
        let effectiveBodyHtml = email.body_html;
        let effectiveBodyText = email.body_text;
        
        // If HTML is empty shell and we have body_text, use that
        if (isEmptyHtml(email.body_html) && email.body_text && email.body_text.trim().length > 0) {
          effectiveBodyHtml = `<p>${email.body_text.replace(/\n/g, '<br/>')}</p>`;
        }
        
        // If both are empty and email is scheduled/draft, indicate content is pending
        if (isEmptyHtml(effectiveBodyHtml) && (!effectiveBodyText || effectiveBodyText.trim().length === 0)) {
          if (!bodyHtmlLoaded || needsDynamicAssemble || derivedStatus === 'scheduled' || derivedStatus === 'draft') {
            effectiveBodyText = '[Email content will be generated at send time]';
            effectiveBodyHtml = '<p><em>[Email content will be generated at send time]</em></p>';
          }
        }

        return {
          apolloId: email.id,
          sequenceId: email.emailer_campaign_id,
          sequenceName: email.emailer_campaign_name || email.campaign_name,
          stepPosition: email.emailer_step_position,
          subject: email.subject,
          bodyText: effectiveBodyText,
          bodyHtml: effectiveBodyHtml,
          contentPending: !bodyHtmlLoaded || needsDynamicAssemble,
          status: derivedStatus,
          rawStatus: email.status,
          sentAt: email.completed_at || email.sent_at,
          openedAt: email.opened_at || engagement.openedAt,
          openCount: (email.open_count ?? 0) + engagement.openCount,
          clickedAt: email.clicked_at || engagement.clickedAt,
          clickCount: (email.click_count ?? 0) + engagement.clickCount,
          repliedAt: email.replied_at || engagement.repliedAt || (email.replied ? email.completed_at : null),
          replyCount: (email.reply_count ?? 0) + engagement.replyCount,
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
