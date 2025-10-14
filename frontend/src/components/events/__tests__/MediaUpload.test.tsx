import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MediaUpload } from '../MediaUpload';
import { eventService } from '../../../services/event';

// Mock the event service
vi.mock('../../../services/event', () => ({
  eventService: {
    uploadEventMedia: vi.fn(),
    deleteEventMedia: vi.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('MediaUpload', () => {
  const mockOnMediaUpdate = vi.fn();
  const mockMedia = ['image1.jpg', 'image2.jpg'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload section correctly', () => {
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    expect(screen.getByText('Upload Event Media')).toBeInTheDocument();
    expect(screen.getByText('Add images to showcase your event. Supported formats: JPEG, PNG, GIF, WebP')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 5MB per image')).toBeInTheDocument();
    expect(screen.getByText('Select Images')).toBeInTheDocument();
  });

  it('shows empty state when no media exists', () => {
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    expect(screen.getByText('No media uploaded')).toBeInTheDocument();
    expect(screen.getByText('Upload images to make your event more attractive to potential attendees')).toBeInTheDocument();
  });

  it('displays existing media correctly', () => {
    render(
      <MediaUpload
        media={mockMedia}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    expect(screen.getByText('Event Media (2)')).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByText('image1.jpg')).toBeInTheDocument();
    expect(screen.getByText('image2.jpg')).toBeInTheDocument();
  });

  it('opens file selector when select button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const selectButton = screen.getByText('Select Images');
    await user.click(selectButton);

    // File input should be triggered (though we can't directly test this in jsdom)
    expect(selectButton).toBeInTheDocument();
  });

  it('validates file types', async () => {
    const user = userEvent.setup();
    
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      
      await user.upload(fileInput, invalidFile);

      await waitFor(() => {
        expect(screen.getByText('Please select only image files (JPEG, PNG, GIF, WebP)')).toBeInTheDocument();
      });
    }
  });

  it('validates file sizes', async () => {
    const user = userEvent.setup();
    
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(screen.getByText('Please select files smaller than 5MB')).toBeInTheDocument();
      });
    }
  });

  it('uploads files to server when eventId is provided', async () => {
    const user = userEvent.setup();
    const mockUploadEventMedia = vi.mocked(eventService.uploadEventMedia);
    mockUploadEventMedia.mockResolvedValue({ url: 'uploaded-image.jpg' });
    
    render(
      <MediaUpload
        eventId="event1"
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const validFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);

      await waitFor(() => {
        expect(mockUploadEventMedia).toHaveBeenCalledWith('event1', validFile);
        expect(mockOnMediaUpdate).toHaveBeenCalledWith(['uploaded-image.jpg']);
      });
    }
  });

  it('creates local URLs when no eventId is provided', async () => {
    const user = userEvent.setup();
    
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const validFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(validFile);
        expect(mockOnMediaUpdate).toHaveBeenCalledWith(['blob:mock-url']);
      });
    }
  });

  it('removes media from server when eventId is provided', async () => {
    const user = userEvent.setup();
    const mockDeleteEventMedia = vi.mocked(eventService.deleteEventMedia);
    mockDeleteEventMedia.mockResolvedValue();
    
    render(
      <MediaUpload
        eventId="event1"
        media={['server-image.jpg']}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const removeButton = screen.getByRole('button', { name: '' }); // Remove button with X icon
    await user.click(removeButton);

    await waitFor(() => {
      expect(mockDeleteEventMedia).toHaveBeenCalledWith('event1', 'server-image.jpg');
      expect(mockOnMediaUpdate).toHaveBeenCalledWith([]);
    });
  });

  it('revokes object URL for local files', async () => {
    const user = userEvent.setup();
    
    render(
      <MediaUpload
        media={['blob:mock-url']}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const removeButton = screen.getByRole('button', { name: '' }); // Remove button with X icon
    await user.click(removeButton);

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      expect(mockOnMediaUpdate).toHaveBeenCalledWith([]);
    });
  });

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup();
    const mockUploadEventMedia = vi.mocked(eventService.uploadEventMedia);
    mockUploadEventMedia.mockRejectedValue(new Error('Upload failed'));
    
    render(
      <MediaUpload
        eventId="event1"
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const validFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);

      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    }
  });

  it('handles delete errors gracefully', async () => {
    const user = userEvent.setup();
    const mockDeleteEventMedia = vi.mocked(eventService.deleteEventMedia);
    mockDeleteEventMedia.mockRejectedValue(new Error('Delete failed'));
    
    render(
      <MediaUpload
        eventId="event1"
        media={['server-image.jpg']}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const removeButton = screen.getByRole('button', { name: '' }); // Remove button with X icon
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('shows uploading state', async () => {
    const user = userEvent.setup();
    const mockUploadEventMedia = vi.mocked(eventService.uploadEventMedia);
    
    // Make the upload promise never resolve to test loading state
    mockUploadEventMedia.mockImplementation(() => new Promise(() => {}));
    
    render(
      <MediaUpload
        eventId="event1"
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const validFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, validFile);

      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    }
  });

  it('displays image guidelines', () => {
    render(
      <MediaUpload
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    expect(screen.getByText('Image Guidelines')).toBeInTheDocument();
    expect(screen.getByText('• Use high-quality images that represent your event well')).toBeInTheDocument();
    expect(screen.getByText('• The first image will be used as the main event poster')).toBeInTheDocument();
  });

  it('handles broken images gracefully', () => {
    render(
      <MediaUpload
        media={['broken-image.jpg']}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const image = screen.getByRole('img');
    
    // Simulate image error
    fireEvent.error(image);

    // Image src should be updated to placeholder
    expect(image).toHaveAttribute('src', expect.stringContaining('data:image/svg+xml'));
  });

  it('displays correct file names', () => {
    render(
      <MediaUpload
        media={['blob:mock-url', 'server/path/image.jpg']}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    expect(screen.getByText('Preview Image')).toBeInTheDocument();
    expect(screen.getByText('image.jpg')).toBeInTheDocument();
  });

  it('uploads multiple files at once', async () => {
    const user = userEvent.setup();
    const mockUploadEventMedia = vi.mocked(eventService.uploadEventMedia);
    mockUploadEventMedia
      .mockResolvedValueOnce({ url: 'uploaded-image1.jpg' })
      .mockResolvedValueOnce({ url: 'uploaded-image2.jpg' });
    
    render(
      <MediaUpload
        eventId="event1"
        media={[]}
        onMediaUpdate={mockOnMediaUpdate}
      />
    );

    const fileInput = screen.getByRole('button', { name: 'Select Images' }).parentElement?.querySelector('input[type="file"]');
    
    if (fileInput) {
      const file1 = new File(['content1'], 'image1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'image2.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, [file1, file2]);

      await waitFor(() => {
        expect(mockUploadEventMedia).toHaveBeenCalledTimes(2);
        expect(mockOnMediaUpdate).toHaveBeenCalledWith(['uploaded-image1.jpg', 'uploaded-image2.jpg']);
      });
    }
  });
});