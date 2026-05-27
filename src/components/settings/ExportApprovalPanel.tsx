import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileCheck, FileX, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function ExportApprovalPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reviewingRequest, setReviewingRequest] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['export-approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_approval_requests')
        .select(`
          *,
          profiles:requested_by (first_name, last_name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: 'approved' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('export_approval_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['export-approvals'] });
      toast({
        title: 'Request Reviewed',
        description: 'The export request has been reviewed.',
      });
      setReviewingRequest(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to review request. Please try again.',
        variant: 'destructive',
      });
      console.error('Error reviewing request:', error);
    },
  });

  const handleReview = (status: 'approved' | 'rejected') => {
    if (!reviewingRequest) return;
    reviewRequest.mutate({ requestId: reviewingRequest.id, status });
  };

  if (isLoading) {
    return <div>Loading approval requests...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Export Approvals</CardTitle>
          <CardDescription>
            Review and approve large data export requests from team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests && pendingRequests.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Requests expire after 24 hours
                </span>
              </div>
              {pendingRequests.map((request: any) => {
                const expiresIn = new Date(request.expires_at).getTime() - Date.now();
                const hoursRemaining = Math.floor(expiresIn / (1000 * 60 * 60));
                const isExpiringSoon = hoursRemaining < 6;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-sm font-medium">
                          {request.profiles?.first_name} {request.profiles?.last_name}
                        </p>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Expires in {hoursRemaining}h
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <strong>Table:</strong> {request.table_name} • 
                          <strong> Records:</strong> {request.record_count} • 
                          <strong> Format:</strong> {request.export_type}
                        </p>
                        <p>
                          <strong>Requested:</strong> {format(new Date(request.created_at), 'PPp')}
                        </p>
                        {request.business_justification && (
                          <p className="mt-2 text-sm">
                            <strong>Justification:</strong> {request.business_justification}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => setReviewingRequest(request)}
                      >
                        <FileCheck className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No pending approval requests</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reviewingRequest} onOpenChange={(open) => !open && setReviewingRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Export Request</DialogTitle>
            <DialogDescription>
              Approve or reject this export request with optional notes
            </DialogDescription>
          </DialogHeader>

          {reviewingRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
                <p>
                  <strong>Requested by:</strong>{' '}
                  {reviewingRequest.profiles?.first_name} {reviewingRequest.profiles?.last_name}
                </p>
                <p>
                  <strong>Table:</strong> {reviewingRequest.table_name}
                </p>
                <p>
                  <strong>Records:</strong> {reviewingRequest.record_count}
                </p>
                <p>
                  <strong>Format:</strong> {reviewingRequest.export_type}
                </p>
                {reviewingRequest.business_justification && (
                  <div className="pt-2 border-t">
                    <p className="font-medium mb-1">Business Justification:</p>
                    <p className="text-muted-foreground">
                      {reviewingRequest.business_justification}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes (Optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add any notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleReview('rejected')}
              disabled={reviewRequest.isPending}
            >
              <FileX className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleReview('approved')}
              disabled={reviewRequest.isPending}
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
