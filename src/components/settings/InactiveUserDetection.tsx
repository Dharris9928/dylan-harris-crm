import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, UserX, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InactiveUser {
  user_id: string;
  email: string;
  role: string;
  last_activity: string | null;
  days_inactive: number;
}

export function InactiveUserDetection() {
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState(90);
  const { toast } = useToast();

  const loadInactiveUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("detect_inactive_users", {
        _days_inactive: daysThreshold,
      });

      if (error) throw error;
      setInactiveUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading inactive users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInactiveUsers();
  }, [daysThreshold]);

  const handleRevokeAccess = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role as any);

      if (error) throw error;

      toast({
        title: "Access revoked",
        description: "User role has been removed due to inactivity",
      });

      loadInactiveUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: <Badge variant="destructive">Admin</Badge>,
      sales_manager: <Badge variant="default">Sales Manager</Badge>,
      sales_rep: <Badge variant="secondary">Sales Rep</Badge>,
      read_only: <Badge variant="outline">Read Only</Badge>,
    };
    return badges[role as keyof typeof badges] || <Badge>{role}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">Inactive User Detection</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={daysThreshold.toString()}
              onValueChange={(v) => setDaysThreshold(parseInt(v))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={loadInactiveUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : inactiveUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No inactive users found</p>
            <p className="text-sm text-muted-foreground mt-1">
              All users have been active within the last {daysThreshold} days
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Found {inactiveUsers.length} inactive user{inactiveUsers.length !== 1 ? 's' : ''}
              </p>
            </div>

            {inactiveUsers.map((user) => (
              <Card key={`${user.user_id}-${user.role}`} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.email}</p>
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.last_activity ? (
                        <>
                          Last activity: {format(new Date(user.last_activity), "MMM d, yyyy")}
                          <br />
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Inactive for {user.days_inactive} days
                          </span>
                        </>
                      ) : (
                        <span className="text-orange-600 dark:text-orange-400 font-medium">
                          No activity recorded
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRevokeAccess(user.user_id, user.role)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Revoke Access
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
