from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    """Inline admin for UserProfile"""
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = ['role', 'phone_number', 'preferences', 'is_verified']


class UserAdmin(BaseUserAdmin):
    """Extended User admin with profile inline"""
    inlines = (UserProfileInline,)
    list_display = ['username', 'email', 'first_name', 'last_name', 'get_role', 'is_active', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'profile__role', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    def get_role(self, obj):
        """Get user role from profile"""
        return obj.profile.get_role_display() if hasattr(obj, 'profile') else 'No Profile'
    get_role.short_description = 'Role'


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """Admin for UserProfile model"""
    list_display = ['user', 'role', 'phone_number', 'is_verified', 'created_at']
    list_filter = ['role', 'is_verified', 'created_at']
    search_fields = ['user__username', 'user__email', 'phone_number']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'role')
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'is_verified')
        }),
        ('Preferences', {
            'fields': ('preferences',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# Unregister the default User admin and register our custom one
admin.site.unregister(User)
admin.site.register(User, UserAdmin)
