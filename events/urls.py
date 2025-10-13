from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'events'

# Create router for ViewSets
router = DefaultRouter()
router.register(r'events', views.EventViewSet, basename='event')
router.register(r'ticket-types', views.TicketTypeViewSet, basename='tickettype')
router.register(r'discounts', views.DiscountViewSet, basename='discount')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
]