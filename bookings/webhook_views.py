"""
Webhook views for handling Stripe payment webhooks
"""
import json
import logging
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .payment_service import WebhookService, WebhookError

logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(View):
    """
    Handle Stripe webhook events
    """
    
    def post(self, request):
        """
        Process incoming Stripe webhook
        """
        try:
            # Get raw payload and signature
            payload = request.body
            signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')
            
            if not signature:
                logger.error("Missing Stripe signature in webhook request")
                return HttpResponseBadRequest("Missing signature")
            
            # Verify webhook signature
            if not WebhookService.verify_webhook_signature(payload, signature):
                logger.error("Invalid Stripe webhook signature")
                return HttpResponseBadRequest("Invalid signature")
            
            # Parse webhook data
            try:
                event_data = json.loads(payload.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.error(f"Invalid webhook payload: {str(e)}")
                return HttpResponseBadRequest("Invalid payload")
            
            # Process the webhook event
            try:
                success = WebhookService.process_webhook_event(event_data)
                
                if success:
                    logger.info(f"Successfully processed webhook event: {event_data.get('type')}")
                    return HttpResponse("OK", status=200)
                else:
                    logger.warning(f"Webhook event processing returned false: {event_data.get('type')}")
                    return HttpResponse("Processing failed", status=400)
                    
            except WebhookError as e:
                logger.error(f"Webhook processing error: {str(e)}")
                return HttpResponse(f"Processing error: {str(e)}", status=400)
            
        except Exception as e:
            logger.error(f"Unexpected error in webhook processing: {str(e)}")
            return HttpResponse("Internal server error", status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def stripe_webhook_endpoint(request):
    """
    DRF-based Stripe webhook endpoint
    """
    try:
        # Get raw payload and signature
        payload = request.body
        signature = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        
        if not signature:
            logger.error("Missing Stripe signature in webhook request")
            return Response(
                {"error": "Missing signature"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify webhook signature
        if not WebhookService.verify_webhook_signature(payload, signature):
            logger.error("Invalid Stripe webhook signature")
            return Response(
                {"error": "Invalid signature"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse webhook data
        try:
            event_data = json.loads(payload.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.error(f"Invalid webhook payload: {str(e)}")
            return Response(
                {"error": "Invalid payload"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the webhook event
        try:
            success = WebhookService.process_webhook_event(event_data)
            
            if success:
                logger.info(f"Successfully processed webhook event: {event_data.get('type')}")
                return Response({"status": "success"}, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Webhook event processing returned false: {event_data.get('type')}")
                return Response(
                    {"error": "Processing failed"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except WebhookError as e:
            logger.error(f"Webhook processing error: {str(e)}")
            return Response(
                {"error": f"Processing error: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
    except Exception as e:
        logger.error(f"Unexpected error in webhook processing: {str(e)}")
        return Response(
            {"error": "Internal server error"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_health_check(request):
    """
    Health check endpoint for webhook monitoring
    """
    return Response({
        "status": "healthy",
        "service": "stripe_webhooks",
        "timestamp": request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
    })