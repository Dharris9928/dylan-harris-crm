import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface DeletionRequest {
  id: string;
  requested_by: string;
  table_name: string;
  record_id: string;
  record_details: any;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  requester_name?: string;
}

export function DeletionApprovalPanel() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeletionRequests();

    // Real-time subscription for new deletion requests
    const channel = supabase
      .channel('deletion_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deletion_requests'
        },
        () => {
          fetchDeletionRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDeletionRequests = async () => {
    setLoading(true);
    try {
      const { data: requestsData, error } = await supabase
        .from('deletion_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get requester names
      const userIds = [...new Set(requestsData?.map(r => r.requested_by) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const profilesMap = (profilesData || []).reduce((acc, profile) => {
        acc[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';
        return acc;
      }, {} as Record<string, string>);

      const requestsWithNames = (requestsData || []).map(request => ({
        ...request,
        requester_name: profilesMap[request.requested_by],
        status: request.status as 'pending' | 'approved' | 'rejected'
      }));

      setRequests(requestsWithNames);
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      toast.error('Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId: string, approve: boolean) => {
    setProcessingId(requestId);
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Update the deletion request status
      const { error: updateError } = await supabase
        .from('deletion_requests')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, perform the actual deletion
      if (approve) {
        const { error: deleteError } = await supabase
          .from(request.table_name as any)
          .delete()
          .eq('id', request.record_id);

        if (deleteError) {
          // Rollback the approval if deletion fails
          await supabase
            .from('deletion_requests')
            .update({ status: 'pending' })
            .eq('id', requestId);
          throw deleteError;
        }
      }

      toast.success(approve ? 'Deletion approved and executed' : 'Deletion request rejected');
      fetchDeletionRequests();
    } catch (error: any) {
      console.error('Error processing deletion request:', error);
      toast.error(error.message || 'Failed to process deletion request');
    } finally {
      setProcessingId(null);
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const names: Record<string, string> = {
      companies: 'Company',
      contacts: 'Contact',
      outreach_activities: 'Activity',
      pilot_programs: 'Pilot Program',
      training_certifications: 'Training'
    };
    return names[tableName] || tableName;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'outline', icon: Clock },
      approved: { variant: 'default', icon: CheckCircle },
      rejected: { variant: 'destructive', icon: XCircle }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading deletion requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Pending Deletion Requests
          </CardTitle>
          <CardDescription>
            Review and approve or reject deletion requests from users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <Alert>
              <AlertDescription>No pending deletion requests</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge>{getTableDisplayName(request.table_name)}</Badge>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested by <strong>{request.requester_name}</strong> on{' '}
                        {format(new Date(request.created_at), 'PPp')}
                      </p>
                      {request.reason && (
                        <p className="text-sm">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      {request.record_details && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View record details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(request.record_details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApproval(request.id, true)}
                        disabled={processingId === request.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleApproval(request.id, false)}
                        disabled={processingId === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request History */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Previously processed deletion requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.slice(0, 10).map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-3 space-y-2 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getTableDisplayName(request.table_name)}</Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'PP')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requested by {request.requester_name}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
