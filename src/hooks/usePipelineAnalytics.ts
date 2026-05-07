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

interface ApolloMetrics {
  sent: number;
  opened: number;
  responded: number;
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
  regionFilter: RegionFilter = "all",
  enabled: boolean = true
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

      // Build perspective filter — column name varies per table
      const buildPerspectiveFilter = (query: any, ownerColumn: string = "created_by") => {
        if ((perspective === "my_records" || perspective === "assigned_to_me") && userId) {
          return query.eq(ownerColumn, userId);
        }
        return query;
      };

      const countRows = async (query: any) => {
        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      };

      const fetchApolloMetrics = async (from: string, to: string, companyIds?: string[]): Promise<ApolloMetrics> => {
        if (companyIds && companyIds.length === 0) {
          return { sent: 0, opened: 0, responded: 0 };
        }

        const { data, error } = await (supabase as any).rpc("get_apollo_email_metrics", {
          _from: from,
          _to: to,
          _perspective: perspective,
          _user_id: userId || null,
          _company_ids: companyIds || null,
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        return {
          sent: Number(row?.sent || 0),
          opened: Number(row?.opened || 0),
          responded: Number(row?.responded || 0),
        };
      };

      let regionalCompanyIds: string[] | undefined;
      if (filterStates) {
        const companies = await paginatedFetch(() =>
          supabase
            .from("companies")
            .select("id")
            .in("state", filterStates)
        );
        regionalCompanyIds = companies.map((company: any) => company.id);
      }

      // Build all the main fetch queries
      const buildCommsQuery = () => {
        let q = supabase
          .from("company_communications")
          .select(`
            id, sent_at, email_opened_at, email_responded_at, company_id, contact_id, communication_type,
            companies!company_communications_company_id_fkey(id, company_name),
            contacts(id, first_name, last_name)
          `)
          .gte("sent_at", fromDate)
          .lte("sent_at", toDate);
        return buildPerspectiveFilter(q, "user_id");
      };

      const buildPrevCommsQuery = () => {
        let q = supabase
          .from("company_communications")
          .select("id, sent_at, email_opened_at, email_responded_at, company_id, communication_type")
          .gte("sent_at", prevFrom)
          .lte("sent_at", prevTo);
        return buildPerspectiveFilter(q, "user_id");
      };

      const buildActivitiesQuery = () => {
        let q = supabase
          .from("outreach_activities")
          .select("id, activity_type, outcome, scheduled_date, completed_date, created_at, company_id")
          .in("activity_type", ["Meeting", "Demo", "Phone"])
          .or(`created_at.gte.${fromDate},completed_date.gte.${fromDate},scheduled_date.gte.${fromDate}`)
          .or(`created_at.lte.${toDate},completed_date.lte.${toDate},scheduled_date.lte.${toDate}`);
        return buildPerspectiveFilter(q);
      };

      const buildPrevActivitiesQuery = () => {
        let q = supabase
          .from("outreach_activities")
          .select("id, activity_type, outcome, scheduled_date, completed_date, created_at, company_id")
          .in("activity_type", ["Meeting", "Demo", "Phone"])
          .or(`scheduled_date.gte.${prevFrom},completed_date.gte.${prevFrom},created_at.gte.${prevFrom}`)
          .or(`scheduled_date.lte.${prevTo},completed_date.lte.${prevTo},created_at.lte.${prevTo}`);
        return buildPerspectiveFilter(q);
      };

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

      const buildPrevOppsQuery = () => {
        let q = supabase
          .from("opportunities")
          .select("id, assigned_to, stage, company_id, opportunity_name")
          .gte("created_at", prevFrom)
          .lte("created_at", prevTo)
          .or("assigned_to.not.is.null,opportunity_name.ilike.Lead from%,opportunity_name.ilike.Handoff:%");
        return buildPerspectiveFilter(q);
      };

      // Run all major fetches in parallel
      const [
        commsDataRaw,
        prevCommsDataRaw,
        activitiesDataRaw,
        prevActivitiesDataRaw,
        oppsDataRaw,
        prevOppsDataRaw,
        apolloMetrics,
        prevApolloMetrics,
      ] = await Promise.all([
        paginatedFetch(buildCommsQuery),
        paginatedFetch(buildPrevCommsQuery),
        paginatedFetch(buildActivitiesQuery),
        paginatedFetch(buildPrevActivitiesQuery),
        paginatedFetch(buildOppsQuery),
        paginatedFetch(buildPrevOppsQuery),
        fetchApolloMetrics(fromDate, toDate, regionalCompanyIds),
        fetchApolloMetrics(prevFrom, prevTo, regionalCompanyIds),
      ]);

      // Region filter helper — reuse preloaded regionalCompanyIds (no extra queries)
      const regionalIdSet = regionalCompanyIds ? new Set(regionalCompanyIds) : null;
      const filterByRegion = <T extends { company_id?: string | null }>(rows: T[]): T[] => {
        if (!regionalIdSet) return rows;
        return rows.filter(r => r.company_id && regionalIdSet.has(r.company_id));
      };

      let commsData = filterByRegion((commsDataRaw || []) as any[]);
      let prevCommsData = filterByRegion((prevCommsDataRaw || []) as any[]);

      // Activities — date-range filter in JS, then region
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      let activitiesData = ((activitiesDataRaw || []) as any[]).filter((a: any) => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const createdDate = a.created_at ? new Date(a.created_at) : null;
        const createdInRange = createdDate && createdDate >= from && createdDate <= to;
        const completedInRange = compDate && compDate >= from && compDate <= to;
        const scheduledInRange = schedDate && schedDate >= from && schedDate <= to;
        const isUpcoming = schedDate && schedDate >= currentDate && !a.completed_date && a.outcome !== "Completed";
        return createdInRange || completedInRange || scheduledInRange || isUpcoming;
      });
      activitiesData = filterByRegion(activitiesData);

      const meetingsData = activitiesData.filter((a: any) => a.activity_type === "Meeting");
      const demosData = activitiesData.filter((a: any) => a.activity_type === "Demo");
      const phoneData = activitiesData.filter((a: any) => a.activity_type === "Phone");

      const upcomingMeetingsData = activitiesData.filter((a: any) => {
        if (!["Meeting", "Demo"].includes(a.activity_type)) return false;
        if (!a.scheduled_date) return false;
        if (a.completed_date) return false;
        if (a.outcome === "Completed") return false;
        return true;
      });

      let prevActivitiesData = ((prevActivitiesDataRaw || []) as any[]).filter((a: any) => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const createdDate = a.created_at ? new Date(a.created_at) : null;
        const pf = new Date(prevFrom);
        pf.setHours(0, 0, 0, 0);
        const pt = new Date(prevTo);
        pt.setHours(23, 59, 59, 999);
        return (schedDate && schedDate >= pf && schedDate <= pt) ||
               (compDate && compDate >= pf && compDate <= pt) ||
               (createdDate && createdDate >= pf && createdDate <= pt);
      });
      prevActivitiesData = filterByRegion(prevActivitiesData);

