from django.db import models
from django.contrib.auth.models import User, Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings


class UserProfile(models.Model):
    """Extended user profile with role-based access control"""
    
    USER_ROLES = [
        ('admin', 'Administrator'),
        ('event_owner', 'Event Owner'),
        ('theater_owner', 'Theater Owner'),
        ('customer', 'Customer'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=USER_ROLES, default='customer')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    preferences = models.JSONField(default=dict, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_profiles'
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    def save(self, *args, **kwargs):
        """Override save to assign user to appropriate group based on role"""
        is_new = self.pk is None
        old_role = None
        
        if not is_new:
            try:
                old_role = UserProfile.objects.get(pk=self.pk).role
            except UserProfile.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # Assign role permissions if this is a new profile or role has changed
        if is_new or (old_role and old_role != self.role):
            self.assign_role_permissions()
    
    def assign_role_permissions(self):
        """Assign user to appropriate Django group based on role"""
        # Ensure permissions are set up first
        RolePermissionManager.setup_role_permissions()
        
        # Remove user from all role-based groups first
        role_groups = Group.objects.filter(name__in=[role[0] for role in self.USER_ROLES])
        self.user.groups.remove(*role_groups)
        
        # Add user to the appropriate group
        group, created = Group.objects.get_or_create(name=self.role)
        self.user.groups.add(group)
        
        # Set specific permissions based on role
        if self.role == 'admin':
            self.user.is_staff = True
            self.user.is_superuser = True
        else:
            self.user.is_staff = False
            self.user.is_superuser = False
        
        self.user.save()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile when User is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()


class RolePermissionManager:
    """Manager class to handle role-based permissions setup"""
    
    @staticmethod
    def setup_role_permissions():
        """Set up permissions for different user roles"""
        
        # Create groups for each role
        admin_group, _ = Group.objects.get_or_create(name='admin')
        event_owner_group, _ = Group.objects.get_or_create(name='event_owner')
        theater_owner_group, _ = Group.objects.get_or_create(name='theater_owner')
        customer_group, _ = Group.objects.get_or_create(name='customer')
        
        # Get content types for our models
        user_ct = ContentType.objects.get_for_model(User)
        profile_ct = ContentType.objects.get_for_model(UserProfile)
        
        # Create custom permissions
        permissions_to_create = [
            # Event management permissions
            ('can_create_event', 'Can create events'),
            ('can_manage_own_events', 'Can manage own events'),
            ('can_view_event_analytics', 'Can view event analytics'),
            
            # Theater management permissions
            ('can_create_theater', 'Can create theaters'),
            ('can_manage_own_theaters', 'Can manage own theaters'),
            ('can_view_theater_analytics', 'Can view theater analytics'),
            
            # Booking permissions
            ('can_create_booking', 'Can create bookings'),
            ('can_view_own_bookings', 'Can view own bookings'),
            ('can_cancel_booking', 'Can cancel bookings'),
            
            # Admin permissions
            ('can_view_system_analytics', 'Can view system analytics'),
            ('can_manage_all_users', 'Can manage all users'),
            ('can_moderate_content', 'Can moderate content'),
        ]
        
        # Create permissions if they don't exist
        for codename, name in permissions_to_create:
            Permission.objects.get_or_create(
                codename=codename,
                name=name,
                content_type=profile_ct
            )
        
        # Assign permissions to groups
        
        # Admin permissions (all permissions)
        admin_permissions = Permission.objects.filter(
            codename__in=[p[0] for p in permissions_to_create]
        )
        admin_group.permissions.set(admin_permissions)
        
        # Event owner permissions
        event_owner_permissions = Permission.objects.filter(
            codename__in=[
                'can_create_event',
                'can_manage_own_events',
                'can_view_event_analytics',
                'can_create_booking',
                'can_view_own_bookings',
                'can_cancel_booking',
            ]
        )
        event_owner_group.permissions.set(event_owner_permissions)
        
        # Theater owner permissions
        theater_owner_permissions = Permission.objects.filter(
            codename__in=[
                'can_create_theater',
                'can_manage_own_theaters',
                'can_view_theater_analytics',
                'can_create_booking',
                'can_view_own_bookings',
                'can_cancel_booking',
            ]
        )
        theater_owner_group.permissions.set(theater_owner_permissions)
        
        # Customer permissions
        customer_permissions = Permission.objects.filter(
            codename__in=[
                'can_create_booking',
                'can_view_own_bookings',
                'can_cancel_booking',
            ]
        )
        customer_group.permissions.set(customer_permissions)
