import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserCheck, DollarSign, ArrowRightCircle, Building2 } from "lucide-react";
import { format } from "date-fns";
import type { HandoffDetail } from "@/hooks/usePipelineAnalytics";

interface LeadHandoffCardProps {
  metrics: {
    meetingsCompleted: number;
    leadsAssigned: number;
    handoffRate: number;
    totalPipelineValue: number;
    handoffDetails: HandoffDetail[];
  } | undefined;
  isLoading: boolean;
}

export function LeadHandoffCard({ metrics, isLoading }: LeadHandoffCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRightCircle className="h-5 w-5 text-purple-500" />
          Lead Handoff
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Handoff Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-purple-500" />
              <span>Handoff Rate</span>
            </div>
            <span className="text-lg font-bold">{metrics.handoffRate.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.handoffRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {metrics.leadsAssigned} assigned from {metrics.meetingsCompleted} completed meetings
          </p>
        </div>

        {/* Handoff Details */}
        {metrics.handoffDetails.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-purple-500" />
              <span>Recent Handoffs</span>
            </div>
            <ScrollArea className="h-[120px]">
              <div className="space-y-1.5">
                {metrics.handoffDetails.slice(0, 5).map((handoff) => (
                  <div key={handoff.id} className="text-xs bg-purple-50 dark:bg-purple-950/30 rounded px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{handoff.company_name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">
                        {format(new Date(handoff.created_at), "MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-purple-700 dark:text-purple-300">
                        → {handoff.assigned_to_name}
                      </span>
                      {handoff.amount && (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {formatCurrency(handoff.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Total Pipeline Value */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span>Total Pipeline Value</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-500 mt-2">
            {formatCurrency(metrics.totalPipelineValue)}
          </p>
          <p className="text-xs text-muted-foreground">
            From {metrics.leadsAssigned} assigned opportunity{metrics.leadsAssigned !== 1 ? "ies" : "y"}
          </p>
        </div>

        {/* Leads Assigned Count */}
        <div className="pt-2 border-t">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-500">{metrics.leadsAssigned}</p>
            <p className="text-sm text-muted-foreground">Leads Assigned to Sales</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
