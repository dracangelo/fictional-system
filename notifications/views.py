from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import NotificationPreference, NotificationLog, NotificationTemplate
from .serializers import (
    NotificationPreferenceSerializer,
    NotificationLogSerializer,
    NotificationTemplateSerializer,
    BulkNotificationSerializer,
    TestNotificationSerializer
)
from .tasks import send_notification_task, send_bulk_notification_task
from .services import NotificationService


class NotificationPreferenceView(APIView):
    """
    Get and update user notification preferences
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user's notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=request.user,
            defaults={
                'email_enabled': True,
                'sms_enabled': True,
                'push_enabled': True,
            }
        )
        serializer = NotificationPreferenceSerializer(preferences)
        return Response(serializer.data)
    
    def put(self, request):
        """Update user notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationLogListView(generics.ListAPIView):
    """
    List notification logs for the current user
    """
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'channel', 'status']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return NotificationLog.objects.filter(user=self.request.user)


class AdminNotificationLogListView(generics.ListAPIView):
    """
    List all notification logs (admin only)
    """
    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'channel', 'status', 'user']
    ordering_fields = ['created_at', 'sent_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Only allow admin users
        if not (self.request.user.is_staff or 
                (hasattr(self.request.user, 'profile') and 
                 self.request.user.profile.role == 'admin')):
            return NotificationLog.objects.none()
        return super().get_queryset()


class NotificationTemplateListView(generics.ListAPIView):
    """
    List notification templates (admin only)
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'channel', 'is_active']
    ordering_fields = ['name', 'notification_type', 'created_at']
    ordering = ['notification_type', 'channel']
    
    def get_queryset(self):
        # Only allow admin users
        if not (self.request.user.is_staff or 
                (hasattr(self.request.user, 'profile') and 
                 self.request.user.profile.role == 'admin')):
            return NotificationTemplate.objects.none()
        return super().get_queryset()


class NotificationTemplateDetailView(generics.RetrieveUpdateAPIView):
    """
    Retrieve and update notification templates (admin only)
    """
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only allow admin users
        if not (self.request.user.is_staff or 
                (hasattr(self.request.user, 'profile') and 
                 self.request.user.profile.role == 'admin')):
            return NotificationTemplate.objects.none()
        return super().get_queryset()


class SendBulkNotificationView(APIView):
    """
    Send bulk notifications (admin only)
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Check admin permissions
        if not (request.user.is_staff or 
                (hasattr(request.user, 'profile') and 
                 request.user.profile.role == 'admin')):
            return Response(
                {'error': 'Admin permissions required'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BulkNotificationSerializer(data=request.data)
        if serializer.is_valid():
            # Queue bulk notification task
            task = send_bulk_notification_task.delay(
                user_ids=serializer.validated_data['user_ids'],
                notification_type=serializer.validated_data['notification_type'],
                context_data=serializer.validated_data['context_data'],
                channels=serializer.validated_data.get('channels')
            )
            
            return Response({
                'message': 'Bulk notification queued successfully',
                'task_id': task.id,
                'user_count': len(serializer.validated_data['user_ids'])
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TestNotificationView(APIView):
    """
    Send test notification to current user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = TestNotificationSerializer(data=request.data)
        if serializer.is_valid():
            # Prepare default context data for testing
            default_context = {
                'user_name': request.user.get_full_name() or request.user.username,
                'booking_reference': 'TEST-12345',
                'event_title': 'Test Event',
                'event_venue': 'Test Venue',
                'event_datetime': '2024-12-25 19:00:00',
                'movie_title': 'Test Movie',
                'theater_name': 'Test Theater',
                'showtime_datetime': '2024-12-25 19:00:00',
                'total_amount': '25.00',
                'ticket_count': 2,
                'hours_until_event': 24,
                'hours_until_show': 24,
            }
            
            # Merge with provided context data
            context_data = {**default_context, **serializer.validated_data.get('context_data', {})}
            
            # Send test notification
            task = send_notification_task.delay(
                user_id=request.user.id,
                notification_type=serializer.validated_data['notification_type'],
                context_data=context_data,
                channels=[serializer.validated_data['channel']]
            )
            
            return Response({
                'message': f'Test {serializer.validated_data["channel"]} notification sent',
                'task_id': task.id
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def opt_out_all_notifications(request):
    """
    Opt out of all notifications
    """
    preferences, created = NotificationPreference.objects.get_or_create(
        user=request.user
    )
    
    # Disable all notifications
    preferences.email_enabled = False
    preferences.sms_enabled = False
    preferences.push_enabled = False
    
    # Disable all specific notification types
    for field in preferences._meta.fields:
        if field.name.endswith('_email') or field.name.endswith('_sms'):
            setattr(preferences, field.name, False)
    
    preferences.save()
    
    return Response({
        'message': 'Successfully opted out of all notifications'
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def opt_in_essential_notifications(request):
    """
    Opt in to essential notifications only (booking confirmations)
    """
    preferences, created = NotificationPreference.objects.get_or_create(
        user=request.user
    )
    
    # Enable email for essential notifications
    preferences.email_enabled = True
    preferences.booking_confirmation_email = True
    preferences.booking_cancellation_email = True
    
    # Disable SMS by default
    preferences.sms_enabled = False
    
    # Disable other notifications
    preferences.booking_reminder_email = False
    preferences.booking_reminder_sms = False
    preferences.event_update_email = False
    preferences.event_update_sms = False
    preferences.system_maintenance_email = False
    preferences.system_maintenance_sms = False
    
    preferences.save()
    
    return Response({
        'message': 'Successfully opted in to essential notifications only'
    })