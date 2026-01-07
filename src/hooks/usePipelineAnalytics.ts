import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from "date-fns";
import { Perspective } from "@/components/common/PerspectiveSelector";
import { RegionFilter } from "@/components/pipeline/RegionToggle";

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

      // Fetch communications data
      let commsQuery = supabase
        .from("company_communications")
        .select("id, sent_at, email_opened_at, email_responded_at, company_id")
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

      // Fetch meetings (activities with type Meeting)
      let meetingsQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, status, scheduled_date, completed_date, company_id")
        .eq("activity_type", "Meeting")
        .gte("scheduled_date", fromDate)
        .lte("scheduled_date", toDate);
      
      meetingsQuery = buildPerspectiveFilter(meetingsQuery);
      const { data: meetingsDataRaw, error: meetingsError } = await meetingsQuery;
      
      if (meetingsError) throw meetingsError;

      let meetingsData = meetingsDataRaw || [];
      if (filterStates && meetingsData.length > 0) {
        const companyIds = [...new Set(meetingsData.map(m => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          meetingsData = meetingsData.filter(m => validCompanyIds.has(m.company_id));
        }
      }

      // Fetch previous period meetings
      let prevMeetingsQuery = supabase
        .from("outreach_activities")
        .select("id, activity_type, status, company_id")
        .eq("activity_type", "Meeting")
        .gte("scheduled_date", prevFrom)
        .lte("scheduled_date", prevTo);
      
      prevMeetingsQuery = buildPerspectiveFilter(prevMeetingsQuery);
      const { data: prevMeetingsDataRaw } = await prevMeetingsQuery;
      
      let prevMeetingsData = prevMeetingsDataRaw || [];
      if (filterStates && prevMeetingsData.length > 0) {
        const companyIds = [...new Set(prevMeetingsData.map(m => m.company_id).filter(Boolean))];
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id, state")
            .in("id", companyIds)
            .in("state", filterStates);
          const validCompanyIds = new Set(companies?.map(c => c.id) || []);
          prevMeetingsData = prevMeetingsData.filter(m => validCompanyIds.has(m.company_id));
        }
      }

      // Fetch opportunities (leads assigned)
      let oppsQuery = supabase
        .from("opportunities")
        .select("id, assigned_to, amount, created_at, stage, closed_date, company_id")
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
      const meetingsScheduled = meetingsData.filter(m => m.status === "Scheduled" || m.status === "Completed").length;
      const meetingsCompleted = meetingsData.filter(m => m.status === "Completed").length;
      const leadsAssigned = oppsData.length;
      
      // Calculate closed deals (manual selection via stage = 'closed_won')
      const closedDealsData = oppsData.filter(o => o.stage === 'closed_won');
      const closedDeals = closedDealsData.length;
      const closedDealValue = closedDealsData.reduce((sum, opp) => sum + (opp.amount || 0), 0);

      // Calculate previous period metrics
      const prevCommsSent = prevCommsData.filter(c => c.sent_at).length;
      const prevEmailsOpened = prevCommsData.filter(c => c.email_opened_at).length;
      const prevResponsesReceived = prevCommsData.filter(c => c.email_responded_at).length;
      const prevMeetingsScheduled = prevMeetingsData.filter(m => m.status === "Scheduled" || m.status === "Completed").length;
      const prevMeetingsCompleted = prevMeetingsData.filter(m => m.status === "Completed").length;
      const prevLeadsAssigned = prevOppsData.length;
      const prevClosedDeals = prevOppsData.filter(o => o.stage === 'closed_won').length;

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
