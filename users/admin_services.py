from django.db.models import Count, Sum, Avg, Q, F
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
import time
from django.db import connection
from django.core.cache import cache

# Optional import for system metrics
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

from .admin_models import AuditLog, SystemHealthMetric, UserAction, ContentModerationQueue
from events.models import Event, TicketType
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket
from users.models import UserProfile


class AdminAnalyticsService:
    """Service for generating admin analytics and system-wide metrics"""
    
    @staticmethod
    def get_system_overview():
        """Get high-level system overview metrics"""
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # User metrics
        total_users = User.objects.count()
        new_users_30d = User.objects.filter(date_joined__gte=thirty_days_ago).count()
        active_users_30d = UserAction.objects.filter(
            timestamp__gte=thirty_days_ago
        ).values('user').distinct().count()
        
        # Content metrics
        total_events = Event.objects.count()
        active_events = Event.objects.filter(
            status='published',
            is_active=True,
            start_datetime__gt=now
        ).count()
        total_theaters = Theater.objects.count()
        total_movies = Movie.objects.count()
        
        # Booking metrics
        total_bookings = Booking.objects.count()
        bookings_30d = Booking.objects.filter(created_at__gte=thirty_days_ago).count()
        total_revenue = Booking.objects.filter(
            payment_status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        revenue_30d = Booking.objects.filter(
            created_at__gte=thirty_days_ago,
            payment_status='completed'
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Ticket metrics
        total_tickets = Ticket.objects.count()
        tickets_sold_30d = Ticket.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        return {
            'users': {
                'total': total_users,
                'new_30d': new_users_30d,
                'active_30d': active_users_30d,
                'growth_rate': (new_users_30d / max(total_users - new_users_30d, 1)) * 100
            },
            'content': {
                'total_events': total_events,
                'active_events': active_events,
                'total_theaters': total_theaters,
                'total_movies': total_movies
            },
            'bookings': {
                'total': total_bookings,
                'bookings_30d': bookings_30d,
                'growth_rate': (bookings_30d / max(total_bookings - bookings_30d, 1)) * 100
            },
            'revenue': {
                'total': float(total_revenue),
                'revenue_30d': float(revenue_30d),
                'average_booking_value': float(total_revenue / max(total_bookings, 1))
            },
            'tickets': {
                'total': total_tickets,
                'sold_30d': tickets_sold_30d
            }
        }
    
    @staticmethod
    def get_user_analytics():
        """Get detailed user analytics"""
        # User role distribution
        role_distribution = UserProfile.objects.values('role').annotate(
            count=Count('id')
        ).order_by('role')
        
        # User registration trends (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        registration_trends = []
        for i in range(30):
            date = thirty_days_ago + timedelta(days=i)
            count = User.objects.filter(
                date_joined__date=date.date()
            ).count()
            registration_trends.append({
                'date': date.strftime('%Y-%m-%d'),
                'registrations': count
            })
        
        # Most active users
        active_users = UserAction.objects.filter(
            timestamp__gte=timezone.now() - timedelta(days=30)
        ).values('user__username', 'user__id').annotate(
            action_count=Count('id')
        ).order_by('-action_count')[:10]
        
        # User activity by category
        activity_by_category = UserAction.objects.filter(
            timestamp__gte=timezone.now() - timedelta(days=30)
        ).values('action_category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return {
            'role_distribution': list(role_distribution),
            'registration_trends': registration_trends,
            'most_active_users': list(active_users),
            'activity_by_category': list(activity_by_category)
        }
    
    @staticmethod
    def get_booking_analytics():
        """Get detailed booking analytics"""
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        
        # Booking trends
        booking_trends = []
        for i in range(30):
            date = thirty_days_ago + timedelta(days=i)
            bookings = Booking.objects.filter(created_at__date=date.date())
            revenue = bookings.filter(payment_status='completed').aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0.00')
            
            booking_trends.append({
                'date': date.strftime('%Y-%m-%d'),
                'bookings': bookings.count(),
                'revenue': float(revenue)
            })
        
        # Booking status distribution
        status_distribution = Booking.objects.values('booking_status').annotate(
            count=Count('id')
        ).order_by('booking_status')
        
        # Payment status distribution
        payment_distribution = Booking.objects.values('payment_status').annotate(
            count=Count('id')
        ).order_by('payment_status')
        
        # Top events by bookings
        top_events = Booking.objects.filter(
            booking_type='event',
            event__isnull=False
        ).values('event__title', 'event__id').annotate(
            booking_count=Count('id'),
            total_revenue=Sum('total_amount')
        ).order_by('-booking_count')[:10]
        
        # Top movies by bookings
        top_movies = Booking.objects.filter(
            booking_type='movie',
            showtime__movie__isnull=False
        ).values('showtime__movie__title', 'showtime__movie__id').annotate(
            booking_count=Count('id'),
            total_revenue=Sum('total_amount')
        ).order_by('-booking_count')[:10]
        
        # Average booking value by type
        avg_booking_values = Booking.objects.values('booking_type').annotate(
            avg_value=Avg('total_amount'),
            count=Count('id')
        )
        
        return {
            'booking_trends': booking_trends,
            'status_distribution': list(status_distribution),
            'payment_distribution': list(payment_distribution),
            'top_events': list(top_events),
            'top_movies': list(top_movies),
            'avg_booking_values': list(avg_booking_values)
        }
    
    @staticmethod
    def get_content_analytics():
        """Get content analytics for events and movies"""
        # Event analytics
        event_stats = {
            'total': Event.objects.count(),
            'by_status': list(Event.objects.values('status').annotate(count=Count('id'))),
            'by_category': list(Event.objects.values('category').annotate(count=Count('id'))),
            'upcoming': Event.objects.filter(
                start_datetime__gt=timezone.now(),
                status='published'
            ).count()
        }
        
        # Movie analytics
        movie_stats = {
            'total': Movie.objects.count(),
            'by_genre': list(Movie.objects.values('genre').annotate(count=Count('id'))),
            'by_rating': list(Movie.objects.values('rating').annotate(count=Count('id'))),
            'active': Movie.objects.filter(is_active=True).count()
        }
        
        # Theater analytics
        theater_stats = {
            'total': Theater.objects.count(),
            'by_city': list(Theater.objects.values('city').annotate(count=Count('id'))),
            'active': Theater.objects.filter(is_active=True).count(),
            'total_screens': Theater.objects.aggregate(total=Sum('screens'))['total'] or 0
        }
        
        return {
            'events': event_stats,
            'movies': movie_stats,
            'theaters': theater_stats
        }
    
    @staticmethod
    def get_performance_metrics():
        """Get system performance metrics"""
        # Database performance
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            table_count = cursor.fetchone()[0]
        
        # Recent system health metrics
        recent_metrics = SystemHealthMetric.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).values('metric_type', 'metric_name').annotate(
            avg_value=Avg('value'),
            latest_value=F('value'),
            status=F('status')
        ).order_by('metric_type', 'metric_name')
        
        # Error rate from audit logs
        total_actions = AuditLog.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        failed_actions = AuditLog.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24),
            is_successful=False
        ).count()
        error_rate = (failed_actions / max(total_actions, 1)) * 100
        
        return {
            'database': {
                'table_count': table_count,
                'connection_status': 'healthy'
            },
            'system_metrics': list(recent_metrics),
            'error_rate': error_rate,
            'total_actions_24h': total_actions,
            'failed_actions_24h': failed_actions
        }


