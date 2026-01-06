import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { Perspective } from "@/components/common/PerspectiveSelector";

interface DateRange {
  from: Date;
  to: Date;
}

interface PipelineMetrics {
  commsSent: number;
  emailsOpened: number;
  responsesReceived: number;
  meetingsScheduled: number;
  meetingsCompleted: number;
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
  previousPeriod: {
    commsSent: number;
    emailsOpened: number;
    responsesReceived: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
    leadsAssigned: number;
    closedDeals: number;
  };
}

export function usePipelineAnalytics(
  dateRange: DateRange,
  perspective: Perspective,
  userId?: string
) {
  return useQuery({
    queryKey: ["pipeline-analytics", dateRange.from, dateRange.to, perspective, userId],
    queryFn: async (): Promise<PipelineMetrics> => {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");
      
      // Calculate previous period for comparison
      const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      const prevFrom = format(subDays(dateRange.from, periodDays), "yyyy-MM-dd");
      const prevTo = format(subDays(dateRange.to, periodDays), "yyyy-MM-dd");

      // Build perspective filter
      const buildPerspectiveFilter = (query: any) => {
        if (perspective === "my_records" && userId) {
          return query.eq("created_by", userId);
        } else if (perspective === "assigned_to_me" && userId) {
          return query.eq("created_by", userId);
        }
        return query;
      };

      // Fetch communications data
      let commsQuery = supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at")
        .gte("sent_at", fromDate)
        .lte("sent_at", toDate);
      
      commsQuery = buildPerspectiveFilter(commsQuery);
      const { data: commsData, error: commsError } = await commsQuery;
      
      if (commsError) throw commsError;

      // Fetch previous period communications
      let prevCommsQuery = supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at")
        .gte("sent_at", prevFrom)
        .lte("sent_at", prevTo);
      
      prevCommsQuery = buildPerspectiveFilter(prevCommsQuery);
      const { data: prevCommsData } = await prevCommsQuery;

      // Fetch meetings (activities with type Meeting)
      let meetingsQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, status, scheduled_date, completed_date")
        .eq("activity_type", "Meeting")
        .gte("scheduled_date", fromDate)
        .lte("scheduled_date", toDate);
      
      meetingsQuery = buildPerspectiveFilter(meetingsQuery);
      const { data: meetingsData, error: meetingsError } = await meetingsQuery;
      
      if (meetingsError) throw meetingsError;

      // Fetch previous period meetings
      let prevMeetingsQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, status")
        .eq("activity_type", "Meeting")
        .gte("scheduled_date", prevFrom)
        .lte("scheduled_date", prevTo);
      
      prevMeetingsQuery = buildPerspectiveFilter(prevMeetingsQuery);
      const { data: prevMeetingsData } = await prevMeetingsQuery;

      // Fetch opportunities (leads assigned)
      let oppsQuery = supabase
        .from("opportunities")
        .select("id, assigned_to, amount, created_at, stage, closed_date")
        .not("assigned_to", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);
      
      oppsQuery = buildPerspectiveFilter(oppsQuery);
      const { data: oppsData, error: oppsError } = await oppsQuery;
      
      if (oppsError) throw oppsError;

      // Fetch previous period opportunities
      let prevOppsQuery = supabase
        .from("opportunities")
        .select("id, assigned_to, stage")
        .not("assigned_to", "is", null)
        .gte("created_at", prevFrom)
        .lte("created_at", prevTo);
      
      prevOppsQuery = buildPerspectiveFilter(prevOppsQuery);
      const { data: prevOppsData } = await prevOppsQuery;

      // Calculate current period metrics
      const commsSent = commsData?.filter(c => c.sent_at).length || 0;
      const emailsOpened = commsData?.filter(c => c.email_opened_at).length || 0;
      const responsesReceived = commsData?.filter(c => c.email_responded_at).length || 0;
      const meetingsScheduled = meetingsData?.filter(m => m.status === "Scheduled" || m.status === "Completed").length || 0;
      const meetingsCompleted = meetingsData?.filter(m => m.status === "Completed").length || 0;
      const leadsAssigned = oppsData?.length || 0;
      
      // Calculate closed deals (manual selection via stage = 'closed_won')
      const closedDealsData = oppsData?.filter(o => o.stage === 'closed_won') || [];
      const closedDeals = closedDealsData.length;
      const closedDealValue = closedDealsData.reduce((sum, opp) => sum + (opp.amount || 0), 0);

      // Calculate previous period metrics
      const prevCommsSent = prevCommsData?.filter(c => c.sent_at).length || 0;
      const prevEmailsOpened = prevCommsData?.filter(c => c.email_opened_at).length || 0;
      const prevResponsesReceived = prevCommsData?.filter(c => c.email_responded_at).length || 0;
      const prevMeetingsScheduled = prevMeetingsData?.filter(m => m.status === "Scheduled" || m.status === "Completed").length || 0;
      const prevMeetingsCompleted = prevMeetingsData?.filter(m => m.status === "Completed").length || 0;
      const prevLeadsAssigned = prevOppsData?.length || 0;
      const prevClosedDeals = prevOppsData?.filter(o => o.stage === 'closed_won').length || 0;

      // Calculate conversion rates
      const openRate = commsSent > 0 ? (emailsOpened / commsSent) * 100 : 0;
      const responseRate = emailsOpened > 0 ? (responsesReceived / emailsOpened) * 100 : 0;
      const scheduleRate = responsesReceived > 0 ? (meetingsScheduled / responsesReceived) * 100 : 0;
      const completionRate = meetingsScheduled > 0 ? (meetingsCompleted / meetingsScheduled) * 100 : 0;
      const handoffRate = meetingsCompleted > 0 ? (leadsAssigned / meetingsCompleted) * 100 : 0;
      const closeRate = leadsAssigned > 0 ? (closedDeals / leadsAssigned) * 100 : 0;

      // Calculate average response time
      let totalResponseTime = 0;
      let responseCount = 0;
      commsData?.forEach(c => {
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
      const totalPipelineValue = oppsData?.reduce((sum, opp) => sum + (opp.amount || 0), 0) || 0;

      return {
        commsSent,
        emailsOpened,
        responsesReceived,
        meetingsScheduled,
        meetingsCompleted,
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
        previousPeriod: {
          commsSent: prevCommsSent,
          emailsOpened: prevEmailsOpened,
          responsesReceived: prevResponsesReceived,
          meetingsScheduled: prevMeetingsScheduled,
          meetingsCompleted: prevMeetingsCompleted,
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
