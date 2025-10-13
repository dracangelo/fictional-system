from rest_framework import permissions
from django.contrib.auth.models import User


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users to access admin endpoints.
    """
    
    def has_permission(self, request, view):
        """
        Check if user has admin role and necessary permissions
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin role
        if hasattr(request.user, 'profile'):
            if request.user.profile.role != 'admin':
                return False
        else:
            return False
        
        # Additional check for superuser status
        if not request.user.is_superuser:
            return False
        
        return True


class IsEventOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow event owners to manage their own events
    and admins to manage all events.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role in ['admin', 'event_owner']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any object
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        
        # Event owner can only access their own events
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False


class IsTheaterOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow theater owners to manage their own theaters
    and admins to manage all theaters.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role in ['admin', 'theater_owner']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any object
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        
        # Theater owner can only access their own theaters
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        return False


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Generic permission to allow owners to manage their own objects
    and admins to manage all objects.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any object
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        
        # Owner can access their own objects
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        elif hasattr(obj, 'customer'):
            return obj.customer == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return False


class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage users (admin only)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin role
        if hasattr(request.user, 'profile'):
            return request.user.profile.role == 'admin'
        
        return False


class CanViewSystemAnalytics(permissions.BasePermission):
    """
    Permission to view system analytics (admin only)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin role or specific permission
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'admin':
                return True
        
        # Check for specific permission
        return request.user.has_perm('users.can_view_system_analytics')


class CanModerateContent(permissions.BasePermission):
    """
    Permission to moderate content (admin only)
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if user has admin role or specific permission
        if hasattr(request.user, 'profile'):
            if request.user.profile.role == 'admin':
                return True
        
        # Check for specific permission
        return request.user.has_perm('users.can_moderate_content')


class IsCustomerOrAdmin(permissions.BasePermission):
    """
    Permission for customer-specific actions or admin access
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if hasattr(request.user, 'profile'):
            return request.user.profile.role in ['admin', 'customer']
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # Admin can access any object
        if hasattr(request.user, 'profile') and request.user.profile.role == 'admin':
            return True
        
        # Customer can only access their own objects
        if hasattr(obj, 'customer'):
            return obj.customer == request.user
        
        return False


class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    Permission that allows read-only access to all authenticated users
    but write access only to admins
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Allow write access only to admins
        if hasattr(request.user, 'profile'):
            return request.user.profile.role == 'admin'
        
        return False


# Aliases for backward compatibility
IsEventOwner = IsEventOwnerOrAdmin
IsTheaterOwner = IsTheaterOwnerOrAdmin
IsOwnerOrReadOnly = IsOwnerOrAdmin
CanManageOwnContent = IsOwnerOrAdmin