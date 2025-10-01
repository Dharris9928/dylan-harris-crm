import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
}

export const UserManagement = () => {
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Check if current user is admin
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setCurrentUserRole(data?.role || null);
      }
    };
    checkUserRole();
  }, []);

  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return profiles as UserProfile[];
    },
    enabled: currentUserRole === 'admin' || currentUserRole === 'sales_manager',
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("User role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update user role");
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'sales_manager':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'sales_rep':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'read_only':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'sales_manager':
        return 'Sales Manager';
      case 'sales_rep':
        return 'Sales Rep';
      case 'read_only':
        return 'Read Only';
      default:
        return role;
    }
  };

  // Only show to admins and sales managers
  if (currentUserRole !== 'admin' && currentUserRole !== 'sales_manager') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>User Administration</CardTitle>
        </div>
        <CardDescription>
          Manage user roles and security clearances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentUserRole === 'sales_manager' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              As a Sales Manager, you can view users but only Admins can modify roles.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading users...
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Unnamed User'}
                    </div>
                    <div className="text-sm text-muted-foreground">User ID: {user.id.slice(0, 8)}...</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {currentUserRole === 'admin' ? (
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => {
                        updateRoleMutation.mutate({
                          userId: user.id,
                          newRole: newRole as AppRole,
                        });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sales_manager">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Sales Manager</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sales_rep">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Sales Rep</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="read_only">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Read Only</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No users found
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="font-medium">Role Permissions:</div>
            <ul className="space-y-1 ml-4">
              <li>• <strong>Admin:</strong> Full access to all features and user management</li>
              <li>• <strong>Sales Manager:</strong> Can view all companies, manage data, view users</li>
              <li>• <strong>Sales Rep:</strong> Can only view and edit companies they created</li>
              <li>• <strong>Read Only:</strong> Can view companies they created but cannot edit</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
