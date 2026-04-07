import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { Perspective } from "@/components/common/PerspectiveSelector";
import { WEST_STATES, EAST_STATES, getFilterStates, type RegionFilter } from "@/lib/regions/regionConstants";

interface DateRange {
  from: Date;
  to: Date;
}

interface EmailedCompany {
  id: string;
  company_name: string;
  sent_at: string;
}

interface ResponseDetail {
  id: string;
  company_name: string;
  contact_name: string | null;
  responded_at: string;
}

interface HandoffDetail {
  id: string;
  company_name: string;
  assigned_to_name: string;
  created_at: string;
  amount: number | null;
}

interface PipelineMetrics {
  commsSent: number;
  emailsOpened: number;
  responsesReceived: number;
  phoneCalls: number;
  meetingsScheduled: number;
  meetingsCompleted: number;
  upcomingMeetings: number;
  meetingsConducted: number;
  meetingsNeedingFollowup: number;
  demosScheduled: number;
  demosCompleted: number;
  leadsAssigned: number;
  closedDeals: number;
  closedDealValue: number;
  openRate: number;
  responseRate: number;
  scheduleRate: number;
  completionRate: number;
  handoffRate: number;
  closeRate: number;
  avgResponseTimeDays: number;
  totalPipelineValue: number;
  emailedCompanies: EmailedCompany[];
  responseDetails: ResponseDetail[];
  handoffDetails: HandoffDetail[];
  previousPeriod: {
    commsSent: number;
    emailsOpened: number;
    responsesReceived: number;
    phoneCalls: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    upcomingMeetings: number;
    meetingsConducted: number;
    meetingsNeedingFollowup: number;
    demosScheduled: number;
    demosCompleted: number;
    leadsAssigned: number;
    closedDeals: number;
  };
}

export type { PipelineMetrics, EmailedCompany, ResponseDetail, HandoffDetail };

// Re-export for convenience
export { WEST_STATES, EAST_STATES };

