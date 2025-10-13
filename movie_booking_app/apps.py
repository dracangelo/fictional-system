"""
App configuration for movie booking app
"""

from django.apps import AppConfig


class MovieBookingAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'movie_booking_app'
    
    def ready(self):
        """Import signal handlers when app is ready"""
        import movie_booking_app.signals