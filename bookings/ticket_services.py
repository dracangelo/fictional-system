"""
Ticket generation and management services for the booking system.
Handles ticket PDF generation, QR code creation, and validation logic.
"""

import qrcode
import base64
import secrets
import string
import hashlib
import json
from io import BytesIO
from datetime import timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Union

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from django.core.exceptions import ValidationError

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import black, white, grey
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing

from .models import Ticket, Booking


class TicketNumberGenerator:
    """Service for generating unique ticket numbers with various algorithms"""
    
    @staticmethod
    def generate_standard_ticket_number() -> str:
        """
        Generate standard ticket number with format: TKT-YYYYMMDD-XXXXXXXX
        
        Returns:
            Unique ticket number string
        """
        while True:
            # Generate a ticket number with format: TKT-YYYYMMDD-XXXXXXXX
            date_part = timezone.now().strftime('%Y%m%d')
            random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            ticket_number = f"TKT-{date_part}-{random_part}"
            
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
    
    @staticmethod
    def generate_sequential_ticket_number(event_id: Optional[int] = None, showtime_id: Optional[int] = None) -> str:
        """
        Generate sequential ticket number for specific event or showtime
        
        Args:
            event_id: Event ID for event tickets
            showtime_id: Showtime ID for movie tickets
            
        Returns:
            Sequential ticket number string
        """
        while True:
            if event_id:
                # Count existing tickets for this event
                existing_count = Ticket.objects.filter(
                    booking__event_id=event_id
                ).count()
                prefix = f"EVT{event_id:06d}"
            elif showtime_id:
                # Count existing tickets for this showtime
                existing_count = Ticket.objects.filter(
                    booking__showtime_id=showtime_id
                ).count()
                prefix = f"SHW{showtime_id:06d}"
            else:
                # General sequential numbering
                existing_count = Ticket.objects.count()
                prefix = "TKT"
            
            sequence_number = existing_count + 1
            ticket_number = f"{prefix}-{sequence_number:08d}"
            
            # Check for uniqueness (in case of race conditions)
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number
    
    @staticmethod
    def generate_secure_ticket_number() -> str:
        """
        Generate cryptographically secure ticket number
        
        Returns:
            Secure ticket number string
        """
        while True:
            # Generate secure random bytes
            random_bytes = secrets.token_bytes(16)
            # Create hash and take first 12 characters
            ticket_hash = hashlib.sha256(random_bytes).hexdigest()[:12].upper()
            ticket_number = f"SEC-{ticket_hash[:4]}-{ticket_hash[4:8]}-{ticket_hash[8:12]}"
            
            if not Ticket.objects.filter(ticket_number=ticket_number).exists():
                return ticket_number


