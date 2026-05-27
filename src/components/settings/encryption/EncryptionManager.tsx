import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Key, AlertTriangle, CheckCircle, RefreshCw, Users, Building2 } from "lucide-react";
import { toast } from "sonner";

export function EncryptionManager() {
  const [isContactsMigrating, setIsContactsMigrating] = useState(false);
  const [isCompaniesMigrating, setIsCompaniesMigrating] = useState(false);
  const contactsToastId = useRef<string | number | null>(null);
  const companiesToastId = useRef<string | number | null>(null);
  const queryClient = useQueryClient();

  // Fetch contacts encryption status
  const { data: contactsStatus, isLoading: isLoadingContacts } = useQuery({
    queryKey: ['encryption-status-contacts'],
    queryFn: async () => {
      // Total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Remaining needing migration (align with server logic)
      const { count: remainingToMigrate } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .or([
          'encryption_version.is.null',
          'and(email.not.is.null,email.neq.,email_encrypted.is.null)',
          'and(phone.not.is.null,phone.neq.,phone_encrypted.is.null)',
          'and(mobile.not.is.null,mobile.neq.,mobile_encrypted.is.null)'
        ].join(','));

      // Current encryption config (may be absent)
      const { data: config } = await supabase
        .from('encryption_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      const total = totalContacts || 0;
      const remaining = remainingToMigrate || 0;
      const encrypted = Math.max(0, total - remaining);

      return {
        totalContacts: total,
        encryptedContacts: encrypted,
        encryptionConfig: config ?? null,
        encryptionPercentage: total > 0
          ? Math.round(((total - remaining) / total) * 100)
          : 0
      };
    },
    refetchInterval: isContactsMigrating ? 2000 : false
  });

  // Fetch companies encryption status
  const { data: companiesStatus, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['encryption-status-companies'],
    queryFn: async () => {
      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: remainingToMigrate } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .or([
          'encryption_version.is.null',
          'and(primary_email.not.is.null,primary_email.neq.,primary_email_encrypted.is.null)',
          'and(primary_phone.not.is.null,primary_phone.neq.,primary_phone_encrypted.is.null)'
        ].join(','));

      const { data: config } = await supabase
        .from('encryption_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      const total = totalCompanies || 0;
      const remaining = remainingToMigrate || 0;
      const encrypted = Math.max(0, total - remaining);

      return {
        totalCompanies: total,
        encryptedCompanies: encrypted,
        encryptionConfig: config ?? null,
        encryptionPercentage: total > 0
          ? Math.round(((total - remaining) / total) * 100)
          : 0
      };
    },
    refetchInterval: isCompaniesMigrating ? 2000 : false
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
  const migrateContactsMutation = useMutation({
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

        if (!contactsToastId.current) {
          contactsToastId.current = toast.loading('Encrypting contacts...');
        }

        if (result.total_migrated === 0) {
          toast.success('All contacts already encrypted', { id: contactsToastId.current || undefined });
          contactsToastId.current = null;
          setIsContactsMigrating(false);
        } else {
          toast.message(`Encrypted ${result.total_migrated} contacts (${result.completion_percentage}% complete)`, {
            id: contactsToastId.current || undefined,
            duration: 1200,
          });

          if (result.completion_percentage < 100) {
            setTimeout(() => migrateContactsMutation.mutate(100), 400);
          } else {
            setIsContactsMigrating(false);
            toast.success('Contact encryption completed!', { id: contactsToastId.current || undefined });
            contactsToastId.current = null;
          }
        }
      }

      void queryClient.invalidateQueries({ queryKey: ['encryption-status-contacts'] });
      void queryClient.invalidateQueries({ queryKey: ['encryption-audit-logs'] });
    },
    onError: (error: any) => {
      if (contactsToastId.current) {
        toast.error(error.message || 'Contact encryption failed', { id: contactsToastId.current as string });
        contactsToastId.current = null;
      } else {
        toast.error(error.message || 'Contact encryption failed');
      }
      setIsContactsMigrating(false);
    }
  });

  // Migrate companies mutation
  const migrateCompaniesMutation = useMutation({
    mutationFn: async (batchSize: number = 100) => {
      const { data, error } = await supabase.rpc('batch_migrate_companies_encryption', {
        _batch_size: batchSize
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const result = data[0];

        if (!companiesToastId.current) {
          companiesToastId.current = toast.loading('Encrypting companies...');
        }

        if (result.total_migrated === 0) {
          toast.success('All companies already encrypted', { id: companiesToastId.current || undefined });
          companiesToastId.current = null;
          setIsCompaniesMigrating(false);
        } else {
          toast.message(`Encrypted ${result.total_migrated} companies (${result.completion_percentage}% complete)`, {
            id: companiesToastId.current || undefined,
            duration: 1200,
          });

          if (result.completion_percentage < 100) {
            setTimeout(() => migrateCompaniesMutation.mutate(100), 400);
          } else {
            setIsCompaniesMigrating(false);
            toast.success('Company encryption completed!', { id: companiesToastId.current || undefined });
            companiesToastId.current = null;
          }
        }
      }

      void queryClient.invalidateQueries({ queryKey: ['encryption-status-companies'] });
      void queryClient.invalidateQueries({ queryKey: ['encryption-audit-logs'] });
    },
    onError: (error: any) => {
      if (companiesToastId.current) {
        toast.error(error.message || 'Company encryption failed', { id: companiesToastId.current as string });
        companiesToastId.current = null;
      } else {
        toast.error(error.message || 'Company encryption failed');
      }
      setIsCompaniesMigrating(false);
    }
  });

  const handleStartContactsMigration = () => {
    if (confirm('This will encrypt all contact emails and phone numbers. Continue?')) {
      setIsContactsMigrating(true);
      migrateContactsMutation.mutate(100);
    }
  };

  const handleStartCompaniesMigration = () => {
    if (confirm('This will encrypt all company primary emails and phones. Continue?')) {
      setIsCompaniesMigrating(true);
      migrateCompaniesMutation.mutate(100);
    }
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage === 100) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />Fully Encrypted</Badge>;
    } else if (percentage > 0) {
      return <Badge variant="secondary" className="gap-1"><RefreshCw className="h-3 w-3" />Partially Encrypted</Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Not Encrypted</Badge>;
    }
  };

  const overallPercentage = contactsStatus && companiesStatus
    ? Math.round(
        ((contactsStatus.encryptedContacts + companiesStatus.encryptedCompanies) / 
        (contactsStatus.totalContacts + companiesStatus.totalCompanies)) * 100
      )
    : 0;

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
          {getStatusBadge(overallPercentage)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Warning */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Enterprise-Grade Security:</strong> All sensitive data is encrypted at rest using AES-256 encryption. 
            Encryption keys are stored securely and never exposed in the database.
          </AlertDescription>
        </Alert>

        {/* Tabs for Contacts and Companies */}
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contacts
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
          </TabsList>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            {!isLoadingContacts && contactsStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{contactsStatus.totalContacts}</div>
                    <p className="text-sm text-muted-foreground">Total Contacts</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{contactsStatus.encryptedContacts}</div>
                    <p className="text-sm text-muted-foreground">Encrypted</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{contactsStatus.totalContacts - contactsStatus.encryptedContacts}</div>
                    <p className="text-sm text-muted-foreground">Unencrypted</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">{contactsStatus.encryptionPercentage}%</span>
                  </div>
                  <Progress value={contactsStatus.encryptionPercentage} className="h-2" />
                </div>

                {contactsStatus.encryptionConfig && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Encryption Key</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Version</p>
                        <p className="font-medium">{contactsStatus.encryptionConfig.key_version}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Rotated</p>
                        <p className="font-medium">
                          {new Date(contactsStatus.encryptionConfig.key_rotated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {contactsStatus.encryptionPercentage < 100 && (
                  <div className="space-y-4">
                    <Alert variant="default">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {contactsStatus.encryptedContacts === 0 
                          ? 'Contact emails and phones are not encrypted.'
                          : `${contactsStatus.totalContacts - contactsStatus.encryptedContacts} contacts need encryption.`
                        }
                      </AlertDescription>
                    </Alert>

                    <Button 
                      onClick={handleStartContactsMigration}
                      disabled={isContactsMigrating || migrateContactsMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {isContactsMigrating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Encrypting...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {contactsStatus.encryptedContacts === 0 ? 'Start Encryption' : 'Continue Encryption'}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {contactsStatus.encryptionPercentage === 100 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>All contacts encrypted.</strong> Emails and phones protected with AES-256.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  <strong>Encrypted fields:</strong> Email, Phone, Mobile
                </p>
              </div>
            )}

            {isLoadingContacts && (
              <div className="text-center py-8 text-muted-foreground">
                Loading contacts encryption status...
              </div>
            )}
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            {!isLoadingCompanies && companiesStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{companiesStatus.totalCompanies}</div>
                    <p className="text-sm text-muted-foreground">Total Companies</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{companiesStatus.encryptedCompanies}</div>
                    <p className="text-sm text-muted-foreground">Encrypted</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{companiesStatus.totalCompanies - companiesStatus.encryptedCompanies}</div>
                    <p className="text-sm text-muted-foreground">Unencrypted</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <span className="text-muted-foreground">{companiesStatus.encryptionPercentage}%</span>
                  </div>
                  <Progress value={companiesStatus.encryptionPercentage} className="h-2" />
                </div>

                {companiesStatus.encryptionConfig && (
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Encryption Key</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Version</p>
                        <p className="font-medium">{companiesStatus.encryptionConfig.key_version}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Rotated</p>
                        <p className="font-medium">
                          {new Date(companiesStatus.encryptionConfig.key_rotated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {companiesStatus.encryptionPercentage < 100 && (
                  <div className="space-y-4">
                    <Alert variant="default">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {companiesStatus.encryptedCompanies === 0 
                          ? 'Company emails and phones are not encrypted.'
                          : `${companiesStatus.totalCompanies - companiesStatus.encryptedCompanies} companies need encryption.`
                        }
                      </AlertDescription>
                    </Alert>

                    <Button 
                      onClick={handleStartCompaniesMigration}
                      disabled={isCompaniesMigrating || migrateCompaniesMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      {isCompaniesMigrating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Encrypting...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {companiesStatus.encryptedCompanies === 0 ? 'Start Encryption' : 'Continue Encryption'}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {companiesStatus.encryptionPercentage === 100 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>All companies encrypted.</strong> Primary emails and phones protected with AES-256.
                    </AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground">
                  <strong>Encrypted fields:</strong> Primary Email, Primary Phone
                </p>
              </div>
            )}

            {isLoadingCompanies && (
              <div className="text-center py-8 text-muted-foreground">
                Loading companies encryption status...
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent Audit Log */}
        {auditLogs && auditLogs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Recent Encryption Operations</h3>
            <div className="space-y-2">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <p className="font-medium">{log.operation_type} - {log.table_name}</p>
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

        {/* Technical Details */}
        <div className="pt-4 border-t">
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
            <div className="text-sm text-muted-foreground space-y-2 pl-4">
              <p>• <strong>Encryption:</strong> AES-256 (Advanced Encryption Standard)</p>
              <p>• <strong>Key Storage:</strong> Supabase Secrets (never in database)</p>
              <p>• <strong>Contacts:</strong> Email, Phone, Mobile</p>
              <p>• <strong>Companies:</strong> Primary Email, Primary Phone</p>
              <p>• <strong>Decryption:</strong> Transparent via decrypted views</p>
              <p>• <strong>Performance:</strong> Minimal impact (database-level)</p>
              <p>• <strong>Compliance:</strong> GDPR, CCPA, HIPAA-compatible</p>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
