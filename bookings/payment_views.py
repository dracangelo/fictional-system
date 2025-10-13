"""
Payment-related API views for booking system
"""
import logging
from decimal import Decimal, InvalidOperation
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError

from .models import Booking
from .services import BookingService
from .payment_service import PaymentService, PaymentProcessingError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request, booking_id):
    """
    Create a Stripe PaymentIntent for a booking
    
    POST /api/bookings/{booking_id}/payment/intent/
    
    Request body:
    {
        "payment_method_id": "pm_1234567890",  // Optional
        "confirm_immediately": false           // Optional
    }
    """
    try:
        # Get booking and verify ownership
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.customer != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate booking status
        if booking.payment_status not in ['pending', 'failed']:
            return Response(
                {"error": f"Cannot create payment for booking with status: {booking.payment_status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get request data
        payment_method_id = request.data.get('payment_method_id')
        confirm_immediately = request.data.get('confirm_immediately', False)
        
        # Process payment
        result = BookingService.process_booking_payment(
            booking=booking,
            payment_method_id=payment_method_id,
            confirm_immediately=confirm_immediately
        )
        
        if result['success']:
            return Response({
                "payment_intent_id": result['payment_intent_id'],
                "client_secret": result['client_secret'],
                "status": result['status'],
                "requires_action": result.get('requires_action', False),
                "booking_reference": booking.booking_reference,
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                "error": result['error'],
                "error_type": result['error_type']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error creating payment intent for booking {booking_id}: {str(e)}")
        return Response(
            {"error": "Payment processing failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment_intent(request, booking_id):
    """
    Confirm a PaymentIntent for a booking
    
    POST /api/bookings/{booking_id}/payment/confirm/
    
    Request body:
    {
        "payment_method_id": "pm_1234567890"  // Optional
    }
    """
    try:
        # Get booking and verify ownership
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.customer != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get payment method ID
        payment_method_id = request.data.get('payment_method_id')
        
        # Confirm payment
        result = BookingService.confirm_booking_payment(
            booking=booking,
            payment_method_id=payment_method_id
        )
        
        if result['success']:
            return Response({
                "status": result['status'],
                "requires_action": result.get('requires_action', False),
                "client_secret": result.get('client_secret'),
                "booking_reference": booking.booking_reference,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": result['error'],
                "error_type": result['error_type']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error confirming payment for booking {booking_id}: {str(e)}")
        return Response(
            {"error": "Payment confirmation failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_status(request, booking_id):
    """
    Get payment status for a booking
    
    GET /api/bookings/{booking_id}/payment/status/
    """
    try:
        # Get booking and verify ownership
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.customer != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get payment details from Stripe if available
        payment_details = None
        if booking.payment_transaction_id:
            try:
                payment_details = PaymentService.retrieve_payment_intent(
                    booking.payment_transaction_id
                )
            except PaymentProcessingError as e:
                logger.warning(f"Could not retrieve payment details: {str(e)}")
        
        return Response({
            "booking_reference": booking.booking_reference,
            "payment_status": booking.payment_status,
            "booking_status": booking.booking_status,
            "total_amount": str(booking.total_amount),
            "payment_method": booking.payment_method,
            "payment_transaction_id": booking.payment_transaction_id,
            "stripe_details": payment_details,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting payment status for booking {booking_id}: {str(e)}")
        return Response(
            {"error": "Failed to retrieve payment status"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_refund(request, booking_id):
    """
    Request a refund for a booking
    
    POST /api/bookings/{booking_id}/payment/refund/
    
    Request body:
    {
        "amount": "50.00",                    // Optional partial refund amount
        "reason": "requested_by_customer"     // Optional reason
    }
    """
    try:
        # Get booking and verify ownership
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.customer != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get refund parameters
        refund_amount = None
        if 'amount' in request.data:
            try:
                refund_amount = Decimal(str(request.data['amount']))
                if refund_amount <= 0 or refund_amount > booking.total_amount:
                    return Response(
                        {"error": "Invalid refund amount"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (InvalidOperation, ValueError):
                return Response(
                    {"error": "Invalid refund amount format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        reason = request.data.get('reason', 'requested_by_customer')
        
        # Process refund
        result = BookingService.process_booking_refund(
            booking=booking,
            refund_amount=refund_amount,
            reason=reason
        )
        
        if result['success']:
            return Response({
                "refund_id": result['refund_id'],
                "amount": result['amount'],
                "status": result['status'],
                "booking_reference": booking.booking_reference,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": result['error'],
                "error_type": result['error_type']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error processing refund for booking {booking_id}: {str(e)}")
        return Response(
            {"error": "Refund processing failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def retry_payment(request, booking_id):
    """
    Retry payment for a failed booking
    
    POST /api/bookings/{booking_id}/payment/retry/
    
    Request body:
    {
        "payment_method_id": "pm_1234567890"  // Required
    }
    """
    try:
        # Get booking and verify ownership
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.customer != request.user:
            return Response(
                {"error": "You don't have permission to access this booking"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate payment method ID
        payment_method_id = request.data.get('payment_method_id')
        if not payment_method_id:
            return Response(
                {"error": "payment_method_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Retry payment
        result = BookingService.retry_booking_payment(
            booking=booking,
            payment_method_id=payment_method_id
        )
        
        if result['success']:
            return Response({
                "payment_intent_id": result['payment_intent_id'],
                "client_secret": result['client_secret'],
                "status": result['status'],
                "booking_reference": booking.booking_reference,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                "error": result['error'],
                "error_type": result['error_type']
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        logger.error(f"Error retrying payment for booking {booking_id}: {str(e)}")
        return Response(
            {"error": "Payment retry failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stripe_config(request):
    """
    Get Stripe configuration for frontend
    
    GET /api/payment/config/
    """
    from django.conf import settings
    
    return Response({
        "publishable_key": getattr(settings, 'STRIPE_PUBLISHABLE_KEY', ''),
        "currency": "usd",
        "processing_fee_rate": getattr(settings, 'PAYMENT_PROCESSING_FEE_RATE', 0.03),
    }, status=status.HTTP_200_OK)