import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, MailOpen, MessageSquareReply, Clock, Building2, User } from "lucide-react";
import { format } from "date-fns";
import type { EmailedCompany, ResponseDetail } from "@/hooks/usePipelineAnalytics";

interface EmailPerformanceCardProps {
  metrics: {
    commsSent: number;
    emailsOpened: number;
    responsesReceived: number;
    openRate: number;
    responseRate: number;
    avgResponseTimeDays: number;
    emailedCompanies: EmailedCompany[];
    responseDetails: ResponseDetail[];
  } | undefined;
  isLoading: boolean;
}

export function EmailPerformanceCard({ metrics, isLoading }: EmailPerformanceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatResponseTime = (days: number) => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
    return `${days.toFixed(1)} day${days !== 1 ? "s" : ""}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          Email Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Open Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <MailOpen className="h-4 w-4 text-cyan-500" />
              <span>Open Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.openRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.openRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.emailsOpened} opened of {metrics.commsSent} sent
          </p>
        </div>

        {/* Companies Emailed */}
        {metrics.emailedCompanies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span>Recent Companies Emailed</span>
            </div>
            <ScrollArea className="h-[80px]">
              <div className="space-y-1.5">
                {metrics.emailedCompanies.slice(0, 5).map((company) => (
                  <div key={company.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                    <span className="truncate font-medium">{company.company_name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {format(new Date(company.sent_at), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Response Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <MessageSquareReply className="h-4 w-4 text-green-500" />
              <span>Response Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.responseRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.responseRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.responsesReceived} responded of {metrics.emailsOpened} opened
          </p>
        </div>

        {/* Response Details */}
        {metrics.responseDetails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-green-500" />
              <span>Recent Responses</span>
            </div>
            <ScrollArea className="h-[100px]">
              <div className="space-y-1.5">
                {metrics.responseDetails.slice(0, 5).map((response) => (
                  <div key={response.id} className="text-xs bg-green-50 dark:bg-green-950/30 rounded px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-700 dark:text-green-300 truncate">
                        {response.contact_name}
                      </span>
                      <span className="text-muted-foreground ml-2 shrink-0">
                        {format(new Date(response.responded_at), "MMM d")}
                      </span>
                    </div>
                    <span className="text-muted-foreground truncate block">
                      {response.company_name}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Average Response Time */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              <span>Avg Response Time</span>
            </div>
            <span className="text-lg font-bold">
              {metrics.avgResponseTimeDays > 0 
                ? formatResponseTime(metrics.avgResponseTimeDays)
                : "N/A"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
