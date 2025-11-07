import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Ban, Loader2, Edit } from 'lucide-react';
import { format } from 'date-fns';

interface PresentationTableProps {
  onEditPresentation: (presentationId: string) => void;
}

export function PresentationTable({ onEditPresentation }: PresentationTableProps) {
  const { toast } = useToast();
  const [presentations, setPresentations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresentations(data || []);
    } catch (error: any) {
      console.error('Load error:', error);
      toast({
        title: 'Failed to load presentations',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/present/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied!',
      description: 'Shareable presentation link copied to clipboard',
    });
  };

  const deactivatePresentation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('presentations')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Presentation deactivated',
        description: 'The shareable link is no longer valid',
      });

      loadPresentations();
    } catch (error: any) {
      toast({
        title: 'Deactivation failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatus = (presentation: any) => {
    if (!presentation.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    
    const expiresAt = new Date(presentation.token_expires_at);
    if (expiresAt < new Date()) return { label: 'Expired', variant: 'destructive' as const };
    
    return { label: 'Active', variant: 'default' as const };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-google">All Presentations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-google">Title</TableHead>
              <TableHead className="font-google">Created</TableHead>
              <TableHead className="font-google">Expires</TableHead>
              <TableHead className="font-google">Slides</TableHead>
              <TableHead className="font-google">Status</TableHead>
              <TableHead className="font-google">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presentations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground font-google">
                  No presentations yet. Create your first one!
                </TableCell>
              </TableRow>
            ) : (
              presentations.map((p) => {
                const status = getStatus(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium font-google">{p.title}</TableCell>
                    <TableCell className="font-google">
                      {format(new Date(p.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-google">
                      {format(new Date(p.token_expires_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-google">{p.slides?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="font-google">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditPresentation(p.id)}
                          disabled={!p.is_active}
                          className="font-google"
                          title="Edit presentation"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(p.token)}
                          disabled={!p.is_active}
                          className="font-google"
                          title="Copy shareable link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deactivatePresentation(p.id)}
                          disabled={!p.is_active}
                          className="font-google"
                          title="Deactivate presentation"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}