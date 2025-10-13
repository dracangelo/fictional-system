from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import NotificationTemplate, NotificationPreference, NotificationLog


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'notification_type', 'channel', 'is_active', 'created_at']
    list_filter = ['notification_type', 'channel', 'is_active', 'created_at']
    search_fields = ['name', 'notification_type', 'subject']
    ordering = ['notification_type', 'channel']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'notification_type', 'channel', 'is_active')
        }),
        ('Template Content', {
            'fields': ('subject', 'template_content'),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related()


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'email_enabled', 'sms_enabled', 'push_enabled', 'updated_at']
    list_filter = ['email_enabled', 'sms_enabled', 'push_enabled', 'updated_at']
    search_fields = ['user__username', 'user__email']
    ordering = ['-updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('General Preferences', {
            'fields': ('email_enabled', 'sms_enabled', 'push_enabled')
        }),
        ('Email Notifications', {
            'fields': (
                'booking_confirmation_email',
                'booking_reminder_email',
                'booking_cancellation_email',
                'event_update_email',
                'system_maintenance_email'
            ),
            'classes': ('collapse',)
        }),
        ('SMS Notifications', {
            'fields': (
                'booking_confirmation_sms',
                'booking_reminder_sms',
                'booking_cancellation_sms',
                'event_update_sms',
                'system_maintenance_sms'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = [
        'user_email', 'notification_type', 'channel', 'recipient', 
        'status', 'sent_at', 'created_at'
    ]
    list_filter = [
        'notification_type', 'channel', 'status', 'sent_at', 'created_at'
    ]
    search_fields = [
        'user__username', 'user__email', 'recipient', 'subject', 'content'
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'notification_type', 'channel', 'status')
        }),
        ('Recipient Details', {
            'fields': ('recipient', 'subject')
        }),
        ('Content', {
            'fields': ('content_preview', 'error_message'),
            'classes': ('wide',)
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id', 'content_object_link'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('sent_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = [
        'user', 'notification_type', 'channel', 'recipient', 'subject',
        'content_preview', 'status', 'error_message', 'content_type',
        'object_id', 'content_object_link', 'sent_at', 'created_at'
    ]
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'
    
    def content_preview(self, obj):
        """Show truncated content"""
        if obj.content:
            preview = obj.content[:200]
            if len(obj.content) > 200:
                preview += '...'
            return format_html('<pre>{}</pre>', preview)
        return '-'
    content_preview.short_description = 'Content Preview'
    
    def content_object_link(self, obj):
        """Show link to related object"""
        if obj.content_object:
            try:
                url = reverse(
                    f'admin:{obj.content_type.app_label}_{obj.content_type.model}_change',
                    args=[obj.object_id]
                )
                return format_html(
                    '<a href="{}" target="_blank">{}</a>',
                    url,
                    str(obj.content_object)
                )
            except:
                return str(obj.content_object)
        return '-'
    content_object_link.short_description = 'Related Object'
    
    def has_add_permission(self, request):
        """Disable adding notification logs through admin"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing notification logs through admin"""
        return False
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'content_type'
        ).prefetch_related('content_object')


# Custom admin actions
def mark_templates_active(modeladmin, request, queryset):
    """Mark selected templates as active"""
    updated = queryset.update(is_active=True)
    modeladmin.message_user(
        request,
        f'{updated} template(s) marked as active.'
    )
mark_templates_active.short_description = "Mark selected templates as active"


def mark_templates_inactive(modeladmin, request, queryset):
    """Mark selected templates as inactive"""
    updated = queryset.update(is_active=False)
    modeladmin.message_user(
        request,
        f'{updated} template(s) marked as inactive.'
    )
mark_templates_inactive.short_description = "Mark selected templates as inactive"


# Add actions to NotificationTemplateAdmin
NotificationTemplateAdmin.actions = [mark_templates_active, mark_templates_inactive]