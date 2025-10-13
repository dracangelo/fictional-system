"""
Management command to perform security audit
"""
import os
import json
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.core.cache import cache
from django.conf import settings
from users.models import UserProfile
from users.admin_models import AuditLog, UserAction


class Command(BaseCommand):
    help = 'Perform security audit and generate report'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to analyze (default: 7)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='security_audit_report.json',
            help='Output file for the report'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Verbose output'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        output_file = options['output']
        verbose = options['verbose']
        
        self.stdout.write(f"Starting security audit for the last {days} days...")
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Perform security checks
        report = {
            'audit_date': end_date.isoformat(),
            'period': f"{start_date.date()} to {end_date.date()}",
            'summary': {},
            'findings': [],
            'recommendations': []
        }
        
        # 1. Check failed login attempts
        failed_logins = self.check_failed_logins(start_date, end_date, verbose)
        report['summary']['failed_logins'] = failed_logins
        
        # 2. Check suspicious user activities
        suspicious_activities = self.check_suspicious_activities(start_date, end_date, verbose)
        report['summary']['suspicious_activities'] = suspicious_activities
        
        # 3. Check admin activities
        admin_activities = self.check_admin_activities(start_date, end_date, verbose)
        report['summary']['admin_activities'] = admin_activities
        
        # 4. Check user account security
        account_security = self.check_account_security(verbose)
        report['summary']['account_security'] = account_security
        
        # 5. Check system configuration
        config_security = self.check_configuration_security(verbose)
        report['summary']['configuration_security'] = config_security
        
        # 6. Generate recommendations
        recommendations = self.generate_recommendations(report['summary'])
        report['recommendations'] = recommendations
        
        # Save report
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        self.stdout.write(
            self.style.SUCCESS(f"Security audit completed. Report saved to {output_file}")
        )
        
        # Print summary
        self.print_summary(report)
    
    def check_failed_logins(self, start_date, end_date, verbose):
        """Check for failed login attempts"""
        if verbose:
            self.stdout.write("Checking failed login attempts...")
        
        # Get failed login audit logs
        failed_logins = AuditLog.objects.filter(
            timestamp__range=[start_date, end_date],
            action_type='login',
            is_successful=False
        )
        
        # Group by IP address
        ip_counts = {}
        for log in failed_logins:
            ip = log.ip_address
            if ip:
                ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        # Find suspicious IPs (more than 10 failed attempts)
        suspicious_ips = {ip: count for ip, count in ip_counts.items() if count > 10}
        
        return {
            'total_failed_attempts': failed_logins.count(),
            'unique_ips': len(ip_counts),
            'suspicious_ips': suspicious_ips,
            'top_failing_ips': dict(sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:5])
        }
    
    def check_suspicious_activities(self, start_date, end_date, verbose):
        """Check for suspicious user activities"""
        if verbose:
            self.stdout.write("Checking suspicious activities...")
        
        suspicious_patterns = []
        
        # Check for users with excessive API calls
        user_actions = UserAction.objects.filter(
            timestamp__range=[start_date, end_date]
        ).values('user').annotate(
            action_count=Count('id')
        ).filter(action_count__gt=1000)  # More than 1000 actions per day on average
        
        for action in user_actions:
            user_id = action['user']
            count = action['action_count']
            try:
                user = User.objects.get(id=user_id)
                suspicious_patterns.append({
                    'type': 'excessive_api_calls',
                    'user': user.username,
                    'count': count,
                    'severity': 'medium'
                })
            except User.DoesNotExist:
                continue
        
        # Check for rapid booking attempts
        rapid_bookings = UserAction.objects.filter(
            timestamp__range=[start_date, end_date],
            action_category='booking',
            action_name='create_booking'
        ).values('user', 'ip_address').annotate(
            booking_count=Count('id')
        ).filter(booking_count__gt=50)  # More than 50 booking attempts
        
        for booking in rapid_bookings:
            suspicious_patterns.append({
                'type': 'rapid_booking_attempts',
                'user_id': booking['user'],
                'ip_address': booking['ip_address'],
                'count': booking['booking_count'],
                'severity': 'high'
            })
        
        # Check for unusual access patterns (access from multiple IPs)
        users_multiple_ips = UserAction.objects.filter(
            timestamp__range=[start_date, end_date]
        ).values('user').annotate(
            ip_count=Count('ip_address', distinct=True)
        ).filter(ip_count__gt=5)  # More than 5 different IPs
        
        for user_ip in users_multiple_ips:
            suspicious_patterns.append({
                'type': 'multiple_ip_access',
                'user_id': user_ip['user'],
                'ip_count': user_ip['ip_count'],
                'severity': 'medium'
            })
        
        return {
            'total_suspicious_patterns': len(suspicious_patterns),
            'patterns': suspicious_patterns
        }
    
    def check_admin_activities(self, start_date, end_date, verbose):
        """Check admin activities"""
        if verbose:
            self.stdout.write("Checking admin activities...")
        
        admin_logs = AuditLog.objects.filter(
            timestamp__range=[start_date, end_date],
            user__profile__role='admin'
        )
        
        # Group by action type
        action_counts = admin_logs.values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Check for unusual admin activities
        unusual_activities = []
        
        # Check for admin actions outside business hours
        for log in admin_logs:
            hour = log.timestamp.hour
            if hour < 6 or hour > 22:  # Outside 6 AM - 10 PM
                unusual_activities.append({
                    'type': 'off_hours_admin_activity',
                    'user': log.user.username if log.user else 'unknown',
                    'action': log.action_type,
                    'timestamp': log.timestamp,
                    'severity': 'medium'
                })
        
        return {
            'total_admin_actions': admin_logs.count(),
            'action_breakdown': list(action_counts),
            'unusual_activities': unusual_activities[:10]  # Limit to 10 most recent
        }
    
    def check_account_security(self, verbose):
        """Check user account security"""
        if verbose:
            self.stdout.write("Checking account security...")
        
        # Check for weak passwords (this is a simplified check)
        total_users = User.objects.count()
        
        # Check for users without profiles
        users_without_profiles = User.objects.filter(profile__isnull=True).count()
        
        # Check for unverified users (if verification is implemented)
        unverified_users = UserProfile.objects.filter(is_verified=False).count()
        
        # Check for admin users
        admin_users = UserProfile.objects.filter(role='admin').count()
        
        # Check for inactive users with recent activity
        inactive_with_activity = User.objects.filter(
            is_active=False,
            tracked_actions__timestamp__gte=datetime.now() - timedelta(days=30)
        ).distinct().count()
        
        return {
            'total_users': total_users,
            'users_without_profiles': users_without_profiles,
            'unverified_users': unverified_users,
            'admin_users': admin_users,
            'inactive_with_recent_activity': inactive_with_activity
        }
    
    def check_configuration_security(self, verbose):
        """Check system configuration security"""
        if verbose:
            self.stdout.write("Checking configuration security...")
        
        issues = []
        
        # Check DEBUG setting
        if settings.DEBUG:
            issues.append({
                'type': 'debug_enabled',
                'severity': 'high',
                'description': 'DEBUG is enabled in production'
            })
        
        # Check SECRET_KEY
        if 'django-insecure' in settings.SECRET_KEY:
            issues.append({
                'type': 'insecure_secret_key',
                'severity': 'critical',
                'description': 'Using default insecure SECRET_KEY'
            })
        
        # Check ALLOWED_HOSTS
        if '*' in settings.ALLOWED_HOSTS:
            issues.append({
                'type': 'wildcard_allowed_hosts',
                'severity': 'high',
                'description': 'ALLOWED_HOSTS contains wildcard'
            })
        
        # Check CORS settings
        if getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False):
            issues.append({
                'type': 'cors_allow_all',
                'severity': 'high',
                'description': 'CORS allows all origins'
            })
        
        # Check session security
        if not getattr(settings, 'SESSION_COOKIE_SECURE', False) and not settings.DEBUG:
            issues.append({
                'type': 'insecure_session_cookie',
                'severity': 'medium',
                'description': 'Session cookies not marked as secure'
            })
        
        return {
            'total_issues': len(issues),
            'issues': issues
        }
    
    def generate_recommendations(self, summary):
        """Generate security recommendations based on findings"""
        recommendations = []
        
        # Failed login recommendations
        if summary['failed_logins']['total_failed_attempts'] > 100:
            recommendations.append({
                'priority': 'high',
                'category': 'authentication',
                'recommendation': 'Consider implementing IP-based blocking for repeated failed login attempts'
            })
        
        # Suspicious activity recommendations
        if summary['suspicious_activities']['total_suspicious_patterns'] > 0:
            recommendations.append({
                'priority': 'medium',
                'category': 'monitoring',
                'recommendation': 'Investigate suspicious activity patterns and consider implementing additional monitoring'
            })
        
        # Configuration recommendations
        config_issues = summary['configuration_security']['total_issues']
        if config_issues > 0:
            recommendations.append({
                'priority': 'high',
                'category': 'configuration',
                'recommendation': f'Fix {config_issues} configuration security issues'
            })
        
        # Account security recommendations
        if summary['account_security']['unverified_users'] > 10:
            recommendations.append({
                'priority': 'medium',
                'category': 'user_management',
                'recommendation': 'Implement email verification for user accounts'
            })
        
        # General recommendations
        recommendations.extend([
            {
                'priority': 'low',
                'category': 'maintenance',
                'recommendation': 'Regularly review and rotate API keys and secrets'
            },
            {
                'priority': 'medium',
                'category': 'monitoring',
                'recommendation': 'Set up automated alerts for security events'
            },
            {
                'priority': 'low',
                'category': 'backup',
                'recommendation': 'Ensure regular security audits and penetration testing'
            }
        ])
        
        return recommendations
    
    def print_summary(self, report):
        """Print audit summary to console"""
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS("SECURITY AUDIT SUMMARY"))
        self.stdout.write("="*50)
        
        summary = report['summary']
        
        self.stdout.write(f"Period: {report['period']}")
        self.stdout.write(f"Failed Login Attempts: {summary['failed_logins']['total_failed_attempts']}")
        self.stdout.write(f"Suspicious Activities: {summary['suspicious_activities']['total_suspicious_patterns']}")
        self.stdout.write(f"Admin Actions: {summary['admin_activities']['total_admin_actions']}")
        self.stdout.write(f"Configuration Issues: {summary['configuration_security']['total_issues']}")
        
        # Print high priority recommendations
        high_priority_recs = [r for r in report['recommendations'] if r['priority'] == 'high']
        if high_priority_recs:
            self.stdout.write("\n" + self.style.WARNING("HIGH PRIORITY RECOMMENDATIONS:"))
            for rec in high_priority_recs:
                self.stdout.write(f"- {rec['recommendation']}")
        
        self.stdout.write("\n" + "="*50)