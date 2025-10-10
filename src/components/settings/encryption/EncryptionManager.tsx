import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Key, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function EncryptionManager() {
  const [isMigrating, setIsMigrating] = useState(false);
  const toastId = useRef<string | number | null>(null);
  const queryClient = useQueryClient();

  // Fetch encryption status
  const { data: encryptionStatus, isLoading } = useQuery({
    queryKey: ['encryption-status'],
    queryFn: async () => {
      // Get total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Get encrypted contacts
      const { count: encryptedContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not('email_encrypted', 'is', null);

      // Get current encryption config
      const { data: config } = await supabase
        .from('encryption_config')
        .select('*')
        .eq('is_active', true)
        .single();

      return {
        totalContacts: totalContacts || 0,
        encryptedContacts: encryptedContacts || 0,
        encryptionConfig: config,
        encryptionPercentage: totalContacts 
          ? Math.round((encryptedContacts / totalContacts) * 100) 
          : 0
      };
    },
    refetchInterval: isMigrating ? 2000 : false // Poll while migrating
  });

  // Fetch recent audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['encryption-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('encryption_audit_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

// Migrate contacts mutation
const migrateMutation = useMutation({
  mutationFn: async (batchSize: number = 100) => {
    const { data, error } = await supabase.rpc('batch_migrate_contacts_encryption', {
      batch_size: batchSize
    });

    if (error) throw error;
    return data;
  },
  onSuccess: (data) => {
    if (data && data.length > 0) {
      const result = data[0];

      // Initialize a single updatable toast
      if (!toastId.current) {
        toastId.current = toast.loading('Encrypting contacts...');
      }

      if (result.total_migrated === 0) {
        toast.success('All contacts already encrypted', { id: toastId.current || undefined });
        toastId.current = null;
        setIsMigrating(false);
      } else {
        // Update the same toast instead of stacking
        toast.message(`Encrypted ${result.total_migrated} contacts (${result.completion_percentage}% complete)`, {
          id: toastId.current || undefined,
          duration: 1200,
        });

        // Continue migrating if not complete
        if (result.completion_percentage < 100) {
          setTimeout(() => migrateMutation.mutate(100), 400);
        } else {
          setIsMigrating(false);
          toast.success('Encryption migration completed!', { id: toastId.current || undefined });
          toastId.current = null;
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['encryption-status'] });
    queryClient.invalidateQueries({ queryKey: ['encryption-audit-logs'] });
  },
  onError: (error: any) => {
    if (toastId.current) {
      toast.error(error.message || 'Encryption migration failed', { id: toastId.current as string });
      toastId.current = null;
    } else {
      toast.error(error.message || 'Encryption migration failed');
    }
    setIsMigrating(false);
  }
});

  const handleStartMigration = () => {
    if (confirm('This will encrypt all contact emails and phone numbers. This operation may take several minutes for large datasets. Continue?')) {
      setIsMigrating(true);
      migrateMutation.mutate(100);
    }
  };

  const getStatusBadge = () => {
    if (!encryptionStatus) return null;
    
    const { encryptionPercentage } = encryptionStatus;
    
    if (encryptionPercentage === 100) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Fully Encrypted</Badge>;
    } else if (encryptionPercentage > 0) {
      return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />Partially Encrypted</Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Not Encrypted</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Contact Data Encryption
            </CardTitle>
            <CardDescription>
              Database-level AES-256 encryption for emails and phone numbers
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Warning */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Enterprise-Grade Security:</strong> All contact emails and phone numbers are encrypted at rest using AES-256 encryption. 
            Encryption keys are stored securely in Supabase secrets and never exposed in the database.
          </AlertDescription>
        </Alert>

        {/* Encryption Status */}
        {!isLoading && encryptionStatus && (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{encryptionStatus.totalContacts}</div>
                  <p className="text-sm text-muted-foreground">Total Contacts</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{encryptionStatus.encryptedContacts}</div>
                  <p className="text-sm text-muted-foreground">Encrypted Contacts</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{encryptionStatus.totalContacts - encryptionStatus.encryptedContacts}</div>
                  <p className="text-sm text-muted-foreground">Unencrypted Contacts</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Encryption Progress</span>
                  <span className="text-muted-foreground">{encryptionStatus.encryptionPercentage}%</span>
                </div>
                <Progress value={encryptionStatus.encryptionPercentage} className="h-2" />
              </div>

              {/* Encryption Config */}
              {encryptionStatus.encryptionConfig && (
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Encryption Configuration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Key Version</p>
                      <p className="font-medium">{encryptionStatus.encryptionConfig.key_version}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Rotated</p>
                      <p className="font-medium">
                        {new Date(encryptionStatus.encryptionConfig.key_rotated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Migration Controls */}
              {encryptionStatus.encryptionPercentage < 100 && (
                <div className="space-y-4">
                  <Alert variant="default">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {encryptionStatus.encryptedContacts === 0 
                        ? 'Contact data is not encrypted. Run migration to encrypt all contact emails and phone numbers.'
                        : `${encryptionStatus.totalContacts - encryptionStatus.encryptedContacts} contacts remain unencrypted. Complete the migration to ensure full data protection.`
                      }
                    </AlertDescription>
                  </Alert>

                  <Button 
                    onClick={handleStartMigration}
                    disabled={isMigrating || migrateMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {isMigrating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Encrypting Contacts...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        {encryptionStatus.encryptedContacts === 0 ? 'Start Encryption' : 'Continue Encryption'}
                      </>
                    )}
                  </Button>
                </div>
              )}

              {encryptionStatus.encryptionPercentage === 100 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>All contact data is encrypted.</strong> All emails and phone numbers are protected with AES-256 encryption at rest.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Recent Audit Log */}
            {auditLogs && auditLogs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Recent Encryption Operations</h3>
                <div className="space-y-2">
                  {auditLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{log.operation_type}</p>
                        <p className="text-muted-foreground">
                          {log.record_count} records • {new Date(log.performed_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading encryption status...
          </div>
        )}

        {/* Technical Details */}
        <div className="pt-4 border-t">
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
            <div className="text-sm text-muted-foreground space-y-2 pl-4">
              <p>• <strong>Encryption Algorithm:</strong> AES-256 (Advanced Encryption Standard)</p>
              <p>• <strong>Key Storage:</strong> Supabase Secrets (never stored in database)</p>
              <p>• <strong>Encrypted Fields:</strong> Email, Phone, Mobile</p>
              <p>• <strong>Decryption:</strong> Transparent via contacts_decrypted view</p>
              <p>• <strong>Performance Impact:</strong> Minimal (uses database-level encryption)</p>
              <p>• <strong>Compliance:</strong> GDPR, CCPA, HIPAA-compatible</p>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
