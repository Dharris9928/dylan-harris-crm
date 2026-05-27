import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, FileWarning } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportApprovalRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  recordCount: number;
  exportType: string;
  filterCriteria?: any;
  onApprovalRequested: () => void;
}

export function ExportApprovalRequestDialog({
  open,
  onOpenChange,
  tableName,
  recordCount,
  exportType,
  filterCriteria,
  onApprovalRequested,
}: ExportApprovalRequestDialogProps) {
  const [justification, setJustification] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const requestApproval = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('export_approval_requests')
        .insert({
          requested_by: user.id,
          table_name: tableName,
          record_count: recordCount,
          export_type: exportType,
          filter_criteria: filterCriteria || null,
          business_justification: justification,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['export-approvals'] });
      toast({
        title: 'Approval Requested',
        description: 'Your export request has been submitted for admin review.',
      });
      onApprovalRequested();
      onOpenChange(false);
      setJustification('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to submit approval request. Please try again.',
        variant: 'destructive',
      });
      console.error('Error requesting approval:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!justification.trim()) {
      toast({
        title: 'Justification Required',
        description: 'Please provide a business justification for this export.',
        variant: 'destructive',
      });
      return;
    }
    requestApproval.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-amber-500" />
            <DialogTitle>Export Approval Required</DialogTitle>
          </div>
          <DialogDescription>
            This export exceeds your automatic approval threshold and requires admin review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Export Details:</strong>
              <ul className="mt-2 text-sm space-y-1">
                <li>• Table: <span className="font-medium">{tableName}</span></li>
                <li>• Records: <span className="font-medium">{recordCount}</span></li>
                <li>• Format: <span className="font-medium">{exportType}</span></li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 mt-4">
            <Label htmlFor="justification">
              Business Justification <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Explain why you need to export this data and how it will be used..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Your request will expire after 24 hours if not reviewed.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={requestApproval.isPending}>
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
