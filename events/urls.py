from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, search_views

app_name = 'events'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'ticket-types', views.TicketTypeViewSet, basename='tickettype')
router.register(r'discounts', views.DiscountViewSet, basename='discount')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Search and discovery endpoints
    path('search/events/', search_views.search_events, name='search-events'),
    path('search/movies/', search_views.search_movies, name='search-movies'),
    path('search/popular/', search_views.get_popular_searches, name='popular-searches'),
    path('search/nearby/', search_views.search_nearby, name='search-nearby'),
    path('search/history/', search_views.get_search_history, name='search-history'),
    path('search/analytics/', search_views.get_search_analytics, name='search-analytics'),
    
    # Recommendation endpoints
    path('recommendations/', search_views.get_recommendations, name='recommendations'),
    path('similar/<str:content_type>/<int:content_id>/', search_views.get_similar_content, name='similar-content'),
    
    # Category browsing endpoints
    path('categories/', search_views.browse_categories, name='browse-categories'),
    path('browse/<str:category_type>/<str:category_name>/', search_views.browse_by_category, name='browse-by-category'),
    path('featured/', search_views.get_featured_content, name='featured-content'),
]