      const prevMeetingsData = prevActivitiesData.filter((a: any) => a.activity_type === "Meeting");
      const prevDemosData = prevActivitiesData.filter((a: any) => a.activity_type === "Demo");
      const prevPhoneData = prevActivitiesData.filter((a: any) => a.activity_type === "Phone");

      const prevUpcomingMeetingsData = prevActivitiesData.filter((a: any) => {
        if (!["Meeting", "Demo"].includes(a.activity_type)) return false;
        if (!a.scheduled_date) return false;
        if (a.outcome === "Completed" || a.completed_date) return false;
        return true;
      });

      let oppsData = filterByRegion((oppsDataRaw || []) as any[]);
      let prevOppsData = filterByRegion((prevOppsDataRaw || []) as any[]);

      // Fetch assignee names (from sales_reps or profiles) — parallel
      const assigneeIds = [...new Set(oppsData.map((o: any) => o.assigned_to).filter(Boolean))] as string[];
      const assigneeMap: Record<string, string> = {};

      if (assigneeIds.length > 0) {
        const salesRepIds = assigneeIds.filter(id => id.startsWith("rep_")).map(id => id.replace("rep_", ""));
        const profileIds = assigneeIds.filter(id => !id.startsWith("rep_"));

        const [repsRes, profilesRes] = await Promise.all([
          salesRepIds.length > 0
            ? supabase.from("sales_reps").select("id, first_name, last_name").in("id", salesRepIds)
            : Promise.resolve({ data: [] as any[] }),
          profileIds.length > 0
            ? supabase.from("profiles").select("id, first_name, last_name").in("id", profileIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        repsRes.data?.forEach((rep: any) => {
          assigneeMap[`rep_${rep.id}`] = [rep.first_name, rep.last_name].filter(Boolean).join(" ") || "Unknown Rep";
        });
        profilesRes.data?.forEach((profile: any) => {
          assigneeMap[profile.id] = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Unknown User";
        });
      }

      // Calculate current period metrics
      // IMPORTANT: company_communications email rows are mirrors of Apollo imports (same company+sent_at).
      // To avoid double-counting, only count non-email comms here; Apollo is the source of truth for emails.
      const commsEmailRows = commsData.filter(c => c.communication_type === "email");
      const commsSent = apolloMetrics.sent;

      const commsOpened = commsEmailRows.filter(c => c.email_opened_at).length;
      // Use max() instead of sum to avoid double-counting opens that exist in both tables
      const emailsOpened = Math.max(commsOpened, apolloMetrics.opened);

      const commsResponded = commsEmailRows.filter(c => c.email_responded_at).length;
      const responsesReceived = Math.max(commsResponded, apolloMetrics.responded);
      
      // Meetings (Scheduled or Completed outcome)
      const meetingsScheduled = meetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const meetingsCompleted = meetingsData.filter(m => m.outcome === "Completed").length;
      
      // Demos
      const demosScheduled = demosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const demosCompleted = demosData.filter(d => d.outcome === "Completed").length;
      
      // Phone calls — combine outreach_activities (Phone) + company_communications (call_script)
      const phoneCallsFromActivities = phoneData.filter(p => p.outcome === "Completed" || p.completed_date).length;
      const phoneCallsFromComms = commsData.filter((c: any) => c.communication_type === "call_script").length;
      const phoneCalls = phoneCallsFromActivities + phoneCallsFromComms;
      
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

      // Calculate previous period metrics (Apollo is source of truth for emails)
      const prevCommsEmailRows = prevCommsData.filter((c: any) => c.communication_type === "email");
      const prevCommsSent = prevApolloMetrics.sent;
      const prevCommsOpened = prevCommsEmailRows.filter((c: any) => c.email_opened_at).length;
      const prevEmailsOpened = Math.max(prevCommsOpened, prevApolloMetrics.opened);
      const prevCommsResponded = prevCommsEmailRows.filter((c: any) => c.email_responded_at).length;
      const prevResponsesReceived = Math.max(prevCommsResponded, prevApolloMetrics.responded);
      const prevMeetingsScheduled = prevMeetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const prevMeetingsCompleted = prevMeetingsData.filter(m => m.outcome === "Completed").length;
      const prevDemosScheduled = prevDemosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const prevDemosCompleted = prevDemosData.filter(d => d.outcome === "Completed").length;
      const prevPhoneCalls = prevPhoneData.filter(p => p.outcome === "Completed" || p.completed_date).length +
                            prevCommsData.filter((c: any) => c.communication_type === "call_script").length;
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
    enabled: enabled && !!dateRange.from && !!dateRange.to,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
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
