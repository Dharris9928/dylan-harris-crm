import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, User, Users, Globe } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

export type Perspective = 'my_records' | 'assigned_to_me' | 'my_team' | 'all_records';

interface PerspectiveSelectorProps {
  value: Perspective;
  onChange: (value: Perspective) => void;
  className?: string;
}

export function PerspectiveSelector({ value, onChange, className }: PerspectiveSelectorProps) {
  const { data: userRoleData } = useUserRole();
  const hasElevatedAccess = userRoleData?.hasElevatedAccess || false;
  const role = userRoleData?.role;

  const perspectives = [
    {
      value: 'my_records' as Perspective,
      label: 'My Records',
      icon: User,
      description: 'Records created by me',
      available: true,
    },
    {
      value: 'assigned_to_me' as Perspective,
      label: 'Assigned to Me',
      icon: Eye,
      description: 'Records assigned to me',
      available: true,
    },
    {
      value: 'my_team' as Perspective,
      label: 'My Team',
      icon: Users,
      description: 'Records from my team',
      available: role === 'sales_manager',
    },
    {
      value: 'all_records' as Perspective,
      label: hasElevatedAccess ? 'All Records' : 'All Records (Limited)',
      icon: Globe,
      description: hasElevatedAccess 
        ? 'All records in the system' 
        : 'View all companies (limited details)',
      available: true, // Now available to everyone
    },
  ];

  const availablePerspectives = perspectives.filter(p => p.available);

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {perspectives.find(p => p.value === value)?.icon && (
                <span className="h-4 w-4">
                  {(() => {
                    const Icon = perspectives.find(p => p.value === value)?.icon;
                    return Icon ? <Icon className="h-4 w-4" /> : null;
                  })()}
                </span>
              )}
              <span>{perspectives.find(p => p.value === value)?.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border shadow-lg z-50">
          {availablePerspectives.map((perspective) => {
            const Icon = perspective.icon;
            return (
              <SelectItem 
                key={perspective.value} 
                value={perspective.value}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 py-1">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{perspective.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {perspective.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export function getPerspectiveFilterClause(
  perspective: Perspective,
  userId: string | undefined,
  hasElevatedAccess: boolean
): { field: string; value: string } | null {
  if (!userId) return null;

  switch (perspective) {
    case 'my_records':
      return { field: 'created_by', value: userId };
    case 'assigned_to_me':
      return { field: 'assigned_to', value: userId };
    case 'my_team':
      // For team view, we'll need to query based on team membership
      // For now, return null and handle in the query logic
      return null;
    case 'all_records':
      // All users can see all records now; field-level permissions control visibility
      return null;
    default:
      return { field: 'created_by', value: userId };
  }
}
