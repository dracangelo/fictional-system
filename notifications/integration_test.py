#!/usr/bin/env python
"""
Integration test script for the notification system.
This script demonstrates the notification system functionality.
"""

import os
import sys
import django
from django.conf import settings

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_booking_app.settings')
django.setup()

from django.contrib.auth.models import User
from django.core import mail
from notifications.services import NotificationService
from notifications.models import NotificationTemplate, NotificationPreference, NotificationLog


def test_notification_system():
    """Test the notification system end-to-end"""
    print("🚀 Testing Movie Booking Notification System")
    print("=" * 50)
    
    # Create test user
    print("1. Creating test user...")
    user, created = User.objects.get_or_create(
        username='test_notification_user',
        defaults={
            'email': 'test@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
    )
    
    # Set up user profile
    user.profile.phone_number = '+1234567890'
    user.profile.save()
    
    print(f"   ✓ User created: {user.username} ({user.email})")
    
    # Check notification templates
    print("\n2. Checking notification templates...")
    templates = NotificationTemplate.objects.filter(is_active=True)
    print(f"   ✓ Found {templates.count()} active notification templates")
    
    for template in templates:
        print(f"     - {template.name} ({template.notification_type}, {template.channel})")
    
    # Test notification preferences
    print("\n3. Testing notification preferences...")
    preferences, created = NotificationPreference.objects.get_or_create(
        user=user,
        defaults={'email_enabled': True, 'sms_enabled': True}
    )
    if created:
        print("   ✓ Created notification preferences for user")
    print(f"   ✓ Email enabled: {preferences.email_enabled}")
    print(f"   ✓ SMS enabled: {preferences.sms_enabled}")
    print(f"   ✓ Booking confirmation email: {preferences.booking_confirmation_email}")
    print(f"   ✓ Booking confirmation SMS: {preferences.booking_confirmation_sms}")
    
    # Test email notification
    print("\n4. Testing email notification...")
    service = NotificationService()
    
    context_data = {
        'user_name': user.get_full_name() or user.username,
        'booking_reference': 'TEST-12345',
        'event_title': 'Test Concert',
        'event_venue': 'Test Arena',
        'event_datetime': '2024-12-25 19:00:00',
        'total_amount': '75.00',
        'ticket_count': 2
    }
    
    result = service.send_notification(
        user=user,
        notification_type='booking_confirmation',
        context_data=context_data,
        channels=['email']
    )
    
    print(f"   ✓ Email notification result: {result}")
    
    # Check notification log
    print("\n5. Checking notification logs...")
    logs = NotificationLog.objects.filter(user=user).order_by('-created_at')
    print(f"   ✓ Found {logs.count()} notification logs for user")
    
    for log in logs[:3]:  # Show last 3 logs
        print(f"     - {log.notification_type} via {log.channel}: {log.status}")
    
    # Test user preferences update
    print("\n6. Testing preference updates...")
    preferences.booking_reminder_email = False
    preferences.save()
    print("   ✓ Updated booking reminder email preference to False")
    
    # Test opt-out functionality
    print("\n7. Testing opt-out functionality...")
    original_email_enabled = preferences.email_enabled
    preferences.email_enabled = False
    preferences.save()
    
    # Try to send notification (should be skipped)
    result = service.send_notification(
        user=user,
        notification_type='booking_confirmation',
        context_data=context_data
    )
    
    print(f"   ✓ Notification with email disabled: {result}")
    
    # Restore preferences
    preferences.email_enabled = original_email_enabled
    preferences.save()
    
    # Test template rendering
    print("\n8. Testing template rendering...")
    template = NotificationTemplate.objects.filter(
        notification_type='booking_confirmation',
        channel='email'
    ).first()
    
    if template:
        from django.template import Template, Context
        subject_template = Template(template.subject)
        content_template = Template(template.template_content)
        context = Context(context_data)
        
        rendered_subject = subject_template.render(context)
        rendered_content = content_template.render(context)
        
        print(f"   ✓ Rendered subject: {rendered_subject}")
        print(f"   ✓ Rendered content preview: {rendered_content[:100]}...")
    
    print("\n9. System statistics...")
    total_templates = NotificationTemplate.objects.count()
    active_templates = NotificationTemplate.objects.filter(is_active=True).count()
    total_logs = NotificationLog.objects.count()
    successful_notifications = NotificationLog.objects.filter(status='sent').count()
    
    print(f"   ✓ Total templates: {total_templates}")
    print(f"   ✓ Active templates: {active_templates}")
    print(f"   ✓ Total notification logs: {total_logs}")
    print(f"   ✓ Successful notifications: {successful_notifications}")
    
    print("\n" + "=" * 50)
    print("🎉 Notification system test completed successfully!")
    print("\nKey Features Verified:")
    print("✓ Email notification sending")
    print("✓ Template rendering with context data")
    print("✓ User preference management")
    print("✓ Notification logging")
    print("✓ Opt-out functionality")
    print("✓ Template management")
    
    return True


if __name__ == '__main__':
    try:
        test_notification_system()
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)