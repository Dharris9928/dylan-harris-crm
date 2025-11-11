import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserRole } from '@/hooks/useUserRole';
import { ApolloRelationshipConfirmDialog } from './ApolloRelationshipConfirmDialog';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const { toast } = useToast();
  const { data: userRole, isLoading: roleLoading } = useUserRole();
  
  const canEnrich = userRole?.hasElevatedAccess || false;
  const isDisabled = enriching || !canEnrich || roleLoading;

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
        setEnriching(false);
        return;
      }

      // Check if there are relationships to confirm
      const hasRelationships = data.relationships && 
        (data.relationships.parent || data.relationships.subsidiaries?.length > 0);

      if (hasRelationships) {
        // Show confirmation dialog
        setEnrichmentData(data);
        setShowConfirmDialog(true);
        setEnriching(false);
      } else {
        // No relationships, proceed directly
        await applyEnrichment(data);
      }
    } catch (error) {
      console.error('Apollo enrichment error:', error);
      toast({
        title: 'Enrichment Failed',
        description: error instanceof Error ? error.message : 'Failed to enrich company with Apollo data',
        variant: 'destructive'
      });
      setEnriching(false);
    }
  };

  const applyEnrichment = async (data: any) => {
    try {
      setEnriching(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update the main company
      const { error: updateError } = await supabase
        .from('companies')
        .update(data.companyUpdates)
        .eq('id', companyId);

      if (updateError) throw updateError;

      // Handle parent company relationship
      if (data.relationships?.parent) {
        const parent = data.relationships.parent;
        
        if (!parent.exists) {
          // Create new parent company
          const { data: newParent, error: createError } = await supabase
            .from('companies')
            .insert({
              company_name: parent.name,
              company_type: 'parent',
              is_parent_company: true,
              website_url: parent.website,
              linkedin_company_url: parent.linkedin,
              industry_type: data.companyUpdates.industry_type || 'Contractor',
              created_by: user.id
            })
            .select('id, company_name')
            .single();

          if (createError) throw createError;

          // Link to parent
          await supabase
            .from('companies')
            .update({
              parent_company_id: newParent.id,
              company_type: 'subsidiary'
            })
            .eq('id', companyId);

          // Create notification
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'parent_company_created',
            title: 'Parent Company Created',
            message: `A new parent company "${newParent.company_name}" was created and linked. Please review and update the profile.`,
            link_url: `/companies?search=${encodeURIComponent(newParent.company_name)}`,
            is_read: false
          });
        } else {
          // Link to existing parent
          await supabase
            .from('companies')
            .update({
              parent_company_id: parent.existingId,
              company_type: 'subsidiary'
            })
            .eq('id', companyId);
        }
      }

      // Handle subsidiaries
      if (data.relationships?.subsidiaries?.length > 0) {
        for (const subsidiary of data.relationships.subsidiaries) {
          if (!subsidiary.exists) {
            // Create new subsidiary
            const { data: newSub, error: createError } = await supabase
              .from('companies')
              .insert({
                company_name: subsidiary.name,
                company_type: 'subsidiary',
                parent_company_id: companyId,
                website_url: subsidiary.website,
                linkedin_company_url: subsidiary.linkedin,
                industry_type: data.companyUpdates.industry_type || 'Contractor',
                created_by: user.id
              })
              .select('id, company_name')
              .single();

            if (createError) {
              console.error('Error creating subsidiary:', createError);
              continue;
            }

            // Create notification
            await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'subsidiary_company_created',
              title: 'Subsidiary Company Created',
              message: `A new subsidiary "${newSub.company_name}" was created and linked. Please review and update the profile.`,
              link_url: `/companies?search=${encodeURIComponent(newSub.company_name)}`,
              is_read: false
            });
          } else {
            // Link existing subsidiary
            await supabase
              .from('companies')
              .update({
                parent_company_id: companyId,
                company_type: 'subsidiary'
              })
              .eq('id', subsidiary.existingId);
          }
        }

        // Mark main company as parent if it has subsidiaries
        await supabase
          .from('companies')
          .update({ is_parent_company: true })
          .eq('id', companyId);
      }

      const relationshipCount = 
        (data.relationships?.parent ? 1 : 0) + 
        (data.relationships?.subsidiaries?.length || 0);

      toast({
        title: 'Apollo Enrichment Complete',
        description: `${data.fieldsEnriched.length} business fields updated and ${relationshipCount} company ${relationshipCount === 1 ? 'relationship' : 'relationships'} established.`,
        duration: 6000,
      });
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error applying enrichment:', error);
      toast({
        title: 'Enrichment Failed',
        description: error instanceof Error ? error.message : 'Failed to apply enrichment',
        variant: 'destructive'
      });
    } finally {
      setEnriching(false);
      setShowConfirmDialog(false);
      setEnrichmentData(null);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnrich}
                disabled={isDisabled}
              >
                <Building2 className={`h-4 w-4 mr-2 ${enriching ? 'animate-pulse' : ''}`} />
                {enriching ? 'Enriching from Apollo...' : 'Enrich with Apollo'}
              </Button>
            </div>
          </TooltipTrigger>
          {!canEnrich && !roleLoading && (
            <TooltipContent>
              <p>Enrichment requires Admin or Sales Manager role</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {enrichmentData && (
        <ApolloRelationshipConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          companyName={companyName}
          relationships={enrichmentData.relationships}
          onConfirm={() => applyEnrichment(enrichmentData)}
          onCancel={() => {
            setShowConfirmDialog(false);
            setEnrichmentData(null);
            setEnriching(false);
          }}
        />
      )}
    </>
  );
}
