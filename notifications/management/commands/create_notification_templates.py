from django.core.management.base import BaseCommand
from notifications.models import NotificationTemplate


class Command(BaseCommand):
    help = 'Create default notification templates'

    def handle(self, *args, **options):
        templates = [
            # Booking Confirmation Templates
            {
                'name': 'Booking Confirmation Email',
                'notification_type': 'booking_confirmation',
                'channel': 'email',
                'subject': 'Booking Confirmed - {{ booking_reference }}',
                'template_content': '''
Dear {{ user_name }},

Your booking has been confirmed! Here are the details:

Booking Reference: {{ booking_reference }}
{% if event_title %}
Event: {{ event_title }}
Venue: {{ event_venue }}
Date & Time: {{ event_datetime|date:"F d, Y" }} at {{ event_datetime|time:"g:i A" }}
{% endif %}
{% if movie_title %}
Movie: {{ movie_title }}
Theater: {{ theater_name }}
Showtime: {{ showtime_datetime|date:"F d, Y" }} at {{ showtime_datetime|time:"g:i A" }}
{% endif %}
Total Amount: ${{ total_amount }}
Number of Tickets: {{ ticket_count }}

{% if tickets %}
Your Tickets:
{% for ticket in tickets %}
- Ticket #{{ ticket.ticket_number }}{% if ticket.seat_number %} - Seat {{ ticket.seat_number }}{% endif %}
{% endfor %}
{% endif %}

Please save this email and bring your tickets (digital or printed) to the venue.

Thank you for choosing our platform!

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            {
                'name': 'Booking Confirmation SMS',
                'notification_type': 'booking_confirmation',
                'channel': 'sms',
                'subject': '',
                'template_content': '''Booking confirmed! Ref: {{ booking_reference }}. {% if event_title %}{{ event_title }} on {{ event_datetime|date:"M d" }} at {{ event_datetime|time:"g:i A" }}{% endif %}{% if movie_title %}{{ movie_title }} on {{ showtime_datetime|date:"M d" }} at {{ showtime_datetime|time:"g:i A" }}{% endif %}. Check email for details.''',
                'is_active': True,
            },
            
            # Booking Reminder Templates
            {
                'name': 'Booking Reminder Email',
                'notification_type': 'booking_reminder',
                'channel': 'email',
                'subject': 'Reminder: Your booking is in {{ hours_until_event|default:hours_until_show }} hours',
                'template_content': '''
Dear {{ user_name }},

This is a friendly reminder about your upcoming booking:

Booking Reference: {{ booking_reference }}
{% if event_title %}
Event: {{ event_title }}
Venue: {{ event_venue }}
Date & Time: {{ event_datetime|date:"F d, Y" }} at {{ event_datetime|time:"g:i A" }}
Time Until Event: {{ hours_until_event }} hours
{% endif %}
{% if movie_title %}
Movie: {{ movie_title }}
Theater: {{ theater_name }}
Showtime: {{ showtime_datetime|date:"F d, Y" }} at {{ showtime_datetime|time:"g:i A" }}
Time Until Show: {{ hours_until_show }} hours
{% endif %}

Don't forget to bring your tickets!

See you there!

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            {
                'name': 'Booking Reminder SMS',
                'notification_type': 'booking_reminder',
                'channel': 'sms',
                'subject': '',
                'template_content': '''Reminder: {% if event_title %}{{ event_title }}{% endif %}{% if movie_title %}{{ movie_title }}{% endif %} starts in {{ hours_until_event|default:hours_until_show }} hours. Ref: {{ booking_reference }}. Don't forget your tickets!''',
                'is_active': True,
            },
            
            # Booking Cancellation Templates
            {
                'name': 'Booking Cancellation Email',
                'notification_type': 'booking_cancellation',
                'channel': 'email',
                'subject': 'Booking Cancelled - {{ booking_reference }}',
                'template_content': '''
Dear {{ user_name }},

Your booking has been cancelled as requested.

Booking Reference: {{ booking_reference }}
{% if event_title %}
Event: {{ event_title }}
Date & Time: {{ event_datetime|date:"F d, Y" }} at {{ event_datetime|time:"g:i A" }}
{% endif %}
{% if movie_title %}
Movie: {{ movie_title }}
Showtime: {{ showtime_datetime|date:"F d, Y" }} at {{ showtime_datetime|time:"g:i A" }}
{% endif %}
Cancelled Amount: ${{ refund_amount }}

{% if refund_amount %}
Your refund of ${{ refund_amount }} will be processed within 3-5 business days to your original payment method.
{% endif %}

We're sorry to see you go and hope to serve you again in the future.

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            
            # Event Update Templates
            {
                'name': 'Event Update Email',
                'notification_type': 'event_update',
                'channel': 'email',
                'subject': 'Important Update: {{ event_title }}',
                'template_content': '''
Dear {{ user_name }},

There has been an important update regarding your booked event:

Event: {{ event_title }}
Booking Reference: {{ booking_reference }}

Update Details:
{{ update_message }}

{% if new_datetime %}
New Date & Time: {{ new_datetime|date:"F d, Y" }} at {{ new_datetime|time:"g:i A" }}
{% endif %}

{% if new_venue %}
New Venue: {{ new_venue }}
{% endif %}

Your booking remains valid with these changes. If you have any concerns or cannot attend with the new details, please contact our support team.

Thank you for your understanding.

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            
            # System Maintenance Templates
            {
                'name': 'System Maintenance Email',
                'notification_type': 'system_maintenance',
                'channel': 'email',
                'subject': 'Scheduled System Maintenance',
                'template_content': '''
Dear Valued Customer,

We will be performing scheduled system maintenance to improve our services.

Maintenance Details:
{{ message }}

Scheduled Time: {{ scheduled_time }}

During this time, our platform may be temporarily unavailable. We apologize for any inconvenience and appreciate your patience.

If you have any urgent questions, please contact us at {{ support_email }}.

Thank you for your understanding.

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            
            # Payment Success Templates
            {
                'name': 'Payment Success Email',
                'notification_type': 'payment_success',
                'channel': 'email',
                'subject': 'Payment Successful - {{ booking_reference }}',
                'template_content': '''
Dear {{ user_name }},

Your payment has been successfully processed!

Booking Reference: {{ booking_reference }}
Payment Amount: ${{ payment_amount }}
Payment Method: {{ payment_method }}
Transaction ID: {{ transaction_id }}

Your booking is now confirmed. You should receive a separate booking confirmation email shortly.

Thank you for your payment!

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
            
            # Payment Failed Templates
            {
                'name': 'Payment Failed Email',
                'notification_type': 'payment_failed',
                'channel': 'email',
                'subject': 'Payment Failed - {{ booking_reference }}',
                'template_content': '''
Dear {{ user_name }},

Unfortunately, your payment could not be processed.

Booking Reference: {{ booking_reference }}
Payment Amount: ${{ payment_amount }}
Error: {{ error_message }}

Your booking is currently on hold. Please try again with a different payment method or contact our support team for assistance.

You can retry your payment by logging into your account and viewing your pending bookings.

Best regards,
Movie Booking Team
                ''',
                'is_active': True,
            },
        ]

        created_count = 0
        updated_count = 0

        for template_data in templates:
            template, created = NotificationTemplate.objects.get_or_create(
                notification_type=template_data['notification_type'],
                channel=template_data['channel'],
                defaults=template_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created template: {template_data["name"]}'
                    )
                )
            else:
                # Update existing template
                for key, value in template_data.items():
                    setattr(template, key, value)
                template.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'Updated template: {template_data["name"]}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully processed {created_count + updated_count} templates '
                f'({created_count} created, {updated_count} updated)'
            )
        )