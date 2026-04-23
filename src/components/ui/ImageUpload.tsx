import { useRef, useState } from "react";
import { supabase } from "@/integrations/superbase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
}

export default function ImageUpload({ value, onChange, folder = "general", className = "" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("media")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(data.path);
    onChange(publicUrl);
    toast.success("Image uploaded");
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = async () => {
    onChange("");
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-input">
          <img src={value} alt="Uploaded" className="w-full max-h-52 object-cover" />
          <div className="absolute top-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-2.5 py-1 bg-black/60 rounded-full text-white text-xs font-medium hover:bg-black/80 transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-input rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
              <p className="text-xs">PNG, JPG, WebP — max 5MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
