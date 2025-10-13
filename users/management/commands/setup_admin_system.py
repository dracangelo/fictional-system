from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from users.models import UserProfile, RolePermissionManager
from users.admin_models import SystemHealthMetric, AuditLog
from users.admin_services import SystemHealthService


class Command(BaseCommand):
    help = 'Set up admin system with permissions, health monitoring, and initial data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-superuser',
            action='store_true',
            help='Create a superuser admin account',
        )
        parser.add_argument(
            '--admin-username',
            type=str,
            default='admin',
            help='Username for the admin account (default: admin)',
        )
        parser.add_argument(
            '--admin-email',
            type=str,
            default='admin@moviebooking.com',
            help='Email for the admin account',
        )
        parser.add_argument(
            '--admin-password',
            type=str,
            default='admin123',
            help='Password for the admin account (default: admin123)',
        )
        parser.add_argument(
            '--collect-metrics',
            action='store_true',
            help='Collect initial system health metrics',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Setting up admin system...')
        )
        
        # Set up role permissions
        self.setup_permissions()
        
        # Create superuser if requested
        if options['create_superuser']:
            self.create_admin_user(
                options['admin_username'],
                options['admin_email'],
                options['admin_password']
            )
        
        # Initialize system health monitoring
        self.initialize_health_monitoring()
        
        # Collect initial metrics if requested
        if options['collect_metrics']:
            self.collect_initial_metrics()
        
        # Create initial audit log
        self.create_initial_audit_log()
        
        self.stdout.write(
            self.style.SUCCESS('Admin system setup completed successfully!')
        )
    
    def setup_permissions(self):
        """Set up role-based permissions"""
        self.stdout.write('Setting up role-based permissions...')
        
        try:
            RolePermissionManager.setup_role_permissions()
            self.stdout.write(
                self.style.SUCCESS('✓ Role permissions configured')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to set up permissions: {e}')
            )
    
    def create_admin_user(self, username, email, password):
        """Create admin superuser"""
        self.stdout.write(f'Creating admin user: {username}...')
        
        try:
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'User {username} already exists')
                )
                return
            
            # Create superuser
            admin_user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                first_name='System',
                last_name='Administrator'
            )
            
            # Set admin role
            admin_user.profile.role = 'admin'
            admin_user.profile.is_verified = True
            admin_user.profile.save()
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Admin user {username} created successfully')
            )
            self.stdout.write(
                self.style.WARNING(f'Default password: {password}')
            )
            self.stdout.write(
                self.style.WARNING('Please change the password after first login!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to create admin user: {e}')
            )
    
    def initialize_health_monitoring(self):
        """Initialize system health monitoring"""
        self.stdout.write('Initializing system health monitoring...')
        
        try:
            # Create initial health metrics with default thresholds
            initial_metrics = [
                {
                    'metric_type': 'database',
                    'metric_name': 'Query Response Time',
                    'value': 0.0,
                    'unit': 'ms',
                    'warning_threshold': 100.0,
                    'critical_threshold': 500.0
                },
                {
                    'metric_type': 'memory_usage',
                    'metric_name': 'Memory Usage',
                    'value': 0.0,
                    'unit': '%',
                    'warning_threshold': 80.0,
                    'critical_threshold': 95.0
                },
                {
                    'metric_type': 'cpu_usage',
                    'metric_name': 'CPU Usage',
                    'value': 0.0,
                    'unit': '%',
                    'warning_threshold': 70.0,
                    'critical_threshold': 90.0
                },
                {
                    'metric_type': 'disk_usage',
                    'metric_name': 'Disk Usage',
                    'value': 0.0,
                    'unit': '%',
                    'warning_threshold': 80.0,
                    'critical_threshold': 95.0
                },
                {
                    'metric_type': 'error_rate',
                    'metric_name': 'Error Rate (1h)',
                    'value': 0.0,
                    'unit': '%',
                    'warning_threshold': 5.0,
                    'critical_threshold': 10.0
                }
            ]
            
            for metric_data in initial_metrics:
                SystemHealthMetric.objects.create(**metric_data)
            
            self.stdout.write(
                self.style.SUCCESS('✓ System health monitoring initialized')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to initialize health monitoring: {e}')
            )
    
    def collect_initial_metrics(self):
        """Collect initial system health metrics"""
        self.stdout.write('Collecting initial system metrics...')
        
        try:
            metrics = SystemHealthService.collect_system_metrics()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Collected {len(metrics)} system metrics')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to collect metrics: {e}')
            )
    
    def create_initial_audit_log(self):
        """Create initial audit log entry"""
        self.stdout.write('Creating initial audit log...')
        
        try:
            AuditLog.log_action(
                user=None,
                action_type='system',
                description='Admin system setup completed',
                additional_data={
                    'setup_timestamp': timezone.now().isoformat(),
                    'components_initialized': [
                        'role_permissions',
                        'health_monitoring',
                        'audit_logging'
                    ]
                },
                severity='medium'
            )
            
            self.stdout.write(
                self.style.SUCCESS('✓ Initial audit log created')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to create audit log: {e}')
            )