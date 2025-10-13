"""
Custom permission classes with detailed documentation for API endpoints.
"""
from rest_framework.permissions import BasePermission
from drf_spectacular.utils import extend_schema


class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    
    This permission class is used throughout the API to ensure that users
    can only modify resources they own, while allowing read access to others.
    
    **Usage:**
    - Event owners can modify their own events
    - Theater owners can modify their own theaters and showtimes
    - Customers can modify their own bookings and profiles
    
    **Permission Logic:**
    - Read permissions (GET, HEAD, OPTIONS) are allowed for authenticated users
    - Write permissions (POST, PUT, PATCH, DELETE) are only allowed to the owner
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated
        
        # Write permissions only to the owner
        return obj.owner == request.user


class IsAdminUser(BasePermission):
    """
    Permission class for admin-only endpoints.
    
    This permission ensures that only users with admin role can access
    administrative endpoints for system management.
    
    **Usage:**
    - System analytics and reporting
    - User management operations
    - Content moderation
    - Audit log access
    
    **Permission Logic:**
    - Only users with 'admin' role in their profile can access
    - Superusers are automatically granted access
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_superuser or 
             getattr(request.user.profile, 'role', None) == 'admin')
        )


class IsEventOwner(BasePermission):
    """
    Permission class for event owner specific operations.
    
    This permission is used for endpoints that should only be accessible
    to users with the 'event_owner' role.
    
    **Usage:**
    - Creating and managing events
    - Setting up ticket types and discounts
    - Accessing event analytics
    
    **Permission Logic:**
    - User must be authenticated
    - User profile role must be 'event_owner' or 'admin'
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user.profile, 'role', None)
        return user_role in ['event_owner', 'admin']


class IsTheaterOwner(BasePermission):
    """
    Permission class for theater owner specific operations.
    
    This permission is used for endpoints that should only be accessible
    to users with the 'theater_owner' role.
    
    **Usage:**
    - Creating and managing theaters
    - Managing movies and showtimes
    - Accessing theater analytics
    
    **Permission Logic:**
    - User must be authenticated
    - User profile role must be 'theater_owner' or 'admin'
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        user_role = getattr(request.user.profile, 'role', None)
        return user_role in ['theater_owner', 'admin']


class IsCustomer(BasePermission):
    """
    Permission class for customer-specific operations.
    
    This permission is used for endpoints that should be accessible
    to regular customers for booking and account management.
    
    **Usage:**
    - Creating bookings
    - Managing booking history
    - Updating profile preferences
    - Leaving reviews
    
    **Permission Logic:**
    - User must be authenticated
    - Any authenticated user can access (customers, owners, admins)
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated


# Permission documentation for Spectacular
PERMISSION_DOCS = {
    'IsOwnerOrReadOnly': {
        'description': 'Owner can modify, others can read',
        'examples': {
            'allowed': 'Event owner updating their event',
            'denied': 'User trying to modify another user\'s event'
        }
    },
    'IsAdminUser': {
        'description': 'Admin users only',
        'examples': {
            'allowed': 'Admin accessing system analytics',
            'denied': 'Regular user trying to access admin endpoints'
        }
    },
    'IsEventOwner': {
        'description': 'Event owners and admins only',
        'examples': {
            'allowed': 'Event owner creating a new event',
            'denied': 'Customer trying to create an event'
        }
    },
    'IsTheaterOwner': {
        'description': 'Theater owners and admins only',
        'examples': {
            'allowed': 'Theater owner adding a new showtime',
            'denied': 'Customer trying to manage theater'
        }
    },
    'IsCustomer': {
        'description': 'Any authenticated user',
        'examples': {
            'allowed': 'Any logged-in user making a booking',
            'denied': 'Anonymous user trying to book tickets'
        }
    }
}