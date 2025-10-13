from django.urls import path
from . import admin_views

app_name = 'admin'

urlpatterns = [
    # Admin analytics endpoints
    path('analytics/', admin_views.AdminAnalyticsView.as_view(), name='analytics'),
    path('dashboard/summary/', admin_views.admin_dashboard_summary, name='dashboard_summary'),
    
    # User management endpoints
    path('users/', admin_views.AdminUserManagementView.as_view(), name='user_list'),
    path('users/<int:user_id>/', admin_views.AdminUserManagementView.as_view(), name='user_detail'),
    path('users/<int:user_id>/activity/', admin_views.AdminUserActivityView.as_view(), name='user_activity'),
    
    # Audit logging endpoints
    path('audit-logs/', admin_views.AdminAuditLogView.as_view(), name='audit_logs'),
    
    # Content moderation endpoints
    path('moderation/', admin_views.AdminContentModerationView.as_view(), name='moderation_queue'),
    path('moderation/<int:item_id>/', admin_views.AdminContentModerationView.as_view(), name='moderation_item'),
    
    # System health endpoints
    path('health/', admin_views.AdminSystemHealthView.as_view(), name='system_health'),
]