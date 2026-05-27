import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { DollarSign, TrendingUp, Target, Award } from "lucide-react";

const STAGES = ["Open", "Proposal", "Committed", "Purchased", "Declined"] as const;
const STAGE_COLORS: Record<string, string> = {
  Open: "#94a3b8",
  Proposal: "#3b82f6",
  Committed: "#10b981",
  Purchased: "#059669",
  Declined: "#ef4444",
};

interface Opp {
  id: string;
  stage: string;
  estimated_value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  created_at: string;
}

function PipelineAnalyticsPage() {
  const [opps, setOpps] = useState<Opp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, stage, estimated_value, probability, expected_close_date, created_at");
      if (!error && data) setOpps(data as Opp[]);
      setLoading(false);
    })();
  }, []);

  const kpi = useMemo(() => {
    const total = opps.reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
    const open = opps
      .filter((o) => o.stage !== "Purchased" && o.stage !== "Declined")
      .reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
    const weighted = opps.reduce(
      (s, o) => s + (Number(o.estimated_value ?? 0) * Number(o.probability ?? 0)) / 100,
      0,
    );
    const won = opps
      .filter((o) => o.stage === "Purchased")
      .reduce((s, o) => s + Number(o.estimated_value ?? 0), 0);
    const winRate =
      opps.length === 0
        ? 0
        : (opps.filter((o) => o.stage === "Purchased").length /
            opps.filter((o) => o.stage === "Purchased" || o.stage === "Declined").length || 0) * 100;
    return { total, open, weighted, won, winRate: isFinite(winRate) ? winRate : 0 };
  }, [opps]);

  const byStage = useMemo(
    () =>
      STAGES.map((s) => ({
        stage: s,
        count: opps.filter((o) => o.stage === s).length,
        value: opps
          .filter((o) => o.stage === s)
          .reduce((sum, o) => sum + Number(o.estimated_value ?? 0), 0),
      })),
    [opps],
  );

  const forecast = useMemo(() => {
    const months: Record<string, number> = {};
    opps.forEach((o) => {
      if (!o.expected_close_date) return;
      const d = new Date(o.expected_close_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] =
        (months[key] ?? 0) +
        (Number(o.estimated_value ?? 0) * Number(o.probability ?? 0)) / 100;
    });
    return Object.entries(months)
      .sort()
      .slice(0, 12)
      .map(([month, value]) => ({ month, value: Math.round(value) }));
  }, [opps]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline Analytics</h1>
        <p className="text-muted-foreground">
          Stage distribution, weighted forecast, and win rate insights.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${kpi.total.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Value</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${kpi.open.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weighted Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(kpi.weighted).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              ${kpi.won.toLocaleString()} won
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Value by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value">
                  {byStage.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deal Count by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byStage.filter((s) => s.count > 0)}
                  dataKey="count"
                  nameKey="stage"
                  outerRadius={100}
                  label={(entry: any) => `${entry.stage}: ${entry.count}`}
                >
                  {byStage.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weighted Forecast by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {forecast.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {loading ? "Loading..." : "No close dates set on opportunities yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/pipeline-analytics")({
  component: PipelineAnalyticsPage,
});
