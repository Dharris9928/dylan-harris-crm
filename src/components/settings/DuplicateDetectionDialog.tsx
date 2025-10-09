import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DuplicatePair {
  company1_id: string;
  company1_name: string;
  company1_created_by: string;
  company2_id: string;
  company2_name: string;
  company2_created_by: string;
  similarity_score: number;
  same_industry: boolean;
  same_state: boolean;
}

interface DuplicateDetectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateDetectionDialog({
  open,
  onOpenChange,
}: DuplicateDetectionDialogProps) {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { data: duplicates, isLoading, refetch } = useQuery({
    queryKey: ["duplicate-companies", similarityThreshold],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_duplicate_companies", {
        similarity_threshold: similarityThreshold,
        max_results: 100,
      });

      if (error) throw error;

      // Log this search
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("duplicate_search_logs").insert({
          user_id: userData.user.id,
          search_type: "companies",
          search_parameters: { similarity_threshold: similarityThreshold },
          results_found: data?.length || 0,
          action_taken: "viewed",
        });
      }

      return data as DuplicatePair[];
    },
    enabled: searchTriggered && open,
  });

  const handleSearch = () => {
    setSearchTriggered(true);
    refetch();
  };

  const handleMerge = async (company1Id: string, company2Id: string) => {
    // Navigate to merge dialog or open merge functionality
    toast.info("Merge functionality - navigate to Settings > Merge Companies");
    onOpenChange(false);
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return "bg-red-500";
    if (score >= 0.8) return "bg-orange-500";
    if (score >= 0.7) return "bg-yellow-500";
    return "bg-blue-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Duplicate Company Detection
          </DialogTitle>
          <DialogDescription>
            Find companies with similar names to keep your database clean. Uses fuzzy matching to detect potential duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Controls */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="threshold">
                Similarity Threshold: {(similarityThreshold * 100).toFixed(0)}%
              </Label>
              <Input
                id="threshold"
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Higher values = stricter matching (fewer results)
              </p>
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search for Duplicates"
              )}
            </Button>
          </div>

          {/* Results */}
          {searchTriggered && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : duplicates && duplicates.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Found {duplicates.length} potential duplicate pair(s)
                    </p>
                  </div>
                  {duplicates.map((pair, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getSimilarityColor(pair.similarity_score)}>
                              {(pair.similarity_score * 100).toFixed(0)}% Match
                            </Badge>
                            {pair.same_industry && (
                              <Badge variant="secondary">Same Industry</Badge>
                            )}
                            {pair.same_state && (
                              <Badge variant="secondary">Same State</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-foreground">
                                {pair.company1_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {pair.company1_id.slice(0, 8)}...
                              </p>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {pair.company2_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {pair.company2_id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMerge(pair.company1_id, pair.company2_id)}
                        >
                          Review / Merge
                        </Button>
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No duplicates found with current threshold.</p>
                  <p className="text-sm mt-1">Try lowering the similarity threshold.</p>
                </div>
              )}
            </div>
          )}

          {!searchTriggered && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Adjust the threshold and click "Search for Duplicates" to begin.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
