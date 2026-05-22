import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, X, Download } from "lucide-react";

interface PoFileUploadProps {
  value?: string | null;
  onChange: (path: string | null) => void;
  quoteId?: string;
}

const BUCKET = "job-quote-pos";

export function PoFileUpload({ value, onChange, quoteId }: PoFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const folder = quoteId || "unassigned";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      onChange(path);
      toast({ title: "PO uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async () => {
    if (!value) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(value, 60);
    if (error) {
      toast({ title: "Could not open file", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleRemove = async () => {
    if (value) {
      await supabase.storage.from(BUCKET).remove([value]);
    }
    onChange(null);
  };

  const fileName = value?.split("/").pop() || "PO file";

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm flex-1 truncate">{fileName}</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleUpload}
            disabled={uploading}
            className="cursor-pointer"
          />
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}
    </div>
  );
}
