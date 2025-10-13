import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Copy, Check } from 'lucide-react';
import { useMFAStatus } from '@/hooks/useMFAStatus';

interface MFAEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MFAEnrollmentDialog({ open, onOpenChange, onSuccess }: MFAEnrollmentDialogProps) {
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { updateMFAStatus } = useMFAStatus();

  const handleEnroll = async () => {
    try {
      setIsLoading(true);
      
      // Fetch existing factors first
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) {
        console.error('Error listing MFA factors:', factorsError);
      }
      const existingTotp = factorsData?.totp ?? [];

      // If there's already a verified TOTP factor, reuse it (no need to enroll another)
      const verified = existingTotp.find((f: any) => f.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setStep('verify');
        toast.message('Using your existing authenticator factor. Enter a code to verify.');
        return;
      }

      // Remove any stale/unverified factors to avoid name conflicts
      const unverified = existingTotp.filter((f: any) => f.status !== 'verified');
      for (const factor of unverified) {
        try {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        } catch (e) {
          console.error('Failed to unenroll existing factor:', e);
        }
      }
      
      // Enroll a new factor with a unique friendly name to avoid conflict
      const friendlyName = `Authenticator ${new Date().toISOString()}`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep('verify');
    } catch (error: any) {
      toast.error('Failed to start MFA enrollment', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);

      if (!factorId) throw new Error('Missing MFA factor. Please restart enrollment.');

      // Create challenge for this factor and use the returned challenge id
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;
      if (!challenge?.id) throw new Error('No challenge ID returned');

      // Verify code with the challenge id
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });

      if (verifyError) throw verifyError;

      // Update MFA status in database
      updateMFAStatus(true);

      toast.success('MFA enabled successfully');
      setVerifyCode('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Failed to verify MFA code', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            {step === 'enroll'
              ? 'Set up MFA to add an extra layer of security to your account'
              : 'Scan the QR code with your authenticator app and enter the verification code'}
          </DialogDescription>
        </DialogHeader>

        {step === 'enroll' ? (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                You'll need an authenticator app like Google Authenticator, Authy, or 1Password to continue.
              </AlertDescription>
            </Alert>
            <Button onClick={handleEnroll} disabled={isLoading} className="w-full">
              {isLoading ? 'Setting up...' : 'Continue'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="secret">Or enter this code manually:</Label>
                <div className="flex gap-2">
                  <Input
                    id="secret"
                    value={secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copySecret}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="verify-code">Enter verification code:</Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={isLoading || verifyCode.length !== 6}
                className="w-full"
              >
                {isLoading ? 'Verifying...' : 'Verify and Enable'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
