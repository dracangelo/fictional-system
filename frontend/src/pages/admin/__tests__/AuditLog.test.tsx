import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AuditLog } from '../AuditLog';
import { adminService } from '../../../services';
import type { AuditLogEntry } from '../../../types/admin';

// Mock the admin service
vi.mock('../../../services', () => ({
  adminService: {
    getAuditLogs: vi.fn(),
    exportData: vi.fn(),
  },
}));

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T10:30:00Z',
    userId: 'user1',
    userEmail: 'john.doe@example.com',
    action: 'CREATE',
    resource: 'event',
    resourceId: 'event123',
    details: { title: 'New Event', category: 'music' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  },
  {
    id: '2',
    timestamp: '2024-01-15T11:45:00Z',
    userId: 'admin1',
    userEmail: 'admin@example.com',
    action: 'DELETE',
    resource: 'user',
    resourceId: 'user456',
    details: { reason: 'Policy violation' },
    ipAddress: '10.0.0.1',
    userAgent: 'Mozilla/5.0...',
  },
  {
    id: '3',
    timestamp: '2024-01-15T14:20:00Z',
    userId: 'user2',
    userEmail: 'jane.smith@example.com',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: 'session789',
    details: {},
    ipAddress: '172.16.0.1',
    userAgent: 'Mozilla/5.0...',
  },
];

const mockAuditResponse = {
  logs: mockAuditLogs,
  total: 3,
  page: 1,
  totalPages: 1,
};

// Mock URL.createObjectURL and related methods
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL });
Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

// Mock document.createElement and related DOM methods
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateElement = vi.fn(() => ({
  click: mockClick,
  href: '',
  download: '',
}));

Object.defineProperty(document, 'createElement', { value: mockCreateElement });
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

describe('AuditLog', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    (adminService.getAuditLogs as any).mockResolvedValue(mockAuditResponse);
  });

  it('renders audit log interface', async () => {
    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
    });

    expect(screen.getByText('Track system actions and changes')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by user ID or email...')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
  });

  it('displays audit logs in table format', async () => {
    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    });

    // Check actions with proper badge colors
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('DELETE')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();

    // Check resources
    expect(screen.getByText('event')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('auth')).toBeInTheDocument();

    // Check IP addresses
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(screen.getByText('172.16.0.1')).toBeInTheDocument();
  });

  it('formats timestamps correctly', async () => {
    render(<AuditLog />);

    await waitFor(() => {
      // Check that dates are formatted (exact format may vary by locale)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });
  });

  it('formats details correctly', async () => {
    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText(/title: "New Event"/)).toBeInTheDocument();
      expect(screen.getByText(/reason: "Policy violation"/)).toBeInTheDocument();
      expect(screen.getByText('No additional details')).toBeInTheDocument();
    });
  });

  it('handles user ID search filtering', async () => {
    render(<AuditLog />);

    const searchInput = screen.getByPlaceholderText('Search by user ID or email...');
    await user.type(searchInput, 'user1');

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user1' }),
        1,
        50
      );
    });
  });

  it('handles action filtering', async () => {
    render(<AuditLog />);

    const actionSelect = screen.getByDisplayValue('All Actions');
    await user.selectOptions(actionSelect, 'CREATE');

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE' }),
        1,
        50
      );
    });
  });

  it('handles resource filtering', async () => {
    render(<AuditLog />);

    const resourceSelect = screen.getByDisplayValue('All Resources');
    await user.selectOptions(resourceSelect, 'event');

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'event' }),
        1,
        50
      );
    });
  });

  it('handles date range filtering', async () => {
    render(<AuditLog />);

    const startDateInput = screen.getAllByDisplayValue(/2024-/)[0]; // First date input
    const endDateInput = screen.getAllByDisplayValue(/2024-/)[1]; // Second date input

    await user.clear(startDateInput);
    await user.type(startDateInput, '2024-01-10');

    await user.clear(endDateInput);
    await user.type(endDateInput, '2024-01-20');

    await waitFor(() => {
      expect(adminService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: {
            start: '2024-01-10',
            end: '2024-01-20',
          },
        }),
        1,
        50
      );
    });
  });

  it('clears filters when clear button is clicked', async () => {
    render(<AuditLog />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Search by user ID or email...');
    await user.type(searchInput, 'test');

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
  });

  it('handles CSV export', async () => {
    const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
    (adminService.exportData as any).mockResolvedValue(mockBlob);

    render(<AuditLog />);

    const exportButton = screen.getByText('Export CSV');
    await user.click(exportButton);

    await waitFor(() => {
      expect(adminService.exportData).toHaveBeenCalledWith(
        'audit_logs',
        'csv',
        expect.any(Object)
      );
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('handles JSON export', async () => {
    const mockBlob = new Blob(['json data'], { type: 'application/json' });
    (adminService.exportData as any).mockResolvedValue(mockBlob);

    render(<AuditLog />);

    const exportButton = screen.getByText('Export JSON');
    await user.click(exportButton);

    await waitFor(() => {
      expect(adminService.exportData).toHaveBeenCalledWith(
        'audit_logs',
        'json',
        expect.any(Object)
      );
    });
  });

  it('handles export errors', async () => {
    (adminService.exportData as any).mockRejectedValue(new Error('Export failed'));
    
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AuditLog />);

    const exportButton = screen.getByText('Export CSV');
    await user.click(exportButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to export audit logs as CSV');
    });

    alertSpy.mockRestore();
  });

  it('handles API errors gracefully', async () => {
    (adminService.getAuditLogs as any).mockRejectedValue(new Error('API Error'));
    
    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load audit logs')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no logs found', async () => {
    const emptyResponse = {
      logs: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };
    (adminService.getAuditLogs as any).mockResolvedValue(emptyResponse);

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText('No audit logs found')).toBeInTheDocument();
      expect(screen.getByText('No audit logs match the current filters and date range.')).toBeInTheDocument();
    });
  });

  it('displays pagination when multiple pages exist', async () => {
    const multiPageResponse = {
      ...mockAuditResponse,
      total: 150,
      totalPages: 3,
    };
    (adminService.getAuditLogs as any).mockResolvedValue(multiPageResponse);

    render(<AuditLog />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 50 of 150 entries')).toBeInTheDocument();
    });
  });

  it('applies correct badge colors for different actions', async () => {
    render(<AuditLog />);

    await waitFor(() => {
      const createBadge = screen.getByText('CREATE');
      const deleteBadge = screen.getByText('DELETE');
      const loginBadge = screen.getByText('LOGIN');

      expect(createBadge).toHaveClass('bg-green-100', 'text-green-800');
      expect(deleteBadge).toHaveClass('bg-red-100', 'text-red-800');
      expect(loginBadge).toHaveClass('bg-purple-100', 'text-purple-800');
    });
  });

  it('disables export buttons during loading', async () => {
    // Make the API call hang to test loading state
    (adminService.getAuditLogs as any).mockImplementation(() => new Promise(() => {}));

    render(<AuditLog />);

    const csvButton = screen.getByText('Export CSV');
    const jsonButton = screen.getByText('Export JSON');

    expect(csvButton).toBeDisabled();
    expect(jsonButton).toBeDisabled();
  });
});