import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  read: boolean;
  action_required: boolean;
  created_at: string;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await (supabase as any)
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return (data || []) as Notification[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [queryClient]);

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
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    markAsRead.mutate(notification.id);
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  // Separate action-required notifications
  const actionRequired = notifications.filter(n => n.action_required && !n.read);
  const others = notifications.filter(n => !n.action_required || n.read);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {actionRequired.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                Action Required
              </div>
              {actionRequired.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="cursor-pointer px-4 py-3 focus:bg-accent"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-start justify-between">
                      <span className="font-medium text-sm">{notification.title}</span>
                      <Badge variant="destructive" className="ml-2">!</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          
          {others.length > 0 ? (
            others.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`cursor-pointer px-4 py-3 focus:bg-accent ${!notification.read ? 'bg-muted/50' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-medium text-sm">{notification.title}</span>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          ) : actionRequired.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : null}
        </ScrollArea>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          className="cursor-pointer justify-center font-medium"
          onClick={() => navigate('/notifications')}
        >
          View All Notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
