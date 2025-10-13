"""
App configuration for movie booking app
"""

from django.apps import AppConfig


class MovieBookingAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'movie_booking_app'
    verbose_name = 'Movie Booking App'
    
    def ready(self):
        """Initialize error handling when Django is ready."""
        import sys
        # Only initialize in the main process, not in management commands
        if any(cmd in sys.argv for cmd in ['runserver', 'gunicorn', 'uwsgi']):
            try:
                from movie_booking_app.error_setup import initialize_error_handling
                initialize_error_handling()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error handling initialization failed: {e}")
    
    def ready(self):
        """Import signal handlers when app is ready"""
        import movie_booking_app.signals