class UserManagementService:
    """Service for admin user management operations"""
    
    @staticmethod
    def get_user_list(filters=None, page=1, page_size=20):
        """Get paginated list of users with filters"""
        queryset = User.objects.select_related('profile').all()
        
        if filters:
            if filters.get('role'):
                queryset = queryset.filter(profile__role=filters['role'])
            if filters.get('is_active') is not None:
                queryset = queryset.filter(is_active=filters['is_active'])
            if filters.get('search'):
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(username__icontains=search_term) |
                    Q(email__icontains=search_term) |
                    Q(first_name__icontains=search_term) |
                    Q(last_name__icontains=search_term)
                )
            if filters.get('date_joined_from'):
                queryset = queryset.filter(date_joined__gte=filters['date_joined_from'])
            if filters.get('date_joined_to'):
                queryset = queryset.filter(date_joined__lte=filters['date_joined_to'])
        
        # Pagination
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        users = queryset[start_index:end_index]
        
        return {
            'users': users,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }
    
    @staticmethod
    def update_user_status(user_id, is_active, admin_user):
        """Update user active status"""
        try:
            user = User.objects.get(id=user_id)
            old_status = user.is_active
            user.is_active = is_active
            user.save()
            
            # Log the action
            AuditLog.log_action(
                user=admin_user,
                action_type='status_change',
                description=f'Changed user {user.username} active status from {old_status} to {is_active}',
                target_object=user,
                old_values={'is_active': old_status},
                new_values={'is_active': is_active},
                severity='medium'
            )
            
            return {'success': True, 'message': 'User status updated successfully'}
        except User.DoesNotExist:
            return {'success': False, 'message': 'User not found'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def update_user_role(user_id, new_role, admin_user):
        """Update user role"""
        try:
            user = User.objects.get(id=user_id)
            profile = user.profile
            old_role = profile.role
            
            if new_role not in [choice[0] for choice in UserProfile.USER_ROLES]:
                return {'success': False, 'message': 'Invalid role'}
            
            profile.role = new_role
            profile.save()  # This will trigger role permission assignment
            
            # Log the action
            AuditLog.log_action(
                user=admin_user,
                action_type='permission_change',
                description=f'Changed user {user.username} role from {old_role} to {new_role}',
                target_object=user,
                old_values={'role': old_role},
                new_values={'role': new_role},
                severity='high'
            )
            
            return {'success': True, 'message': 'User role updated successfully'}
        except User.DoesNotExist:
            return {'success': False, 'message': 'User not found'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def get_user_activity(user_id, days=30):
        """Get user activity history"""
        try:
            user = User.objects.get(id=user_id)
            since_date = timezone.now() - timedelta(days=days)
            
            # Get user actions
            actions = UserAction.objects.filter(
                user=user,
                timestamp__gte=since_date
            ).order_by('-timestamp')[:100]
            
            # Get audit logs for this user
            audit_logs = AuditLog.objects.filter(
                user=user,
                timestamp__gte=since_date
            ).order_by('-timestamp')[:50]
            
            # Get bookings
            bookings = Booking.objects.filter(
                customer=user,
                created_at__gte=since_date
            ).order_by('-created_at')[:20]
            
            return {
                'user': user,
                'actions': actions,
                'audit_logs': audit_logs,
                'bookings': bookings
            }
        except User.DoesNotExist:
            return None


class ContentModerationService:
    """Service for content moderation operations"""
    
    @staticmethod
    def get_moderation_queue(status=None, priority=None, page=1, page_size=20):
        """Get content moderation queue with filters"""
        queryset = ContentModerationQueue.objects.select_related(
            'submitted_by', 'moderator'
        ).all()
        
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Pagination
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        items = queryset[start_index:end_index]
        
        return {
            'items': items,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        }
    
    @staticmethod
    def add_to_moderation_queue(content_object, content_category, submitted_by, 
                               priority='medium', flagged_reasons=None):
        """Add content to moderation queue"""
        from django.contrib.contenttypes.models import ContentType
        
        # Get content type
        content_type = ContentType.objects.get_for_model(content_object)
        
        # Check if already in queue
        existing = ContentModerationQueue.objects.filter(
            content_type=content_type,
            object_id=content_object.id,
            status__in=['pending', 'flagged']
        ).first()
        
        if existing:
            return existing
        
        # Get content title based on type
        content_title = getattr(content_object, 'title', 
                               getattr(content_object, 'name', str(content_object)))
        
        # Get content description
        content_description = getattr(content_object, 'description', '')[:500]
        
        moderation_item = ContentModerationQueue.objects.create(
            content_object=content_object,
            content_category=content_category,
            content_title=content_title,
            content_description=content_description,
            submitted_by=submitted_by,
            priority=priority,
            flagged_reasons=flagged_reasons or []
        )
        
        return moderation_item
    
    @staticmethod
    def get_moderation_stats():
        """Get moderation statistics"""
        total_pending = ContentModerationQueue.objects.filter(status='pending').count()
        total_flagged = ContentModerationQueue.objects.filter(status='flagged').count()
        
        # Stats by category
        by_category = ContentModerationQueue.objects.filter(
            status__in=['pending', 'flagged']
        ).values('content_category').annotate(count=Count('id'))
        
        # Stats by priority
        by_priority = ContentModerationQueue.objects.filter(
            status__in=['pending', 'flagged']
        ).values('priority').annotate(count=Count('id'))
        
        return {
            'total_pending': total_pending,
            'total_flagged': total_flagged,
            'by_category': list(by_category),
            'by_priority': list(by_priority)
        }


class SystemHealthService:
    """Service for system health monitoring"""
    
    @staticmethod
    def collect_system_metrics():
        """Collect current system metrics"""
        metrics = []
        
        if PSUTIL_AVAILABLE:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                metrics.append(SystemHealthMetric.record_metric(
                    'cpu_usage', 'CPU Usage', cpu_percent, '%',
                    warning_threshold=70, critical_threshold=90
                ))
                
                # Memory usage
                memory = psutil.virtual_memory()
                metrics.append(SystemHealthMetric.record_metric(
                    'memory_usage', 'Memory Usage', memory.percent, '%',
                    warning_threshold=80, critical_threshold=95
                ))
                
                # Disk usage
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                metrics.append(SystemHealthMetric.record_metric(
                    'disk_usage', 'Disk Usage', disk_percent, '%',
                    warning_threshold=80, critical_threshold=95
                ))
                
            except Exception as e:
                # If psutil fails, continue with other metrics
                pass
        
        # Database response time
        start_time = time.time()
        User.objects.count()  # Simple query to test DB
        db_response_time = (time.time() - start_time) * 1000
        metrics.append(SystemHealthMetric.record_metric(
            'database', 'Query Response Time', db_response_time, 'ms',
            warning_threshold=100, critical_threshold=500
        ))
        
        # Active users (last hour)
        active_users = UserAction.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1)
        ).values('user').distinct().count()
        metrics.append(SystemHealthMetric.record_metric(
            'active_users', 'Active Users (1h)', active_users, 'users'
        ))
        
        # Error rate (last hour)
        total_actions = AuditLog.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1)
        ).count()
        failed_actions = AuditLog.objects.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1),
            is_successful=False
        ).count()
        error_rate = (failed_actions / max(total_actions, 1)) * 100
        metrics.append(SystemHealthMetric.record_metric(
            'error_rate', 'Error Rate (1h)', error_rate, '%',
            warning_threshold=5, critical_threshold=10
        ))
        
        return metrics
    
    @staticmethod
    def get_health_summary():
        """Get current system health summary"""
        # Get latest metrics for each type
        latest_metrics = {}
        for metric_type, _ in SystemHealthMetric.METRIC_TYPES:
            latest = SystemHealthMetric.objects.filter(
                metric_type=metric_type
            ).order_by('-timestamp').first()
            if latest:
                latest_metrics[metric_type] = latest
        
        # Overall system status
        critical_count = sum(1 for m in latest_metrics.values() if m.status == 'critical')
        warning_count = sum(1 for m in latest_metrics.values() if m.status == 'warning')
        
        if critical_count > 0:
            overall_status = 'critical'
        elif warning_count > 0:
            overall_status = 'warning'
        else:
            overall_status = 'healthy'
        
        return {
            'overall_status': overall_status,
            'metrics': latest_metrics,
            'critical_count': critical_count,
            'warning_count': warning_count,
            'last_updated': timezone.now()
        }