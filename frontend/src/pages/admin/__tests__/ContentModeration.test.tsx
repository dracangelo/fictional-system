import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ContentModeration } from '../ContentModeration';
import { adminService } from '../../../services';
import type { ContentModerationItem } from '../../../types';

// Mock the admin service
vi.mock('../../../services', () => ({
  adminService: {
    getContentModerationQueue: vi.fn(),
    moderateContent: vi.fn(),
  },
}));

const mockContentItems: ContentModerationItem[] = [
  {
    id: '1',
    type: 'event',
    title: 'Summer Music Festival',
    description: 'A great outdoor music festival featuring local and international artists.',
    owner: {
      id: 'owner1',
      name: 'John Organizer',
      email: 'john@events.com',
    },
    status: 'pending',
    submittedAt: '2024-01-15T10:30:00Z',
    media: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  },
  {
    id: '2',
    type: 'movie',
    title: 'Independent Film',
    description: 'A thought-provoking independent film about modern society.',
    owner: {
      id: 'owner2',
      name: 'Jane Director',
      email: 'jane@films.com',
    },
    status: 'approved',
    submittedAt: '2024-01-10T09:15:00Z',
    reviewedAt: '2024-01-12T14:20:00Z',
    reviewedBy: 'Admin User',
    media: [],
  },
  {
    id: '3',
    type: 'event',
    title: 'Rejected Event',
    description: 'This event was rejected for policy violations.',
    owner: {
      id: 'owner3',
      name: 'Bad Actor',
      email: 'bad@example.com',
    },
    status: 'rejected',
    submittedAt: '2024-01-08T16:45:00Z',
    reviewedAt: '2024-01-09T10:30:00Z',
    reviewedBy: 'Admin User',
    rejectionReason: 'Content violates community guidelines',
    media: [],
  },
];

const mockContentResponse = {
  items: mockContentItems,
  total: 3,
  page: 1,
  totalPages: 1,
};

describe('ContentModeration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getContentModerationQueue as any).mockResolvedValue(mockContentResponse);
  });

  it('renders content moderation interface', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Content Moderation')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('All Types')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pending')).toBeInTheDocument(); // Default filter
  });

  it('displays content items correctly', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
      expect(screen.getByText('Independent Film')).toBeInTheDocument();
      expect(screen.getByText('Rejected Event')).toBeInTheDocument();
    });

    // Check type badges
    expect(screen.getAllByText('event')).toHaveLength(2);
    expect(screen.getByText('movie')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();

    // Check owner information
    expect(screen.getByText('John Organizer (john@events.com)')).toBeInTheDocument();
    expect(screen.getByText('Jane Director (jane@films.com)')).toBeInTheDocument();
  });

  it('shows pending count in header', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('1 pending')).toBeInTheDocument();
    });
  });

  it('handles type filtering', async () => {
    render(<ContentModeration />);

    const typeSelect = screen.getByDisplayValue('All Types');
    await user.selectOptions(typeSelect, 'event');

    await waitFor(() => {
      expect(adminService.getContentModerationQueue).toHaveBeenCalledWith(
        'event',
        'pending',
        1,
        10
      );
    });
  });

  it('handles status filtering', async () => {
    render(<ContentModeration />);

    const statusSelect = screen.getByDisplayValue('Pending');
    await user.selectOptions(statusSelect, 'approved');

    await waitFor(() => {
      expect(adminService.getContentModerationQueue).toHaveBeenCalledWith(
        undefined,
        'approved',
        1,
        10
      );
    });
  });

  it('resets filters correctly', async () => {
    render(<ContentModeration />);

    const resetButton = screen.getByText('Reset Filters');
    await user.click(resetButton);

    await waitFor(() => {
      expect(adminService.getContentModerationQueue).toHaveBeenCalledWith(
        undefined,
        'pending',
        1,
        10
      );
    });
  });

  it('shows and hides content details', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    // Initially details should be hidden
    expect(screen.queryByText('Full Description')).not.toBeInTheDocument();

    // Click show details
    const showDetailsButton = screen.getAllByText('Show Details')[0];
    await user.click(showDetailsButton);

    expect(screen.getByText('Full Description')).toBeInTheDocument();
    expect(screen.getByText('Hide Details')).toBeInTheDocument();

    // Click hide details
    await user.click(screen.getByText('Hide Details'));
    expect(screen.queryByText('Full Description')).not.toBeInTheDocument();
  });

  it('displays media preview correctly', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    // Should show media thumbnails
    const mediaImages = screen.getAllByAltText(/Summer Music Festival media/);
    expect(mediaImages).toHaveLength(2);
  });

  it('handles content approval', async () => {
    (adminService.moderateContent as any).mockResolvedValue(undefined);
    
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    await user.click(approveButton);

    await waitFor(() => {
      expect(adminService.moderateContent).toHaveBeenCalledWith({
        itemId: '1',
        action: 'approve',
      });
    });
  });

  it('opens rejection modal and handles rejection', async () => {
    (adminService.moderateContent as any).mockResolvedValue(undefined);
    
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    // Click reject button
    const rejectButton = screen.getByText('Reject');
    await user.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByText('Reject Content')).toBeInTheDocument();
    });

    // Enter rejection reason
    const reasonTextarea = screen.getByPlaceholderText('Enter rejection reason...');
    await user.type(reasonTextarea, 'Content does not meet quality standards');

    // Confirm rejection
    const confirmButton = screen.getByRole('button', { name: 'Reject Content' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(adminService.moderateContent).toHaveBeenCalledWith({
        itemId: '1',
        action: 'reject',
        reason: 'Content does not meet quality standards',
      });
    });
  });

  it('prevents rejection without reason', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    // Click reject button
    const rejectButton = screen.getByText('Reject');
    await user.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByText('Reject Content')).toBeInTheDocument();
    });

    // Try to confirm without reason
    const confirmButton = screen.getByRole('button', { name: 'Reject Content' });
    expect(confirmButton).toBeDisabled();
  });

  it('displays rejection reason for rejected content', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Content violates community guidelines')).toBeInTheDocument();
    });
  });

  it('shows action buttons only for pending content', async () => {
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    // Pending content should have approve/reject buttons
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();

    // Approved/rejected content should not have action buttons
    const approveButtons = screen.getAllByText('Approve');
    const rejectButtons = screen.getAllByText('Reject');
    expect(approveButtons).toHaveLength(1); // Only for pending item
    expect(rejectButtons).toHaveLength(1); // Only for pending item
  });

  it('handles API errors gracefully', async () => {
    (adminService.getContentModerationQueue as any).mockRejectedValue(new Error('API Error'));
    
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load content moderation queue')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no content matches filters', async () => {
    const emptyResponse = {
      items: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    (adminService.getContentModerationQueue as any).mockResolvedValue(emptyResponse);

    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('No content to review')).toBeInTheDocument();
      expect(screen.getByText('All content has been reviewed')).toBeInTheDocument();
    });
  });

  it('handles moderation errors', async () => {
    (adminService.moderateContent as any).mockRejectedValue(new Error('Moderation failed'));
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Summer Music Festival')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    await user.click(approveButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to approve content');
    });

    alertSpy.mockRestore();
  });

  it('displays pagination when multiple pages exist', async () => {
    const multiPageResponse = {
      ...mockContentResponse,
      total: 25,
      totalPages: 3,
    };
    (adminService.getContentModerationQueue as any).mockResolvedValue(multiPageResponse);

    render(<ContentModeration />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 10 of 25 items')).toBeInTheDocument();
    });
  });
});