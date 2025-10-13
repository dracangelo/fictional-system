"""
Payment processing service for handling Stripe payments and webhooks
"""
import stripe
import logging
from decimal import Decimal
from typing import Dict, Optional, Tuple, Any
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Booking

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class PaymentError(Exception):
    """Base exception for payment processing errors"""
    pass


class PaymentProcessingError(PaymentError):
    """Raised when payment processing fails"""
    pass


class RefundError(PaymentError):
    """Raised when refund processing fails"""
    pass


class WebhookError(PaymentError):
    """Raised when webhook processing fails"""
    pass


class PaymentService:
    """Service for handling Stripe payment processing"""
    
    @staticmethod
    def create_payment_intent(
        booking: Booking,
        payment_method_id: Optional[str] = None,
        confirm: bool = False,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe PaymentIntent for a booking
        
        Args:
            booking: Booking instance to create payment for
            payment_method_id: Optional payment method ID for immediate confirmation
            confirm: Whether to confirm the payment immediately
            metadata: Additional metadata to attach to the payment
            
        Returns:
            Dictionary containing PaymentIntent data
            
        Raises:
            PaymentProcessingError: If payment intent creation fails
        """
        try:
            # Convert amount to cents (Stripe expects integer cents)
            amount_cents = int(booking.total_amount * 100)
            
            # Prepare metadata
            payment_metadata = {
                'booking_id': str(booking.id),
                'booking_reference': booking.booking_reference,
                'customer_id': str(booking.customer.id),
                'booking_type': booking.booking_type,
            }
            
            if metadata:
                payment_metadata.update(metadata)
            
            # Create PaymentIntent
            intent_data = {
                'amount': amount_cents,
                'currency': 'usd',
                'metadata': payment_metadata,
                'description': f'Booking {booking.booking_reference} - {booking.event_or_showtime_title}',
            }
            
            # Add payment method if provided
            if payment_method_id:
                intent_data['payment_method'] = payment_method_id
                intent_data['confirmation_method'] = 'manual'
                intent_data['confirm'] = confirm
            
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            # Update booking with payment intent ID
            with transaction.atomic():
                booking = Booking.objects.select_for_update().get(id=booking.id)
                booking.payment_transaction_id = payment_intent.id
                booking.payment_status = 'processing'
                booking.save()
            
            logger.info(f"Created PaymentIntent {payment_intent.id} for booking {booking.booking_reference}")
            
            return {
                'payment_intent_id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'status': payment_intent.status,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating PaymentIntent for booking {booking.booking_reference}: {str(e)}")
            raise PaymentProcessingError(f"Failed to create payment: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating PaymentIntent for booking {booking.booking_reference}: {str(e)}")
            raise PaymentProcessingError(f"Payment processing failed: {str(e)}")
    
    @staticmethod
    def confirm_payment_intent(
        payment_intent_id: str,
        payment_method_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Confirm a PaymentIntent
        
        Args:
            payment_intent_id: Stripe PaymentIntent ID
            payment_method_id: Optional payment method ID
            
        Returns:
            Dictionary containing confirmation result
            
        Raises:
            PaymentProcessingError: If confirmation fails
        """
        try:
            confirm_data = {}
            if payment_method_id:
                confirm_data['payment_method'] = payment_method_id
            
            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent_id,
                **confirm_data
            )
            
            logger.info(f"Confirmed PaymentIntent {payment_intent_id}")
            
            return {
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status,
                'requires_action': payment_intent.status == 'requires_action',
                'client_secret': payment_intent.client_secret,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming PaymentIntent {payment_intent_id}: {str(e)}")
            raise PaymentProcessingError(f"Failed to confirm payment: {str(e)}")
    
    @staticmethod
    def retrieve_payment_intent(payment_intent_id: str) -> Dict[str, Any]:
        """
        Retrieve PaymentIntent details from Stripe
        
        Args:
            payment_intent_id: Stripe PaymentIntent ID
            
        Returns:
            Dictionary containing PaymentIntent data
            
        Raises:
            PaymentProcessingError: If retrieval fails
        """
        try:
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            return {
                'payment_intent_id': payment_intent.id,
                'status': payment_intent.status,
                'amount': payment_intent.amount,
                'currency': payment_intent.currency,
                'metadata': payment_intent.metadata,
                'charges': [
                    {
                        'id': charge.id,
                        'amount': charge.amount,
                        'status': charge.status,
                        'payment_method': charge.payment_method,
                    }
                    for charge in payment_intent.charges.data
                ],
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving PaymentIntent {payment_intent_id}: {str(e)}")
            raise PaymentProcessingError(f"Failed to retrieve payment: {str(e)}")
    
    @staticmethod
    @transaction.atomic
    def process_successful_payment(payment_intent_id: str) -> bool:
        """
        Process a successful payment and update booking status
        
        Args:
            payment_intent_id: Stripe PaymentIntent ID
            
        Returns:
            True if processing was successful
            
        Raises:
            PaymentProcessingError: If processing fails
        """
        try:
            # Find booking by payment intent ID
            booking = Booking.objects.select_for_update().get(
                payment_transaction_id=payment_intent_id
            )
            
            # Retrieve payment details from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if payment_intent.status != 'succeeded':
                raise PaymentProcessingError(f"Payment not successful: {payment_intent.status}")
            
            # Update booking status
            booking.payment_status = 'completed'
            booking.booking_status = 'confirmed'
            
            # Extract payment method information
            if payment_intent.charges.data:
                charge = payment_intent.charges.data[0]
                booking.payment_method = charge.payment_method_details.type if charge.payment_method_details else 'card'
            
            booking.save()
            
            logger.info(f"Successfully processed payment for booking {booking.booking_reference}")
            
            # Send payment success notification
            from notifications.tasks import send_notification_task
            
            context_data = {
                'user_name': booking.customer.get_full_name() or booking.customer.username,
                'booking_reference': booking.booking_reference,
                'payment_amount': str(booking.total_amount),
                'payment_method': booking.payment_method or 'card',
                'transaction_id': payment_intent_id
            }
            
            # Queue payment success notification
            send_notification_task.delay(
                user_id=booking.customer.id,
                notification_type='payment_success',
                context_data=context_data,
                related_object_id=booking.id,
                related_object_type='booking'
            )
            
            return True
            
        except Booking.DoesNotExist:
            logger.error(f"No booking found for PaymentIntent {payment_intent_id}")
            raise PaymentProcessingError("Booking not found for payment")
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error processing successful payment {payment_intent_id}: {str(e)}")
            raise PaymentProcessingError(f"Failed to process payment: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error processing payment {payment_intent_id}: {str(e)}")
            raise PaymentProcessingError(f"Payment processing failed: {str(e)}")
    
    @staticmethod
    @transaction.atomic
    def process_failed_payment(payment_intent_id: str, failure_reason: str = '') -> bool:
        """
        Process a failed payment and update booking status
        
        Args:
            payment_intent_id: Stripe PaymentIntent ID
            failure_reason: Reason for payment failure
            
        Returns:
            True if processing was successful
        """
        try:
            # Find booking by payment intent ID
            booking = Booking.objects.select_for_update().get(
                payment_transaction_id=payment_intent_id
            )
            
            # Update booking status
            booking.payment_status = 'failed'
            booking.booking_status = 'cancelled'
            booking.save()
            
            # Release reserved seats/tickets
            from .services import BookingService
            BookingService.cancel_booking(booking, f"Payment failed: {failure_reason}")
            
            logger.info(f"Processed failed payment for booking {booking.booking_reference}")
            
            # Send payment failure notification
            from notifications.tasks import send_notification_task
            
            context_data = {
                'user_name': booking.customer.get_full_name() or booking.customer.username,
                'booking_reference': booking.booking_reference,
                'payment_amount': str(booking.total_amount),
                'error_message': failure_reason or 'Payment processing failed'
            }
            
            # Queue payment failure notification
            send_notification_task.delay(
                user_id=booking.customer.id,
                notification_type='payment_failed',
                context_data=context_data,
                related_object_id=booking.id,
                related_object_type='booking'
            )
            
            return True
            
        except Booking.DoesNotExist:
            logger.error(f"No booking found for PaymentIntent {payment_intent_id}")
            return False
        except Exception as e:
            logger.error(f"Error processing failed payment {payment_intent_id}: {str(e)}")
            return False
    
    @staticmethod
    def create_refund(
        booking: Booking,
        amount: Optional[Decimal] = None,
        reason: str = 'requested_by_customer'
    ) -> Dict[str, Any]:
        """
        Create a refund for a booking
        
        Args:
            booking: Booking instance to refund
            amount: Optional partial refund amount (defaults to full refund)
            reason: Reason for refund
            
        Returns:
            Dictionary containing refund data
            
        Raises:
            RefundError: If refund creation fails
        """
        try:
            if not booking.payment_transaction_id:
                raise RefundError("No payment transaction found for booking")
            
            if booking.payment_status != 'completed':
                raise RefundError("Cannot refund booking with non-completed payment")
            
            # Retrieve the PaymentIntent to get the charge ID
            payment_intent = stripe.PaymentIntent.retrieve(booking.payment_transaction_id)
            
            if not payment_intent.charges.data:
                raise RefundError("No charges found for payment")
            
            charge_id = payment_intent.charges.data[0].id
            
            # Calculate refund amount
            refund_amount_cents = int((amount or booking.total_amount) * 100)
            
            # Create refund
            refund = stripe.Refund.create(
                charge=charge_id,
                amount=refund_amount_cents,
                reason=reason,
                metadata={
                    'booking_id': str(booking.id),
                    'booking_reference': booking.booking_reference,
                }
            )
            
            # Update booking status
            with transaction.atomic():
                booking = Booking.objects.select_for_update().get(id=booking.id)
                
                if refund_amount_cents >= int(booking.total_amount * 100):
                    booking.payment_status = 'refunded'
                else:
                    booking.payment_status = 'partially_refunded'
                
                booking.save()
            
            logger.info(f"Created refund {refund.id} for booking {booking.booking_reference}")
            
            return {
                'refund_id': refund.id,
                'amount': refund.amount,
                'currency': refund.currency,
                'status': refund.status,
                'reason': refund.reason,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund for booking {booking.booking_reference}: {str(e)}")
            raise RefundError(f"Failed to create refund: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error creating refund for booking {booking.booking_reference}: {str(e)}")
            raise RefundError(f"Refund processing failed: {str(e)}")
    
    @staticmethod
    def retry_failed_payment(
        booking: Booking,
        payment_method_id: str,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Retry a failed payment with exponential backoff
        
        Args:
            booking: Booking instance to retry payment for
            payment_method_id: New payment method ID
            max_retries: Maximum number of retry attempts
            
        Returns:
            Dictionary containing retry result
            
        Raises:
            PaymentProcessingError: If all retries fail
        """
        import time
        import random
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Create new PaymentIntent for retry
                result = PaymentService.create_payment_intent(
                    booking=booking,
                    payment_method_id=payment_method_id,
                    confirm=True,
                    metadata={'retry_attempt': str(attempt + 1)}
                )
                
                logger.info(f"Payment retry {attempt + 1} successful for booking {booking.booking_reference}")
                return result
                
            except PaymentProcessingError as e:
                last_error = e
                
                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning(
                        f"Payment retry {attempt + 1} failed for booking {booking.booking_reference}. "
                        f"Retrying in {delay:.2f} seconds..."
                    )
                    time.sleep(delay)
                else:
                    logger.error(f"All payment retries failed for booking {booking.booking_reference}")
        
        if last_error:
            raise last_error
        
        raise PaymentProcessingError("Payment retry failed")


class WebhookService:
    """Service for handling Stripe webhooks"""
    
    @staticmethod
    def verify_webhook_signature(payload: bytes, signature: str) -> bool:
        """
        Verify Stripe webhook signature
        
        Args:
            payload: Raw webhook payload
            signature: Stripe signature header
            
        Returns:
            True if signature is valid
        """
        try:
            webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
            if not webhook_secret:
                logger.warning("STRIPE_WEBHOOK_SECRET not configured")
                return False
            
            stripe.Webhook.construct_event(payload, signature, webhook_secret)
            return True
            
        except ValueError:
            logger.error("Invalid webhook payload")
            return False
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid webhook signature")
            return False
    
    @staticmethod
    def process_webhook_event(event_data: Dict) -> bool:
        """
        Process a Stripe webhook event
        
        Args:
            event_data: Webhook event data
            
        Returns:
            True if event was processed successfully
            
        Raises:
            WebhookError: If event processing fails
        """
        try:
            event_type = event_data.get('type')
            event_object = event_data.get('data', {}).get('object', {})
            
            logger.info(f"Processing webhook event: {event_type}")
            
            if event_type == 'payment_intent.succeeded':
                return WebhookService._handle_payment_succeeded(event_object)
            
            elif event_type == 'payment_intent.payment_failed':
                return WebhookService._handle_payment_failed(event_object)
            
            elif event_type == 'payment_intent.requires_action':
                return WebhookService._handle_payment_requires_action(event_object)
            
            elif event_type == 'charge.dispute.created':
                return WebhookService._handle_dispute_created(event_object)
            
            elif event_type == 'invoice.payment_succeeded':
                # Handle subscription payments if needed in the future
                logger.info(f"Received invoice payment succeeded event: {event_object.get('id')}")
                return True
            
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
                return True
            
        except Exception as e:
            logger.error(f"Error processing webhook event {event_data.get('id')}: {str(e)}")
            raise WebhookError(f"Webhook processing failed: {str(e)}")
    
    @staticmethod
    def _handle_payment_succeeded(payment_intent: Dict) -> bool:
        """Handle successful payment webhook"""
        try:
            payment_intent_id = payment_intent.get('id')
            PaymentService.process_successful_payment(payment_intent_id)
            return True
        except Exception as e:
            logger.error(f"Error handling payment succeeded webhook: {str(e)}")
            return False
    
    @staticmethod
    def _handle_payment_failed(payment_intent: Dict) -> bool:
        """Handle failed payment webhook"""
        try:
            payment_intent_id = payment_intent.get('id')
            failure_reason = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
            PaymentService.process_failed_payment(payment_intent_id, failure_reason)
            return True
        except Exception as e:
            logger.error(f"Error handling payment failed webhook: {str(e)}")
            return False
    
    @staticmethod
    def _handle_payment_requires_action(payment_intent: Dict) -> bool:
        """Handle payment requiring additional action"""
        try:
            payment_intent_id = payment_intent.get('id')
            logger.info(f"Payment {payment_intent_id} requires additional action")
            
            # Update booking status to indicate action required
            try:
                booking = Booking.objects.get(payment_transaction_id=payment_intent_id)
                booking.payment_status = 'processing'
                booking.save()
            except Booking.DoesNotExist:
                logger.warning(f"No booking found for PaymentIntent {payment_intent_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error handling payment requires action webhook: {str(e)}")
            return False
    
    @staticmethod
    def _handle_dispute_created(charge: Dict) -> bool:
        """Handle chargeback/dispute creation"""
        try:
            charge_id = charge.get('id')
            dispute_reason = charge.get('dispute', {}).get('reason', 'Unknown')
            
            logger.warning(f"Dispute created for charge {charge_id}: {dispute_reason}")
            
            # TODO: Implement dispute handling logic
            # - Notify administrators
            # - Update booking status if needed
            # - Gather evidence for dispute response
            
            return True
        except Exception as e:
            logger.error(f"Error handling dispute created webhook: {str(e)}")
            return False