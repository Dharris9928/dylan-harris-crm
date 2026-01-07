import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface RegionMetrics {
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
  closeRate: number;
}

interface RegionComparisonCardProps {
  westMetrics?: RegionMetrics | null;
  eastMetrics?: RegionMetrics | null;
  isLoading: boolean;
}

export function RegionComparisonCard({ westMetrics, eastMetrics, isLoading }: RegionComparisonCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>East vs West Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { label: "Emails Sent", west: westMetrics?.commsSent ?? 0, east: eastMetrics?.commsSent ?? 0 },
    { label: "Emails Opened", west: westMetrics?.emailsOpened ?? 0, east: eastMetrics?.emailsOpened ?? 0 },
    { label: "Responses", west: westMetrics?.responsesReceived ?? 0, east: eastMetrics?.responsesReceived ?? 0 },
    { label: "Meetings Scheduled", west: westMetrics?.meetingsScheduled ?? 0, east: eastMetrics?.meetingsScheduled ?? 0 },
    { label: "Meetings Completed", west: westMetrics?.meetingsCompleted ?? 0, east: eastMetrics?.meetingsCompleted ?? 0 },
    { label: "Leads Assigned", west: westMetrics?.leadsAssigned ?? 0, east: eastMetrics?.leadsAssigned ?? 0 },
    { label: "Closed Deals", west: westMetrics?.closedDeals ?? 0, east: eastMetrics?.closedDeals ?? 0 },
  ];

  const rates = [
    { label: "Open Rate", west: westMetrics?.openRate ?? 0, east: eastMetrics?.openRate ?? 0, isPercent: true },
    { label: "Response Rate", west: westMetrics?.responseRate ?? 0, east: eastMetrics?.responseRate ?? 0, isPercent: true },
    { label: "Close Rate", west: westMetrics?.closeRate ?? 0, east: eastMetrics?.closeRate ?? 0, isPercent: true },
  ];

  const formatValue = (value: number, isPercent?: boolean) => {
    if (isPercent) return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getWinner = (west: number, east: number) => {
    if (west > east) return "west";
    if (east > west) return "east";
    return "tie";
  };

  const WinnerIcon = ({ winner }: { winner: "west" | "east" | "tie" }) => {
    if (winner === "tie") return <Minus className="h-4 w-4 text-muted-foreground" />;
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          East vs West Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume Metrics */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Volume Metrics</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span>Metric</span>
              <span className="text-center">🟣 West</span>
              <span className="text-center">🔵 East</span>
              <span className="text-center">Leader</span>
            </div>
            {metrics.map((metric) => {
              const winner = getWinner(metric.west, metric.east);
              return (
                <div key={metric.label} className="grid grid-cols-4 gap-2 items-center py-1.5">
                  <span className="text-sm font-medium">{metric.label}</span>
                  <span className={`text-center text-sm ${winner === "west" ? "font-bold text-purple-600" : ""}`}>
                    {formatValue(metric.west)}
                  </span>
                  <span className={`text-center text-sm ${winner === "east" ? "font-bold text-blue-600" : ""}`}>
                    {formatValue(metric.east)}
                  </span>
                  <span className="flex justify-center">
                    {winner === "west" && <span className="text-xs font-medium text-purple-600">West</span>}
                    {winner === "east" && <span className="text-xs font-medium text-blue-600">East</span>}
                    {winner === "tie" && <span className="text-xs text-muted-foreground">Tie</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversion Rates */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Conversion Rates</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span>Rate</span>
              <span className="text-center">🟣 West</span>
              <span className="text-center">🔵 East</span>
              <span className="text-center">Leader</span>
            </div>
            {rates.map((rate) => {
              const winner = getWinner(rate.west, rate.east);
              return (
                <div key={rate.label} className="grid grid-cols-4 gap-2 items-center py-1.5">
                  <span className="text-sm font-medium">{rate.label}</span>
                  <span className={`text-center text-sm ${winner === "west" ? "font-bold text-purple-600" : ""}`}>
                    {formatValue(rate.west, rate.isPercent)}
                  </span>
                  <span className={`text-center text-sm ${winner === "east" ? "font-bold text-blue-600" : ""}`}>
                    {formatValue(rate.east, rate.isPercent)}
                  </span>
                  <span className="flex justify-center">
                    {winner === "west" && <span className="text-xs font-medium text-purple-600">West</span>}
                    {winner === "east" && <span className="text-xs font-medium text-blue-600">East</span>}
                    {winner === "tie" && <span className="text-xs text-muted-foreground">Tie</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deal Value */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Deal Value</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-muted-foreground mb-1">🟣 West Closed Value</p>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(westMetrics?.closedDealValue ?? 0)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-muted-foreground mb-1">🔵 East Closed Value</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(eastMetrics?.closedDealValue ?? 0)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
