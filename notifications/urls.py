from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # User notification preferences
    path('preferences/', views.NotificationPreferenceView.as_view(), name='preferences'),
    path('opt-out-all/', views.opt_out_all_notifications, name='opt_out_all'),
    path('opt-in-essential/', views.opt_in_essential_notifications, name='opt_in_essential'),
    
    # Notification logs
    path('logs/', views.NotificationLogListView.as_view(), name='logs'),
    path('admin/logs/', views.AdminNotificationLogListView.as_view(), name='admin_logs'),
    
    # Notification templates (admin)
    path('templates/', views.NotificationTemplateListView.as_view(), name='templates'),
    path('templates/<int:pk>/', views.NotificationTemplateDetailView.as_view(), name='template_detail'),
    
    # Bulk notifications (admin)
    path('send-bulk/', views.SendBulkNotificationView.as_view(), name='send_bulk'),
    
    # Test notifications
    path('test/', views.TestNotificationView.as_view(), name='test'),
]