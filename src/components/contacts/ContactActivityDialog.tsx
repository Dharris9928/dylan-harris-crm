import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Linkedin, GraduationCap, Calendar, FileText, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ContactActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    first_name: string;
    last_name: string;
    title?: string | null;
    companies?: { company_name: string } | null;
  };
}

const activityTypeIcons: Record<string, React.ReactNode> = {
  Email: <Mail className="h-4 w-4" />,
  Phone: <Phone className="h-4 w-4" />,
  LinkedIn: <Linkedin className="h-4 w-4" />,
  Training: <GraduationCap className="h-4 w-4" />,
  Meeting: <Calendar className="h-4 w-4" />,
};

const outcomeColors: Record<string, string> = {
  Positive: "bg-green-500/15 text-green-700 dark:text-green-400",
  Neutral: "bg-muted text-muted-foreground",
  Negative: "bg-destructive/15 text-destructive",
  "No Answer": "bg-muted text-muted-foreground",
  "Left Voicemail": "bg-accent text-accent-foreground",
};

export function ContactActivityDialog({ open, onOpenChange, contact }: ContactActivityDialogProps) {
  // Fetch activities directly linked to this contact
  const { data: directActivities, isLoading: loadingDirect } = useQuery({
    queryKey: ["contact-activities-direct", contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_activities")
        .select("*, companies(company_name)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch activities linked via activity_contacts junction table
  const { data: junctionActivities, isLoading: loadingJunction } = useQuery({
    queryKey: ["contact-activities-junction", contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_contacts")
        .select("activity_id, outreach_activities(*, companies(company_name))")
        .eq("contact_id", contact.id);
      if (error) throw error;
      return data?.map((ac: any) => ac.outreach_activities).filter(Boolean) || [];
    },
    enabled: open,
  });

  // Fetch communications linked via communication_contacts junction table
  const { data: communications, isLoading: loadingComms } = useQuery({
    queryKey: ["contact-communications", contact.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_contacts")
        .select("communication_id, company_communications(*, companies(company_name))")
        .eq("contact_id", contact.id);
      if (error) throw error;
      return data?.map((cc: any) => cc.company_communications).filter(Boolean) || [];
    },
    enabled: open,
  });

  const isLoading = loadingDirect || loadingJunction || loadingComms;

  // Merge direct and junction activities, deduplicate by id
  const allActivities = (() => {
    const map = new Map<string, any>();
    (directActivities || []).forEach((a: any) => map.set(a.id, a));
    (junctionActivities || []).forEach((a: any) => { if (!map.has(a.id)) map.set(a.id, a); });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  })();

  const allCommunications = communications || [];
  const totalItems = allActivities.length + allCommunications.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {contact.first_name} {contact.last_name} — Activity History
          </DialogTitle>
          <DialogDescription>
            {contact.title && <span>{contact.title}</span>}
            {contact.title && contact.companies?.company_name && <span> at </span>}
            {contact.companies?.company_name && <span>{contact.companies.company_name}</span>}
            {!contact.title && !contact.companies?.company_name && <span>All activities and communications involving this contact</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading activities...</p>
          ) : totalItems === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activities found for this contact.</p>
          ) : (
            <div className="space-y-3">
              {/* Activities Section */}
              {allActivities.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Activities ({allActivities.length})
                  </h3>
                  {allActivities.map((activity: any) => (
                    <div key={activity.id} className="border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {activityTypeIcons[activity.activity_type] || <FileText className="h-4 w-4" />}
                          <span className="font-medium text-sm">{activity.activity_type}</span>
                          {activity.outcome && (
                            <Badge className={outcomeColors[activity.outcome] || "bg-muted"}>
                              {activity.outcome}
                            </Badge>
                          )}
                          {activity.status && (
                            <Badge variant="outline" className="text-xs">{activity.status}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {activity.completed_date
                            ? format(new Date(activity.completed_date), "MMM d, yyyy")
                            : activity.scheduled_date
                            ? format(new Date(activity.scheduled_date), "MMM d, yyyy") + " (scheduled)"
                            : activity.created_at
                            ? format(new Date(activity.created_at), "MMM d, yyyy")
                            : ""}
                        </span>
                      </div>
                      {activity.subject_line && (
                        <p className="text-sm font-medium">{activity.subject_line}</p>
                      )}
                      {activity.companies?.company_name && (
                        <p className="text-xs text-muted-foreground">Company: {activity.companies.company_name}</p>
                      )}
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{activity.notes}</p>
                      )}
                      {activity.next_action && (
                        <p className="text-xs text-primary">Next: {activity.next_action}</p>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Communications Section */}
              {allCommunications.length > 0 && (
                <>
                  {allActivities.length > 0 && <Separator className="my-4" />}
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Communications ({allCommunications.length})
                  </h3>
                  {allCommunications.map((comm: any) => (
                    <div key={comm.id} className="border border-border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          <span className="font-medium text-sm">{comm.communication_type || "Communication"}</span>
                          {comm.status && (
                            <Badge variant="outline" className="text-xs">{comm.status}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {comm.communication_date
                            ? format(new Date(comm.communication_date), "MMM d, yyyy")
                            : comm.created_at
                            ? format(new Date(comm.created_at), "MMM d, yyyy")
                            : ""}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium">{comm.subject}</p>
                      )}
                      {comm.companies?.company_name && (
                        <p className="text-xs text-muted-foreground">Company: {comm.companies.company_name}</p>
                      )}
                      {comm.content && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{comm.content}</p>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
