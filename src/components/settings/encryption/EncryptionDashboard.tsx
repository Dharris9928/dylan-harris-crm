import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Shield, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function EncryptionDashboard() {
  const queryClient = useQueryClient();

  // Fetch encryption statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['encryption-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_encryption_stats');
      if (error) throw error;
      return data as Array<{
        table_name: string;
        total_records: number;
        encrypted_records: number;
        pending_records: number;
        encryption_percentage: number;
      }>;
    },
  });

  // Check key rotation status
  const { data: rotationStatus } = useQuery({
    queryKey: ['key-rotation-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_key_rotation_due');
      if (error) throw error;
      return data?.[0] as {
        is_due: boolean;
        days_until_rotation: number;
        next_rotation_date: string;
        current_key_version: number;
      };
    },
  });

  // Migrate contacts batch
  const migrateContacts = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('batch_migrate_contacts_encryption', {
        batch_size: 100,
      });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['encryption-stats'] });
      toast.success('Contacts encrypted successfully', {
        description: `Migrated ${data.total_migrated} records. ${data.completion_percentage}% complete.`,
      });
    },
    onError: (error: any) => {
      toast.error('Migration failed', {
        description: error.message,
      });
    },
  });

  // Migrate companies batch
  const migrateCompanies = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('batch_migrate_companies_encryption', {
        _batch_size: 100,
      });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['encryption-stats'] });
      toast.success('Companies encrypted successfully', {
        description: `Migrated ${data.total_migrated} records. ${data.completion_percentage}% complete.`,
      });
    },
    onError: (error: any) => {
      toast.error('Migration failed', {
        description: error.message,
      });
    },
  });

  // Schedule key rotation
  const scheduleRotation = useMutation({
    mutationFn: async (days: number) => {
      const { data, error } = await supabase.rpc('schedule_key_rotation', {
        _days_until_rotation: days,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      void queryClient.invalidateQueries({ queryKey: ['key-rotation-status'] });
      toast.success('Key rotation scheduled', {
        description: `Next rotation: ${new Date(data.next_rotation_date).toLocaleDateString()}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to schedule rotation', {
        description: error.message,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Encryption Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage PII encryption across your database
          </p>
        </div>
      </div>

      {/* Key Rotation Status */}
      {rotationStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Key Rotation Schedule
            </CardTitle>
            <CardDescription>
              Automatic encryption key rotation for enhanced security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Key Version</p>
                <p className="text-2xl font-bold">{rotationStatus.current_key_version}</p>
              </div>
              {rotationStatus.next_rotation_date && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Next Rotation</p>
                  <p className="text-lg font-semibold">
                    {new Date(rotationStatus.next_rotation_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rotationStatus.days_until_rotation} days remaining
                  </p>
                </div>
              )}
            </div>

            {rotationStatus.is_due && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Key rotation is overdue. Please schedule a new rotation immediately.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => scheduleRotation.mutate(90)}
                disabled={scheduleRotation.isPending}
              >
                Schedule 90-Day Rotation
              </Button>
              <Button
                variant="outline"
                onClick={() => scheduleRotation.mutate(180)}
                disabled={scheduleRotation.isPending}
              >
                Schedule 180-Day Rotation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encryption Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Encryption Progress</CardTitle>
          <CardDescription>
            Track PII encryption status across all tables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {statsLoading ? (
            <div className="space-y-4">
              <div className="h-20 bg-muted animate-pulse rounded" />
              <div className="h-20 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            stats?.map((stat) => (
              <div key={stat.table_name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold capitalize">{stat.table_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {stat.encrypted_records.toLocaleString()} of {stat.total_records.toLocaleString()} records encrypted
                    </p>
                  </div>
                  <Badge variant={stat.encryption_percentage >= 100 ? 'default' : 'secondary'}>
                    {stat.encryption_percentage}%
                  </Badge>
                </div>
                <Progress value={stat.encryption_percentage} />
                
                {stat.pending_records > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (stat.table_name === 'contacts') {
                        migrateContacts.mutate();
                      } else if (stat.table_name === 'companies') {
                        migrateCompanies.mutate();
                      }
                    }}
                    disabled={migrateContacts.isPending || migrateCompanies.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Encrypt {stat.pending_records} Pending Records
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          All new records are automatically encrypted. This dashboard helps migrate existing data.
        </AlertDescription>
      </Alert>
    </div>
  );
}
