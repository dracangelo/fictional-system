"""
API views for ticket validation and management
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json

from .models import Ticket, Booking
from .ticket_services import (
    TicketValidationService,
    TicketStatusManager,
    TicketPDFGenerator
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_ticket(request):
    """
    Validate a ticket for entry
    
    POST /api/tickets/validate/
    {
        "ticket_identifier": "TKT-20241011-ABC12345" or QR code data,
        "scanner_id": "Scanner1"
    }
    """
    ticket_identifier = request.data.get('ticket_identifier')
    scanner_id = request.data.get('scanner_id', 'API')
    
    if not ticket_identifier:
        return Response(
            {'error': 'ticket_identifier is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
        ticket_identifier, scanner_id, "api_scan"
    )
    
    response_data = {
        'is_valid': is_valid,
        'message': message,
        'ticket': None
    }
    
    if ticket:
        response_data['ticket'] = {
            'ticket_number': ticket.ticket_number,
            'booking_reference': ticket.booking.booking_reference,
            'customer_name': ticket.booking.customer.get_full_name() or ticket.booking.customer.username,
            'event_or_movie': ticket.event_or_movie_title,
            'venue': ticket.venue_info,
            'price': str(ticket.price),
            'status': ticket.status,
            'used_at': ticket.used_at.isoformat() if ticket.used_at else None,
            'used_by': ticket.used_by,
        }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_ticket_info(request, ticket_identifier):
    """
    Get ticket information without validating/using it
    
    GET /api/tickets/info/{ticket_identifier}/
    """
    found, info, ticket = TicketValidationService.get_ticket_info(ticket_identifier)
    
    if not found:
        return Response(
            {'error': 'Ticket not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(info, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_ticket_status(request, ticket_id):
    """
    Change ticket status
    
    POST /api/tickets/{ticket_id}/status/
    {
        "new_status": "cancelled",
        "reason": "Customer request",
        "changed_by": "Admin"
    }
    """
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    # Check permissions - only ticket owner, event/theater owner, or admin
    user = request.user
    can_modify = (
        ticket.booking.customer == user or
        (ticket.booking.event and ticket.booking.event.owner == user) or
        (ticket.booking.showtime and ticket.booking.showtime.theater.owner == user) or
        user.is_staff
    )
    
    if not can_modify:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    new_status = request.data.get('new_status')
    reason = request.data.get('reason', '')
    changed_by = request.data.get('changed_by', str(user))
    
    if not new_status:
        return Response(
            {'error': 'new_status is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    success, message = TicketStatusManager.change_ticket_status(
        ticket, new_status, reason, changed_by
    )
    
    if success:
        return Response({
            'success': True,
            'message': message,
            'ticket': {
                'id': ticket.id,
                'ticket_number': ticket.ticket_number,
                'status': ticket.status,
                'used_at': ticket.used_at.isoformat() if ticket.used_at else None,
                'used_by': ticket.used_by,
            }
        })
    else:
        return Response(
            {'error': message},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_ticket_pdf(request, ticket_id):
    """
    Download PDF for a specific ticket
    
    GET /api/tickets/{ticket_id}/pdf/
    """
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    # Check permissions - only ticket owner or event/theater owner
    user = request.user
    can_download = (
        ticket.booking.customer == user or
        (ticket.booking.event and ticket.booking.event.owner == user) or
        (ticket.booking.showtime and ticket.booking.showtime.theater.owner == user) or
        user.is_staff
    )
    
    if not can_download:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        pdf_bytes = ticket.generate_pdf()
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ticket_{ticket.ticket_number}.pdf"'
        return response
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate PDF: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_booking_pdf(request, booking_id):
    """
    Download PDF for all tickets in a booking
    
    GET /api/bookings/{booking_id}/tickets/pdf/
    """
    booking = get_object_or_404(Booking, id=booking_id)
    
    # Check permissions - only booking owner or event/theater owner
    user = request.user
    can_download = (
        booking.customer == user or
        (booking.event and booking.event.owner == user) or
        (booking.showtime and booking.showtime.theater.owner == user) or
        user.is_staff
    )
    
    if not can_download:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        pdf_bytes = booking.generate_tickets_pdf()
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="booking_{booking.booking_reference}_tickets.pdf"'
        return response
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate PDF: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_expire_tickets(request):
    """
    Bulk expire old tickets (admin only)
    
    POST /api/tickets/bulk-expire/
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin access required'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    expired_count = TicketStatusManager.expire_old_tickets()
    
    return Response({
        'success': True,
        'expired_count': expired_count,
        'message': f'Expired {expired_count} old tickets'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking_tickets(request, booking_id):
    """
    Cancel all tickets in a booking
    
    POST /api/bookings/{booking_id}/cancel-tickets/
    {
        "reason": "Customer cancellation"
    }
    """
    booking = get_object_or_404(Booking, id=booking_id)
    
    # Check permissions - only booking owner or admin
    user = request.user
    can_cancel = (
        booking.customer == user or
        user.is_staff
    )
    
    if not can_cancel:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    reason = request.data.get('reason', 'Booking cancelled')
    
    cancelled_count = TicketStatusManager.bulk_cancel_tickets(booking, reason)
    
    return Response({
        'success': True,
        'cancelled_count': cancelled_count,
        'message': f'Cancelled {cancelled_count} tickets'
    })


# Scanner interface views (for venue entry systems)

@csrf_exempt
@require_http_methods(["POST"])
def scanner_validate_ticket(request):
    """
    Simple ticket validation endpoint for scanner devices
    
    POST /api/scanner/validate/
    {
        "qr_data": "TKT-20241011-ABC12345|BOOK123|456|signature",
        "scanner_id": "Entry_Scanner_1"
    }
    
    Returns simple JSON response suitable for scanner displays
    """
    try:
        data = json.loads(request.body)
        qr_data = data.get('qr_data')
        scanner_id = data.get('scanner_id', 'Scanner')
        
        if not qr_data:
            return HttpResponse(
                json.dumps({'valid': False, 'message': 'No QR data provided'}),
                content_type='application/json',
                status=400
            )
        
        is_valid, message, ticket = TicketValidationService.validate_ticket_for_entry(
            qr_data, scanner_id, "qr_scan"
        )
        
        response_data = {
            'valid': is_valid,
            'message': message,
            'timestamp': ticket.used_at.isoformat() if ticket and ticket.used_at else None
        }
        
        if ticket and is_valid:
            response_data.update({
                'ticket_number': ticket.ticket_number,
                'customer': ticket.booking.customer.get_full_name() or ticket.booking.customer.username,
                'event': ticket.event_or_movie_title,
                'venue': ticket.venue_info,
            })
        
        return HttpResponse(
            json.dumps(response_data),
            content_type='application/json',
            status=200
        )
        
    except json.JSONDecodeError:
        return HttpResponse(
            json.dumps({'valid': False, 'message': 'Invalid JSON'}),
            content_type='application/json',
            status=400
        )
    except Exception as e:
        return HttpResponse(
            json.dumps({'valid': False, 'message': f'Error: {str(e)}'}),
            content_type='application/json',
            status=500
        )


@csrf_exempt
@require_http_methods(["POST"])
def scanner_get_ticket_info(request):
    """
    Get ticket info for scanner displays without validating
    
    POST /api/scanner/info/
    {
        "qr_data": "TKT-20241011-ABC12345|BOOK123|456|signature"
    }
    """
    try:
        data = json.loads(request.body)
        qr_data = data.get('qr_data')
        
        if not qr_data:
            return HttpResponse(
                json.dumps({'found': False, 'message': 'No QR data provided'}),
                content_type='application/json',
                status=400
            )
        
        # Extract ticket number from QR data
        parts = qr_data.split('|')
        if len(parts) < 1:
            return HttpResponse(
                json.dumps({'found': False, 'message': 'Invalid QR format'}),
                content_type='application/json',
                status=400
            )
        
        ticket_number = parts[0]
        found, info, ticket = TicketValidationService.get_ticket_info(ticket_number)
        
        if not found:
            return HttpResponse(
                json.dumps({'found': False, 'message': 'Ticket not found'}),
                content_type='application/json',
                status=404
            )
        
        # Simplified response for scanner displays
        scanner_info = {
            'found': True,
            'ticket_number': info['ticket_number'],
            'customer_name': info['customer_name'],
            'title': info['title'],
            'venue': info.get('venue', info.get('theater', 'Unknown')),
            'status': info['status'],
            'is_valid': info['is_valid_for_entry'],
            'message': info['validity_message'],
            'used_at': info['used_at'],
            'used_by': info['used_by'],
        }
        
        return HttpResponse(
            json.dumps(scanner_info),
            content_type='application/json',
            status=200
        )
        
    except json.JSONDecodeError:
        return HttpResponse(
            json.dumps({'found': False, 'message': 'Invalid JSON'}),
            content_type='application/json',
            status=400
        )
    except Exception as e:
        return HttpResponse(
            json.dumps({'found': False, 'message': f'Error: {str(e)}'}),
            content_type='application/json',
            status=500
        )