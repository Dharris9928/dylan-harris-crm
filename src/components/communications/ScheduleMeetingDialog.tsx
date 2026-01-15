import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communication: {
    id: string;
    company_id: string;
    contact_id?: string | null;
    companies?: { company_name: string };
    contacts?: { first_name: string; last_name: string };
  };
  onSuccess: () => void;
}

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  communication,
  onSuccess,
}: ScheduleMeetingDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    meetingPlace: "virtual" as "virtual" | "in_person",
    scheduledDate: "",
    topics: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scheduledDate) {
      toast({
        title: "Error",
        description: "Please select a scheduled date and time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Create meeting activity in outreach_activities
      const { data: activity, error: activityError } = await supabase
        .from("outreach_activities")
        .insert({
          company_id: communication.company_id,
          activity_type: "Meeting",
          subject_line: `Meeting ${formData.meetingPlace === "virtual" ? "(Virtual)" : "(In Person)"}`,
          message_content: formData.topics || undefined,
          outcome: "Scheduled",
          scheduled_date: formData.scheduledDate,
          completed_date: new Date().toISOString().split("T")[0],
          notes: `Place: ${formData.meetingPlace === "virtual" ? "Virtual" : "In Person"}${formData.topics ? `\n\nTopics to discuss:\n${formData.topics}` : ""}`,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (activityError) throw activityError;

      // If there's a contact, link it to the activity
      if (communication.contact_id && activity) {
        await supabase
          .from("activity_contacts")
          .insert({
            activity_id: activity.id,
            contact_id: communication.contact_id,
          });
      }

      toast({
        title: "Meeting Scheduled",
        description: `Meeting scheduled for ${new Date(formData.scheduledDate).toLocaleString()}`,
      });

      // Reset form
      setFormData({
        meetingPlace: "virtual",
        scheduledDate: "",
        topics: "",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error scheduling meeting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule meeting",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company/Contact Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium">{communication.companies?.company_name}</p>
            {communication.contacts && (
              <p className="text-muted-foreground">
                {communication.contacts.first_name} {communication.contacts.last_name}
              </p>
            )}
          </div>

          {/* Meeting Place */}
          <div>
            <Label htmlFor="meetingPlace">Meeting Place *</Label>
            <Select
              value={formData.meetingPlace}
              onValueChange={(value: "virtual" | "in_person") =>
                setFormData((prev) => ({ ...prev, meetingPlace: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div>
            <Label htmlFor="scheduledDate">Date & Time Scheduled *</Label>
            <Input
              id="scheduledDate"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, scheduledDate: e.target.value }))
              }
              required
            />
          </div>

          {/* Topics to Discuss */}
          <div>
            <Label htmlFor="topics">Topics to Discuss</Label>
            <Textarea
              id="topics"
              value={formData.topics}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, topics: e.target.value }))
              }
              placeholder="Enter agenda items or topics to discuss..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
