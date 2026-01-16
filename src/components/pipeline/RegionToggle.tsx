import { Button } from "@/components/ui/button";
import { Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { RegionFilter } from "@/lib/regions/regionConstants";

// Re-export for backwards compatibility
export type { RegionFilter };

interface RegionToggleProps {
  value: RegionFilter;
  onChange: (value: RegionFilter) => void;
}

export function RegionToggle({ value, onChange }: RegionToggleProps) {
  const options: { value: RegionFilter; label: string; color: string }[] = [
    { value: "all", label: "All", color: "" },
    { value: "west", label: "West", color: "bg-purple-500" },
    { value: "east", label: "East", color: "bg-blue-500" },
  ];

  return (
    <div className="flex items-center gap-1 border rounded-md p-1 bg-background">
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "ghost"}
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            value === option.value && option.value === "west" && "bg-purple-600 hover:bg-purple-700",
            value === option.value && option.value === "east" && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {option.value === "all" ? (
            <Globe className="h-3 w-3 mr-1" />
          ) : (
            <span
              className={cn(
                "w-2 h-2 rounded-full mr-1.5",
                option.color
              )}
            />
          )}
          {option.label}
        </Button>
      ))}
    </div>
  );
}
