import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export function OpportunitiesQuickActions() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['opportunities-stats'],
    queryFn: async () => {
      const { data: opportunities, error } = await supabase
        .from('opportunities' as any)
        .select('status, estimated_value');

      if (error) throw error;

      const total = opportunities?.length || 0;
      const inProgress = opportunities?.filter((o: any) => o.status === 'Proposal' || o.status === 'Committed').length || 0;
      const totalValue = opportunities?.reduce((sum: number, o: any) => 
        sum + (parseFloat(o.estimated_value) || 0), 0) || 0;

      return { total, inProgress, totalValue };
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Opportunities Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">
              ${stats?.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </p>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={() => navigate('/opportunities')}
        >
          View All Opportunities
        </Button>
      </CardContent>
    </Card>
  );
}
