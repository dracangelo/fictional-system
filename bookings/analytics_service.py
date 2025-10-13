from django.db import models
from django.db.models import Sum, Count, Avg, F, Q, Case, When, DecimalField
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek, Extract, Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
import csv
import io

from .models import Booking, Ticket, CustomerReview, WaitlistEntry
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from users.models import User, UserProfile


class AnalyticsService:
    """Service class for aggregating booking and revenue data"""
    
    @staticmethod
    def get_system_analytics(date_from: Optional[datetime] = None, date_to: Optional[datetime] = None) -> Dict:
        """
        Get comprehensive system-wide analytics
        
        Args:
            date_from: Start date for analytics (optional)
            date_to: End date for analytics (optional)
            
        Returns:
            Dictionary containing system analytics
        """
        # Default to last 30 days if no dates provided
        if not date_to:
            date_to = timezone.now()
        if not date_from:
            date_from = date_to - timedelta(days=30)
        
        # Base querysets with date filtering
        bookings_qs = Booking.objects.filter(created_at__range=[date_from, date_to])
        tickets_qs = Ticket.objects.filter(booking__created_at__range=[date_from, date_to])
        
        # Basic metrics
        total_bookings = bookings_qs.count()
        total_tickets_sold = tickets_qs.count()
        
        # Revenue metrics
        total_revenue = tickets_qs.filter(
            booking__payment_status='completed'
        ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
        
        total_discount_amount = bookings_qs.filter(
            payment_status='completed'
        ).aggregate(total=Sum('discount_amount'))['total'] or Decimal('0.00')
        
        total_fees = bookings_qs.filter(
            payment_status='completed'
        ).aggregate(total=Sum('fees'))['total'] or Decimal('0.00')
        
        # Booking status breakdown
        booking_status_breakdown = dict(
            bookings_qs.values('booking_status').annotate(
                count=Count('id')
            ).values_list('booking_status', 'count')
        )
        
        # Payment status breakdown
        payment_status_breakdown = dict(
            bookings_qs.values('payment_status').annotate(
                count=Count('id')
            ).values_list('payment_status', 'count')
        )
        
        # Booking type breakdown
        booking_type_breakdown = dict(
            bookings_qs.values('booking_type').annotate(
                count=Count('id'),
                revenue=Sum('total_amount', filter=Q(payment_status='completed'))
            ).values_list('booking_type', 'count')
        )
        
        # User metrics
        total_users = User.objects.count()
        new_users = User.objects.filter(date_joined__range=[date_from, date_to]).count()
        active_customers = bookings_qs.values('customer').distinct().count()
        
        # Average metrics
        avg_booking_value = bookings_qs.filter(
            payment_status='completed'
        ).aggregate(avg=Avg('total_amount'))['avg'] or Decimal('0.00')
        
        avg_tickets_per_booking = bookings_qs.annotate(
            ticket_count=Count('tickets')
        ).aggregate(avg=Avg('ticket_count'))['avg'] or 0
        
        return {
            'period': {
                'date_from': date_from.isoformat(),
                'date_to': date_to.isoformat(),
            },
            'overview': {
                'total_bookings': total_bookings,
                'total_tickets_sold': total_tickets_sold,
                'total_revenue': float(total_revenue),
                'total_discount_amount': float(total_discount_amount),
                'total_fees': float(total_fees),
                'net_revenue': float(total_revenue - total_fees),
                'avg_booking_value': float(avg_booking_value),
                'avg_tickets_per_booking': float(avg_tickets_per_booking),
            },
            'users': {
                'total_users': total_users,
                'new_users': new_users,
                'active_customers': active_customers,
            },
            'breakdowns': {
                'booking_status': booking_status_breakdown,
                'payment_status': payment_status_breakdown,
                'booking_type': booking_type_breakdown,
            }
        }  
  
    @staticmethod
    def get_event_analytics(event_id: int, owner_id: Optional[int] = None) -> Dict:
        """
        Get analytics for a specific event
        
        Args:
            event_id: Event ID
            owner_id: Optional owner ID for permission checking
            
        Returns:
            Dictionary containing event analytics
        """
        try:
            event = Event.objects.get(id=event_id)
            
            # Permission check
            if owner_id and event.owner_id != owner_id:
                raise PermissionError("Not authorized to view this event's analytics")
            
            # Basic event info
            event_bookings = event.bookings.all()
            event_tickets = Ticket.objects.filter(booking__event=event)
            
            # Booking metrics
            total_bookings = event_bookings.count()
            confirmed_bookings = event_bookings.filter(booking_status='confirmed').count()
            cancelled_bookings = event_bookings.filter(booking_status='cancelled').count()
            
            # Ticket metrics
            total_tickets_sold = event_tickets.count()
            total_tickets_available = event.total_tickets_available
            tickets_remaining = event.tickets_remaining
            
            # Revenue metrics
            total_revenue = event_tickets.filter(
                booking__payment_status='completed'
            ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
            
            total_discount_amount = event_bookings.filter(
                payment_status='completed'
            ).aggregate(total=Sum('discount_amount'))['total'] or Decimal('0.00')
            
            # Ticket type breakdown
            ticket_type_breakdown = []
            for ticket_type in event.ticket_types.all():
                tickets_sold = ticket_type.quantity_sold
                revenue = Ticket.objects.filter(
                    ticket_type=ticket_type,
                    booking__payment_status='completed'
                ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
                
                ticket_type_breakdown.append({
                    'name': ticket_type.name,
                    'price': float(ticket_type.price),
                    'available': ticket_type.quantity_available,
                    'sold': tickets_sold,
                    'remaining': ticket_type.tickets_remaining,
                    'revenue': float(revenue),
                    'sell_through_rate': (tickets_sold / ticket_type.quantity_available * 100) if ticket_type.quantity_available > 0 else 0
                })
            
            # Daily sales trend
            daily_sales = list(
                event_tickets.filter(
                    booking__payment_status='completed'
                ).annotate(
                    date=TruncDate('booking__created_at')
                ).values('date').annotate(
                    tickets_sold=Count('id'),
                    revenue=Sum('price')
                ).order_by('date')
            )
            
            # Customer reviews
            reviews = CustomerReview.objects.filter(booking__event=event)
            avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
            total_reviews = reviews.count()
            
            # Waitlist metrics
            waitlist_entries = event.waitlist_entries.all()
            active_waitlist = waitlist_entries.filter(status='active').count()
            
            return {
                'event': {
                    'id': event.id,
                    'title': event.title,
                    'start_datetime': event.start_datetime.isoformat(),
                    'status': event.status,
                    'venue': event.venue,
                },
                'bookings': {
                    'total': total_bookings,
                    'confirmed': confirmed_bookings,
                    'cancelled': cancelled_bookings,
                    'conversion_rate': (confirmed_bookings / total_bookings * 100) if total_bookings > 0 else 0,
                },
                'tickets': {
                    'total_available': total_tickets_available,
                    'total_sold': total_tickets_sold,
                    'remaining': tickets_remaining,
                    'sell_through_rate': (total_tickets_sold / total_tickets_available * 100) if total_tickets_available > 0 else 0,
                },
                'revenue': {
                    'total_revenue': float(total_revenue),
                    'total_discount_amount': float(total_discount_amount),
                    'net_revenue': float(total_revenue - total_discount_amount),
                    'avg_ticket_price': float(total_revenue / total_tickets_sold) if total_tickets_sold > 0 else 0,
                },
                'ticket_types': ticket_type_breakdown,
                'daily_sales': daily_sales,
                'reviews': {
                    'total_reviews': total_reviews,
                    'average_rating': float(avg_rating),
                },
                'waitlist': {
                    'active_entries': active_waitlist,
                    'total_entries': waitlist_entries.count(),
                }
            }
            
        except Event.DoesNotExist:
            raise ValueError("Event not found")
    
    @staticmethod
    def get_theater_analytics(theater_id: int, owner_id: Optional[int] = None) -> Dict:
        """
        Get analytics for a specific theater
        
        Args:
            theater_id: Theater ID
            owner_id: Optional owner ID for permission checking
            
        Returns:
            Dictionary containing theater analytics
        """
        try:
            theater = Theater.objects.get(id=theater_id)
            
            # Permission check
            if owner_id and theater.owner_id != owner_id:
                raise PermissionError("Not authorized to view this theater's analytics")
            
            # Basic theater info
            theater_showtimes = theater.showtimes.all()
            theater_bookings = Booking.objects.filter(showtime__theater=theater)
            theater_tickets = Ticket.objects.filter(booking__showtime__theater=theater)
            
            # Showtime metrics
            total_showtimes = theater_showtimes.count()
            upcoming_showtimes = theater_showtimes.filter(
                start_time__gt=timezone.now(),
                is_active=True
            ).count()
            
            # Booking metrics
            total_bookings = theater_bookings.count()
            
            # Revenue metrics
            total_revenue = theater_tickets.filter(
                booking__payment_status='completed'
            ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
            
            # Occupancy metrics
            completed_showtimes = theater_showtimes.filter(
                end_time__lt=timezone.now(),
                is_active=True
            )
            
            if completed_showtimes.exists():
                total_capacity = sum(st.total_seats for st in completed_showtimes)
                total_sold = sum(st.seats_booked for st in completed_showtimes)
                avg_occupancy = (total_sold / total_capacity * 100) if total_capacity > 0 else 0
            else:
                avg_occupancy = 0
            
            # Screen performance
            screen_performance = []
            for screen_num in range(1, theater.screens + 1):
                screen_showtimes = completed_showtimes.filter(screen_number=screen_num)
                screen_bookings = theater_bookings.filter(showtime__screen_number=screen_num)
                
                if screen_showtimes.exists():
                    screen_capacity = sum(st.total_seats for st in screen_showtimes)
                    screen_sold = sum(st.seats_booked for st in screen_showtimes)
                    screen_occupancy = (screen_sold / screen_capacity * 100) if screen_capacity > 0 else 0
                else:
                    screen_occupancy = 0
                
                screen_revenue = Ticket.objects.filter(
                    booking__showtime__theater=theater,
                    booking__showtime__screen_number=screen_num,
                    booking__payment_status='completed'
                ).aggregate(total=Sum('price'))['total'] or Decimal('0.00')
                
                screen_performance.append({
                    'screen_number': screen_num,
                    'showtimes': screen_showtimes.count(),
                    'bookings': screen_bookings.count(),
                    'occupancy_rate': round(screen_occupancy, 2),
                    'revenue': float(screen_revenue),
                })
            
            # Popular movies
            popular_movies = list(
                theater_tickets.filter(
                    booking__payment_status='completed'
                ).values(
                    'booking__showtime__movie__title',
                    'booking__showtime__movie__id'
                ).annotate(
                    tickets_sold=Count('id'),
                    revenue=Sum('price'),
                    showtimes=Count('booking__showtime', distinct=True)
                ).order_by('-tickets_sold')[:10]
            )
            
            # Revenue by month
            monthly_revenue = list(
                theater_tickets.filter(
                    booking__payment_status='completed'
                ).annotate(
                    month=Extract('booking__created_at', 'month'),
                    year=Extract('booking__created_at', 'year')
                ).values('month', 'year').annotate(
                    revenue=Sum('price'),
                    tickets_sold=Count('id')
                ).order_by('year', 'month')
            )
            
            return {
                'theater': {
                    'id': theater.id,
                    'name': theater.name,
                    'screens': theater.screens,
                    'total_seats': theater.get_total_seats(),
                    'city': theater.city,
                },
                'showtimes': {
                    'total': total_showtimes,
                    'upcoming': upcoming_showtimes,
                },
                'bookings': {
                    'total': total_bookings,
                },
                'revenue': {
                    'total_revenue': float(total_revenue),
                },
                'occupancy': {
                    'average_occupancy': round(avg_occupancy, 2),
                },
                'screen_performance': screen_performance,
                'popular_movies': popular_movies,
                'monthly_revenue': monthly_revenue,
            }
            
        except Theater.DoesNotExist:
            raise ValueError("Theater not found")   
 
    @staticmethod
    def get_trend_analysis(
        entity_type: str, 
        entity_id: int, 
        days: int = 30
    ) -> Dict:
        """
        Get trend analysis for events or theaters
        
        Args:
            entity_type: 'event' or 'theater'
            entity_id: Entity ID
            days: Number of days to analyze
            
        Returns:
            Dictionary containing trend analysis
        """
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        if entity_type == 'event':
            tickets_qs = Ticket.objects.filter(
                booking__event_id=entity_id,
                booking__created_at__range=[start_date, end_date]
            )
        elif entity_type == 'theater':
            tickets_qs = Ticket.objects.filter(
                booking__showtime__theater_id=entity_id,
                booking__created_at__range=[start_date, end_date]
            )
        else:
            raise ValueError("Invalid entity_type. Must be 'event' or 'theater'")
        
        # Daily trends
        daily_trends = list(
            tickets_qs.annotate(
                date=TruncDate('booking__created_at')
            ).values('date').annotate(
                tickets_sold=Count('id'),
                revenue=Sum('price', filter=Q(booking__payment_status='completed')),
                bookings=Count('booking', distinct=True)
            ).order_by('date')
        )
        
        # Calculate growth rates
        if len(daily_trends) >= 2:
            recent_avg = sum(day['tickets_sold'] for day in daily_trends[-7:]) / 7
            previous_avg = sum(day['tickets_sold'] for day in daily_trends[-14:-7]) / 7 if len(daily_trends) >= 14 else 0
            
            growth_rate = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0
        else:
            growth_rate = 0
        
        # Peak performance analysis
        peak_day = max(daily_trends, key=lambda x: x['tickets_sold']) if daily_trends else None
        
        return {
            'period': {
                'start_date': start_date.date().isoformat(),
                'end_date': end_date.date().isoformat(),
                'days': days,
            },
            'trends': {
                'daily_data': daily_trends,
                'growth_rate': round(growth_rate, 2),
                'peak_day': peak_day,
            }
        }
    
    @staticmethod
    def get_recommendation_insights(user_id: Optional[int] = None) -> Dict:
        """
        Generate recommendation insights based on booking patterns
        
        Args:
            user_id: Optional user ID for personalized recommendations
            
        Returns:
            Dictionary containing recommendation insights
        """
        insights = {
            'popular_events': [],
            'trending_movies': [],
            'optimal_pricing': {},
            'peak_times': {},
        }
        
        # Popular events (by booking volume)
        popular_events = list(
            Event.objects.filter(
                status='published',
                start_datetime__gt=timezone.now()
            ).annotate(
                booking_count=Count('bookings', filter=Q(bookings__payment_status='completed')),
                revenue=Sum('bookings__total_amount', filter=Q(bookings__payment_status='completed'))
            ).order_by('-booking_count')[:10]
        )
        
        insights['popular_events'] = [
            {
                'id': event.id,
                'title': event.title,
                'booking_count': event.booking_count,
                'revenue': float(event.revenue or 0),
                'start_datetime': event.start_datetime.isoformat(),
            }
            for event in popular_events
        ]
        
        # Trending movies (by recent booking growth)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        trending_movies = list(
            Movie.objects.annotate(
                recent_bookings=Count(
                    'showtimes__bookings',
                    filter=Q(
                        showtimes__bookings__created_at__gte=thirty_days_ago,
                        showtimes__bookings__payment_status='completed'
                    )
                )
            ).order_by('-recent_bookings')[:10]
        )
        
        insights['trending_movies'] = [
            {
                'id': movie.id,
                'title': movie.title,
                'recent_bookings': movie.recent_bookings,
                'genre': movie.genre,
            }
            for movie in trending_movies
        ]
        
        # Peak booking times analysis
        peak_hours_qs = Booking.objects.filter(
            created_at__gte=thirty_days_ago,
            payment_status='completed'
        ).annotate(
            hour=Extract('created_at', 'hour')
        ).values('hour').annotate(
            booking_count=Count('id')
        ).values_list('hour', 'booking_count')
        
        peak_hours = dict(peak_hours_qs)
        
        insights['peak_times'] = {
            'hourly_distribution': peak_hours,
            'peak_hour': max(peak_hours.items(), key=lambda x: x[1])[0] if peak_hours else None,
        }
        
        return insights