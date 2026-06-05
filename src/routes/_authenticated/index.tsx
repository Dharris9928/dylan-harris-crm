import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

interface Stats {
  companies: number;
  contacts: number;
  opportunities: number;
  pipelineValue: number;
  activities: number;
  permits: number;
}

function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    companies: 0,
    contacts: 0,
    opportunities: 0,
    pipelineValue: 0,
    activities: 0,
    permits: 0,
  });
  const [userName, setUserName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authData.user.id)
          .single();
        setUserName(profile?.full_name || "there");
      }
    });

    const fetchStats = async () => {
      const [
        { count: companies },
        { count: contacts },
        { count: opportunities },
        { data: pipelineData },
        { count: activities },
        { count: permits },
      ] = await Promise.all([
        supabase.from("companies").select("*", { count: "exact", head: true }),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("opportunities").select("*", { count: "exact", head: true }),
        supabase.from("opportunities").select("estimated_value"),
        supabase.from("activities").select("*", { count: "exact", head: true }),
        supabase.from("building_permits").select("*", { count: "exact", head: true }),
      ]);

      const pipelineValue = pipelineData?.reduce((sum, o) => sum + (o.estimated_value || 0), 0) || 0;

      setStats({
        companies: companies || 0,
        contacts: contacts || 0,
        opportunities: opportunities || 0,
        pipelineValue,
        activities: activities || 0,
        permits: permits || 0,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight">Good morning, {userName}</h1>
        <p className="text-muted-foreground">Here's what's happening in your pipeline today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Companies"
          value={stats.companies}
          change="+12%"
          trend="up"
          icon={Building2}
          to="/companies"
        />
        <KPICard
          title="Active Contacts"
          value={stats.contacts}
          change="+5%"
          trend="up"
          icon={Users}
          to="/contacts"
        />
        <KPICard
          title="Open Opportunities"
          value={stats.opportunities}
          change="+8%"
          trend="up"
          icon={Briefcase}
          to="/opportunities"
        />
        <KPICard
          title="Pipeline Value"
          value={`$${(stats.pipelineValue / 1000000).toFixed(1)}M`}
          change="-2%"
          trend="down"
          icon={DollarSign}
          to="/pipeline-analytics"
        />
      </div>

      {/* Second row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <PriorityDistribution />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Building2 className="mr-2 h-4 w-4" />
              Add Company
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Briefcase className="mr-2 h-4 w-4" />
              Create Opportunity
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <ClipboardList className="mr-2 h-4 w-4" />
              Log Activity
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  to,
}: {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down";
  icon: React.ElementType;
  to?: string;
}) {
  const inner = (
    <Card className={to ? "transition-all hover:shadow-md hover:border-emerald-500/50 cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        <p className="flex items-center text-xs text-muted-foreground">
          {trend === "up" ? (
            <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-600" />
          ) : (
            <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
          )}
          {change} from last month
        </p>
      </CardContent>
    </Card>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
}

function PriorityDistribution() {
  const [data, setData] = useState<{ priority_tier: string; count: number }[]>([]);

  useEffect(() => {
    supabase
      .from("companies")
      .select("priority_tier")
      .then(({ data: rows }) => {
        const counts: Record<string, number> = {};
        rows?.forEach((r) => {
          counts[r.priority_tier || "P4"] = (counts[r.priority_tier || "P4"] || 0) + 1;
        });
        setData(
          Object.entries(counts).map(([priority_tier, count]) => ({ priority_tier, count }))
        );
      });
  }, []);

  const tiers = ["P1", "P2", "P3", "P4"];
  const colors: Record<string, string> = {
    P1: "bg-emerald-600",
    P2: "bg-emerald-400",
    P3: "bg-emerald-200",
    P4: "bg-emerald-100",
  };

  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {tiers.map((tier) => {
          const item = data.find((d) => d.priority_tier === tier);
          const pct = ((item?.count || 0) / total) * 100;
          return (
            <div
              key={tier}
              className={`${colors[tier]} h-full transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {tiers.map((tier) => {
          const item = data.find((d) => d.priority_tier === tier);
          return (
            <div key={tier} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${colors[tier]}`} />
              <span className="font-mono font-medium">{tier}</span>
              <span className="text-muted-foreground">({item?.count || 0})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentActivity() {
  const [items, setItems] = useState<
    { id: string; subject: string | null; type: string; created_at: string }[]
  >([]);

  useEffect(() => {
    supabase
      .from("activities")
      .select("id, subject, type, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setItems(data || []));
  }, []);

  const typeIcons: Record<string, React.ElementType> = {
    Call: TrendingUp,
    Email: ClipboardList,
    Meeting: Users,
    Demo: Briefcase,
    "Follow-up": Activity,
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No recent activity.</p>
      )}
      {items.map((item) => {
        const Icon = typeIcons[item.type] || Activity;
        return (
          <div key={item.id} className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <Icon className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.subject || item.type}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
