import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Modal, TextArea } from '../../components/ui';
import { LoadingSpinner, Pagination } from '../../components/common';
import { adminService } from '../../services';
import type { ContentModerationItem, ContentModerationAction } from '../../types';

interface ContentItemProps {
  item: ContentModerationItem;
  onModerate: (itemId: string, action: 'approve' | 'reject', reason?: string) => void;
}

const ContentItem: React.FC<ContentItemProps> = ({ item, onModerate }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'event':
        return 'bg-blue-100 text-blue-800';
      case 'movie':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReject = () => {
    if (rejectReason.trim()) {
      onModerate(item.id, 'reject', rejectReason);
      setRejectReason('');
      setRejectModal(false);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(item.type)}`}>
                {item.type}
              </span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(item.status)}`}>
                {item.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 mb-3 line-clamp-2">{item.description}</p>
            <div className="text-sm text-gray-500">
              <p>Submitted by: {item.owner.name} ({item.owner.email})</p>
              <p>Submitted: {formatDate(item.submittedAt)}</p>
              {item.reviewedAt && (
                <p>Reviewed: {formatDate(item.reviewedAt)} by {item.reviewedBy}</p>
              )}
              {item.rejectionReason && (
                <p className="text-red-600 mt-1">Rejection reason: {item.rejectionReason}</p>
              )}
            </div>
          </div>
          
          {item.status === 'pending' && (
            <div className="flex space-x-2 ml-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onModerate(item.id, 'approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModal(true)}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Media Preview */}
        {item.media && item.media.length > 0 && (
          <div className="mb-4">
            <div className="flex space-x-2 overflow-x-auto">
              {item.media.slice(0, 3).map((mediaUrl, index) => (
                <img
                  key={index}
                  src={mediaUrl}
                  alt={`${item.title} media ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
              ))}
              {item.media.length > 3 && (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-600">
                  +{item.media.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="prose prose-sm max-w-none">
              <h4 className="font-medium text-gray-900 mb-2">Full Description</h4>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
              
              {item.media && item.media.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Media ({item.media.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {item.media.map((mediaUrl, index) => (
                      <img
                        key={index}
                        src={mediaUrl}
                        alt={`${item.title} media ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        onClick={() => window.open(mediaUrl, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Content">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Please provide a reason for rejecting "{item.title}". This will be sent to the content owner.
          </p>
          <TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
            required
          />
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Content
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const ContentModeration: React.FC = () => {
  const [items, setItems] = useState<ContentModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'event' | 'movie' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const fetchItems = async (page = 1) => {
    try {
      setLoading(true);
      const response = await adminService.getContentModerationQueue(
        typeFilter || undefined,
        statusFilter || undefined,
        page,
        10
      );
      setItems(response.items);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total,
      });
      setError(null);
    } catch (err) {
      setError('Failed to load content moderation queue');
      console.error('Content moderation fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, [typeFilter, statusFilter]);

  const handleModerate = async (itemId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await adminService.moderateContent({ itemId, action, reason } as ContentModerationAction);
      await fetchItems(pagination.page);
    } catch (err) {
      console.error('Content moderation error:', err);
      alert(`Failed to ${action} content`);
    }
  };

  const handlePageChange = (page: number) => {
    fetchItems(page);
  };

  const pendingCount = items.filter(item => item.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-gray-600">
          Review and approve content submissions
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {pendingCount} pending
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="sm:w-48"
            placeholder="All Types"
            options={[
              { value: '', label: 'All Types' },
              { value: 'event', label: 'Events' },
              { value: 'movie', label: 'Movies' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="sm:w-48"
            placeholder="All Status"
            options={[
              { value: '', label: 'All Status' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
          <Button
            variant="outline"
            onClick={() => {
              setTypeFilter('');
              setStatusFilter('pending');
            }}
          >
            Reset Filters
          </Button>
        </div>
      </Card>

      {/* Content Items */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Card className="p-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchItems(pagination.page)}>
            Retry
          </Button>
        </Card>
      ) : items.length > 0 ? (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <ContentItem
                key={item.id}
                item={item}
                onModerate={handleModerate}
              />
            ))}
          </div>
          
          {pagination.totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * 10) + 1} to {Math.min(pagination.page * 10, pagination.total)} of {pagination.total} items
                </p>
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content to review</h3>
          <p className="text-gray-600">
            {statusFilter === 'pending' 
              ? 'All content has been reviewed' 
              : 'No content matches the current filters'
            }
          </p>
        </Card>
      )}
    </div>
  );
};

export default ContentModeration;