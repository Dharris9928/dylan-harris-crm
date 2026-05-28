import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Mail, MailOpen, Reply, AlertCircle } from "lucide-react";

export function CommunicationsCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { firstDay, lastDay, currentMonthName } = useMemo(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return {
      firstDay: first.toISOString(),
      lastDay: last.toISOString(),
      currentMonthName: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, []);

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-communications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "company_communications" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-communications"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "apollo_email_activities" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-communications"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["dashboard-communications", firstDay, lastDay],
    queryFn: async () => {
      const [manual, apollo] = await Promise.all([
        supabase
          .from("company_communications")
          .select("id, sent_at, email_opened_at, email_responded_at, communication_type")
          .gte("sent_at", firstDay)
          .lte("sent_at", lastDay),
        supabase
          .from("apollo_email_activities")
          .select("id, sent_at, opened_at, replied_at")
          .gte("sent_at", firstDay)
          .lte("sent_at", lastDay),
      ]);

      if (manual.error) throw manual.error;
      if (apollo.error) throw apollo.error;

      const manualRows = manual.data ?? [];
      const apolloRows = apollo.data ?? [];

      const sent = manualRows.filter((r) => r.sent_at).length + apolloRows.length;
      const opened =
        manualRows.filter((r) => r.email_opened_at).length +
        apolloRows.filter((r) => r.opened_at).length;
      const replied =
        manualRows.filter((r) => r.email_responded_at).length +
        apolloRows.filter((r) => r.replied_at).length;

      const total = manualRows.length + apolloRows.length;
      const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
      const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

      return { total, sent, opened, replied, openRate, replyRate };
    },
  });

  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:bg-accent/50 transition-all duration-200"
      onClick={() => navigate("/communications")}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Communications</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{currentMonthName}</p>
        </div>
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Failed to load communications
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-2xl font-bold animate-in fade-in duration-300">
                {query.data?.total ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Total this month</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Sent</span>
                </div>
                <span className="font-semibold">{query.data?.sent ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <MailOpen className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Opened</span>
                </div>
                <span className="font-semibold">
                  {query.data?.opened ?? 0}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({query.data?.openRate ?? 0}%)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Reply className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Replied</span>
                </div>
                <span className="font-semibold">
                  {query.data?.replied ?? 0}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({query.data?.replyRate ?? 0}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