// Helper to fetch all rows by paginating through results
async function paginatedFetch(buildQuery: () => any): Promise<any[]> {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data || [];
    allRows = allRows.concat(rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return allRows;
}

export function usePipelineAnalytics(
  dateRange: DateRange,
  perspective: Perspective,
  userId?: string,
  regionFilter: RegionFilter = "all"
) {
  return useQuery({
    queryKey: ["pipeline-analytics", dateRange.from, dateRange.to, perspective, userId, regionFilter],
    queryFn: async (): Promise<PipelineMetrics> => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd") + "T23:59:59";
      
      // Calculate previous period for comparison
      const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevFrom = format(subDays(dateRange.from, periodDays), "yyyy-MM-dd");
      const prevTo = format(subDays(dateRange.to, periodDays), "yyyy-MM-dd") + "T23:59:59";

      const filterStates = getFilterStates(regionFilter);

      // Build perspective filter
      const buildPerspectiveFilter = (query: any) => {
        if (perspective === "my_records" && userId) {
          return query.eq("created_by", userId);
        } else if (perspective === "assigned_to_me" && userId) {
          return query.eq("created_by", userId);
        }
        return query;
      };

      // Fetch communications data with contact info (paginated)
      const buildCommsQuery = () => {
        let q = supabase
          .from("company_communications")
          .select(`
            id, sent_at, email_opened_at, email_responded_at, company_id, contact_id,
            companies!company_communications_company_id_fkey(id, company_name),
            contacts(id, first_name, last_name)
          `)
          .gte("sent_at", fromDate)
          .lte("sent_at", toDate);
        return buildPerspectiveFilter(q);
      };
      const commsDataRaw = await paginatedFetch(buildCommsQuery);

      // Filter by region if needed
      let commsData = commsDataRaw || [];
      if (filterStates && commsData.length > 0) {
        const companyIds = [...new Set(commsData.map((c: any) => c.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          commsData = commsData.filter((c: any) => validCompanyIds.has(c.company_id));
        }
      }

      // Fetch Apollo email activities (paginated)
      const buildApolloQuery = () => {
        let q = supabase
          .from("apollo_email_activities")
          .select("id, sent_at, opened_at, replied_at, status, company_id, contact_id, open_count, click_count, reply_count, activity_date")
          .gte("activity_date", fromDate)
          .lte("activity_date", toDate);
        return buildPerspectiveFilter(q);
      };
      const apolloDataRaw = await paginatedFetch(buildApolloQuery);
      
      let apolloData = apolloDataRaw || [];
      if (filterStates && apolloData.length > 0) {
        const companyIds = [...new Set(apolloData.map((a: any) => a.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          apolloData = apolloData.filter((a: any) => validCompanyIds.has(a.company_id));
        }
      }

      // Fetch previous period Apollo data (paginated)
      const buildPrevApolloQuery = () => {
        let q = supabase
          .from("apollo_email_activities")
          .select("id, sent_at, opened_at, replied_at, status, company_id, open_count, click_count, reply_count, activity_date")
          .gte("activity_date", prevFrom)
          .lte("activity_date", prevTo);
        return buildPerspectiveFilter(q);
      };
      const prevApolloDataRaw = await paginatedFetch(buildPrevApolloQuery);
      
      let prevApolloData = prevApolloDataRaw || [];
      if (filterStates && prevApolloData.length > 0) {
        const companyIds = [...new Set(prevApolloData.map((a: any) => a.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevApolloData = prevApolloData.filter((a: any) => validCompanyIds.has(a.company_id));
        }
      }

      // Fetch previous period communications (paginated)
      const buildPrevCommsQuery = () => {
        let q = supabase
          .from("company_communications")
          .select("id, sent_at, email_opened_at, email_responded_at, company_id")
          .gte("sent_at", prevFrom)
          .lte("sent_at", prevTo);
        return buildPerspectiveFilter(q);
      };
      const prevCommsDataRaw = await paginatedFetch(buildPrevCommsQuery);
      
      let prevCommsData = prevCommsDataRaw || [];
      if (filterStates && prevCommsData.length > 0) {
        const companyIds = [...new Set(prevCommsData.map((c: any) => c.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevCommsData = prevCommsData.filter((c: any) => validCompanyIds.has(c.company_id));
        }
      }

      // Fetch all activities (Meeting, Demo, Phone) - paginated
      const buildActivitiesQuery = () => {
        let q = supabase
          .from("outreach_activities")
          .select("id, activity_type, outcome, scheduled_date, completed_date, created_at, company_id")
          .in("activity_type", ["Meeting", "Demo", "Phone"]);
        return buildPerspectiveFilter(q);
      };
      const activitiesDataRaw = await paginatedFetch(buildActivitiesQuery);

      let activitiesData = activitiesDataRaw || [];
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      
      // Filter activities: include those in date range OR upcoming future meetings
      activitiesData = activitiesData.filter(a => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const createdDate = a.created_at ? new Date(a.created_at) : null;
        
        // Include if: created within range, completed within range, scheduled within range
        const createdInRange = createdDate && createdDate >= from && createdDate <= to;
        const completedInRange = compDate && compDate >= from && compDate <= to;
        const scheduledInRange = schedDate && schedDate >= from && schedDate <= to;
        
        // ALWAYS include upcoming meetings (scheduled for future, not completed)
        const isUpcoming = schedDate && schedDate >= currentDate && !a.completed_date && a.outcome !== "Completed";
        
        return createdInRange || completedInRange || scheduledInRange || isUpcoming;
      });

      if (filterStates && activitiesData.length > 0) {
        const companyIds = [...new Set(activitiesData.map(m => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          activitiesData = activitiesData.filter(m => validCompanyIds.has(m.company_id));
        }
      }

      // Separate by type
      const meetingsData = activitiesData.filter(a => a.activity_type === "Meeting");
      const demosData = activitiesData.filter(a => a.activity_type === "Demo");
      const phoneData = activitiesData.filter(a => a.activity_type === "Phone");

      // Calculate upcoming meetings - scheduled but NOT yet completed
      // An activity is "upcoming" if it has a scheduled_date, no completed_date, and outcome is NOT "Completed"
      const upcomingMeetingsData = activitiesData.filter(a => {
        if (!["Meeting", "Demo"].includes(a.activity_type)) return false;
        if (!a.scheduled_date) return false;
        // If there's a completed_date OR outcome is Completed, it's not upcoming
        if (a.completed_date) return false;
        if (a.outcome === "Completed") return false;
        return true;
      });

      // Fetch previous period activities (paginated)
      const buildPrevActivitiesQuery = () => {
        let q = supabase
          .from("outreach_activities")
          .select("id, activity_type, outcome, scheduled_date, completed_date, created_at, company_id")
          .in("activity_type", ["Meeting", "Demo", "Phone"])
          .or(`scheduled_date.gte.${prevFrom},completed_date.gte.${prevFrom},created_at.gte.${prevFrom}`)
          .or(`scheduled_date.lte.${prevTo},completed_date.lte.${prevTo},created_at.lte.${prevTo}`);
        return buildPerspectiveFilter(q);
      };
      const prevActivitiesDataRaw = await paginatedFetch(buildPrevActivitiesQuery);
      
      let prevActivitiesData = prevActivitiesDataRaw || [];
      prevActivitiesData = prevActivitiesData.filter((a: any) => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const createdDate = a.created_at ? new Date(a.created_at) : null;
        const from = new Date(prevFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(prevTo);
        to.setHours(23, 59, 59, 999);
        return (schedDate && schedDate >= from && schedDate <= to) || 
               (compDate && compDate >= from && compDate <= to) ||
               (createdDate && createdDate >= from && createdDate <= to);
      });

      if (filterStates && prevActivitiesData.length > 0) {
        const companyIds = [...new Set(prevActivitiesData.map((m: any) => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevActivitiesData = prevActivitiesData.filter((m: any) => validCompanyIds.has(m.company_id));
        }
      }

      const prevMeetingsData = prevActivitiesData.filter((a: any) => a.activity_type === "Meeting");
      const prevDemosData = prevActivitiesData.filter((a: any) => a.activity_type === "Demo");
      const prevPhoneData = prevActivitiesData.filter((a: any) => a.activity_type === "Phone");
      
      const prevUpcomingMeetingsData = prevActivitiesData.filter((a: any) => {
        if (!["Meeting", "Demo"].includes(a.activity_type)) return false;
        if (!a.scheduled_date) return false;
        if (a.outcome === "Completed" || a.completed_date) return false;
        return true;
      });

      // Fetch opportunities (paginated)
      const buildOppsQuery = () => {
        let q = supabase
          .from("opportunities")
          .select(`
            id, assigned_to, assigned_to_sales_rep_id, amount, created_at, stage, closed_date, company_id, notes,
            companies!opportunities_company_id_fkey(id, company_name),
            profiles!opportunities_assigned_to_fkey(first_name, last_name),
            sales_reps!opportunities_assigned_to_sales_rep_id_fkey(first_name, last_name),
            opportunity_name
          `)
          .gte("created_at", fromDate)
          .lte("created_at", toDate)
          .or("assigned_to.not.is.null,assigned_to_sales_rep_id.not.is.null,opportunity_name.ilike.Lead from%,opportunity_name.ilike.Handoff:%");
        return buildPerspectiveFilter(q);
      };
      const oppsDataRaw = await paginatedFetch(buildOppsQuery);

      let oppsData = oppsDataRaw || [];
      if (filterStates && oppsData.length > 0) {
        const companyIds = [...new Set(oppsData.map(o => o.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          oppsData = oppsData.filter(o => validCompanyIds.has(o.company_id));
        }
      }

      // Fetch assignee names (from sales_reps or profiles)
      const assigneeIds = [...new Set(oppsData.map(o => o.assigned_to).filter(Boolean))];
      const assigneeMap: Record<string, string> = {};
      
      if (assigneeIds.length > 0) {
        // Check sales_reps first (format: "rep_UUID")
        const salesRepIds = assigneeIds.filter(id => id?.startsWith("rep_")).map(id => id?.replace("rep_", ""));
        const profileIds = assigneeIds.filter(id => !id?.startsWith("rep_"));
        
        if (salesRepIds.length > 0) {
          const { data: reps } = await supabase
            .from("sales_reps")
            .select("id, first_name, last_name")
            .in("id", salesRepIds);
          reps?.forEach(rep => {
            assigneeMap[`rep_${rep.id}`] = [rep.first_name, rep.last_name].filter(Boolean).join(" ") || "Unknown Rep";
          });
        }
        
        if (profileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", profileIds);
          profiles?.forEach(profile => {
            assigneeMap[profile.id] = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown User";
          });
        }
      }

      // Fetch previous period opportunities (paginated)
      const buildPrevOppsQuery = () => {
        let q = supabase
          .from("opportunities")
          .select("id, assigned_to, stage, company_id, opportunity_name")
          .gte("created_at", prevFrom)
          .lte("created_at", prevTo)
          .or("assigned_to.not.is.null,opportunity_name.ilike.Lead from%,opportunity_name.ilike.Handoff:%");
        return buildPerspectiveFilter(q);
      };
      const prevOppsDataRaw = await paginatedFetch(buildPrevOppsQuery);
      
      let prevOppsData = prevOppsDataRaw || [];
      if (filterStates && prevOppsData.length > 0) {
        const companyIds = [...new Set(prevOppsData.map(o => o.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevOppsData = prevOppsData.filter(o => validCompanyIds.has(o.company_id));
        }
      }

      // Calculate current period metrics
      // Combine comms sent from both company_communications and apollo_email_activities
      // Count Apollo records as sent if they have sent_at OR a sent/not_opened/opened/bounced status
      const apolloSentStatuses = ['sent', 'not_opened', 'opened', 'replied', 'bounced'];
      const commsSent = commsData.filter(c => c.sent_at).length + 
        apolloData.filter(a => a.sent_at || apolloSentStatuses.includes(a.status || '')).length;
      
      // Combine opened/responded from both tables
      const commsOpened = commsData.filter(c => c.email_opened_at).length;
      const apolloOpened = apolloData.filter(a => 
        a.opened_at || (a.open_count && a.open_count > 0) || a.status === 'opened' || a.status === 'replied'
      ).length;
      const emailsOpened = commsOpened + apolloOpened;
      
      const commsResponded = commsData.filter(c => c.email_responded_at).length;
      const apolloResponded = apolloData.filter(a => 
        a.replied_at || (a.reply_count && a.reply_count > 0) || a.status === 'replied'
      ).length;
      const responsesReceived = commsResponded + apolloResponded;
      
      // Meetings (Scheduled or Completed outcome)
      const meetingsScheduled = meetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const meetingsCompleted = meetingsData.filter(m => m.outcome === "Completed").length;
      
      // Demos
      const demosScheduled = demosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const demosCompleted = demosData.filter(d => d.outcome === "Completed").length;
      
      // Phone calls (count all completed phone activities)
      const phoneCalls = phoneData.filter(p => p.outcome === "Completed" || p.completed_date).length;
      
      // Upcoming meetings count (scheduled for future)
      const upcomingMeetings = upcomingMeetingsData.length;
      
      // Meetings conducted (completed meetings)
      const meetingsConducted = meetingsData.filter(m => m.outcome === "Completed" || m.completed_date).length +
                                demosData.filter(d => d.outcome === "Completed" || d.completed_date).length;
      
      // Meetings needing follow-up (scheduled date passed but not marked as completed)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const meetingsNeedingFollowup = [...meetingsData, ...demosData].filter(m => {
        if (!m.scheduled_date) return false;
        const schedDate = new Date(m.scheduled_date);
        return schedDate < today && m.outcome !== "Completed" && !m.completed_date;
      }).length;
      
      const leadsAssigned = oppsData.length;
      
      // Calculate closed deals (manual selection via stage = 'closed_won')
      const closedDealsData = oppsData.filter(o => o.stage === 'closed_won');
      const closedDeals = closedDealsData.length;
      const closedDealValue = closedDealsData.reduce((sum, opp) => sum + (opp.amount || 0), 0);

      // Calculate previous period metrics (combine both tables)
      const prevCommsSent = prevCommsData.filter(c => c.sent_at).length + 
        prevApolloData.filter(a => a.sent_at || apolloSentStatuses.includes(a.status || '')).length;
      const prevCommsOpened = prevCommsData.filter(c => c.email_opened_at).length;
      const prevApolloOpened = prevApolloData.filter(a => 
        a.opened_at || (a.open_count && a.open_count > 0) || a.status === 'opened' || a.status === 'replied'
      ).length;
      const prevEmailsOpened = prevCommsOpened + prevApolloOpened;
      const prevCommsResponded = prevCommsData.filter(c => c.email_responded_at).length;
      const prevApolloResponded = prevApolloData.filter(a => 
        a.replied_at || (a.reply_count && a.reply_count > 0) || a.status === 'replied'
      ).length;
      const prevResponsesReceived = prevCommsResponded + prevApolloResponded;
      const prevMeetingsScheduled = prevMeetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const prevMeetingsCompleted = prevMeetingsData.filter(m => m.outcome === "Completed").length;
      const prevDemosScheduled = prevDemosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const prevDemosCompleted = prevDemosData.filter(d => d.outcome === "Completed").length;
      const prevPhoneCalls = prevPhoneData.filter(p => p.outcome === "Completed" || p.completed_date).length;
      const prevUpcomingMeetings = prevUpcomingMeetingsData.length;
      const prevMeetingsConducted = prevMeetingsData.filter(m => m.outcome === "Completed" || m.completed_date).length +
                                    prevDemosData.filter(d => d.outcome === "Completed" || d.completed_date).length;
      const prevMeetingsNeedingFollowup = [...prevMeetingsData, ...prevDemosData].filter(m => {
        if (!m.scheduled_date) return false;
        const schedDate = new Date(m.scheduled_date);
        return schedDate < today && m.outcome !== "Completed" && !m.completed_date;
      }).length;
      const prevLeadsAssigned = prevOppsData.length;
      const prevClosedDeals = prevOppsData.filter(o => o.stage === 'closed_won').length;

      // Calculate conversion rates (combined meetings + demos for engagement rate)
      const totalEngagements = meetingsScheduled + demosScheduled;
      const totalCompleted = meetingsCompleted + demosCompleted;
      
      const openRate = commsSent > 0 ? (emailsOpened / commsSent) * 100 : 0;
      const responseRate = emailsOpened > 0 ? (responsesReceived / emailsOpened) * 100 : 0;
      const scheduleRate = responsesReceived > 0 ? (totalEngagements / responsesReceived) * 100 : 0;
      const completionRate = totalEngagements > 0 ? (totalCompleted / totalEngagements) * 100 : 0;
      const handoffRate = totalCompleted > 0 ? (leadsAssigned / totalCompleted) * 100 : 0;
      const closeRate = leadsAssigned > 0 ? (closedDeals / leadsAssigned) * 100 : 0;

      // Calculate average response time
      let totalResponseTime = 0;
      let responseCount = 0;
      commsData.forEach(c => {
        if (c.sent_at && c.email_responded_at) {
          const sentDate = new Date(c.sent_at);
          const respondedDate = new Date(c.email_responded_at);
          const diffDays = (respondedDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
            totalResponseTime += diffDays;
            responseCount++;
          }
        }
      });
      const avgResponseTimeDays = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // Calculate total pipeline value
      const totalPipelineValue = oppsData.reduce((sum, opp) => sum + (opp.amount || 0), 0);

      // Build detailed lists
      const emailedCompanies: EmailedCompany[] = commsData
        .filter(c => c.sent_at)
        .map(c => ({
          id: c.id,
          company_name: (c.companies as any)?.company_name || "Unknown Company",
          sent_at: c.sent_at!,
        }))
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
        .slice(0, 10); // Limit to 10 most recent

      const responseDetails: ResponseDetail[] = commsData
        .filter(c => c.email_responded_at)
        .map(c => {
          const contact = c.contacts as any;
          const contactName = contact 
            ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") 
            : null;
          return {
            id: c.id,
            company_name: (c.companies as any)?.company_name || "Unknown Company",
            contact_name: contactName || "Unknown Contact",
            responded_at: c.email_responded_at!,
          };
        })
        .sort((a, b) => new Date(b.responded_at).getTime() - new Date(a.responded_at).getTime())
        .slice(0, 10);

      const handoffDetails: HandoffDetail[] = oppsData
        .map(o => {
          // Resolve name: from joined profiles, joined sales_reps, assigneeMap, or notes fallback
          const profileData = (o as any).profiles;
          const salesRepData = (o as any).sales_reps;
          let name = profileData 
            ? `${profileData.first_name} ${profileData.last_name}`.trim()
            : salesRepData
              ? `${salesRepData.first_name} ${salesRepData.last_name}`.trim()
              : assigneeMap[o.assigned_to || ""];
          if (!name && (o as any).notes) {
            const match = ((o as any).notes as string).match(/Handed off to:\s*(.+)/);
            if (match) name = match[1].trim();
          }
          return {
            id: o.id,
            company_name: (o.companies as any)?.company_name || "Unknown Company",
            assigned_to_name: name || "Unknown Assignee",
            created_at: o.created_at,
            amount: o.amount,
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      return {
        commsSent,
        emailsOpened,
        responsesReceived,
        phoneCalls,
        meetingsScheduled,
        meetingsCompleted,
        upcomingMeetings,
        meetingsConducted,
        meetingsNeedingFollowup,
        demosScheduled,
        demosCompleted,
        leadsAssigned,
        closedDeals,
        closedDealValue,
        openRate,
        responseRate,
        scheduleRate,
        completionRate,
        handoffRate,
        closeRate,
        avgResponseTimeDays,
        totalPipelineValue,
        emailedCompanies,
        responseDetails,
        handoffDetails,
        previousPeriod: {
          commsSent: prevCommsSent,
          emailsOpened: prevEmailsOpened,
          responsesReceived: prevResponsesReceived,
          phoneCalls: prevPhoneCalls,
          meetingsScheduled: prevMeetingsScheduled,
          meetingsCompleted: prevMeetingsCompleted,
          upcomingMeetings: prevUpcomingMeetings,
          meetingsConducted: prevMeetingsConducted,
          meetingsNeedingFollowup: prevMeetingsNeedingFollowup,
          demosScheduled: prevDemosScheduled,
          demosCompleted: prevDemosCompleted,
          leadsAssigned: prevLeadsAssigned,
          closedDeals: prevClosedDeals,
        },
      };
    },
    enabled: !!dateRange.from && !!dateRange.to,
  });
}

export function getDatePreset(preset: string): { from: Date; to: Date } {
  const today = new Date();
  
  switch (preset) {
    case "this_week":
      return { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "last_30":
      return { from: subDays(today, 30), to: today };
    case "last_90":
      return { from: subDays(today, 90), to: today };
    default:
      return { from: subDays(today, 30), to: today };
  }
}
