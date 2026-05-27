import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Search, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link_url: string | null;
  read: boolean;
  action_required: boolean;
  created_at: string;
  read_at: string | null;
}

export default function Notifications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', 'all', filterType, filterStatus, searchQuery],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by type
      if (filterType !== 'all') {
        if (filterType === 'action_required') {
          query = query.eq('action_required', true);
        } else {
          query = query.eq('type', filterType);
        }
      }

      // Filter by read status
      if (filterStatus === 'unread') {
        query = query.eq('read', false);
      } else if (filterStatus === 'read') {
        query = query.eq('read', true);
      }

      // Search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data } = await query;
      return (data || []) as Notification[];
    },
  });

  // Mark as read mutation
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notification marked as read" });
    },
  });

  // Mark all as read mutation
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "All notifications marked as read" });
    },
  });

  // Delete notification mutation
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      await (supabase as any)
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: "Notification deleted" });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  const actionRequiredNotifications = notifications.filter(n => n.action_required && !n.read);
  const otherNotifications = notifications.filter(n => !n.action_required || n.read);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button
          onClick={() => markAllAsRead.mutate()}
          disabled={notifications.filter(n => !n.read).length === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="action_required">Action Required</SelectItem>
                <SelectItem value="company_access_request">Access Requests</SelectItem>
                <SelectItem value="communication_view_request">Communication Requests</SelectItem>
                <SelectItem value="access_request_approved">Approvals</SelectItem>
                <SelectItem value="access_request_denied">Denials</SelectItem>
                <SelectItem value="access_expiring_soon">Expiring Access</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Tabs defaultValue="action" className="space-y-4">
        <TabsList>
          <TabsTrigger value="action">
            Action Required
            {actionRequiredNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {actionRequiredNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="action" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : actionRequiredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No action required notifications
              </CardContent>
            </Card>
          ) : (
            actionRequiredNotifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{notification.title}</CardTitle>
                        <Badge variant="destructive">Action Required</Badge>
                        {!notification.read && <Badge variant="secondary">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification.mutate(notification.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{notification.message}</p>
                  {notification.link_url && (
                    <Button onClick={() => handleNotificationClick(notification)}>
                      Take Action
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No notifications yet
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{notification.title}</CardTitle>
                        {notification.action_required && (
                          <Badge variant="destructive">Action Required</Badge>
                        )}
                        {!notification.read && <Badge variant="secondary">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{notification.message}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
