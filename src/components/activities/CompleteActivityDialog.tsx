import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface Activity {
  id: string;
  activity_type: string;
  company_id: string;
  contact_id?: string | null;
  subject_line?: string | null;
  companies?: {
    company_name: string;
  };
}

interface CompleteActivityDialogProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type NextStepType = "none" | "handoff" | "meeting";

export function CompleteActivityDialog({ activity, open, onOpenChange, onComplete }: CompleteActivityDialogProps) {
  const [completedDate, setCompletedDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState<NextStepType>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Follow-up meeting fields
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpSubject, setFollowUpSubject] = useState("");
  const [followUpType, setFollowUpType] = useState<"Meeting" | "Demo" | "Phone Call">("Meeting");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!activity) return null;

  const handleSubmit = async () => {
    if (!completedDate) {
      toast({
        title: "Error",
        description: "Please enter the completion date",
        variant: "destructive",
      });
      return;
    }

    if (nextStep === "meeting" && !followUpDate) {
      toast({
        title: "Error",
        description: "Please enter the follow-up meeting date",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the current activity as completed
      const { error: updateError } = await supabase
        .from("outreach_activities")
        .update({
          completed_date: completedDate,
          outcome: "Completed",
          notes: notes ? `${activity.subject_line ? activity.subject_line + " - " : ""}${notes}` : activity.subject_line,
        })
        .eq("id", activity.id);

      if (updateError) throw updateError;

      // If scheduling a follow-up meeting
      if (nextStep === "meeting" && followUpDate) {
        const { data: userData } = await supabase.auth.getUser();
        
        // Map the display type to the database enum value
        const activityTypeMap: Record<string, "Meeting" | "Demo" | "Phone"> = {
          "Meeting": "Meeting",
          "Demo": "Demo",
          "Phone Call": "Phone"
        };
        
        const dbActivityType = activityTypeMap[followUpType] || "Meeting";
        
        const { error: createError } = await supabase
          .from("outreach_activities")
          .insert({
            activity_type: dbActivityType,
            company_id: activity.company_id,
            contact_id: activity.contact_id,
            subject_line: followUpSubject || `Follow-up: ${activity.subject_line || activity.activity_type}`,
            scheduled_date: followUpDate,
            outcome: "Scheduled",
            notes: followUpNotes,
            created_by: userData.user?.id,
          });

        if (createError) throw createError;
      }

      // If handoff, trigger handoff flow (just mark in notes for now)
      if (nextStep === "handoff") {
        const { error: handoffError } = await supabase
          .from("outreach_activities")
          .update({
            notes: notes ? `${notes}\n\n[Ready for Handoff]` : "[Ready for Handoff]",
          })
          .eq("id", activity.id);

        if (handoffError) throw handoffError;
      }

      toast({
        title: "Activity Completed",
        description: nextStep === "meeting" 
          ? "Activity completed and follow-up meeting scheduled" 
          : nextStep === "handoff"
          ? "Activity completed and marked for handoff"
          : "Activity marked as completed",
      });

      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline-analytics"] });
      void queryClient.invalidateQueries({ queryKey: ["upcoming_meetings"] });
      void queryClient.invalidateQueries({ queryKey: ["meetings_conducted"] });

      // Reset form
      setCompletedDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setNotes("");
      setNextStep("none");
      setFollowUpDate("");
      setFollowUpSubject("");
      setFollowUpType("Meeting");
      setFollowUpNotes("");

      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing activity:", error);
      toast({
        title: "Error",
        description: "Failed to complete activity",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <DialogTitle>Complete Activity</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Activity Info */}
          <div className="bg-muted/30 p-3 rounded-md">
            <p className="text-sm text-muted-foreground">Completing</p>
            <p className="font-medium">{activity.activity_type} - {activity.companies?.company_name}</p>
            {activity.subject_line && (
              <p className="text-sm text-muted-foreground mt-1">{activity.subject_line}</p>
            )}
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label htmlFor="completed_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Completion Date *
            </Label>
            <Input
              id="completed_date"
              type="datetime-local"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Notes / Outcome</Label>
            <Textarea
              id="notes"
              placeholder="Summary of what was discussed, decisions made, action items..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Next Steps
            </Label>
            <RadioGroup value={nextStep} onValueChange={(val) => setNextStep(val as NextStepType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">No follow-up needed</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="meeting" id="meeting" />
                <Label htmlFor="meeting" className="font-normal cursor-pointer">Schedule follow-up meeting</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="handoff" id="handoff" />
                <Label htmlFor="handoff" className="font-normal cursor-pointer">Ready for handoff</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Follow-up Meeting Details */}
          {nextStep === "meeting" && (
            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
              <p className="text-sm font-medium">Follow-up Meeting Details</p>
              
              <div className="space-y-2">
                <Label htmlFor="followup_type">Meeting Type</Label>
                <Select value={followUpType} onValueChange={(val) => setFollowUpType(val as "Meeting" | "Demo" | "Phone Call")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Demo">Demo</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="followup_date">Scheduled Date *</Label>
                <Input
                  id="followup_date"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followup_subject">Subject</Label>
                <Input
                  id="followup_subject"
                  placeholder={`Follow-up: ${activity.subject_line || activity.activity_type}`}
                  value={followUpSubject}
                  onChange={(e) => setFollowUpSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followup_notes">Notes</Label>
                <Textarea
                  id="followup_notes"
                  placeholder="Topics to discuss, goals for the meeting..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Handoff info */}
          {nextStep === "handoff" && (
            <div className="p-4 border rounded-md bg-purple-50 dark:bg-purple-950/20">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                This activity will be marked as ready for handoff. Use the "Hand Off" action to assign it to a team member.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            {isSubmitting ? "Completing..." : "Complete Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
