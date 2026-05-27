import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, User, Calendar, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccessRequest {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  justification: string | null;
  status: string;
  requested_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export function AccessRequestsPanel() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch all pending requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['access-requests', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('record_access_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        // Merge profiles into requests
        return data.map(request => ({
          ...request,
          profiles: profiles?.find(p => p.id === request.user_id)
        })) as AccessRequest[];
      }

      return data as AccessRequest[];
    },
  });

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc('approve_access_request', {
        _request_id: requestId,
        _access_level: 'view_full'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast({
        title: 'Request approved',
        description: 'User has been granted access to the record.',
      });
      setSelectedRequest(null);
    },
    onError: (error) => {
      toast({
        title: 'Approval failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Deny request mutation
  const denyMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: string; notes: string }) => {
      const { error } = await supabase.rpc('deny_access_request', {
        _request_id: requestId,
        _review_notes: notes
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      toast({
        title: 'Request denied',
        description: 'User request has been denied.',
      });
      setSelectedRequest(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Denial failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getTableLabel = (tableName: string) => {
    switch (tableName) {
      case 'companies': return 'Company';
      case 'contacts': return 'Contact';
      case 'opportunities': return 'Opportunity';
      default: return tableName;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
          <CardDescription>Loading pending access requests...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Access Requests
          </CardTitle>
          <CardDescription>
            Review and approve user requests to access restricted records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!requests || requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No pending access requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {request.profiles?.first_name} {request.profiles?.last_name}
                          </span>
                          <Badge variant="secondary">
                            {getTableLabel(request.table_name)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                        </div>

                        {request.justification && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-3 w-3 mt-1 text-muted-foreground" />
                            <p className="text-muted-foreground italic">{request.justification}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                          disabled={denyMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deny dialog with notes */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Access Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for denying this request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Review Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Explain why this request was denied..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedRequest) {
                  denyMutation.mutate({
                    requestId: selectedRequest.id,
                    notes: reviewNotes
                  });
                }
              }}
              disabled={denyMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deny Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
