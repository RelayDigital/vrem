'use client';

import { useState, useMemo } from 'react';
import { DeliveryMedia, MediaType } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Video, FileText, Plane, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Image from 'next/image';

interface DeliveryGalleryProps {
  media: DeliveryMedia[];
  token: string;
}

const MEDIA_TYPE_ICONS: Record<MediaType, React.ReactNode> = {
  [MediaType.PHOTO]: <Camera className="h-4 w-4" />,
  [MediaType.VIDEO]: <Video className="h-4 w-4" />,
  [MediaType.FLOORPLAN]: <FileText className="h-4 w-4" />,
  [MediaType.DOCUMENT]: <FileText className="h-4 w-4" />,
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  [MediaType.PHOTO]: 'Photos',
  [MediaType.VIDEO]: 'Videos',
  [MediaType.FLOORPLAN]: 'Floor Plans',
  [MediaType.DOCUMENT]: 'Documents',
};

function getMediaUrl(media: DeliveryMedia): string {
  if (media.cdnUrl) return media.cdnUrl;
  // Uploadcare CDN URL pattern
  return `https://ucarecdn.com/${media.key}/`;
}

function getThumbnailUrl(media: DeliveryMedia): string {
  const baseUrl = getMediaUrl(media);
  // For Uploadcare, add transformation parameters
  if (baseUrl.includes('ucarecdn.com')) {
    return `${baseUrl}-/preview/400x400/-/quality/smart/`;
  }
  return baseUrl;
}

export function DeliveryGallery({ media, token }: DeliveryGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<MediaType | 'ALL'>('ALL');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Get available media types
  const availableTypes = useMemo(() => {
    const types = new Set(media.map((m) => m.type));
    return Array.from(types) as MediaType[];
  }, [media]);

  // Filter media
  const filteredMedia = useMemo(() => {
    if (activeFilter === 'ALL') return media;
    return media.filter((m) => m.type === activeFilter);
  }, [media, activeFilter]);

  // Get counts by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: media.length };
    for (const m of media) {
      counts[m.type] = (counts[m.type] || 0) + 1;
    }
    return counts;
  }, [media]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : filteredMedia.length - 1));
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev < filteredMedia.length - 1 ? prev + 1 : 0));
  };

  const currentMedia = filteredMedia[lightboxIndex];

  if (media.length === 0) {
    return (
      <div className="text-center py-16">
        <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No media yet</h3>
        <p className="text-muted-foreground">Media will appear here once uploaded.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-6">
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as MediaType | 'ALL')}>
          <TabsList>
            <TabsTrigger value="ALL">
              All ({typeCounts.ALL})
            </TabsTrigger>
            {availableTypes.map((type) => (
              <TabsTrigger key={type} value={type} className="gap-1.5">
                {MEDIA_TYPE_ICONS[type]}
                {MEDIA_TYPE_LABELS[type]} ({typeCounts[type] || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredMedia.map((item, index) => (
          <button
            key={item.id}
            onClick={() => openLightbox(index)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all"
          >
            {item.type === MediaType.VIDEO ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Video className="h-12 w-12 text-muted-foreground" />
              </div>
            ) : item.type === MediaType.DOCUMENT || item.type === MediaType.FLOORPLAN ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted p-4">
                <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground text-center truncate max-w-full">
                  {item.filename}
                </span>
              </div>
            ) : (
              <Image
                src={getThumbnailUrl(item)}
                alt={item.filename}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
            {/* Overlay with type icon */}
            <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1 text-white text-xs flex items-center gap-1">
              {MEDIA_TYPE_ICONS[item.type]}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={closeLightbox}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation buttons */}
            {filteredMedia.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}

            {/* Media display */}
            {currentMedia && (
              <div className="relative w-full h-full flex items-center justify-center p-8">
                {currentMedia.type === MediaType.VIDEO ? (
                  <video
                    src={getMediaUrl(currentMedia)}
                    controls
                    className="max-w-full max-h-full"
                  />
                ) : currentMedia.type === MediaType.DOCUMENT || currentMedia.type === MediaType.FLOORPLAN ? (
                  <div className="text-center text-white">
                    <FileText className="h-24 w-24 mx-auto mb-4" />
                    <p className="text-lg mb-4">{currentMedia.filename}</p>
                    <Button
                      variant="outline"
                      className="text-white border-white hover:bg-white/20"
                      onClick={() => window.open(getMediaUrl(currentMedia), '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ) : (
                  <Image
                    src={getMediaUrl(currentMedia)}
                    alt={currentMedia.filename}
                    fill
                    className="object-contain"
                    sizes="95vw"
                  />
                )}
              </div>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {filteredMedia.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
