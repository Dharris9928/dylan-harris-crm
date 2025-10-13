import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface UserRole {
  user_id: string;
  role: string;
  access_expires_at: string | null;
  last_activity_at: string | null;
  review_required_by: string | null;
  user_email?: string;
}

export function RoleExpirationManager() {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [expirationDate, setExpirationDate] = useState("");
  const { toast } = useToast();

  const loadUserRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("access_expires_at", { ascending: true });

      if (error) throw error;

      // Fetch user emails
      const { data: users } = await supabase.auth.admin.listUsers();
      const emailMap = new Map<string, string>();
      if (users?.users) {
        users.users.forEach((u: any) => {
          if (u.id && u.email) emailMap.set(u.id, u.email);
        });
      }

      const enrichedRoles = (roles || []).map(r => ({
        ...r,
        user_email: emailMap.get(r.user_id) || 'Unknown'
      }));

      setUserRoles(enrichedRoles);
    } catch (error: any) {
      toast({
        title: "Error loading roles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserRoles();
  }, []);

  const handleSetExpiration = async () => {
    if (!selectedRole || !expirationDate) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ access_expires_at: expirationDate })
        .eq("user_id", selectedRole.user_id)
        .eq("role", selectedRole.role as any);

      if (error) throw error;

      toast({
        title: "Expiration updated",
        description: "Role expiration date has been set",
      });

      loadUserRoles();
      setSelectedRole(null);
      setExpirationDate("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRevokeExpired = async () => {
    try {
      const { data, error } = await supabase.rpc("revoke_expired_access");

      if (error) throw error;

      toast({
        title: "Expired access revoked",
        description: `Removed ${data?.length || 0} expired role assignments`,
      });

      loadUserRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDaysUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return differenceInDays(new Date(expiresAt), new Date());
  };

  const getExpirationBadge = (expiresAt: string | null) => {
    if (!expiresAt) {
      return <Badge variant="outline">No Expiration</Badge>;
    }

    const days = getDaysUntilExpiration(expiresAt);
    if (days === null) return null;

    if (days < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-orange-500">Expires in {days}d</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-yellow-500">Expires in {days}d</Badge>;
    }
    return <Badge variant="secondary">Expires in {days}d</Badge>;
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

  if (loading) {
    return <Card className="p-6">Loading role assignments...</Card>;
  }

  const expiringRoles = userRoles.filter(r => {
    if (!r.access_expires_at) return false;
    const days = getDaysUntilExpiration(r.access_expires_at);
    return days !== null && days <= 30;
  });

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Role Expiration Management</h3>
          </div>
          <Button size="sm" variant="destructive" onClick={handleRevokeExpired}>
            Revoke Expired Access
          </Button>
        </div>

        {expiringRoles.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {expiringRoles.length} role{expiringRoles.length !== 1 ? 's' : ''} expiring within 30 days
            </p>
          </div>
        )}

        <div className="space-y-3">
          {userRoles.map((role) => (
            <Card key={`${role.user_id}-${role.role}`} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{role.user_email}</p>
                    {getRoleBadge(role.role)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getExpirationBadge(role.access_expires_at)}
                    {role.access_expires_at && (
                      <span>• {format(new Date(role.access_expires_at), "MMM d, yyyy")}</span>
                    )}
                  </div>
                  {role.last_activity_at && (
                    <p className="text-sm text-muted-foreground">
                      Last active: {format(new Date(role.last_activity_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRole(role)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Set Expiration
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Role Expiration</DialogTitle>
                      <DialogDescription>
                        Set when this role assignment should expire for {role.user_email}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Expiration Date</Label>
                        <Input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <Button onClick={handleSetExpiration} className="w-full">
                        Update Expiration
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}
