import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from celery import shared_task
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q

from .services import NotificationService, send_booking_reminder
from bookings.models import Booking

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_notification_task(self, user_id: int, notification_type: str, context_data: Dict[str, Any], 
                          channels: List[str] = None, related_object_id: int = None, 
                          related_object_type: str = None):
    """
    Celery task to send notifications asynchronously
    
    Args:
        user_id: ID of the user to send notification to
        notification_type: Type of notification
        context_data: Data for template rendering
        channels: List of channels to send to
        related_object_id: ID of related object
        related_object_type: Type of related object (booking, event, etc.)
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Get related object if provided
        related_object = None
        if related_object_id and related_object_type:
            if related_object_type == 'booking':
                from bookings.models import Booking
                related_object = Booking.objects.get(id=related_object_id)
            elif related_object_type == 'event':
                from events.models import Event
                related_object = Event.objects.get(id=related_object_id)
        
        service = NotificationService()
        results = service.send_notification(
            user=user,
            notification_type=notification_type,
            context_data=context_data,
            channels=channels,
            related_object=related_object
        )
        
        logger.info(f"Notification task completed for user {user_id}: {results}")
        return results
        
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found")
        raise
    except Exception as exc:
        logger.error(f"Error in notification task: {str(exc)}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task
def send_booking_confirmation_task(user_id: int, booking_id: int, context_data: Dict[str, Any]):
    """Send booking confirmation notification"""
    try:
        user = User.objects.get(id=user_id)
        booking = Booking.objects.get(id=booking_id)
        
        service = NotificationService()
        results = service.send_notification(
            user=user,
            notification_type='booking_confirmation',
            context_data=context_data,
            related_object=booking
        )
        
        logger.info(f"Booking confirmation sent to user {user_id}: {results}")
        return results
        
    except (User.DoesNotExist, Booking.DoesNotExist) as e:
        logger.error(f"Object not found in booking confirmation task: {str(e)}")
        raise


@shared_task
def send_booking_reminders():
    """
    Periodic task to send booking reminders
    Runs every hour to check for upcoming bookings
    """
    try:
        now = timezone.now()
        
        # Get reminder hours from settings
        from django.conf import settings
        reminder_hours = settings.NOTIFICATION_SETTINGS.get('BOOKING_REMINDER', {}).get('hours_before', [24, 2])
        
        sent_count = 0
        
        for hours in reminder_hours:
            # Calculate the time window for reminders
            reminder_time = now + timedelta(hours=hours)
            window_start = reminder_time - timedelta(minutes=30)
            window_end = reminder_time + timedelta(minutes=30)
            
            # Find bookings that need reminders
            bookings = Booking.objects.filter(
                booking_status='confirmed',
                payment_status='completed'
            ).select_related('customer', 'event', 'showtime')
            
            # Filter by event or showtime datetime
            event_bookings = bookings.filter(
                event__isnull=False,
                event__start_datetime__range=[window_start, window_end]
            )
            
            showtime_bookings = bookings.filter(
                showtime__isnull=False,
                showtime__start_time__range=[window_start, window_end]
            )
            
            # Send reminders for event bookings
            for booking in event_bookings:
                context_data = {
                    'user_name': booking.customer.get_full_name() or booking.customer.username,
                    'booking_reference': booking.booking_reference,
                    'event_title': booking.event.title,
                    'event_venue': booking.event.venue,
                    'event_datetime': booking.event.start_datetime,
                    'hours_until_event': hours,
                }
                
                send_notification_task.delay(
                    user_id=booking.customer.id,
                    notification_type='booking_reminder',
                    context_data=context_data,
                    related_object_id=booking.id,
                    related_object_type='booking'
                )
                sent_count += 1
            
            # Send reminders for showtime bookings
            for booking in showtime_bookings:
                context_data = {
                    'user_name': booking.customer.get_full_name() or booking.customer.username,
                    'booking_reference': booking.booking_reference,
                    'movie_title': booking.showtime.movie.title,
                    'theater_name': booking.showtime.theater.name,
                    'showtime_datetime': booking.showtime.start_time,
                    'hours_until_show': hours,
                }
                
                send_notification_task.delay(
                    user_id=booking.customer.id,
                    notification_type='booking_reminder',
                    context_data=context_data,
                    related_object_id=booking.id,
                    related_object_type='booking'
                )
                sent_count += 1
        
        logger.info(f"Sent {sent_count} booking reminders")
        return sent_count
        
    except Exception as e:
        logger.error(f"Error in send_booking_reminders task: {str(e)}")
        raise


@shared_task
def cleanup_expired_bookings():
    """
    Periodic task to clean up expired bookings and send notifications
    """
    try:
        now = timezone.now()
        cleanup_count = 0
        
        # Find expired bookings (events/shows that have already happened)
        expired_event_bookings = Booking.objects.filter(
            booking_status='confirmed',
            event__isnull=False,
            event__end_datetime__lt=now
        )
        
        expired_showtime_bookings = Booking.objects.filter(
            booking_status='confirmed',
            showtime__isnull=False,
            showtime__end_time__lt=now
        )
        
        # Update status for expired bookings
        for booking in expired_event_bookings:
            booking.booking_status = 'completed'
            booking.save()
            cleanup_count += 1
        
        for booking in expired_showtime_bookings:
            booking.booking_status = 'completed'
            booking.save()
            cleanup_count += 1
        
        logger.info(f"Cleaned up {cleanup_count} expired bookings")
        return cleanup_count
        
    except Exception as e:
        logger.error(f"Error in cleanup_expired_bookings task: {str(e)}")
        raise


@shared_task
def send_bulk_notification_task(user_ids: List[int], notification_type: str, 
                               context_data: Dict[str, Any], channels: List[str] = None):
    """
    Send notifications to multiple users
    
    Args:
        user_ids: List of user IDs to send notifications to
        notification_type: Type of notification
        context_data: Data for template rendering
        channels: List of channels to send to
    """
    try:
        sent_count = 0
        failed_count = 0
        
        for user_id in user_ids:
            try:
                send_notification_task.delay(
                    user_id=user_id,
                    notification_type=notification_type,
                    context_data=context_data,
                    channels=channels
                )
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to queue notification for user {user_id}: {str(e)}")
                failed_count += 1
        
        logger.info(f"Bulk notification queued: {sent_count} sent, {failed_count} failed")
        return {'sent': sent_count, 'failed': failed_count}
        
    except Exception as e:
        logger.error(f"Error in bulk notification task: {str(e)}")
        raise


@shared_task
def send_system_maintenance_notification(message: str, scheduled_time: str):
    """
    Send system maintenance notifications to all users
    """
    try:
        # Get all active users
        users = User.objects.filter(is_active=True)
        user_ids = list(users.values_list('id', flat=True))
        
        context_data = {
            'message': message,
            'scheduled_time': scheduled_time,
            'support_email': 'support@moviebooking.com',
        }
        
        # Send bulk notifications
        result = send_bulk_notification_task.delay(
            user_ids=user_ids,
            notification_type='system_maintenance',
            context_data=context_data,
            channels=['email']  # Only email for system notifications
        )
        
        logger.info(f"System maintenance notification queued for {len(user_ids)} users")
        return result
        
    except Exception as e:
        logger.error(f"Error in system maintenance notification task: {str(e)}")
        raise