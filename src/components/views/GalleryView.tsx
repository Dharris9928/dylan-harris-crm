import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, TrendingUp } from 'lucide-react';

interface GalleryViewProps {
  data: any[];
  onSelectItem: (item: any) => void;
  cardSize?: 'small' | 'medium' | 'large';
  showFields?: string[];
}

export function GalleryView({ 
  data, 
  onSelectItem,
  cardSize = 'medium',
  showFields = ['lead_score', 'priority_tier', 'status', 'location']
}: GalleryViewProps) {
  const getPriorityVariant = (priority: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (priority) {
      case 'P1':
        return 'destructive';
      case 'P2':
        return 'default';
      case 'P3':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="grid gap-4" style={{
      gridTemplateColumns: `repeat(auto-fill, minmax(${
        cardSize === 'small' ? '12rem' : cardSize === 'medium' ? '16rem' : '20rem'
      }, 1fr))`
    }}>
      {data.map((item) => (
        <Card
          key={item.id}
          className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          onClick={() => onSelectItem(item)}
        >
          {/* Cover Image */}
          <div className="relative h-32 bg-gradient-to-br from-[hsl(var(--status-lead)/0.2)] to-[hsl(var(--status-engaged)/0.2)] rounded-t-lg overflow-hidden">
            {item.company_logo ? (
              <img
                src={item.company_logo}
                alt={item.company_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-[hsl(var(--status-lead)/0.5)]" />
              </div>
            )}
            
            {/* Score Badge Overlay */}
            {showFields.includes('lead_score') && (
              <div className="absolute top-2 right-2 bg-card rounded-full px-3 py-1 shadow-md border border-border">
                <span className="font-bold text-primary">{item.lead_score || 0}</span>
              </div>
            )}
          </div>

          <CardContent className="p-4 space-y-3">
            {/* Company Name */}
            <div>
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                {item.company_name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.industry_type} • {item.segment?.replace('_', ' ')}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {showFields.includes('priority_tier') && item.priority_tier && (
                <Badge variant={getPriorityVariant(item.priority_tier)}>
                  {item.priority_tier}
                </Badge>
              )}
              
              {showFields.includes('status') && (
                <Badge variant="outline">{item.status}</Badge>
              )}
            </div>

            {/* Location */}
            {showFields.includes('location') && (item.city || item.state) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {item.city && item.state ? `${item.city}, ${item.state}` : item.state}
                </span>
              </div>
            )}

            {/* Metrics */}
            {item.annual_volume && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {item.annual_volume.toLocaleString()} {item.industry_type === 'Builder' ? 'homes' : 'calls'}/yr
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
