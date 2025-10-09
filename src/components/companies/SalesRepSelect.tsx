import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface SalesRepSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function SalesRepSelect({ value, onValueChange, placeholder = "Select sales rep..." }: SalesRepSelectProps) {
  const { data: salesReps, isLoading } = useQuery({
    queryKey: ['sales-reps-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_reps' as any)
        .select('id, first_name, last_name, active')
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-card z-[100]">
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {salesReps?.map((rep: any) => (
          <SelectItem key={rep.id} value={rep.id}>
            {rep.first_name} {rep.last_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
