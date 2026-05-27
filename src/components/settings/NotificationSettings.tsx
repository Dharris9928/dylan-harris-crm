import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferences {
  id: string;
  access_requests: boolean;
  access_status: boolean;
  access_expiring: boolean;
  access_revoked: boolean;
  communication_requests: boolean;
  appeal_submitted: boolean;
  delivery_method: string;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no preferences exist, create defaults
      if (!data) {
        const { data: newPrefs, error: insertError } = await (supabase as any)
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    updatePreferences.mutate({ [field]: value });
  };

  const handleDeliveryMethodChange = (value: string) => {
    updatePreferences.mutate({ delivery_method: value });
  };

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive and how you want to receive them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Method */}
          <div className="space-y-2">
            <Label htmlFor="delivery-method">Delivery Method</Label>
            <Select
              value={preferences.delivery_method}
              onValueChange={handleDeliveryMethodChange}
            >
              <SelectTrigger id="delivery-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Email + In-App</SelectItem>
                <SelectItem value="email_only">Email Only</SelectItem>
                <SelectItem value="internal_only">In-App Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose how you want to receive notifications
            </p>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="font-medium">Notification Types</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-requests">Access Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone requests access to protected data
                </p>
              </div>
              <Switch
                id="access-requests"
                checked={preferences.access_requests}
                onCheckedChange={(value) => handleToggle('access_requests', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-status">Access Status Changes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about decisions on your access requests
                </p>
              </div>
              <Switch
                id="access-status"
                checked={preferences.access_status}
                onCheckedChange={(value) => handleToggle('access_status', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-expiring">Access Expiring Soon</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your access to records is about to expire (7 days before)
                </p>
              </div>
              <Switch
                id="access-expiring"
                checked={preferences.access_expiring}
                onCheckedChange={(value) => handleToggle('access_expiring', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="access-revoked">Access Revoked</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when your access to records has been revoked
                </p>
              </div>
              <Switch
                id="access-revoked"
                checked={preferences.access_revoked}
                onCheckedChange={(value) => handleToggle('access_revoked', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="communication-requests">Communication View Requests</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about requests to view communications (Admin/Manager only)
                </p>
              </div>
              <Switch
                id="communication-requests"
                checked={preferences.communication_requests}
                onCheckedChange={(value) => handleToggle('communication_requests', value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="appeal-submitted">Appeal Submissions</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone submits an appeal for denied access
                </p>
              </div>
              <Switch
                id="appeal-submitted"
                checked={preferences.appeal_submitted}
                onCheckedChange={(value) => handleToggle('appeal_submitted', value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
