import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface AccessReview {
  id: string;
  user_id: string;
  reviewer_id: string;
  review_type: string;
  status: string;
  previous_role: string | null;
  new_role: string | null;
  access_expires_at: string | null;
  justification: string | null;
  reviewer_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  user_email?: string;
}

export function AccessReviewDashboard() {
  const [pendingReviews, setPendingReviews] = useState<AccessReview[]>([]);
  const [completedReviews, setCompletedReviews] = useState<AccessReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const loadReviews = async () => {
    try {
      const { data: pending, error: pendingError } = await supabase
        .from("access_reviews")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;

      const { data: completed, error: completedError } = await supabase
        .from("access_reviews")
        .select("*")
        .in("status", ["approved", "revoked", "modified"])
        .order("reviewed_at", { ascending: false })
        .limit(50);

      if (completedError) throw completedError;

      // Fetch user emails
      const userIds = [...(pending || []), ...(completed || [])].map(r => r.user_id);
      const { data: users } = await supabase.auth.admin.listUsers();
      
      const emailMap = new Map<string, string>();
      if (users?.users) {
        users.users.forEach((u: any) => {
          if (u.id && u.email) emailMap.set(u.id, u.email);
        });
      }

      const enrichPending = (pending || []).map(r => ({
        ...r,
        user_email: emailMap.get(r.user_id) || 'Unknown'
      }));

      const enrichCompleted = (completed || []).map(r => ({
        ...r,
        user_email: emailMap.get(r.user_id) || 'Unknown'
      }));

      setPendingReviews(enrichPending);
      setCompletedReviews(enrichCompleted);
    } catch (error: any) {
      toast({
        title: "Error loading reviews",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();

    const channel = supabase
      .channel("access_reviews_changes")
      .on("postgres_changes", 
        { event: "*", schema: "public", table: "access_reviews" },
        () => loadReviews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReview = async (reviewId: string, newStatus: "approved" | "revoked" | "modified") => {
    try {
      const notes = reviewNotes[reviewId] || "";
      
      const { error } = await supabase
        .from("access_reviews")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewer_notes: notes,
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast({
        title: "Review completed",
        description: `Access review ${newStatus}`,
      });

      loadReviews();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getReviewTypeBadge = (type: string) => {
    const badges = {
      quarterly: <Badge variant="outline">Quarterly Review</Badge>,
      role_change: <Badge variant="default">Role Change</Badge>,
      manager_review: <Badge variant="secondary">Manager Review</Badge>,
      recertification: <Badge className="bg-primary">Recertification</Badge>,
    };
    return badges[type as keyof typeof badges] || <Badge>{type}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>,
      approved: <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Approved</Badge>,
      revoked: <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Revoked</Badge>,
      modified: <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" />Modified</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  if (loading) {
    return <Card className="p-6">Loading access reviews...</Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Access Review & Certification</h3>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Reviews ({pendingReviews.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingReviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No pending reviews
            </p>
          ) : (
            pendingReviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{review.user_email}</p>
                      <div className="flex gap-2">
                        {getReviewTypeBadge(review.review_type)}
                        {getStatusBadge(review.status)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </p>
                  </div>

                  {review.justification && (
                    <div className="text-sm">
                      <p className="font-medium mb-1">Justification:</p>
                      <p className="text-muted-foreground">{review.justification}</p>
                    </div>
                  )}

                  {review.previous_role && review.new_role && (
                    <div className="text-sm">
                      <p className="font-medium">Role Change:</p>
                      <p className="text-muted-foreground">
                        {review.previous_role} → {review.new_role}
                      </p>
                    </div>
                  )}

                  {review.access_expires_at && (
                    <div className="text-sm">
                      <p className="font-medium">Expires:</p>
                      <p className="text-muted-foreground">
                        {format(new Date(review.access_expires_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Review Notes</label>
                    <Textarea
                      placeholder="Add notes about your decision..."
                      value={reviewNotes[review.id] || ""}
                      onChange={(e) =>
                        setReviewNotes({ ...reviewNotes, [review.id]: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleReview(review.id, "approved")}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReview(review.id, "modified")}
                    >
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReview(review.id, "revoked")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedReviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{review.user_email}</p>
                  <div className="flex gap-2">
                    {getReviewTypeBadge(review.review_type)}
                    {getStatusBadge(review.status)}
                  </div>
                  {review.reviewer_notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Notes: {review.reviewer_notes}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Reviewed: {format(new Date(review.reviewed_at!), "MMM d, yyyy")}</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
