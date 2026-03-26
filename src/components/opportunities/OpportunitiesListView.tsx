import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Building2, Calendar, DollarSign, User } from 'lucide-react';

interface OpportunitiesListViewProps {
  opportunities: any[];
  onSelectItem: (opportunity: any) => void;
}

const statusColors: Record<string, string> = {
  prospecting: 'bg-sky-100 text-sky-800 border border-sky-300',
  qualification: 'bg-amber-100 text-amber-800 border border-amber-300',
  proposal: 'bg-violet-100 text-violet-800 border border-violet-300',
  negotiation: 'bg-orange-100 text-orange-800 border border-orange-300',
  closed_won: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  closed_lost: 'bg-red-100 text-red-800 border border-red-300',
};

export function OpportunitiesListView({ opportunities, onSelectItem }: OpportunitiesListViewProps) {
  return (
    <div className="space-y-2">
      {opportunities.map(opp => (
        <div
          key={opp.id}
          className="border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors"
          onClick={() => onSelectItem(opp)}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-lg">{opp.opportunity_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span>{opp.companies?.company_name || 'No Company'}</span>
              </div>
            </div>
            <Badge className={statusColors[opp.stage]}>
              {opp.stage?.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            {opp.amount && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">${opp.amount.toLocaleString()}</span>
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
              <div className="text-sm text-muted-foreground">
                {opp.opportunity_products.length} product(s)
              </div>
            )}
          </div>
          
          {opp.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {opp.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
