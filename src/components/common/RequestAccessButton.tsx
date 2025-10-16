import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRecordAccess } from '@/hooks/useRecordAccess';

interface RequestAccessButtonProps {
  tableName: 'companies' | 'contacts' | 'opportunities';
  recordId: string;
  recordName?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
}

export function RequestAccessButton({
  tableName,
  recordId,
  recordName,
  size = 'sm',
  variant = 'outline',
}: RequestAccessButtonProps) {
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState('');
  
  const { pendingRequest, requestAccess, isRequestingAccess } = useRecordAccess({
    tableName,
    recordId,
  });

  const handleSubmit = () => {
    requestAccess(justification, {
      onSuccess: () => {
        setOpen(false);
        setJustification('');
      },
    });
  };

  // If there's already a pending request, show that
  if (pendingRequest) {
    return (
      <Button size={size} variant="ghost" disabled>
        <Lock className="h-3 w-3 mr-1" />
        Access Requested
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant}>
          <Lock className="h-3 w-3 mr-1" />
          Request Access
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Access</DialogTitle>
          <DialogDescription>
            Request access to view full details for {recordName || 'this record'}.
            Your request will be reviewed by an admin or manager.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Explain why you need access to this record..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isRequestingAccess}>
            {isRequestingAccess && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
