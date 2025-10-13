"""
API versioning strategy and implementation for the Movie & Event Booking API.

This module defines the versioning approach and provides utilities for managing
API versions across the application.
"""
from rest_framework.versioning import URLPathVersioning
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings


class MovieBookingAPIVersioning(URLPathVersioning):
    """
    Custom API versioning class for the Movie & Event Booking API.
    
    This class implements URL path versioning where the version is specified
    in the URL path (e.g., /api/v1/, /api/v2/).
    
    **Supported Versions:**
    - v1: Current stable version (default)
    - v2: Future version (in development)
    
    **Version Selection Logic:**
    1. If version is specified in URL, use that version
    2. If no version specified, default to v1
    3. If unsupported version requested, return 400 error
    
    **Deprecation Policy:**
    - Versions are supported for minimum 12 months after new version release
    - Deprecation warnings are sent 6 months before end-of-life
    - Breaking changes only introduced in new major versions
    """
    
    default_version = 'v1'
    allowed_versions = ['v1', 'v2']
    version_param = 'version'
    
    def determine_version(self, request, *args, **kwargs):
        """
        Determine the API version from the request.
        
        Returns the version string or None if not specified.
        """
        version = super().determine_version(request, *args, **kwargs)
        
        # If no version specified, use default
        if version is None:
            version = self.default_version
        
        # Validate version
        if version not in self.allowed_versions:
            return None
        
        return version
    
    def is_allowed_version(self, version):
        """Check if the requested version is supported."""
        return version in self.allowed_versions
    
    def get_versioned_view_name(self, view_name, version):
        """Get the versioned view name for URL routing."""
        return f"{view_name}_{version}"


class APIVersionManager:
    """
    Utility class for managing API versions and compatibility.
    """
    
    # Version compatibility matrix
    VERSION_COMPATIBILITY = {
        'v1': {
            'supported': True,
            'deprecated': False,
            'end_of_life': None,
            'features': [
                'Basic authentication',
                'Event and movie booking',
                'User management',
                'Payment processing',
                'Notifications'
            ],
            'breaking_changes': []
        },
        'v2': {
            'supported': False,  # Not yet released
            'deprecated': False,
            'end_of_life': None,
            'features': [
                'Enhanced authentication with OAuth2',
                'Advanced analytics',
                'Real-time notifications via WebSocket',
                'Improved search with AI recommendations',
                'Multi-language support'
            ],
            'breaking_changes': [
                'Authentication endpoint changes',
                'Response format modifications',
                'New required fields in booking requests'
            ]
        }
    }
    
    @classmethod
    def get_version_info(cls, version):
        """Get detailed information about a specific API version."""
        return cls.VERSION_COMPATIBILITY.get(version, {})
    
    @classmethod
    def is_version_supported(cls, version):
        """Check if a version is currently supported."""
        version_info = cls.get_version_info(version)
        return version_info.get('supported', False)
    
    @classmethod
    def is_version_deprecated(cls, version):
        """Check if a version is deprecated."""
        version_info = cls.get_version_info(version)
        return version_info.get('deprecated', False)
    
    @classmethod
    def get_supported_versions(cls):
        """Get list of all supported versions."""
        return [
            version for version, info in cls.VERSION_COMPATIBILITY.items()
            if info.get('supported', False)
        ]
    
    @classmethod
    def get_latest_version(cls):
        """Get the latest supported version."""
        supported_versions = cls.get_supported_versions()
        if supported_versions:
            # Sort versions and return the latest
            return sorted(supported_versions)[-1]
        return 'v1'


def version_deprecation_warning(version):
    """
    Generate deprecation warning headers for deprecated API versions.
    
    Args:
        version (str): The API version being used
        
    Returns:
        dict: Headers to include in the response
    """
    version_info = APIVersionManager.get_version_info(version)
    
    if version_info.get('deprecated'):
        return {
            'Warning': f'299 - "API version {version} is deprecated"',
            'Sunset': version_info.get('end_of_life', ''),
            'Link': f'</api/{APIVersionManager.get_latest_version()}/docs/>; rel="successor-version"'
        }
    
    return {}


