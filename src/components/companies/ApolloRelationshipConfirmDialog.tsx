import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Relationship {
  parent: {
    name: string;
    website?: string;
    linkedin?: string;
    exists: boolean;
    existingId?: string;
  } | null;
  subsidiaries: Array<{
    name: string;
    website?: string;
    linkedin?: string;
    exists: boolean;
    existingId?: string;
  }>;
}

interface ApolloRelationshipConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  relationships: Relationship;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApolloRelationshipConfirmDialog({
  open,
  onOpenChange,
  companyName,
  relationships,
  onConfirm,
  onCancel
}: ApolloRelationshipConfirmDialogProps) {
  const hasRelationships = relationships.parent || relationships.subsidiaries.length > 0;
  const newCompaniesCount = [
    relationships.parent && !relationships.parent.exists ? 1 : 0,
    ...relationships.subsidiaries.filter(s => !s.exists)
  ].reduce((a, b) => a + b, 0);

  if (!hasRelationships) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Relationships Detected
          </DialogTitle>
          <DialogDescription>
            Apollo found {relationships.parent ? 'a parent company' : ''} 
            {relationships.parent && relationships.subsidiaries.length > 0 ? ' and ' : ''}
            {relationships.subsidiaries.length > 0 ? `${relationships.subsidiaries.length} ${relationships.subsidiaries.length === 1 ? 'subsidiary' : 'subsidiaries'}` : ''} 
            {' '}for <strong>{companyName}</strong>.
            {newCompaniesCount > 0 && (
              <> <strong>{newCompaniesCount}</strong> new {newCompaniesCount === 1 ? 'company' : 'companies'} will be created.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {/* Parent Company */}
            {relationships.parent && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Parent Company</h4>
                  <Badge variant={relationships.parent.exists ? "secondary" : "default"}>
                    {relationships.parent.exists ? 'Will Link to Existing' : 'Will Create New'}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{relationships.parent.name}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {relationships.parent.website && (
                    <a 
                      href={relationships.parent.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Website
                    </a>
                  )}
                  {relationships.parent.linkedin && (
                    <a 
                      href={relationships.parent.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                      LinkedIn
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {companyName} will be marked as a <strong>subsidiary</strong> of this company.
                </p>
              </div>
            )}

            {/* Subsidiaries */}
            {relationships.subsidiaries.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  {relationships.subsidiaries.length === 1 ? 'Subsidiary' : 'Subsidiaries'}
                </h4>
                {relationships.subsidiaries.map((subsidiary, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{subsidiary.name}</p>
                      <Badge variant={subsidiary.exists ? "secondary" : "default"} className="text-xs">
                        {subsidiary.exists ? 'Will Link to Existing' : 'Will Create New'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {subsidiary.website && (
                        <a 
                          href={subsidiary.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Website
                        </a>
                      )}
                      {subsidiary.linkedin && (
                        <a 
                          href={subsidiary.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will be linked as a <strong>subsidiary</strong> of {companyName}.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm & Create Relationships
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
