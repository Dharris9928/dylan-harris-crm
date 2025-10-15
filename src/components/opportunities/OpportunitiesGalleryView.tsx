import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Building2, Calendar, DollarSign, User } from 'lucide-react';

interface OpportunitiesGalleryViewProps {
  opportunities: any[];
  onSelectItem: (opportunity: any) => void;
}

const statusColors: Record<string, string> = {
  prospecting: 'bg-blue-500',
  qualification: 'bg-purple-500',
  proposal: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  closed_won: 'bg-green-500',
  closed_lost: 'bg-red-500',
};

export function OpportunitiesGalleryView({ opportunities, onSelectItem }: OpportunitiesGalleryViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {opportunities.map(opp => (
        <Card 
          key={opp.id} 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onSelectItem(opp)}
        >
          <CardHeader>
            <CardTitle className="text-lg">{opp.opportunity_name}</CardTitle>
            <Badge className={statusColors[opp.stage]}>
              {opp.stage?.replace('_', ' ').toUpperCase()}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{opp.companies?.company_name || 'No Company'}</span>
            </div>
            {opp.amount && (
              <div className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>${opp.amount.toLocaleString()}</span>
              </div>
            )}
            {opp.expected_close_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(opp.expected_close_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {opp.profiles && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{opp.profiles.first_name} {opp.profiles.last_name}</span>
              </div>
            )}
            {opp.opportunity_products?.length > 0 && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {opp.opportunity_products.length} product(s)
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
