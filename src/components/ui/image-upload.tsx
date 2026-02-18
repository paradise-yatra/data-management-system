import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { packagesAPI } from '@/services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

interface ImageUploadProps {
    value: string[];
    onChange: (value: string[]) => void;
    maxFiles?: number;
    maxSize?: number; // in bytes
    disabled?: boolean;
    className?: string;
}

export function ImageUpload({
    value = [],
    onChange,
    maxFiles = 1,
    maxSize = 200 * 1024, // 200KB default
    disabled,
    className
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        if (value.length + files.length > maxFiles) {
            toast.error(`You can only upload a maximum of ${maxFiles} images`);
            return;
        }

        setUploading(true);
        const newUrls: string[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                if (file.size > maxSize) {
                    toast.error(`File ${file.name} is too large. Max size is ${Math.round(maxSize / 1024)}KB`);
                    continue;
                }

                const result = await packagesAPI.uploadImage(file);
                newUrls.push(result.url);
            }

            if (newUrls.length > 0) {
                onChange([...value, ...newUrls]);
                toast.success('Images uploaded successfully');
            }
        } catch (error) {
            toast.error('Failed to upload image');
            console.error(error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = (urlToRemove: string) => {
        onChange(value.filter((url) => url !== urlToRemove));
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleUpload(e.dataTransfer.files);
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex flex-wrap gap-4">
                {value.map((url) => (
                    <div key={url} className="relative w-[200px] h-[200px] rounded-md overflow-hidden border border-slate-200 group">
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleRemove(url)}
                                disabled={disabled}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <img
                            src={optimizeCloudinaryUrl(url, { width: 400 })}
                            alt="Uploaded"
                            className="object-cover w-full h-full"
                        />
                    </div>
                ))}
            </div>

            {value.length < maxFiles && (
                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "border-2 border-dashed rounded-lg p-8 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-500",
                        isDragging ? "border-primary bg-primary/5" : "border-slate-200",
                        disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                        uploading && "pointer-events-none opacity-50"
                    )}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        multiple={maxFiles > 1}
                        onChange={(e) => handleUpload(e.target.files)}
                        disabled={disabled || uploading}
                    />

                    {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                        <Upload className="h-8 w-8" />
                    )}

                    <div className="text-center">
                        <p className="text-sm font-medium">
                            {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Max size: {Math.round(maxSize / 1024)}KB • Max files: {maxFiles}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
