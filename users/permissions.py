from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object.
        return obj.owner == request.user


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'admin'
        )


class IsEventOwner(permissions.BasePermission):
    """
    Custom permission to only allow event owners.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role in ['admin', 'event_owner']
        )


class IsTheaterOwner(permissions.BasePermission):
    """
    Custom permission to only allow theater owners.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role in ['admin', 'theater_owner']
        )


class IsCustomer(permissions.BasePermission):
    """
    Custom permission to only allow customers.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role in ['admin', 'customer', 'event_owner', 'theater_owner']
        )


class CanManageOwnContent(permissions.BasePermission):
    """
    Custom permission to allow users to manage their own content.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if the object has an owner field
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Check if the object has a user field
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # Check if the object has a customer field (for bookings)
        if hasattr(obj, 'customer'):
            return obj.customer == request.user
        
        # Check if the object has an event field (for ticket types, discounts)
        if hasattr(obj, 'event') and hasattr(obj.event, 'owner'):
            return obj.event.owner == request.user
        
        return False


class RoleBasedPermission(permissions.BasePermission):
    """
    Generic role-based permission class.
    """
    
    def __init__(self, allowed_roles=None):
        self.allowed_roles = allowed_roles or []
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'profile'):
            return False
        
        # Admin users have access to everything
        if request.user.profile.role == 'admin':
            return True
        
        # Check if user's role is in allowed roles
        return request.user.profile.role in self.allowed_roles


def role_required(allowed_roles):
    """
    Decorator to create role-based permission classes.
    
    Usage:
    @role_required(['admin', 'event_owner'])
    class MyView(APIView):
        pass
    """
    def decorator(cls):
        class RolePermission(permissions.BasePermission):
            def has_permission(self, request, view):
                if not request.user or not request.user.is_authenticated:
                    return False
                
                if not hasattr(request.user, 'profile'):
                    return False
                
                # Admin users have access to everything
                if request.user.profile.role == 'admin':
                    return True
                
                return request.user.profile.role in allowed_roles
        
        # Add the permission class to the view
        if hasattr(cls, 'permission_classes'):
            cls.permission_classes = cls.permission_classes + [RolePermission]
        else:
            cls.permission_classes = [RolePermission]
        
        return cls
    
    return decorator