class QRCodeGenerator:
    """Service for generating QR codes with enhanced security and validation"""
    
    @staticmethod
    def generate_qr_code_data(ticket: Ticket, include_signature: bool = True) -> str:
        """
        Generate QR code data with optional cryptographic signature
        
        Args:
            ticket: Ticket instance
            include_signature: Whether to include cryptographic signature
            
        Returns:
            QR code data string
        """
        # Base validation data
        base_data = {
            'ticket_number': ticket.ticket_number,
            'booking_reference': ticket.booking.booking_reference,
            'customer_id': ticket.booking.customer.id,
            'price': str(ticket.price),
            'timestamp': timezone.now().isoformat(),
        }
        
        # Add event/showtime specific data
        if ticket.booking.booking_type == 'event' and ticket.booking.event:
            base_data.update({
                'event_id': ticket.booking.event.id,
                'event_title': ticket.booking.event.title,
                'venue': ticket.booking.event.venue,
                'start_time': ticket.booking.event.start_datetime.isoformat(),
            })
            if ticket.ticket_type:
                base_data['ticket_type'] = ticket.ticket_type.name
        elif ticket.booking.booking_type == 'movie' and ticket.booking.showtime:
            base_data.update({
                'showtime_id': ticket.booking.showtime.id,
                'movie_title': ticket.booking.showtime.movie.title,
                'theater': ticket.booking.showtime.theater.name,
                'screen': ticket.booking.showtime.screen_number,
                'seat': ticket.seat_number,
                'start_time': ticket.booking.showtime.start_time.isoformat(),
            })
        
        if include_signature:
            # Create signature for validation using only immutable data
            signature_data = {
                'ticket_number': ticket.ticket_number,
                'booking_reference': ticket.booking.booking_reference,
                'customer_id': ticket.booking.customer.id,
                'price': str(ticket.price),
            }
            
            # Add immutable event/showtime data
            if ticket.booking.booking_type == 'event' and ticket.booking.event:
                signature_data.update({
                    'event_id': ticket.booking.event.id,
                    'event_title': ticket.booking.event.title,
                })
                if ticket.ticket_type:
                    signature_data['ticket_type_id'] = ticket.ticket_type.id
            elif ticket.booking.booking_type == 'movie' and ticket.booking.showtime:
                signature_data.update({
                    'showtime_id': ticket.booking.showtime.id,
                    'seat': ticket.seat_number,
                })
            
            data_string = json.dumps(signature_data, sort_keys=True)
            signature = hashlib.sha256(
                (data_string + getattr(settings, 'SECRET_KEY', 'default')).encode()
            ).hexdigest()[:16]
            base_data['signature'] = signature
        
        # Return as pipe-separated string for backward compatibility
        return f"{ticket.ticket_number}|{ticket.booking.booking_reference}|{ticket.booking.customer.id}|{base_data.get('signature', '')}"
    
    @staticmethod
    def generate_qr_code_image(qr_data: str, size: int = 10, border: int = 4) -> str:
        """
        Generate base64 encoded QR code image
        
        Args:
            qr_data: Data to encode in QR code
            size: Box size for QR code
            border: Border size
            
        Returns:
            Base64 encoded PNG image string
        """
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,  # Medium error correction
            box_size=size,
            border=border,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str
    
    @staticmethod
    def validate_qr_code_data(qr_data: str, ticket: Ticket) -> Tuple[bool, str]:
        """
        Validate QR code data against ticket
        
        Args:
            qr_data: QR code data to validate
            ticket: Ticket instance to validate against
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            parts = qr_data.split('|')
            if len(parts) < 3:
                return False, "Invalid QR code format"
            
            qr_ticket_number = parts[0]
            qr_booking_ref = parts[1]
            qr_customer_id = parts[2]
            qr_signature = parts[3] if len(parts) > 3 else None
            
            # Validate basic data
            if qr_ticket_number != ticket.ticket_number:
                return False, "Ticket number mismatch"
            
            if qr_booking_ref != ticket.booking.booking_reference:
                return False, "Booking reference mismatch"
            
            if int(qr_customer_id) != ticket.booking.customer.id:
                return False, "Customer ID mismatch"
            
            # Validate signature if present
            if qr_signature:
                # Recreate the same signature data used during generation
                signature_data = {
                    'ticket_number': ticket.ticket_number,
                    'booking_reference': ticket.booking.booking_reference,
                    'customer_id': ticket.booking.customer.id,
                    'price': str(ticket.price),
                }
                
                # Add immutable event/showtime data
                if ticket.booking.booking_type == 'event' and ticket.booking.event:
                    signature_data.update({
                        'event_id': ticket.booking.event.id,
                        'event_title': ticket.booking.event.title,
                    })
                    if ticket.ticket_type:
                        signature_data['ticket_type_id'] = ticket.ticket_type.id
                elif ticket.booking.booking_type == 'movie' and ticket.booking.showtime:
                    signature_data.update({
                        'showtime_id': ticket.booking.showtime.id,
                        'seat': ticket.seat_number,
                    })
                
                data_string = json.dumps(signature_data, sort_keys=True)
                expected_signature = hashlib.sha256(
                    (data_string + getattr(settings, 'SECRET_KEY', 'default')).encode()
                ).hexdigest()[:16]
                
                if qr_signature != expected_signature:
                    return False, "Invalid signature"
            
            return True, "Valid QR code"
            
        except (ValueError, IndexError) as e:
            return False, f"QR code validation error: {str(e)}"


class TicketPDFGenerator:
    """Service for generating PDF tickets for email delivery"""
    
    @staticmethod
    def generate_ticket_pdf(ticket: Ticket) -> bytes:
        """
        Generate PDF ticket for a single ticket
        
        Args:
            ticket: Ticket instance
            
        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=black
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            alignment=TA_LEFT,
            textColor=black
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=12,
            spaceAfter=6,
            alignment=TA_LEFT
        )
        
        # Build content
        content = []
        
        # Title
        if ticket.booking.booking_type == 'event':
            title = f"Event Ticket - {ticket.booking.event.title}"
        else:
            title = f"Movie Ticket - {ticket.booking.showtime.movie.title}"
        
        content.append(Paragraph(title, title_style))
        content.append(Spacer(1, 20))
        
        # Ticket information table
        ticket_data = [
            ['Ticket Number:', ticket.ticket_number],
            ['Booking Reference:', ticket.booking.booking_reference],
            ['Customer:', ticket.booking.customer.get_full_name() or ticket.booking.customer.username],
            ['Price:', f"${ticket.price}"],
            ['Status:', ticket.status.title()],
        ]
        
        # Add event/movie specific information
        if ticket.booking.booking_type == 'event':
            event = ticket.booking.event
            ticket_data.extend([
                ['Event:', event.title],
                ['Venue:', event.venue],
                ['Address:', event.address],
                ['Date & Time:', event.start_datetime.strftime('%B %d, %Y at %I:%M %p')],
            ])
            if ticket.ticket_type:
                ticket_data.append(['Ticket Type:', ticket.ticket_type.name])
        else:
            showtime = ticket.booking.showtime
            ticket_data.extend([
                ['Movie:', showtime.movie.title],
                ['Theater:', showtime.theater.name],
                ['Screen:', f"Screen {showtime.screen_number}"],
                ['Seat:', ticket.seat_number or 'General Admission'],
                ['Showtime:', showtime.start_time.strftime('%B %d, %Y at %I:%M %p')],
            ])
        
        # Create table
        table = Table(ticket_data, colWidths=[2*inch, 4*inch])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('ROWBACKGROUNDS', (0, 0), (-1, -1), [white, grey]),
            ('GRID', (0, 0), (-1, -1), 1, black),
        ]))
        
        content.append(table)
        content.append(Spacer(1, 30))
        
        # QR Code
        content.append(Paragraph("QR Code for Entry:", header_style))
        
        # Generate QR code as reportlab drawing
        qr_code = qr.QrCodeWidget(ticket.qr_code_data)
        qr_drawing = Drawing(200, 200)
        qr_drawing.add(qr_code)
        content.append(qr_drawing)
        content.append(Spacer(1, 20))
        
        # Instructions
        instructions = [
            "• Present this ticket at the venue entrance",
            "• QR code will be scanned for validation",
            "• Arrive at least 30 minutes before start time",
            "• Keep this ticket until after the event",
        ]
        
        content.append(Paragraph("Instructions:", header_style))
        for instruction in instructions:
            content.append(Paragraph(instruction, normal_style))
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generate_booking_pdf(booking: Booking) -> bytes:
        """
        Generate PDF for all tickets in a booking
        
        Args:
            booking: Booking instance
            
        Returns:
            PDF bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=black
        )
        
        content = []
        
        # Title
        content.append(Paragraph(f"Booking Confirmation - {booking.booking_reference}", title_style))
        content.append(Spacer(1, 20))
        
        # Generate individual ticket pages
        tickets = booking.tickets.all()
        for i, ticket in enumerate(tickets):
            if i > 0:
                content.append(Spacer(1, 50))  # Page break spacing
            
            # Add individual ticket content
            ticket_pdf_content = TicketPDFGenerator._get_ticket_content(ticket)
            content.extend(ticket_pdf_content)
        
        # Build PDF
        doc.build(content)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def _get_ticket_content(ticket: Ticket) -> List:
        """Helper method to get content for a single ticket"""
        # This is a simplified version - in practice, you'd want to reuse
        # the logic from generate_ticket_pdf but return content list instead
        # of building the PDF directly
        styles = getSampleStyleSheet()
        content = []
        
        content.append(Paragraph(f"Ticket: {ticket.ticket_number}", styles['Heading2']))
        content.append(Paragraph(f"Price: ${ticket.price}", styles['Normal']))
        
        return content


class TicketValidationService:
    """Service for validating tickets at entry points"""
    
    @staticmethod
    def validate_ticket_for_entry(
        ticket_identifier: str, 
        scanner_id: str = "System",
        validation_method: str = "qr_scan"
    ) -> Tuple[bool, str, Optional[Ticket]]:
        """
        Validate ticket for entry at venue
        
        Args:
            ticket_identifier: Ticket number or QR code data
            scanner_id: ID of the scanner/validator
            validation_method: Method used for validation
            
        Returns:
            Tuple of (is_valid, message, ticket_instance)
        """
        try:
            # Check if it's a direct ticket number (no pipe characters) or QR code data (has pipe characters)
            if '|' not in ticket_identifier and (ticket_identifier.startswith('TKT-') or ticket_identifier.startswith('EVT') or ticket_identifier.startswith('SHW') or ticket_identifier.startswith('SEC-')):
                # Direct ticket number
                ticket = Ticket.objects.select_related('booking', 'booking__event', 'booking__showtime').get(
                    ticket_number=ticket_identifier
                )
            else:
                # Assume it's QR code data, extract ticket number
                parts = ticket_identifier.split('|')
                if len(parts) < 1:
                    return False, "Invalid ticket identifier format", None
                
                ticket_number = parts[0]
                ticket = Ticket.objects.select_related('booking', 'booking__event', 'booking__showtime').get(
                    ticket_number=ticket_number
                )
                
                # Validate QR code data
                is_valid_qr, qr_message = QRCodeGenerator.validate_qr_code_data(ticket_identifier, ticket)
                if not is_valid_qr:
                    return False, f"QR code validation failed: {qr_message}", ticket
            
            # Check ticket status
            if ticket.status != 'valid':
                return False, f"Ticket status is {ticket.status}", ticket
            
            # Check if ticket is valid for use (timing, etc.)
            is_valid_timing, timing_message = ticket.is_valid_for_use()
            if not is_valid_timing:
                return False, timing_message, ticket
            
            # Mark ticket as used
            success = ticket.mark_as_used(scanner_id)
            if not success:
                return False, "Failed to mark ticket as used", ticket
            
            return True, "Ticket validated successfully", ticket
            
        except Ticket.DoesNotExist:
            return False, "Ticket not found", None
        except Exception as e:
            return False, f"Validation error: {str(e)}", None
    
    @staticmethod
    def get_ticket_info(ticket_identifier: str) -> Tuple[bool, Dict, Optional[Ticket]]:
        """
        Get ticket information without marking as used
        
        Args:
            ticket_identifier: Ticket number or QR code data
            
        Returns:
            Tuple of (found, ticket_info_dict, ticket_instance)
        """
        try:
            # Extract ticket number
            if ticket_identifier.startswith('TKT-') or ticket_identifier.startswith('EVT') or ticket_identifier.startswith('SHW') or ticket_identifier.startswith('SEC-'):
                ticket_number = ticket_identifier
            else:
                parts = ticket_identifier.split('|')
                if len(parts) < 1:
                    return False, {}, None
                ticket_number = parts[0]
            
            ticket = Ticket.objects.select_related(
                'booking', 'booking__event', 'booking__showtime', 
                'booking__customer', 'ticket_type'
            ).get(ticket_number=ticket_number)
            
            # Build ticket info
            ticket_info = {
                'ticket_number': ticket.ticket_number,
                'booking_reference': ticket.booking.booking_reference,
                'customer_name': ticket.booking.customer.get_full_name() or ticket.booking.customer.username,
                'customer_email': ticket.booking.customer_email,
                'price': str(ticket.price),
                'status': ticket.status,
                'created_at': ticket.created_at.isoformat(),
                'used_at': ticket.used_at.isoformat() if ticket.used_at else None,
                'used_by': ticket.used_by,
            }
            
            # Add event/movie specific info
            if ticket.booking.booking_type == 'event':
                event = ticket.booking.event
                ticket_info.update({
                    'type': 'event',
                    'title': event.title,
                    'venue': event.venue,
                    'address': event.address,
                    'start_time': event.start_datetime.isoformat(),
                    'end_time': event.end_datetime.isoformat(),
                    'ticket_type': ticket.ticket_type.name if ticket.ticket_type else None,
                })
            else:
                showtime = ticket.booking.showtime
                ticket_info.update({
                    'type': 'movie',
                    'title': showtime.movie.title,
                    'theater': showtime.theater.name,
                    'screen': showtime.screen_number,
                    'seat': ticket.seat_number,
                    'start_time': showtime.start_time.isoformat(),
                })
            
            # Check validity
            is_valid, message = ticket.is_valid_for_use()
            ticket_info.update({
                'is_valid_for_entry': is_valid,
                'validity_message': message,
            })
            
            return True, ticket_info, ticket
            
        except Ticket.DoesNotExist:
            return False, {}, None
        except Exception as e:
            return False, {'error': str(e)}, None


class TicketStatusManager:
    """Service for managing ticket status transitions"""
    
    VALID_STATUS_TRANSITIONS = {
        'valid': ['used', 'cancelled', 'expired'],
        'used': [],  # Used tickets cannot change status
        'cancelled': [],  # Cancelled tickets cannot change status
        'expired': [],  # Expired tickets cannot change status
    }
    
    @staticmethod
    def change_ticket_status(
        ticket: Ticket, 
        new_status: str, 
        reason: str = '', 
        changed_by: str = 'System'
    ) -> Tuple[bool, str]:
        """
        Change ticket status with validation
        
        Args:
            ticket: Ticket instance
            new_status: New status to set
            reason: Reason for status change
            changed_by: Who made the change
            
        Returns:
            Tuple of (success, message)
        """
        if new_status not in dict(Ticket.TICKET_STATUS_CHOICES):
            return False, f"Invalid status: {new_status}"
        
        current_status = ticket.status
        valid_transitions = TicketStatusManager.VALID_STATUS_TRANSITIONS.get(current_status, [])
        
        if new_status not in valid_transitions:
            return False, f"Cannot change status from {current_status} to {new_status}"
        
        # Update ticket
        old_status = ticket.status
        ticket.status = new_status
        
        # Set additional fields based on status
        if new_status == 'used' and not ticket.used_at:
            ticket.used_at = timezone.now()
            ticket.used_by = changed_by
        
        ticket.save()
        
        # Log the change (in a real system, you'd want proper audit logging)
        print(f"Ticket {ticket.ticket_number} status changed from {old_status} to {new_status} by {changed_by}. Reason: {reason}")
        
        return True, f"Status changed to {new_status}"
    
    @staticmethod
    def expire_old_tickets() -> int:
        """
        Mark old tickets as expired based on event/showtime dates
        
        Returns:
            Number of tickets expired
        """
        now = timezone.now()
        expired_count = 0
        
        # Find tickets for past events/showtimes that are still valid
        valid_tickets = Ticket.objects.filter(status='valid').select_related(
            'booking__event', 'booking__showtime'
        )
        
        for ticket in valid_tickets:
            should_expire = False
            
            if ticket.booking.booking_type == 'event' and ticket.booking.event:
                # Expire if event ended more than 1 hour ago
                if ticket.booking.event.end_datetime < now - timedelta(hours=1):
                    should_expire = True
            elif ticket.booking.booking_type == 'movie' and ticket.booking.showtime:
                # Expire if showtime ended (assuming 3 hour max movie length)
                showtime_end = ticket.booking.showtime.start_time + timedelta(hours=3)
                if showtime_end < now:
                    should_expire = True
            
            if should_expire:
                success, _ = TicketStatusManager.change_ticket_status(
                    ticket, 'expired', 'Automatic expiration', 'System'
                )
                if success:
                    expired_count += 1
        
        return expired_count
    
    @staticmethod
    def bulk_cancel_tickets(booking: Booking, reason: str = 'Booking cancelled') -> int:
        """
        Cancel all tickets in a booking
        
        Args:
            booking: Booking instance
            reason: Reason for cancellation
            
        Returns:
            Number of tickets cancelled
        """
        cancelled_count = 0
        
        for ticket in booking.tickets.filter(status='valid'):
            success, _ = TicketStatusManager.change_ticket_status(
                ticket, 'cancelled', reason, 'System'
            )
            if success:
                cancelled_count += 1
        
        return cancelled_count