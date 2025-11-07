import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, Eye, Edit, Upload } from 'lucide-react';
import { PresentationWebView } from '@/components/presentations/PresentationWebView';
import { PresentationTable } from '@/components/presentations/PresentationTable';
import { AISlideBuilder } from '@/components/presentations/AISlideBuilder';
import { PresentationAnalytics } from '@/components/presentations/PresentationAnalytics';
import { RichTextEditor } from '@/components/presentations/RichTextEditor';

export default function Presentation() {
  const navigate = useNavigate();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [outline, setOutline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any[]>([]);
  const [savedPresentationId, setSavedPresentationId] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState('');
  const [redesignInstruction, setRedesignInstruction] = useState('');
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [presentationTitle, setPresentationTitle] = useState('');

  if (!roleLoading && roleData?.role !== 'admin') {
    navigate('/');
    return null;
  }

  const handleGenerateSlides = async () => {
    if (!outline.trim()) {
      toast({
        title: 'Outline required',
        description: 'Please provide your presentation outline',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-presentation', {
        body: { outline },
      });

      if (error) throw error;

      setGeneratedSlides(data.slides);
      setConversation(data.conversation);
      
      toast({
        title: 'Presentation generated!',
        description: `Created ${data.slides.length} sections`,
      });
    } catch (error: any) {
      console.error('Generate error:', error);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadPresentation = async (presentationId: string) => {
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', presentationId)
        .single();

      if (error) throw error;

      const slides = (data.slides as any[]) || [];
      const aiConversation = (data.ai_conversation as any[]) || [];
      
      setGeneratedSlides(slides);
      setConversation(aiConversation);
      setSavedPresentationId(data.id);
      setPresentationTitle(data.title);
      
      const reconstructedOutline = slides
        .map((s: any) => `# ${s.title}\n${s.content}`)
        .join('\n\n');
      setOutline(reconstructedOutline);

      const link = `${window.location.origin}/present/${data.token}`;
      setShareableLink(link);

      setActiveTab('create');
      
      toast({
        title: 'Presentation loaded',
        description: 'You can now edit this presentation',
      });
    } catch (error: any) {
      console.error('Load error:', error);
      toast({
        title: 'Failed to load presentation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSavePresentation = async () => {
    if (generatedSlides.length === 0) {
      toast({
        title: 'No content to save',
        description: 'Generate a presentation first',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (savedPresentationId) {
        // Update existing presentation
        const { error } = await supabase
          .from('presentations')
          .update({
            title: presentationTitle || 'Presentation ' + new Date().toLocaleDateString(),
            slides: generatedSlides,
            ai_conversation: conversation,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savedPresentationId);

        if (error) throw error;

        toast({
          title: 'Presentation updated!',
          description: 'Your changes have been saved',
        });
      } else {
        // Create new presentation
        const title = presentationTitle || 'Presentation ' + new Date().toLocaleDateString();
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);

        const { data, error } = await supabase
          .from('presentations')
          .insert({
            title,
            slides: generatedSlides,
            ai_conversation: conversation,
            token,
            token_expires_at: expiresAt.toISOString(),
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        setSavedPresentationId(data.id);
        setPresentationTitle(data.title);
        const link = `${window.location.origin}/present/${token}`;
        setShareableLink(link);

        toast({
          title: 'Presentation saved!',
          description: 'Shareable link generated (expires in 14 days)',
        });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStartNewPresentation = () => {
    setOutline('');
    setGeneratedSlides([]);
    setConversation([]);
    setSavedPresentationId(null);
    setShareableLink('');
    setPresentationTitle('');
    setRedesignInstruction('');
    
    toast({
      title: 'Ready for new presentation',
      description: 'All fields have been cleared',
    });
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPDF(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('parse-pdf-upload', {
        body: formData,
      });

      if (error) throw error;

      if (data?.text) {
        setOutline(data.text);
        toast({
          title: 'PDF uploaded successfully',
          description: `Extracted content from ${data.pageCount} pages`,
        });
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      toast({
        title: 'Failed to parse PDF',
        description: 'Please try again or enter content manually',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingPDF(false);
      event.target.value = '';
    }
  };

  const handleRedesign = async () => {
    if (!redesignInstruction.trim()) {
      toast({
        title: 'Instruction required',
        description: 'Please provide redesign instructions',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const fullPrompt = `${outline}\n\nREDESIGN INSTRUCTIONS:\n${redesignInstruction}`;
      
      const { data, error } = await supabase.functions.invoke('ai-generate-presentation', {
        body: { outline: fullPrompt },
      });

      if (error) throw error;

      setGeneratedSlides(data.slides);
      setConversation(data.conversation);
      setRedesignInstruction('');
      
      toast({
        title: 'Presentation redesigned!',
        description: `Regenerated ${data.slides.length} sections`,
      });
    } catch (error: any) {
      console.error('Redesign error:', error);
      toast({
        title: 'Redesign failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast({
      title: 'Link copied!',
      description: 'Shareable presentation link copied to clipboard',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-google">Presentation Manager</h1>
        <p className="text-muted-foreground">Create and manage AI-powered presentations with Google branding</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            {savedPresentationId && generatedSlides.length > 0 ? 'Edit Presentation' : 'Create New'}
          </TabsTrigger>
          <TabsTrigger value="manage">Manage Existing</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-google">
                    {savedPresentationId && generatedSlides.length > 0 ? 'Edit Presentation' : 'AI Presentation Generator'}
                  </CardTitle>
                  <CardDescription>
                    {savedPresentationId && generatedSlides.length > 0 
                      ? `Editing: ${presentationTitle}` 
                      : 'Enter your outline to create a scrollable webpage presentation'}
                  </CardDescription>
                </div>
                {savedPresentationId && generatedSlides.length > 0 && (
                  <Button variant="outline" onClick={handleStartNewPresentation}>
                    Start New Presentation
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedPresentationId && generatedSlides.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="presentation-title">Presentation Title</Label>
                  <Input
                    id="presentation-title"
                    value={presentationTitle}
                    onChange={(e) => setPresentationTitle(e.target.value)}
                    placeholder="Enter presentation title..."
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pdf-upload">Upload PDF (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    disabled={isUploadingPDF || isGenerating}
                    className="cursor-pointer"
                  />
                  {isUploadingPDF && (
                    <Button disabled size="icon" variant="outline">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outline">Presentation Outline</Label>
                <RichTextEditor
                  placeholder="Paste your presentation outline here..."
                  value={outline}
                  onChange={setOutline}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateSlides} 
                  disabled={isGenerating || !outline.trim()}
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Presentation
                </Button>

                {generatedSlides.length > 0 && (
                  <Button 
                    onClick={handleSavePresentation}
                    variant="secondary"
                  >
                    {savedPresentationId ? 'Update Presentation' : 'Save & Get Link'}
                  </Button>
                )}
              </div>

              {generatedSlides.length > 0 && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">Redesign Presentation</h3>
                  </div>
                  <RichTextEditor
                    placeholder="Enter instructions to redesign..."
                    value={redesignInstruction}
                    onChange={setRedesignInstruction}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleRedesign}
                    disabled={isGenerating || !redesignInstruction.trim()}
                    variant="outline"
                  >
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Redesign from Start
                  </Button>
                </div>
              )}

              {shareableLink && (
                <Card className="bg-muted">
                  <CardContent className="pt-6 space-y-2">
                    <p className="text-sm font-medium">Shareable Link (expires in 14 days):</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareableLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm bg-background border rounded-md"
                      />
                      <Button size="sm" variant="outline" onClick={copyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {generatedSlides.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview ({generatedSlides.length} sections)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-background max-h-[600px] overflow-y-auto">
                  <PresentationWebView 
                    sections={generatedSlides}
                    title="Preview"
                    showNavigation={false}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {savedPresentationId && (
            <AISlideBuilder 
              presentationId={savedPresentationId}
              onSlidesUpdated={setGeneratedSlides}
            />
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <PresentationTable onEditPresentation={handleLoadPresentation} />
          <PresentationAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
