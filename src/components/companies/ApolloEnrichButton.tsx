import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApolloEnrichButtonProps {
  companyId: string;
  companyName: string;
  websiteUrl?: string;
  linkedinUrl?: string;
  onComplete?: () => void;
}

export function ApolloEnrichButton({ 
  companyId, 
  companyName, 
  websiteUrl, 
  linkedinUrl,
  onComplete 
}: ApolloEnrichButtonProps) {
  const [enriching, setEnriching] = useState(false);
  const { toast } = useToast();

  const handleEnrich = async () => {
    setEnriching(true);
    
    try {
      // Call Apollo enrichment function
      const { data, error } = await supabase.functions.invoke('apollo-enrich', {
        body: { 
          companyName,
          websiteUrl,
          linkedinUrl
        }
      });

      if (error) throw error;

      if (!data.found) {
        toast({
          title: 'Company Not Found',
          description: 'This company was not found in the Apollo database.',
          variant: 'destructive'
        });
        return;
      }

      // Update company with Apollo data
      const { error: updateError } = await supabase
        .from('companies')
        .update(data.companyUpdates)
        .eq('id', companyId);

      if (updateError) throw updateError;

      toast({
        title: 'Apollo Enrichment Complete',
        description: `${data.fieldsEnriched.length} business fields updated from Apollo database.`,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Apollo enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error.message || 'Failed to enrich company with Apollo data',
        variant: 'destructive'
      });
    } finally {
      setEnriching(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnrich}
      disabled={enriching}
    >
      <Building2 className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
      {enriching ? 'Enriching from Apollo...' : 'Enrich with Apollo'}
    </Button>
  );
}
