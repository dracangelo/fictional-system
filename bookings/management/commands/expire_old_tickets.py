"""
Management command to expire old tickets
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.ticket_services import TicketStatusManager


class Command(BaseCommand):
    help = 'Expire old tickets that are past their event/showtime'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be expired without actually expiring tickets',
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No tickets will actually be expired')
            )
        
        if verbose:
            self.stdout.write(f'Starting ticket expiration process at {timezone.now()}')
        
        try:
            if dry_run:
                # For dry run, we'd need to implement a separate method
                # For now, just show a message
                self.stdout.write(
                    self.style.WARNING('Dry run not fully implemented - would expire old tickets')
                )
                expired_count = 0
            else:
                expired_count = TicketStatusManager.expire_old_tickets()
            
            if expired_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully expired {expired_count} tickets')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('No tickets needed to be expired')
                )
                
            if verbose:
                self.stdout.write(f'Ticket expiration process completed at {timezone.now()}')
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during ticket expiration: {str(e)}')
            )
            raise