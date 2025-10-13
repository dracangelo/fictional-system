"""
Celery configuration for movie_booking_app project.
"""
import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_booking_app.settings')

app = Celery('movie_booking_app')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Celery Beat configuration for periodic tasks
app.conf.beat_schedule = {
    'send-booking-reminders': {
        'task': 'bookings.tasks.send_booking_reminders',
        'schedule': 60.0,  # Run every minute (for testing, adjust as needed)
    },
    'cleanup-expired-bookings': {
        'task': 'bookings.tasks.cleanup_expired_bookings',
        'schedule': 3600.0,  # Run every hour
    },
}

app.conf.timezone = 'UTC'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')