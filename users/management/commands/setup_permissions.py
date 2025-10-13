from django.core.management.base import BaseCommand
from users.models import RolePermissionManager


class Command(BaseCommand):
    help = 'Set up role-based permissions for the application'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up role-based permissions...')
        
        try:
            RolePermissionManager.setup_role_permissions()
            self.stdout.write(
                self.style.SUCCESS('Successfully set up role-based permissions')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to set up permissions: {str(e)}')
            )