from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from users.admin_services import SystemHealthService
from users.admin_models import SystemHealthMetric, AuditLog


class Command(BaseCommand):
    help = 'Collect system health metrics and clean up old data'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--cleanup-days',
            type=int,
            default=30,
            help='Number of days to keep old metrics (default: 30)',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )
    
    def handle(self, *args, **options):
        verbose = options['verbose']
        cleanup_days = options['cleanup_days']
        
        if verbose:
            self.stdout.write('Collecting system health metrics...')
        
        try:
            # Collect current metrics
            metrics = SystemHealthService.collect_system_metrics()
            
            if verbose:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Collected {len(metrics)} metrics')
                )
                
                # Show metric details
                for metric in metrics:
                    status_color = self.style.SUCCESS
                    if metric.status == 'warning':
                        status_color = self.style.WARNING
                    elif metric.status == 'critical':
                        status_color = self.style.ERROR
                    
                    self.stdout.write(
                        f'  {metric.metric_name}: {metric.value}{metric.unit} '
                        f'({status_color(metric.status.upper())})'
                    )
            
            # Get health summary
            health_summary = SystemHealthService.get_health_summary()
            
            if verbose:
                overall_status = health_summary['overall_status']
                status_color = self.style.SUCCESS
                if overall_status == 'warning':
                    status_color = self.style.WARNING
                elif overall_status == 'critical':
                    status_color = self.style.ERROR
                
                self.stdout.write(
                    f'Overall system status: {status_color(overall_status.upper())}'
                )
                
                if health_summary['critical_count'] > 0:
                    self.stdout.write(
                        self.style.ERROR(
                            f'⚠ {health_summary["critical_count"]} critical issues detected'
                        )
                    )
                
                if health_summary['warning_count'] > 0:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠ {health_summary["warning_count"]} warnings detected'
                        )
                    )
            
            # Clean up old metrics
            if cleanup_days > 0:
                self.cleanup_old_metrics(cleanup_days, verbose)
            
            # Log the metrics collection
            AuditLog.log_action(
                user=None,
                action_type='system',
                description='System health metrics collected',
                additional_data={
                    'metrics_collected': len(metrics),
                    'overall_status': health_summary['overall_status'],
                    'critical_count': health_summary['critical_count'],
                    'warning_count': health_summary['warning_count']
                },
                severity='low'
            )
            
            if not verbose:
                # Simple output for cron jobs
                print(f"Metrics collected: {len(metrics)}, Status: {health_summary['overall_status']}")
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to collect metrics: {e}')
            )
            
            # Log the error
            AuditLog.log_action(
                user=None,
                action_type='system',
                description='Failed to collect system health metrics',
                additional_data={'error': str(e)},
                severity='high',
                is_successful=False,
                error_message=str(e)
            )
            
            raise
    
    def cleanup_old_metrics(self, days, verbose):
        """Clean up old system health metrics"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        try:
            # Count old metrics
            old_metrics_count = SystemHealthMetric.objects.filter(
                timestamp__lt=cutoff_date
            ).count()
            
            if old_metrics_count > 0:
                # Delete old metrics
                SystemHealthMetric.objects.filter(
                    timestamp__lt=cutoff_date
                ).delete()
                
                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ Cleaned up {old_metrics_count} old metrics (older than {days} days)'
                        )
                    )
            else:
                if verbose:
                    self.stdout.write('No old metrics to clean up')
                    
        except Exception as e:
            if verbose:
                self.stdout.write(
                    self.style.ERROR(f'Failed to clean up old metrics: {e}')
                )