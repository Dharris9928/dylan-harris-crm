import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

export function AutomationKillSwitch() {
  const { data: roleData } = useUserRole();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (roleData?.role !== "admin") return null;

  const handleDisable = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("disable_all_automation", {
      reason: reason || "Manual panic disable",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Failed to disable automation", { description: error.message });
      return;
    }
    toast.success(`Disabled ${data ?? 0} automation rule(s)`, {
      description: "All rules are now in dry_run and flagged for review.",
    });
    setOpen(false);
    setReason("");
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          Automation Kill Switch
        </CardTitle>
        <CardDescription>
          Immediately force every automation rule into dry-run mode. Use if a flow is misbehaving
          or sending unwanted notifications. Rules will need to be re-enabled individually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <ShieldAlert className="h-4 w-4 mr-2" />
          Disable All Automation
        </Button>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disable all automation rules?</AlertDialogTitle>
              <AlertDialogDescription>
                Every rule will be flipped to <strong>dry_run</strong> and flagged for review.
                Scheduled cron jobs will keep firing but will not write or send anything.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="kill-reason">Reason (logged to audit trail)</Label>
              <Textarea
                id="kill-reason"
                placeholder="e.g. Hot lead alerts firing on stale data"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDisable();
                }}
                disabled={submitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  "Disable All"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
