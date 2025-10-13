from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .admin_services import (
    AdminAnalyticsService,
    UserManagementService,
    ContentModerationService,
    SystemHealthService
)
from .admin_models import AuditLog, ContentModerationQueue, SystemHealthMetric
from .permissions import IsAdminUser
from .serializers import (
    AdminUserListSerializer,
    AuditLogSerializer,
    ContentModerationSerializer,
    SystemHealthMetricSerializer
)


class AdminAnalyticsView(APIView):
    """Admin analytics API with system-wide metrics"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get comprehensive system analytics"""
        try:
            analytics_type = request.query_params.get('type', 'overview')
            
            if analytics_type == 'overview':
                data = AdminAnalyticsService.get_system_overview()
            elif analytics_type == 'users':
                data = AdminAnalyticsService.get_user_analytics()
            elif analytics_type == 'bookings':
                data = AdminAnalyticsService.get_booking_analytics()
            elif analytics_type == 'content':
                data = AdminAnalyticsService.get_content_analytics()
            elif analytics_type == 'performance':
                data = AdminAnalyticsService.get_performance_metrics()
            else:
                return Response({
                    'error': 'Invalid analytics type',
                    'valid_types': ['overview', 'users', 'bookings', 'content', 'performance']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Log the analytics access
            AuditLog.log_action(
                user=request.user,
                action_type='system',
                description=f'Accessed {analytics_type} analytics',
                additional_data={'analytics_type': analytics_type},
                severity='low'
            )
            
            return Response({
                'analytics_type': analytics_type,
                'data': data,
                'generated_at': timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to generate analytics',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserManagementView(APIView):
    """User management endpoints for admin operations"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get paginated list of users with filters"""
        try:
            # Extract filters from query parameters
            filters = {
                'role': request.query_params.get('role'),
                'is_active': request.query_params.get('is_active'),
                'search': request.query_params.get('search'),
                'date_joined_from': request.query_params.get('date_joined_from'),
                'date_joined_to': request.query_params.get('date_joined_to'),
            }
            
            # Remove None values
            filters = {k: v for k, v in filters.items() if v is not None}
            
            # Convert string boolean to actual boolean
            if 'is_active' in filters:
                filters['is_active'] = filters['is_active'].lower() == 'true'
            
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            result = UserManagementService.get_user_list(filters, page, page_size)
            
            # Serialize users
            serializer = AdminUserListSerializer(result['users'], many=True)
            
            return Response({
                'users': serializer.data,
                'pagination': {
                    'total_count': result['total_count'],
                    'page': result['page'],
                    'page_size': result['page_size'],
                    'total_pages': result['total_pages']
                },
                'filters': filters
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve users',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, user_id=None):
        """Update user status or role"""
        if not user_id:
            return Response({
                'error': 'User ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            action = request.data.get('action')
            
            if action == 'update_status':
                is_active = request.data.get('is_active')
                if is_active is None:
                    return Response({
                        'error': 'is_active field is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                result = UserManagementService.update_user_status(
                    user_id, is_active, request.user
                )
                
            elif action == 'update_role':
                new_role = request.data.get('role')
                if not new_role:
                    return Response({
                        'error': 'role field is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                result = UserManagementService.update_user_role(
                    user_id, new_role, request.user
                )
                
            else:
                return Response({
                    'error': 'Invalid action',
                    'valid_actions': ['update_status', 'update_role']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': 'Failed to update user',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserActivityView(APIView):
    """Get user activity history"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request, user_id):
        """Get user activity history"""
        try:
            days = int(request.query_params.get('days', 30))
            activity_data = UserManagementService.get_user_activity(user_id, days)
            
            if not activity_data:
                return Response({
                    'error': 'User not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Serialize the data
            user_serializer = AdminUserListSerializer(activity_data['user'])
            
            return Response({
                'user': user_serializer.data,
                'activity': {
                    'actions_count': activity_data['actions'].count(),
                    'audit_logs_count': activity_data['audit_logs'].count(),
                    'bookings_count': activity_data['bookings'].count(),
                    'recent_actions': [
                        {
                            'action': action.action_name,
                            'category': action.action_category,
                            'timestamp': action.timestamp,
                            'endpoint': action.endpoint,
                            'response_status': action.response_status
                        }
                        for action in activity_data['actions'][:10]
                    ],
                    'recent_bookings': [
                        {
                            'booking_reference': booking.booking_reference,
                            'booking_type': booking.booking_type,
                            'total_amount': float(booking.total_amount),
                            'status': booking.booking_status,
                            'created_at': booking.created_at
                        }
                        for booking in activity_data['bookings'][:10]
                    ]
                },
                'period_days': days
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve user activity',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminAuditLogView(APIView):
    """Audit logging system endpoints"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get audit logs with filtering"""
        try:
            # Extract filters
            action_type = request.query_params.get('action_type')
            severity = request.query_params.get('severity')
            user_id = request.query_params.get('user_id')
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            is_successful = request.query_params.get('is_successful')
            
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
            
            # Build queryset
            queryset = AuditLog.objects.select_related('user').all()
            
            if action_type:
                queryset = queryset.filter(action_type=action_type)
            if severity:
                queryset = queryset.filter(severity=severity)
            if user_id:
                queryset = queryset.filter(user_id=user_id)
            if date_from:
                queryset = queryset.filter(timestamp__gte=date_from)
            if date_to:
                queryset = queryset.filter(timestamp__lte=date_to)
            if is_successful is not None:
                queryset = queryset.filter(is_successful=is_successful.lower() == 'true')
            
            # Pagination
            total_count = queryset.count()
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            logs = queryset[start_index:end_index]
            
            # Serialize
            serializer = AuditLogSerializer(logs, many=True)
            
            return Response({
                'logs': serializer.data,
                'pagination': {
                    'total_count': total_count,
                    'page': page,
                    'page_size': page_size,
                    'total_pages': (total_count + page_size - 1) // page_size
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve audit logs',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminContentModerationView(APIView):
    """Content moderation system endpoints"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get content moderation queue"""
        try:
            status_filter = request.query_params.get('status')
            priority_filter = request.query_params.get('priority')
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            result = ContentModerationService.get_moderation_queue(
                status_filter, priority_filter, page, page_size
            )
            
            # Serialize
            serializer = ContentModerationSerializer(result['items'], many=True)
            
            return Response({
                'items': serializer.data,
                'pagination': {
                    'total_count': result['total_count'],
                    'page': result['page'],
                    'page_size': result['page_size'],
                    'total_pages': result['total_pages']
                },
                'stats': ContentModerationService.get_moderation_stats()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve moderation queue',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, item_id):
        """Moderate content item"""
        try:
            moderation_item = get_object_or_404(ContentModerationQueue, id=item_id)
            action = request.data.get('action')
            notes = request.data.get('notes', '')
            
            if action == 'approve':
                moderation_item.approve(request.user, notes)
                message = 'Content approved successfully'
            elif action == 'reject':
                moderation_item.reject(request.user, notes)
                message = 'Content rejected successfully'
            elif action == 'flag':
                reasons = request.data.get('reasons', [])
                moderation_item.flag(reasons, notes)
                message = 'Content flagged for review'
            else:
                return Response({
                    'error': 'Invalid action',
                    'valid_actions': ['approve', 'reject', 'flag']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Serialize updated item
            serializer = ContentModerationSerializer(moderation_item)
            
            return Response({
                'message': message,
                'item': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to moderate content',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSystemHealthView(APIView):
    """System health monitoring and reporting endpoints"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Get system health status"""
        try:
            # Get current health summary
            health_summary = SystemHealthService.get_health_summary()
            
            # Get recent metrics if requested
            include_history = request.query_params.get('include_history', 'false').lower() == 'true'
            
            response_data = {
                'health_summary': health_summary,
                'timestamp': timezone.now()
            }
            
            if include_history:
                # Get metrics from last 24 hours
                recent_metrics = SystemHealthMetric.objects.filter(
                    timestamp__gte=timezone.now() - timedelta(hours=24)
                ).order_by('-timestamp')[:100]
                
                serializer = SystemHealthMetricSerializer(recent_metrics, many=True)
                response_data['recent_metrics'] = serializer.data
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to retrieve system health',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Trigger system health metrics collection"""
        try:
            metrics = SystemHealthService.collect_system_metrics()
            
            # Log the manual health check
            AuditLog.log_action(
                user=request.user,
                action_type='system',
                description='Triggered manual system health check',
                additional_data={'metrics_collected': len(metrics)},
                severity='low'
            )
            
            return Response({
                'message': 'System health metrics collected successfully',
                'metrics_collected': len(metrics),
                'timestamp': timezone.now()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Failed to collect system metrics',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def admin_dashboard_summary(request):
    """Get admin dashboard summary with key metrics"""
    try:
        # Get overview analytics
        overview = AdminAnalyticsService.get_system_overview()
        
        # Get moderation stats
        moderation_stats = ContentModerationService.get_moderation_stats()
        
        # Get system health
        health_summary = SystemHealthService.get_health_summary()
        
        # Get recent critical audit logs
        critical_logs = AuditLog.objects.filter(
            severity__in=['high', 'critical'],
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        return Response({
            'overview': overview,
            'moderation': moderation_stats,
            'system_health': {
                'overall_status': health_summary['overall_status'],
                'critical_count': health_summary['critical_count'],
                'warning_count': health_summary['warning_count']
            },
            'alerts': {
                'critical_logs_24h': critical_logs
            },
            'generated_at': timezone.now()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Failed to generate dashboard summary',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)