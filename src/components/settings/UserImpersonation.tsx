import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useImpersonation } from '@/hooks/useImpersonation';
import { toast } from 'sonner';
import { UserCog, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UserImpersonation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const { startImpersonation } = useImpersonation();

  // Fetch all users (admin only)
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get profiles with user roles
      let query = supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          approval_status,
          user_roles!inner(role)
        `)
        .eq('approval_status', 'approved')
        .neq('id', user.id); // Don't include current user

      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Get emails from edge function
      const userIds = data?.map(p => p.id) || [];
      if (userIds.length === 0) return [];

      const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
        body: { userIds }
      });

      const emails = emailData?.emails || {};

      return data?.map(profile => ({
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
        email: emails[profile.id] || 'No email',
        role: (profile.user_roles as any)?.[0]?.role || 'unknown'
      })) || [];
    },
    enabled: true,
  });

  const handleImpersonate = () => {
    const user = users?.find(u => u.id === selectedUserId);
    if (!user) {
      toast.error('Please select a user to impersonate');
      return;
    }

    startImpersonation({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
    });

    toast.success(`Now viewing system as ${user.name}`);
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-primary" />
          <CardTitle>User Impersonation</CardTitle>
        </div>
        <CardDescription>
          View the system as another user for troubleshooting. All data will be filtered to match their permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search Users</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-select">Select User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="user-select">
              <SelectValue placeholder="Choose a user to impersonate" />
            </SelectTrigger>
            <SelectContent>
              {isLoading ? (
                <SelectItem value="loading" disabled>Loading users...</SelectItem>
              ) : users?.length === 0 ? (
                <SelectItem value="none" disabled>No users found</SelectItem>
              ) : (
                users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedUser && (
            <p className="text-sm text-muted-foreground">
              {selectedUser.email}
            </p>
          )}
        </div>

        <Button 
          onClick={handleImpersonate} 
          disabled={!selectedUserId}
          className="w-full"
        >
          <UserCog className="h-4 w-4 mr-2" />
          Start Impersonation
        </Button>

        <div className="bg-muted p-3 rounded-lg text-sm">
          <p className="font-medium mb-2">What happens when impersonating:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>You'll see data filtered to their permissions</li>
            <li>Perspective filters will apply to their records</li>
            <li>All queries will use their user ID</li>
            <li>A banner will show you're in impersonation mode</li>
            <li>Click "Stop Impersonation" to return to admin view</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
