"""
Preprocessing hooks for DRF Spectacular API documentation.
"""

def custom_preprocessing_hook(endpoints):
    """
    Custom preprocessing hook to enhance API documentation.
    
    This hook processes the API endpoints before schema generation.
    """
    # Just return the endpoints as-is for now
    return endpoints


def custom_postprocessing_hook(result, generator, request, public):
    """
    Custom postprocessing hook to enhance API documentation.
    
    This hook adds custom metadata, security schemes, and other
    enhancements to the generated OpenAPI schema.
    """
    # Add custom security schemes
    if 'components' not in result:
        result['components'] = {}
    
    if 'securitySchemes' not in result['components']:
        result['components']['securitySchemes'] = {}
    
    # JWT Bearer token authentication
    result['components']['securitySchemes']['jwtAuth'] = {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT',
        'description': 'JWT token obtained from /api/auth/login/ endpoint'
    }
    
    # Session authentication for web interface
    result['components']['securitySchemes']['sessionAuth'] = {
        'type': 'apiKey',
        'in': 'cookie',
        'name': 'sessionid',
        'description': 'Django session authentication'
    }
    
    # Add global security requirements
    if 'security' not in result:
        result['security'] = []
    
    result['security'].extend([
        {'jwtAuth': []},
        {'sessionAuth': []}
    ])
    
    # Add custom response schemas
    if 'components' not in result:
        result['components'] = {}
    
    if 'schemas' not in result['components']:
        result['components']['schemas'] = {}
    
    # Standard error response schema
    result['components']['schemas']['ErrorResponse'] = {
        'type': 'object',
        'properties': {
            'error': {
                'type': 'object',
                'properties': {
                    'code': {
                        'type': 'string',
                        'description': 'Error code for programmatic handling'
                    },
                    'message': {
                        'type': 'string',
                        'description': 'Human-readable error message'
                    },
                    'details': {
                        'type': 'object',
                        'description': 'Additional error details'
                    },
                    'timestamp': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'Error timestamp'
                    }
                },
                'required': ['code', 'message', 'timestamp']
            }
        },
        'required': ['error']
    }
    
    # Pagination response schema
    result['components']['schemas']['PaginatedResponse'] = {
        'type': 'object',
        'properties': {
            'count': {
                'type': 'integer',
                'description': 'Total number of items'
            },
            'next': {
                'type': 'string',
                'nullable': True,
                'description': 'URL to next page'
            },
            'previous': {
                'type': 'string',
                'nullable': True,
                'description': 'URL to previous page'
            },
            'results': {
                'type': 'array',
                'items': {},
                'description': 'Array of results for current page'
            }
        },
        'required': ['count', 'results']
    }
    
    # Success response schema
    result['components']['schemas']['SuccessResponse'] = {
        'type': 'object',
        'properties': {
            'success': {
                'type': 'boolean',
                'description': 'Operation success status'
            },
            'message': {
                'type': 'string',
                'description': 'Success message'
            },
            'data': {
                'type': 'object',
                'description': 'Response data'
            }
        },
        'required': ['success']
    }
    
    return result