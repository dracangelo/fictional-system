"""
URL configuration for movie_booking_app project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)
from . import views as main_views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation (version-agnostic)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API version information
    path('api/versions/', main_views.api_versions, name='api-versions'),
    path('api/version-info/<str:version>/', main_views.version_info, name='version-info'),
    
    # Versioned API Endpoints
    # V1 (current stable)
    path('api/v1/auth/', include(('users.urls', 'users'), namespace='users-v1')),
    path('api/v1/', include(('events.urls', 'events'), namespace='events-v1')),
    path('api/v1/', include(('theaters.urls', 'theaters'), namespace='theaters-v1')),
    path('api/v1/', include(('bookings.urls', 'bookings'), namespace='bookings-v1')),
    path('api/v1/notifications/', include(('notifications.urls', 'notifications'), namespace='notifications-v1')),
    
    # Default to v1 for backward compatibility (without namespace to maintain compatibility)
    path('api/auth/', include('users.urls')),
    path('api/', include('events.urls')),
    path('api/', include('theaters.urls')),
    path('api/', include('bookings.urls')),
    path('api/notifications/', include('notifications.urls')),
    
    # API documentation and guides
    path('api/', main_views.api_documentation_index, name='api-index'),
    path('api/guides/', main_views.api_guides, name='api-guides'),
    path('api/guides/<str:role>/', main_views.role_guide, name='role-guide'),
    path('api/changelog/', main_views.api_changelog, name='api-changelog'),
    path('api/postman/', main_views.postman_collection_info, name='postman-collection'),
    path('api/sdk/<str:sdk_type>/', main_views.sdk_documentation, name='sdk-docs'),
    path('api/health/', main_views.health_check, name='health-check'),
]
