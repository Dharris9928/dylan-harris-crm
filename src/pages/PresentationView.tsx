import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PresentationWebView } from '@/components/presentations/PresentationWebView';
import { Card } from '@/components/ui/card';

export default function PresentationView() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [presentation, setPresentation] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      setError('No token provided');
      setIsLoading(false);
      return;
    }

    validateAndLoadPresentation();
  }, [token]);

  // Track duration on unmount
  useEffect(() => {
    if (!presentation) return;

    const startTime = Date.now();

    return () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      // Log duration
      void supabase.rpc('log_presentation_access', {
        _presentation_id: presentation.id,
        _ip_address: 'tracked',
        _user_agent: navigator.userAgent,
        _duration_seconds: duration,
      });
    };
  }, [presentation]);

  const validateAndLoadPresentation = async () => {
    try {
      const { data, error: validateError } = await supabase.functions.invoke(
        'validate-presentation-token',
        { body: { token } }
      );

      if (validateError || !data?.valid) {
        setError('This presentation link is invalid or has expired');
        setIsLoading(false);
        return;
      }

      setPresentation(data.presentation);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Validation error:', err);
      setError('Failed to load presentation');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Presentation Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This presentation link is invalid or has expired.'}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const sections = presentation.slides || [];

  return (
    <PresentationWebView
      sections={sections}
      title={presentation.title}
      onExit={() => navigate('/')}
      showNavigation={true}
    />
  );
}