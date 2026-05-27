import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function BusinessContextSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [businessContext, setBusinessContext] = useState('');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['business-context-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_context_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setBusinessContext(settings.business_description || '');
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('business_context_settings')
        .update({
          ...updates,
          updated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business-context-settings'] });
      toast({
        title: 'Success',
        description: 'Business context settings updated successfully',
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      business_description: businessContext,
    });
  };

  const handleCancel = () => {
    if (settings) {
      setBusinessContext(settings.business_description || '');
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Context Settings</CardTitle>
        <CardDescription>
          Configure permanent business context that will help AI generate better, more focused communications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These settings are automatically included in all AI-generated communications to ensure consistency 
            with your team's business direction and communication style. Only administrators can edit these settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-context">Business Context</Label>
            <Textarea
              id="business-context"
              value={businessContext}
              onChange={(e) => setBusinessContext(e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your complete business context including mission, goals, products, services, target customers, and communication guidelines..."
              rows={20}
              className="resize-y font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This context is automatically included in all AI-generated communications to ensure consistency 
              with your team's business direction and communication style.
            </p>
          </div>
        </div>

        {settings?.updated_at && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit Business Context
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
