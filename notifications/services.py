import logging
from typing import Dict, Any, Optional, List
from django.core.mail import send_mail
from django.template import Template, Context
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from .models import NotificationTemplate, NotificationPreference, NotificationLog

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for handling all types of notifications"""
    
    def __init__(self):
        self.twilio_client = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
    
    def send_notification(
        self,
        user: User,
        notification_type: str,
        context_data: Dict[str, Any],
        channels: Optional[List[str]] = None,
        related_object: Any = None
    ) -> Dict[str, bool]:
        """
        Send notification to user via specified channels
        
        Args:
            user: User to send notification to
            notification_type: Type of notification (booking_confirmation, etc.)
            context_data: Data to populate template
            channels: List of channels to send to (email, sms). If None, uses user preferences
            related_object: Related object (booking, event, etc.) for logging
        
        Returns:
            Dict with channel success status
        """
        results = {}
        
        # Get user preferences
        preferences = self._get_user_preferences(user)
        
        # Determine which channels to use
        if channels is None:
            channels = self._get_enabled_channels(user, notification_type, preferences)
        
        # Send via each channel
        for channel in channels:
            try:
                if channel == 'email':
                    results[channel] = self._send_email_notification(
                        user, notification_type, context_data, related_object
                    )
                elif channel == 'sms':
                    results[channel] = self._send_sms_notification(
                        user, notification_type, context_data, related_object
                    )
                else:
                    logger.warning(f"Unsupported notification channel: {channel}")
                    results[channel] = False
            except Exception as e:
                logger.error(f"Error sending {channel} notification to {user.email}: {str(e)}")
                results[channel] = False
        
        return results
    
    def _get_user_preferences(self, user: User) -> NotificationPreference:
        """Get or create user notification preferences"""
        preferences, created = NotificationPreference.objects.get_or_create(
            user=user,
            defaults={
                'email_enabled': True,
                'sms_enabled': True,
                'push_enabled': True,
            }
        )
        return preferences
    
    def _get_enabled_channels(
        self, 
        user: User, 
        notification_type: str, 
        preferences: NotificationPreference
    ) -> List[str]:
        """Determine which channels are enabled for this notification type"""
        channels = []
        
        # Check email preferences
        email_pref_attr = f"{notification_type}_email"
        if (preferences.email_enabled and 
            hasattr(preferences, email_pref_attr) and 
            getattr(preferences, email_pref_attr, True)):
            channels.append('email')
        
        # Check SMS preferences
        sms_pref_attr = f"{notification_type}_sms"
        if (preferences.sms_enabled and 
            hasattr(preferences, sms_pref_attr) and 
            getattr(preferences, sms_pref_attr, False) and
            hasattr(user, 'profile') and 
            user.profile.phone_number):
            channels.append('sms')
        
        return channels
    
    def _send_email_notification(
        self, 
        user: User, 
        notification_type: str, 
        context_data: Dict[str, Any],
        related_object: Any = None
    ) -> bool:
        """Send email notification"""
        try:
            # Get email template
            template = NotificationTemplate.objects.filter(
                notification_type=notification_type,
                channel='email',
                is_active=True
            ).first()
            
            if not template:
                logger.error(f"No email template found for {notification_type}")
                return False
            
            # Render template
            subject_template = Template(template.subject)
            content_template = Template(template.template_content)
            context = Context(context_data)
            
            subject = subject_template.render(context)
            content = content_template.render(context)
            
            # Send email
            send_mail(
                subject=subject,
                message=content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            # Log notification
            self._log_notification(
                user=user,
                notification_type=notification_type,
                channel='email',
                recipient=user.email,
                subject=subject,
                content=content,
                status='sent',
                related_object=related_object
            )
            
            logger.info(f"Email notification sent to {user.email} for {notification_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {user.email}: {str(e)}")
            self._log_notification(
                user=user,
                notification_type=notification_type,
                channel='email',
                recipient=user.email,
                subject=template.subject if template else '',
                content='',
                status='failed',
                error_message=str(e),
                related_object=related_object
            )
            return False
    
    def _send_sms_notification(
        self, 
        user: User, 
        notification_type: str, 
        context_data: Dict[str, Any],
        related_object: Any = None
    ) -> bool:
        """Send SMS notification"""
        if not self.twilio_client:
            logger.error("Twilio client not configured")
            return False
        
        try:
            # Get user phone number
            if not hasattr(user, 'profile') or not user.profile.phone_number:
                logger.warning(f"No phone number for user {user.email}")
                return False
            
            phone_number = user.profile.phone_number
            
            # Get SMS template
            template = NotificationTemplate.objects.filter(
                notification_type=notification_type,
                channel='sms',
                is_active=True
            ).first()
            
            if not template:
                logger.error(f"No SMS template found for {notification_type}")
                return False
            
            # Render template
            content_template = Template(template.template_content)
            context = Context(context_data)
            content = content_template.render(context)
            
            # Send SMS
            message = self.twilio_client.messages.create(
                body=content,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            
            # Log notification
            self._log_notification(
                user=user,
                notification_type=notification_type,
                channel='sms',
                recipient=phone_number,
                subject='',
                content=content,
                status='sent',
                related_object=related_object
            )
            
            logger.info(f"SMS notification sent to {phone_number} for {notification_type}")
            return True
            
        except TwilioException as e:
            logger.error(f"Twilio error sending SMS to {phone_number}: {str(e)}")
            self._log_notification(
                user=user,
                notification_type=notification_type,
                channel='sms',
                recipient=phone_number,
                subject='',
                content='',
                status='failed',
                error_message=str(e),
                related_object=related_object
            )
            return False
        except Exception as e:
            logger.error(f"Failed to send SMS to user {user.email}: {str(e)}")
            return False
    
    def _log_notification(
        self,
        user: User,
        notification_type: str,
        channel: str,
        recipient: str,
        subject: str,
        content: str,
        status: str,
        error_message: str = '',
        related_object: Any = None
    ):
        """Log notification attempt"""
        log_entry = NotificationLog.objects.create(
            user=user,
            notification_type=notification_type,
            channel=channel,
            recipient=recipient,
            subject=subject,
            content=content,
            status=status,
            error_message=error_message,
            content_object=related_object,
            sent_at=timezone.now() if status == 'sent' else None
        )
        return log_entry


# Convenience functions for common notification types
def send_booking_confirmation(user: User, booking, context_data: Dict[str, Any]):
    """Send booking confirmation notification"""
    service = NotificationService()
    return service.send_notification(
        user=user,
        notification_type='booking_confirmation',
        context_data=context_data,
        related_object=booking
    )


def send_booking_reminder(user: User, booking, context_data: Dict[str, Any]):
    """Send booking reminder notification"""
    service = NotificationService()
    return service.send_notification(
        user=user,
        notification_type='booking_reminder',
        context_data=context_data,
        related_object=booking
    )


def send_booking_cancellation(user: User, booking, context_data: Dict[str, Any]):
    """Send booking cancellation notification"""
    service = NotificationService()
    return service.send_notification(
        user=user,
        notification_type='booking_cancellation',
        context_data=context_data,
        related_object=booking
    )


def send_event_update(user: User, event, context_data: Dict[str, Any]):
    """Send event update notification"""
    service = NotificationService()
    return service.send_notification(
        user=user,
        notification_type='event_update',
        context_data=context_data,
        related_object=event
    )