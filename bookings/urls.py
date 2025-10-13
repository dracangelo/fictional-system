from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, ticket_views, payment_views, webhook_views

app_name = 'bookings'

# Create router for ViewSets (if we add any later)
router = DefaultRouter()

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Ticket validation and management endpoints
    path('tickets/validate/', ticket_views.validate_ticket, name='validate_ticket'),
    path('tickets/info/<str:ticket_identifier>/', ticket_views.get_ticket_info, name='get_ticket_info'),
    path('tickets/<int:ticket_id>/status/', ticket_views.change_ticket_status, name='change_ticket_status'),
    path('tickets/<int:ticket_id>/pdf/', ticket_views.download_ticket_pdf, name='download_ticket_pdf'),
    path('tickets/bulk-expire/', ticket_views.bulk_expire_tickets, name='bulk_expire_tickets'),
    
    # Booking-related ticket endpoints
    path('bookings/<int:booking_id>/tickets/pdf/', ticket_views.download_booking_pdf, name='download_booking_pdf'),
    path('bookings/<int:booking_id>/cancel-tickets/', ticket_views.cancel_booking_tickets, name='cancel_booking_tickets'),
    
    # Scanner interface endpoints (for venue entry systems)
    path('scanner/validate/', ticket_views.scanner_validate_ticket, name='scanner_validate_ticket'),
    path('scanner/info/', ticket_views.scanner_get_ticket_info, name='scanner_get_ticket_info'),
    
    # Payment processing endpoints
    path('bookings/<int:booking_id>/payment/intent/', payment_views.create_payment_intent, name='create_payment_intent'),
    path('bookings/<int:booking_id>/payment/confirm/', payment_views.confirm_payment_intent, name='confirm_payment_intent'),
    path('bookings/<int:booking_id>/payment/status/', payment_views.get_payment_status, name='get_payment_status'),
    path('bookings/<int:booking_id>/payment/refund/', payment_views.request_refund, name='request_refund'),
    path('bookings/<int:booking_id>/payment/retry/', payment_views.retry_payment, name='retry_payment'),
    path('payment/config/', payment_views.get_stripe_config, name='get_stripe_config'),
    
    # Stripe webhook endpoints
    path('webhooks/stripe/', webhook_views.stripe_webhook_endpoint, name='stripe_webhook'),
    path('webhooks/stripe/class/', webhook_views.StripeWebhookView.as_view(), name='stripe_webhook_class'),
    path('webhooks/health/', webhook_views.webhook_health_check, name='webhook_health_check'),
]