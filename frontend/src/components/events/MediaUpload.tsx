import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { eventService } from '../../services/event';

interface MediaUploadProps {
  eventId?: string;
  media: string[];
  onMediaUpdate: (media: string[]) => void;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  eventId,
  media,
  onMediaUpdate,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError('Please select only image files (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError('Please select files smaller than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = files.map(async (file) => {
        if (eventId) {
          // If event exists, upload to server
          const response = await eventService.uploadEventMedia(eventId, file);
          return response.url;
        } else {
          // If event doesn't exist yet, create local URL for preview
          return URL.createObjectURL(file);
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const updatedMedia = [...media, ...uploadedUrls];
      onMediaUpdate(updatedMedia);
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = async (mediaUrl: string) => {
    try {
      if (eventId && !mediaUrl.startsWith('blob:')) {
        // Remove from server if it's a real uploaded file
        await eventService.deleteEventMedia(eventId, mediaUrl);
      } else if (mediaUrl.startsWith('blob:')) {
        // Revoke object URL for local files
        URL.revokeObjectURL(mediaUrl);
      }

      const updatedMedia = media.filter(url => url !== mediaUrl);
      onMediaUpdate(updatedMedia);
    } catch (err: any) {
      setError(err.message || 'Failed to remove media');
    }
  };

  const getFileName = (url: string) => {
    if (url.startsWith('blob:')) {
      return 'Preview Image';
    }
    return url.split('/').pop() || 'Image';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-gray-400">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="w-full h-full"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Upload Event Media</h3>
                  <p className="text-gray-500 mt-1">
                    Add images to showcase your event. Supported formats: JPEG, PNG, GIF, WebP
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Maximum file size: 5MB per image
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleFileSelect}
                  disabled={uploading}
                  className="mx-auto"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Select Images'
                  )}
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Media Gallery */}
      {media.length === 0 ? (
        <EmptyState
          title="No media uploaded"
          description="Upload images to make your event more attractive to potential attendees"
          action={
            <Button onClick={handleFileSelect} disabled={uploading}>
              Upload Images
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Event Media ({media.length})</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((mediaUrl, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="relative">
                  <img
                    src={mediaUrl}
                    alt={`Event media ${index + 1}`}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      // Handle broken images
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  
                  <div className="absolute top-2 right-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveMedia(mediaUrl)}
                      className="bg-white/90 hover:bg-white text-red-600 hover:text-red-700"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
                
                <CardContent className="p-3">
                  <p className="text-sm text-gray-600 truncate">
                    {getFileName(mediaUrl)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-900 mb-2">Image Guidelines</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Use high-quality images that represent your event well</li>
            <li>• The first image will be used as the main event poster</li>
            <li>• Recommended aspect ratio: 16:9 or 4:3 for best display</li>
            <li>• Include images of the venue, performers, or event highlights</li>
            <li>• Avoid images with excessive text or watermarks</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};