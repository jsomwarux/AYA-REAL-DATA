import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RoomProgress, DriveFile, fetchDriveFiles } from "@/lib/api";
import {
  calculateRoomCompletion,
  BATHROOM_FIELDS,
  BEDROOM_FIELDS,
  isFieldComplete,
  formatFieldValue,
  getCompletionColor,
  getFloorFromRoom,
} from "./utils";

// Helper to get field value with case-insensitive lookup
function getFieldValue(room: RoomProgress, fieldName: string): any {
  // Try exact match first
  if (room[fieldName] !== undefined) {
    return room[fieldName];
  }

  // Try with different cases
  const lowerKey = fieldName.toLowerCase();
  for (const key of Object.keys(room)) {
    if (key.toLowerCase() === lowerKey) {
      return room[key];
    }
  }

  return undefined;
}
import {
  Bath,
  BedDouble,
  Building,
  CheckCircle2,
  Circle,
  MinusCircle,
  ExternalLink,
  Image,
  Video,
  Loader2,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomDetailModalProps {
  room: RoomProgress | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper to check if a file is an image
function isImageFile(file: DriveFile): boolean {
  return file.mimeType.startsWith('image/');
}

// Helper to check if a file is a video
function isVideoFile(file: DriveFile): boolean {
  return file.mimeType.startsWith('video/');
}

// Generate a thumbnail URL for any Drive file (images and videos)
function getDriveThumbnailUrl(file: DriveFile, size: 'thumb' | 'preview' = 'thumb'): string {
  const sz = size === 'thumb' ? 'w400' : 'w1200';
  return `https://drive.google.com/thumbnail?id=${file.id}&sz=${sz}`;
}

// Get video embed URL for playback
function getVideoEmbedUrl(file: DriveFile): string {
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

export function RoomDetailModal({ room, isOpen, onClose }: RoomDetailModalProps) {
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Fetch Drive files when modal opens with a room that has a drive folder URL
  useEffect(() => {
    if (!isOpen || !room) {
      setDriveFiles([]);
      setFilesError(null);
      setLightboxIndex(null);
      return;
    }

    const driveFolderUrl = room._driveFolderUrl as string | undefined;
    if (!driveFolderUrl) {
      setDriveFiles([]);
      return;
    }

    let cancelled = false;
    setIsLoadingFiles(true);
    setFilesError(null);

    fetchDriveFiles(driveFolderUrl)
      .then((data) => {
        if (!cancelled) {
          setDriveFiles(data.files);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch drive files:', err);
          setFilesError(err.message || 'Failed to load files');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingFiles(false);
        }
      });

    return () => { cancelled = true; };
  }, [isOpen, room]);

  // Separate images and videos
  const images = useMemo(() => driveFiles.filter(isImageFile), [driveFiles]);
  const videos = useMemo(() => driveFiles.filter(isVideoFile), [driveFiles]);
  const mediaFiles = useMemo(() => driveFiles.filter(f => isImageFile(f) || isVideoFile(f)), [driveFiles]);

  if (!room) return null;

  const completion = calculateRoomCompletion(room);
  const floor = getFloorFromRoom(room['ROOM #']);
  const driveFolderUrl = room._driveFolderUrl as string | undefined;

  // Get status icon for a field
  const getStatusIcon = (value: any, config: any) => {
    const status = isFieldComplete(value, config);
    if (status === 'na') {
      return <MinusCircle className="h-4 w-4 text-gray-400" />;
    }
    if (status === true) {
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  // Get display value for a field
  const getDisplayValue = (value: any, config: any) => {
    const status = isFieldComplete(value, config);
    if (status === 'na') {
      return 'N/A';
    }
    return formatFieldValue(value, config.type);
  };

  // Lightbox navigation
  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };
  const nextImage = () => {
    if (lightboxIndex !== null && lightboxIndex < mediaFiles.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-white/10">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Building className="h-6 w-6 text-teal-400" />
              <span>Room {room['ROOM #']}</span>
              <span className="text-sm font-normal text-muted-foreground">
                Floor {floor}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Overall Progress */}
          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-muted-foreground mb-1">Overall</p>
              <p className={cn("text-2xl font-bold", getCompletionColor(completion.overall.percentage))}>
                {completion.overall.percentage}%
              </p>
              <p className="text-xs text-muted-foreground">
                {completion.overall.completed}/{completion.overall.total} tasks
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-muted-foreground mb-1">Bathroom</p>
              <p className={cn("text-2xl font-bold", getCompletionColor(completion.bathroom.percentage))}>
                {completion.bathroom.percentage}%
              </p>
              <p className="text-xs text-muted-foreground">
                {completion.bathroom.completed}/{completion.bathroom.total} tasks
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-muted-foreground mb-1">Bedroom</p>
              <p className={cn("text-2xl font-bold", getCompletionColor(completion.bedroom.percentage))}>
                {completion.bedroom.percentage}%
              </p>
              <p className="text-xs text-muted-foreground">
                {completion.bedroom.completed}/{completion.bedroom.total} tasks
              </p>
            </div>
          </div>

          {/* Task Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Bathroom Tasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Bath className="h-5 w-5 text-blue-400" />
                <h3 className="font-medium text-white">Bathroom</h3>
                <span className={cn(
                  "ml-auto text-sm font-medium",
                  getCompletionColor(completion.bathroom.percentage)
                )}>
                  {completion.bathroom.percentage}%
                </span>
              </div>
              <Progress
                value={completion.bathroom.percentage}
                className="h-2 bg-white/10"
              />
              <div className="space-y-2">
                {Object.entries(BATHROOM_FIELDS).map(([fieldName, config]) => {
                  const value = getFieldValue(room, fieldName);
                  // Remove "Bathroom_" prefix for display
                  const displayName = fieldName.replace(/^Bathroom_/, '');
                  return (
                    <div
                      key={fieldName}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value, config)}
                        <span className="text-sm text-muted-foreground">{displayName}</span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {getDisplayValue(value, config)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bedroom Tasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <BedDouble className="h-5 w-5 text-purple-400" />
                <h3 className="font-medium text-white">Bedroom</h3>
                <span className={cn(
                  "ml-auto text-sm font-medium",
                  getCompletionColor(completion.bedroom.percentage)
                )}>
                  {completion.bedroom.percentage}%
                </span>
              </div>
              <Progress
                value={completion.bedroom.percentage}
                className="h-2 bg-white/10"
              />
              <div className="space-y-2">
                {Object.entries(BEDROOM_FIELDS).map(([fieldName, config]) => {
                  const value = getFieldValue(room, fieldName);
                  // Remove "Bedroom_" prefix for display
                  const displayName = fieldName.replace(/^Bedroom_/, '');
                  return (
                    <div
                      key={fieldName}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(value, config)}
                        <span className="text-sm text-muted-foreground">{displayName}</span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {getDisplayValue(value, config)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress Photos & Videos */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-teal-400" />
                <h3 className="font-medium text-white">Progress Media</h3>
                {mediaFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {images.length > 0 && `${images.length} photo${images.length !== 1 ? 's' : ''}`}
                    {images.length > 0 && videos.length > 0 && ', '}
                    {videos.length > 0 && `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Open in Drive
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!driveFolderUrl ? (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 border-dashed">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Image className="h-5 w-5" />
                  <span className="text-sm">
                    No Google Drive folder linked for this room
                  </span>
                </div>
              </div>
            ) : isLoadingFiles ? (
              <div className="p-8 rounded-lg bg-white/5 border border-white/10">
                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Loading progress media...</span>
                </div>
              </div>
            ) : filesError ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-center gap-3 text-red-400">
                  <span className="text-sm">Failed to load files: {filesError}</span>
                </div>
              </div>
            ) : mediaFiles.length === 0 ? (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 border-dashed">
                <div className="flex items-center justify-center gap-3 text-muted-foreground">
                  <Image className="h-5 w-5" />
                  <span className="text-sm">
                    No photos or videos found in this room's folder
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {mediaFiles.map((file, index) => (
                  <button
                    key={file.id}
                    onClick={() => openLightbox(index)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 hover:border-teal-500/50 transition-all hover:scale-[1.02]"
                  >
                    <img
                      src={getDriveThumbnailUrl(file, 'thumb')}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                      <div className="w-full p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] text-white truncate">{file.name}</p>
                      </div>
                    </div>
                    {isVideoFile(file) && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60">
                        <Video className="h-3.5 w-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIndex !== null && mediaFiles[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {lightboxIndex < mediaFiles.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Content */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isImageFile(mediaFiles[lightboxIndex]) ? (
              <img
                src={getDriveThumbnailUrl(mediaFiles[lightboxIndex], 'preview')}
                alt={mediaFiles[lightboxIndex].name}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            ) : (
              <iframe
                src={getVideoEmbedUrl(mediaFiles[lightboxIndex])}
                className="w-[80vw] h-[70vh] max-w-4xl rounded-lg border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            )}
            <div className="mt-3 text-center">
              <p className="text-sm text-white">{mediaFiles[lightboxIndex].name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {lightboxIndex + 1} of {mediaFiles.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
