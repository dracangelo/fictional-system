from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
import json

from .analytics_service import AnalyticsService
from .report_generator import ReportGenerator
from users.permissions import IsAdminUser, IsEventOwner, IsTheaterOwner


def is_admin_user(user):
    """Check if user is admin"""
    return (hasattr(user, 'profile') and 
            user.profile.role == 'admin')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@cache_page(60 * 15)  # Cache for 15 minutes
def system_analytics(request):
    """
    Get system-wide analytics (admin only)
    
    Query parameters:
    - date_from: Start date (YYYY-MM-DD)
    - date_to: End date (YYYY-MM-DD)
    """
    # Check admin permission
    if not is_admin_user(request.user):
        return Response(
            {'error': 'Admin permission required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Parse date parameters
        date_from_str = request.GET.get('date_from')
        date_to_str = request.GET.get('date_to')
        
        date_from = None
        date_to = None
        
        if date_from_str:
            date_from = datetime.strptime(date_from_str, '%Y-%m-%d')
            date_from = timezone.make_aware(date_from)
        
        if date_to_str:
            date_to = datetime.strptime(date_to_str, '%Y-%m-%d')
            date_to = timezone.make_aware(date_to)
        
        # Get analytics data
        analytics_data = AnalyticsService.get_system_analytics(date_from, date_to)
        
        return Response(analytics_data)
        
    except ValueError as e:
        return Response(
            {'error': f'Invalid date format: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate analytics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def event_analytics(request, event_id):
    """
    Get analytics for a specific event
    
    Event owners can only view their own events.
    Admins can view any event.
    """
    try:
        # Check permissions
        owner_id = None
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'event_owner':
                owner_id = request.user.id
            elif not is_admin_user(request.user):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get analytics data
        analytics_data = AnalyticsService.get_event_analytics(event_id, owner_id)
        
        return Response(analytics_data)
        
    except PermissionError:
        return Response(
            {'error': 'Not authorized to view this event\'s analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate analytics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def theater_analytics(request, theater_id):
    """
    Get analytics for a specific theater
    
    Theater owners can only view their own theaters.
    Admins can view any theater.
    """
    try:
        # Check permissions
        owner_id = None
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'theater_owner':
                owner_id = request.user.id
            elif not is_admin_user(request.user):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get analytics data
        analytics_data = AnalyticsService.get_theater_analytics(theater_id, owner_id)
        
        return Response(analytics_data)
        
    except PermissionError:
        return Response(
            {'error': 'Not authorized to view this theater\'s analytics'},
            status=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate analytics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def trend_analysis(request, entity_type, entity_id):
    """
    Get trend analysis for events or theaters
    
    Query parameters:
    - days: Number of days to analyze (default: 30)
    """
    try:
        # Validate entity type
        if entity_type not in ['event', 'theater']:
            return Response(
                {'error': 'Invalid entity type. Must be "event" or "theater"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse days parameter
        days = int(request.GET.get('days', 30))
        if days <= 0 or days > 365:
            return Response(
                {'error': 'Days must be between 1 and 365'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check permissions (similar to individual analytics endpoints)
        if hasattr(request.user, 'profile'):
            if entity_type == 'event' and request.user.profile.role == 'event_owner':
                # Verify ownership
                from events.models import Event
                try:
                    event = Event.objects.get(id=entity_id, owner=request.user)
                except Event.DoesNotExist:
                    return Response(
                        {'error': 'Event not found or access denied'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif entity_type == 'theater' and request.user.profile.role == 'theater_owner':
                # Verify ownership
                from theaters.models import Theater
                try:
                    theater = Theater.objects.get(id=entity_id, owner=request.user)
                except Theater.DoesNotExist:
                    return Response(
                        {'error': 'Theater not found or access denied'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            elif not is_admin_user(request.user):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get trend analysis
        trend_data = AnalyticsService.get_trend_analysis(entity_type, entity_id, days)
        
        return Response(trend_data)
        
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate trend analysis: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recommendation_insights(request):
    """
    Get recommendation insights based on booking patterns
    """
    try:
        user_id = request.user.id if request.user.is_authenticated else None
        insights = AnalyticsService.get_recommendation_insights(user_id)
        
        return Response(insights)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate insights: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_report(request, report_type, entity_id=None):
    """
    Export analytics report as CSV or PDF
    
    Query parameters:
    - format: 'csv' or 'pdf' (default: 'csv')
    - date_from: Start date for system reports (YYYY-MM-DD)
    - date_to: End date for system reports (YYYY-MM-DD)
    """
    try:
        export_format = request.GET.get('format', 'csv').lower()
        
        if export_format not in ['csv', 'pdf']:
            return Response(
                {'error': 'Invalid format. Must be "csv" or "pdf"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get analytics data based on report type
        if report_type == 'system':
            # Check admin permission
            if not is_admin_user(request.user):
                return Response(
                    {'error': 'Admin permission required for system reports'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Parse date parameters
            date_from_str = request.GET.get('date_from')
            date_to_str = request.GET.get('date_to')
            
            date_from = None
            date_to = None
            
            if date_from_str:
                date_from = datetime.strptime(date_from_str, '%Y-%m-%d')
                date_from = timezone.make_aware(date_from)
            
            if date_to_str:
                date_to = datetime.strptime(date_to_str, '%Y-%m-%d')
                date_to = timezone.make_aware(date_to)
            
            analytics_data = AnalyticsService.get_system_analytics(date_from, date_to)
            filename = f"system_analytics_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
        elif report_type == 'event':
            if not entity_id:
                return Response(
                    {'error': 'Event ID is required for event reports'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check permissions
            owner_id = None
            if hasattr(request.user, 'profile'):
                if request.user.profile.role == 'event_owner':
                    owner_id = request.user.id
                elif not is_admin_user(request.user):
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            analytics_data = AnalyticsService.get_event_analytics(entity_id, owner_id)
            filename = f"event_{entity_id}_analytics_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
        elif report_type == 'theater':
            if not entity_id:
                return Response(
                    {'error': 'Theater ID is required for theater reports'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check permissions
            owner_id = None
            if hasattr(request.user, 'profile'):
                if request.user.profile.role == 'theater_owner':
                    owner_id = request.user.id
                elif not is_admin_user(request.user):
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            analytics_data = AnalyticsService.get_theater_analytics(entity_id, owner_id)
            filename = f"theater_{entity_id}_analytics_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
        else:
            return Response(
                {'error': 'Invalid report type. Must be "system", "event", or "theater"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate report
        if export_format == 'csv':
            report_data = ReportGenerator.generate_csv_report(analytics_data, report_type)
            response = HttpResponse(report_data.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{filename}.csv"'
            return response
            
        else:  # PDF
            report_data = ReportGenerator.generate_pdf_report(analytics_data, report_type)
            response = HttpResponse(report_data.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{filename}.pdf"'
            return response
        
    except PermissionError:
        return Response(
            {'error': 'Not authorized to generate this report'},
            status=status.HTTP_403_FORBIDDEN
        )
    except ValueError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except ImportError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to generate report: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )