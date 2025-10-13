from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'theaters'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'theaters', views.TheaterViewSet, basename='theater')
router.register(r'movies', views.MovieViewSet, basename='movie')
router.register(r'showtimes', views.ShowtimeViewSet, basename='showtime')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]