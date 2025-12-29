'use client';

import { useState } from 'react';
import { FileUploaderRegular } from '@uploadcare/react-uploader/next';
import '@uploadcare/react-uploader/core.css';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploaderProps {
  currentUrl?: string | null;
  fallback: string;
  onUpload: (url: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

export function AvatarUploader({
  currentUrl,
  fallback,
  onUpload,
  onRemove,
  size = 'md',
  className,
  disabled = false,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const handleUploadSuccess = async (info: any) => {
    if (!info?.allEntries) return;

    const successfulUpload = info.allEntries.find(
      (entry: any) => entry.status === 'success' && entry.cdnUrl
    );

    if (successfulUpload?.cdnUrl) {
      setIsUploading(true);
      try {
        await onUpload(successfulUpload.cdnUrl);
      } finally {
        setIsUploading(false);
        setShowUploader(false);
      }
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'border-2 border-border')}>
          <AvatarImage src={currentUrl || undefined} alt="Avatar" />
          <AvatarFallback className="text-xl font-semibold">
            {fallback}
          </AvatarFallback>
        </Avatar>

        {/* Overlay on hover */}
        {!disabled && (
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
              'flex items-center justify-center cursor-pointer'
            )}
            onClick={() => setShowUploader(true)}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowUploader(true)}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-1" />
          )}
          {currentUrl ? 'Change' : 'Upload'}
        </Button>

        {currentUrl && onRemove && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Hidden uploader that shows on click */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Photo</h3>
            <FileUploaderRegular
              pubkey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || 'dbf470d49c954f9f6143'}
              classNameUploader="uc-light uc-gray"
              sourceList="local, camera, url"
              userAgentIntegration="llm-nextjs"
              filesViewMode="list"
              useCloudImageEditor={true}
              multiple={false}
              accept="image/*"
              imgOnly={true}
              onChange={handleUploadSuccess}
            />
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploader(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