# Version-specific serializer mappings
VERSION_SERIALIZER_MAPPING = {
    'v1': {
        'user': 'users.serializers.UserSerializer',
        'event': 'events.serializers.EventSerializer',
        'booking': 'bookings.serializers.BookingSerializer',
        'theater': 'theaters.serializers.TheaterSerializer',
    },
    'v2': {
        'user': 'users.serializers.UserSerializerV2',
        'event': 'events.serializers.EventSerializerV2',
        'booking': 'bookings.serializers.BookingSerializerV2',
        'theater': 'theaters.serializers.TheaterSerializerV2',
    }
}


def get_versioned_serializer(model_name, version='v1'):
    """
    Get the appropriate serializer class for a given model and version.
    
    Args:
        model_name (str): Name of the model (e.g., 'user', 'event')
        version (str): API version (e.g., 'v1', 'v2')
        
    Returns:
        class: Serializer class for the specified version
    """
    from django.utils.module_loading import import_string
    
    serializer_path = VERSION_SERIALIZER_MAPPING.get(version, {}).get(model_name)
    
    if not serializer_path:
        # Fallback to v1 if version not found
        serializer_path = VERSION_SERIALIZER_MAPPING.get('v1', {}).get(model_name)
    
    if serializer_path:
        return import_string(serializer_path)
    
    raise ImportError(f"No serializer found for {model_name} in version {version}")


# Migration guide for version upgrades
VERSION_MIGRATION_GUIDE = {
    'v1_to_v2': {
        'title': 'Migrating from API v1 to v2',
        'overview': '''
        API v2 introduces several enhancements and breaking changes.
        This guide helps you migrate your integration from v1 to v2.
        ''',
        'breaking_changes': [
            {
                'change': 'Authentication endpoint modification',
                'description': 'Login endpoint now returns additional user metadata',
                'v1_example': '''
                POST /api/v1/auth/login/
                Response: {"access": "token", "refresh": "token"}
                ''',
                'v2_example': '''
                POST /api/v2/auth/login/
                Response: {
                    "access": "token",
                    "refresh": "token",
                    "user": {...},
                    "permissions": [...],
                    "expires_at": "2024-01-15T10:30:00Z"
                }
                '''
            },
            {
                'change': 'Booking request format',
                'description': 'Additional required fields for enhanced features',
                'v1_example': '''
                POST /api/v1/customer-bookings/
                {
                    "event_id": 123,
                    "tickets": [...]
                }
                ''',
                'v2_example': '''
                POST /api/v2/customer-bookings/
                {
                    "event_id": 123,
                    "tickets": [...],
                    "preferences": {
                        "language": "en",
                        "accessibility_needs": []
                    },
                    "source": "web"
                }
                '''
            }
        ],
        'new_features': [
            'OAuth2 authentication support',
            'WebSocket real-time notifications',
            'AI-powered recommendations',
            'Multi-language content support',
            'Enhanced analytics endpoints'
        ],
        'migration_steps': [
            '1. Update authentication flow to handle new response format',
            '2. Add required fields to booking requests',
            '3. Update error handling for new error codes',
            '4. Test all endpoints with v2 URLs',
            '5. Update client libraries and SDKs'
        ]
    }
}


# API version documentation for OpenAPI schema
API_VERSION_DOCS = {
    'v1': {
        'info': {
            'title': 'Movie & Event Booking API v1',
            'version': '1.0.0',
            'description': '''
            Stable version of the Movie & Event Booking API.
            
            This version provides core functionality for:
            - User authentication and management
            - Event and movie discovery
            - Booking and payment processing
            - Notifications and preferences
            
            **Stability:** Stable - No breaking changes
            **Support:** Full support until v2 is released + 12 months
            '''
        }
    },
    'v2': {
        'info': {
            'title': 'Movie & Event Booking API v2',
            'version': '2.0.0-beta',
            'description': '''
            Next generation of the Movie & Event Booking API.
            
            New features in v2:
            - Enhanced authentication with OAuth2
            - Real-time notifications via WebSocket
            - AI-powered recommendations
            - Multi-language support
            - Advanced analytics
            
            **Stability:** Beta - Subject to changes
            **Support:** Development version, not recommended for production
            '''
        }
    }
}