import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface UserAssignmentSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function UserAssignmentSelect({ value, onValueChange, placeholder = "Select assignee..." }: UserAssignmentSelectProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: async () => {
      // First get all approved profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, approval_status')
        .eq('approval_status', 'approved')
        .order('first_name');

      if (profilesError) throw profilesError;
      if (!profiles) return [];

      // Then get roles for these users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['sales_rep', 'sales_manager', 'admin']);

      if (rolesError) throw rolesError;

      // Filter profiles to only include users with the required roles
      const roleUserIds = new Set(roles?.map(r => r.user_id) || []);
      return profiles.filter(p => roleUserIds.has(p.id));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card z-[100]">
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {users?.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.first_name} {user.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
