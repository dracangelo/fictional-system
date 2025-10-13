import csv
import io
from django.utils import timezone
from typing import Dict

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class ReportGenerator:
    """Service class for generating CSV and PDF reports"""
    
    @staticmethod
    def generate_csv_report(data: Dict, report_type: str) -> io.StringIO:
        """
        Generate CSV report from analytics data
        
        Args:
            data: Analytics data dictionary
            report_type: Type of report ('system', 'event', 'theater')
            
        Returns:
            StringIO object containing CSV data
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        if report_type == 'system':
            # System analytics CSV
            writer.writerow(['System Analytics Report'])
            writer.writerow(['Generated:', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])
            
            # Overview section
            writer.writerow(['Overview'])
            for key, value in data['overview'].items():
                writer.writerow([key.replace('_', ' ').title(), value])
            
            writer.writerow([])
            
            # User metrics
            writer.writerow(['User Metrics'])
            for key, value in data['users'].items():
                writer.writerow([key.replace('_', ' ').title(), value])
            
        elif report_type == 'event':
            # Event analytics CSV
            writer.writerow(['Event Analytics Report'])
            writer.writerow(['Event:', data['event']['title']])
            writer.writerow(['Generated:', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])
            
            # Ticket types breakdown
            writer.writerow(['Ticket Types Performance'])
            writer.writerow(['Name', 'Price', 'Available', 'Sold', 'Remaining', 'Revenue', 'Sell Through Rate %'])
            for ticket_type in data['ticket_types']:
                writer.writerow([
                    ticket_type['name'],
                    ticket_type['price'],
                    ticket_type['available'],
                    ticket_type['sold'],
                    ticket_type['remaining'],
                    ticket_type['revenue'],
                    f"{ticket_type['sell_through_rate']:.2f}%"
                ])
            
            writer.writerow([])
            
            # Daily sales
            writer.writerow(['Daily Sales'])
            writer.writerow(['Date', 'Tickets Sold', 'Revenue'])
            for day in data['daily_sales']:
                writer.writerow([day['date'], day['tickets_sold'], day['revenue']])
            
        elif report_type == 'theater':
            # Theater analytics CSV
            writer.writerow(['Theater Analytics Report'])
            writer.writerow(['Theater:', data['theater']['name']])
            writer.writerow(['Generated:', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
            writer.writerow([])
            
            # Screen performance
            writer.writerow(['Screen Performance'])
            writer.writerow(['Screen', 'Showtimes', 'Bookings', 'Occupancy %', 'Revenue'])
            for screen in data['screen_performance']:
                writer.writerow([
                    f"Screen {screen['screen_number']}",
                    screen['showtimes'],
                    screen['bookings'],
                    f"{screen['occupancy_rate']:.2f}%",
                    screen['revenue']
                ])
            
            writer.writerow([])
            
            # Popular movies
            writer.writerow(['Popular Movies'])
            writer.writerow(['Title', 'Tickets Sold', 'Revenue', 'Showtimes'])
            for movie in data['popular_movies']:
                writer.writerow([
                    movie['booking__showtime__movie__title'],
                    movie['tickets_sold'],
                    movie['revenue'],
                    movie['showtimes']
                ])
        
        output.seek(0)
        return output
    
    @staticmethod
    def generate_pdf_report(data: Dict, report_type: str) -> io.BytesIO:
        """
        Generate PDF report from analytics data
        
        Args:
            data: Analytics data dictionary
            report_type: Type of report ('system', 'event', 'theater')
            
        Returns:
            BytesIO object containing PDF data
        """
        if not REPORTLAB_AVAILABLE:
            raise ImportError("ReportLab is required for PDF generation. Install with: pip install reportlab")
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        if report_type == 'system':
            story.append(Paragraph("System Analytics Report", title_style))
        elif report_type == 'event':
            story.append(Paragraph(f"Event Analytics Report: {data['event']['title']}", title_style))
        elif report_type == 'theater':
            story.append(Paragraph(f"Theater Analytics Report: {data['theater']['name']}", title_style))
        
        story.append(Spacer(1, 12))
        
        # Generated timestamp
        story.append(Paragraph(f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        if report_type == 'system':
            # System overview table
            overview_data = [['Metric', 'Value']]
            for key, value in data['overview'].items():
                overview_data.append([key.replace('_', ' ').title(), str(value)])
            
            overview_table = Table(overview_data)
            overview_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(Paragraph("System Overview", styles['Heading2']))
            story.append(overview_table)
            story.append(Spacer(1, 20))
            
        elif report_type == 'event':
            # Event ticket types table
            ticket_data = [['Ticket Type', 'Price', 'Available', 'Sold', 'Revenue', 'Sell Through %']]
            for ticket_type in data['ticket_types']:
                ticket_data.append([
                    ticket_type['name'],
                    f"${ticket_type['price']:.2f}",
                    str(ticket_type['available']),
                    str(ticket_type['sold']),
                    f"${ticket_type['revenue']:.2f}",
                    f"{ticket_type['sell_through_rate']:.1f}%"
                ])
            
            ticket_table = Table(ticket_data)
            ticket_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(Paragraph("Ticket Types Performance", styles['Heading2']))
            story.append(ticket_table)
            
        elif report_type == 'theater':
            # Theater screen performance table
            screen_data = [['Screen', 'Showtimes', 'Bookings', 'Occupancy %', 'Revenue']]
            for screen in data['screen_performance']:
                screen_data.append([
                    f"Screen {screen['screen_number']}",
                    str(screen['showtimes']),
                    str(screen['bookings']),
                    f"{screen['occupancy_rate']:.1f}%",
                    f"${screen['revenue']:.2f}"
                ])
            
            screen_table = Table(screen_data)
            screen_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(Paragraph("Screen Performance", styles['Heading2']))
            story.append(screen_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer