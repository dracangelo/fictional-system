from django.urls import path
from . import analytics_views

app_name = 'analytics'

urlpatterns = [
    # System analytics (admin only)
    path('system/', analytics_views.system_analytics, name='system_analytics'),
    
    # Event analytics
    path('events/<int:event_id>/', analytics_views.event_analytics, name='event_analytics'),
    
    # Theater analytics
    path('theaters/<int:theater_id>/', analytics_views.theater_analytics, name='theater_analytics'),
    
    # Trend analysis
    path('trends/<str:entity_type>/<int:entity_id>/', analytics_views.trend_analysis, name='trend_analysis'),
    
    # Recommendation insights
    path('insights/', analytics_views.recommendation_insights, name='recommendation_insights'),
    
    # Report exports
    path('reports/<str:report_type>/', analytics_views.export_report, name='export_system_report'),
    path('reports/<str:report_type>/<int:entity_id>/', analytics_views.export_report, name='export_entity_report'),
]