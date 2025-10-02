import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestDeletion } from "@/lib/deletion/requestDeletion";
import { toast } from "sonner";

interface DeleteRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tableName: 'companies' | 'contacts' | 'outreach_activities' | 'pilot_programs' | 'training_certifications';
  recordId: string;
  recordName: string;
  recordDetails?: any;
}

export function DeleteRecordDialog({
  open,
  onOpenChange,
  onSuccess,
  tableName,
  recordId,
  recordName,
  recordDetails
}: DeleteRecordDialogProps) {
  const [reason, setReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await requestDeletion(tableName, recordId, recordDetails, reason);
      
      if (result.immediate) {
        toast.success(`${recordName} deleted successfully`);
      } else {
        toast.success(
          `Deletion request submitted for ${recordName}. An admin will review your request.`,
          { duration: 5000 }
        );
      }
      
      onSuccess();
      onOpenChange(false);
      setReason("");
    } catch (error: any) {
      console.error('Error deleting record:', error);
      toast.error(error.message || 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  };

  const getTableDisplayName = () => {
    const names: Record<string, string> = {
      companies: 'company',
      contacts: 'contact',
      outreach_activities: 'activity',
      pilot_programs: 'pilot program',
      training_certifications: 'training record'
    };
    return names[tableName] || 'record';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {getTableDisplayName()}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{recordName}</strong>? 
              This action cannot be undone.
            </p>
            
            <div className="space-y-2 pt-2">
              <Label htmlFor="delete-reason">
                Reason for deletion (optional)
              </Label>
              <Textarea
                id="delete-reason"
                placeholder="Explain why this record should be deleted..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Note: If you're not an admin, this will create a deletion request that must be approved.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Processing..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
