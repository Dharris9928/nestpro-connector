import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { Perspective } from "@/components/common/PerspectiveSelector";
import { RegionFilter } from "@/components/pipeline/RegionToggle";

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
    demosScheduled: number;
    demosCompleted: number;
    leadsAssigned: number;
    closedDeals: number;
  };
}

export type { PipelineMetrics, EmailedCompany, ResponseDetail, HandoffDetail };

// State mappings based on user's map (Purple = West, Blue = East)
const WEST_STATES = [
  'WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'UT', 'CO', 'AZ', 'NM',
  'TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'AK', 'HI'
];

const EAST_STATES = [
  'MN', 'IA', 'MO', 'AR', 'LA', 'WI', 'IL', 'IN', 'MI', 'OH',
  'KY', 'TN', 'MS', 'AL', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV',
  'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME', 'DC'
];

// Get states array based on filter
function getFilterStates(regionFilter: RegionFilter): string[] | null {
  if (regionFilter === "west") return WEST_STATES;
  if (regionFilter === "east") return EAST_STATES;
  return null;
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
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      
      // Calculate previous period for comparison
      const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevFrom = format(subDays(dateRange.from, periodDays), "yyyy-MM-dd");
      const prevTo = format(subDays(dateRange.to, periodDays), "yyyy-MM-dd");

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

      // Fetch communications data with contact info
      let commsQuery = supabase
        .from("company_communications")
        .select(`
          id, sent_at, email_opened_at, email_responded_at, company_id, contact_id,
          companies!company_communications_company_id_fkey(id, company_name),
          contacts(id, first_name, last_name)
        `)
        .gte("sent_at", fromDate)
        .lte("sent_at", toDate);
      
      commsQuery = buildPerspectiveFilter(commsQuery);
      const { data: commsDataRaw, error: commsError } = await commsQuery;
      
      if (commsError) throw commsError;

      // Filter by region if needed
      let commsData = commsDataRaw || [];
      if (filterStates && commsData.length > 0) {
        const companyIds = [...new Set(commsData.map(c => c.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          commsData = commsData.filter(c => validCompanyIds.has(c.company_id));
        }
      }

      // Fetch previous period communications
      let prevCommsQuery = supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at, company_id")
        .gte("sent_at", prevFrom)
        .lte("sent_at", prevTo);
      
      prevCommsQuery = buildPerspectiveFilter(prevCommsQuery);
      const { data: prevCommsDataRaw } = await prevCommsQuery;
      
      let prevCommsData = prevCommsDataRaw || [];
      if (filterStates && prevCommsData.length > 0) {
        const companyIds = [...new Set(prevCommsData.map(c => c.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevCommsData = prevCommsData.filter(c => validCompanyIds.has(c.company_id));
        }
      }

      // Fetch all activities (Meeting, Demo, Phone)
      let activitiesQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, outcome, scheduled_date, completed_date, company_id")
        .in("activity_type", ["Meeting", "Demo", "Phone"])
        .or(`scheduled_date.gte.${fromDate},completed_date.gte.${fromDate}`)
        .or(`scheduled_date.lte.${toDate},completed_date.lte.${toDate}`);
      
      activitiesQuery = buildPerspectiveFilter(activitiesQuery);
      const { data: activitiesDataRaw, error: activitiesError } = await activitiesQuery;
      
      if (activitiesError) throw activitiesError;

      let activitiesData = activitiesDataRaw || [];
      
      // Filter by date range more precisely
      activitiesData = activitiesData.filter(a => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return (schedDate && schedDate >= from && schedDate <= to) || 
               (compDate && compDate >= from && compDate <= to);
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

      // Fetch previous period activities
      let prevActivitiesQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, outcome, scheduled_date, completed_date, company_id")
        .in("activity_type", ["Meeting", "Demo", "Phone"])
        .or(`scheduled_date.gte.${prevFrom},completed_date.gte.${prevFrom}`)
        .or(`scheduled_date.lte.${prevTo},completed_date.lte.${prevTo}`);
      
      prevActivitiesQuery = buildPerspectiveFilter(prevActivitiesQuery);
      const { data: prevActivitiesDataRaw } = await prevActivitiesQuery;
      
      let prevActivitiesData = prevActivitiesDataRaw || [];
      prevActivitiesData = prevActivitiesData.filter(a => {
        const schedDate = a.scheduled_date ? new Date(a.scheduled_date) : null;
        const compDate = a.completed_date ? new Date(a.completed_date) : null;
        const from = new Date(prevFrom);
        const to = new Date(prevTo);
        return (schedDate && schedDate >= from && schedDate <= to) || 
               (compDate && compDate >= from && compDate <= to);
      });

      if (filterStates && prevActivitiesData.length > 0) {
        const companyIds = [...new Set(prevActivitiesData.map(m => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevActivitiesData = prevActivitiesData.filter(m => validCompanyIds.has(m.company_id));
        }
      }

      const prevMeetingsData = prevActivitiesData.filter(a => a.activity_type === "Meeting");
      const prevDemosData = prevActivitiesData.filter(a => a.activity_type === "Demo");
      const prevPhoneData = prevActivitiesData.filter(a => a.activity_type === "Phone");

      // Fetch opportunities (leads assigned) with company and assignee info
      let oppsQuery = supabase
        .from("opportunities")
        .select(`
          id, assigned_to, amount, created_at, stage, closed_date, company_id,
          companies!opportunities_company_id_fkey(id, company_name)
        `)
        .not("assigned_to", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);
      
      oppsQuery = buildPerspectiveFilter(oppsQuery);
      const { data: oppsDataRaw, error: oppsError } = await oppsQuery;
      
      if (oppsError) throw oppsError;

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

      // Fetch previous period opportunities
      let prevOppsQuery = supabase
        .from("opportunities")
        .select("id, assigned_to, stage, company_id")
        .not("assigned_to", "is", null)
        .gte("created_at", prevFrom)
        .lte("created_at", prevTo);
      
      prevOppsQuery = buildPerspectiveFilter(prevOppsQuery);
      const { data: prevOppsDataRaw } = await prevOppsQuery;
      
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
      const commsSent = commsData.filter(c => c.sent_at).length;
      const emailsOpened = commsData.filter(c => c.email_opened_at).length;
      const responsesReceived = commsData.filter(c => c.email_responded_at).length;
      
      // Meetings (Scheduled or Completed outcome)
      const meetingsScheduled = meetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const meetingsCompleted = meetingsData.filter(m => m.outcome === "Completed").length;
      
      // Demos
      const demosScheduled = demosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const demosCompleted = demosData.filter(d => d.outcome === "Completed").length;
      
      // Phone calls (count all completed phone activities)
      const phoneCalls = phoneData.filter(p => p.outcome === "Completed" || p.completed_date).length;
      
      const leadsAssigned = oppsData.length;
      
      // Calculate closed deals (manual selection via stage = 'closed_won')
      const closedDealsData = oppsData.filter(o => o.stage === 'closed_won');
      const closedDeals = closedDealsData.length;
      const closedDealValue = closedDealsData.reduce((sum, opp) => sum + (opp.amount || 0), 0);

      // Calculate previous period metrics
      const prevCommsSent = prevCommsData.filter(c => c.sent_at).length;
      const prevEmailsOpened = prevCommsData.filter(c => c.email_opened_at).length;
      const prevResponsesReceived = prevCommsData.filter(c => c.email_responded_at).length;
      const prevMeetingsScheduled = prevMeetingsData.filter(m => m.outcome === "Scheduled" || m.outcome === "Completed").length;
      const prevMeetingsCompleted = prevMeetingsData.filter(m => m.outcome === "Completed").length;
      const prevDemosScheduled = prevDemosData.filter(d => d.outcome === "Scheduled" || d.outcome === "Completed").length;
      const prevDemosCompleted = prevDemosData.filter(d => d.outcome === "Completed").length;
      const prevPhoneCalls = prevPhoneData.filter(p => p.outcome === "Completed" || p.completed_date).length;
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
        .map(o => ({
          id: o.id,
          company_name: (o.companies as any)?.company_name || "Unknown Company",
          assigned_to_name: assigneeMap[o.assigned_to || ""] || "Unknown Assignee",
          created_at: o.created_at,
          amount: o.amount,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      return {
        commsSent,
        emailsOpened,
        responsesReceived,
        phoneCalls,
        meetingsScheduled,
        meetingsCompleted,
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
