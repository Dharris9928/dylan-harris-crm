import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EnrichCompanyButtonProps {
  companyId: string;
  onComplete?: () => void;
}

export function EnrichCompanyButton({ companyId, onComplete }: EnrichCompanyButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const { toast } = useToast();

  const handleEnrich = async (deepEnrich: boolean = false) => {
    setEnriching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { companyId, deepEnrich }
      });

      if (error) throw error;

      toast({
        title: deepEnrich ? 'Deep Enrichment Complete' : 'Enrichment Complete',
        description: `${data.fieldsEnriched.length} fields updated using ${data.provider === 'lovable_ai' ? 'Gemini AI' : 'Claude AI'} (${data.confidence} confidence). Score recalculation triggered.`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company data',
        variant: 'destructive'
      });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={enriching}
        >
          <Sparkles className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
          {enriching ? 'Enriching...' : 'Enrich Data'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEnrich(false)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Standard Enrichment
          <span className="ml-2 text-xs text-muted-foreground">(Fast, Gemini AI)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEnrich(true)}>
          <Zap className="h-4 w-4 mr-2" />
          Deep Enrichment
          <span className="ml-2 text-xs text-muted-foreground">(Advanced, Claude AI)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
