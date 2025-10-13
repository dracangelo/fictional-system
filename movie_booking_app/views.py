"""
Main views for API documentation and version management.
"""
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
import markdown

from .api_docs.versioning import APIVersionManager, VERSION_MIGRATION_GUIDE, API_VERSION_DOCS
from .api_docs.usage_guides import API_USAGE_GUIDES
from .api_docs.serializers import ErrorResponseSerializer
from .api_docs.documentation_index import API_DOCUMENTATION_INDEX, CHANGELOG, POSTMAN_COLLECTION_INFO
from .api_docs.sdk_documentation import SDK_DOCUMENTATION


@extend_schema(
    summary="Get API version information",
    description="Returns information about all available API versions, their status, and features.",
    responses={
        200: {
            'description': 'API version information',
            'example': {
                'current_version': 'v1',
                'supported_versions': ['v1'],
                'latest_version': 'v1',
                'versions': {
                    'v1': {
                        'supported': True,
                        'deprecated': False,
                        'features': ['Basic authentication', 'Event booking']
                    }
                }
            }
        }
    },
    tags=['API Information']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def api_versions(request):
    """
    Get information about all available API versions.
    
    This endpoint provides comprehensive information about API versions,
    including their support status, features, and deprecation timeline.
    """
    return Response({
        'current_version': 'v1',
        'supported_versions': APIVersionManager.get_supported_versions(),
        'latest_version': APIVersionManager.get_latest_version(),
        'versions': APIVersionManager.VERSION_COMPATIBILITY,
        'migration_guides': list(VERSION_MIGRATION_GUIDE.keys())
    })


@extend_schema(
    summary="Get specific version information",
    description="Returns detailed information about a specific API version.",
    responses={
        200: {
            'description': 'Version information',
            'example': {
                'version': 'v1',
                'supported': True,
                'deprecated': False,
                'features': ['Basic authentication', 'Event booking'],
                'documentation_url': '/api/docs/',
                'migration_guide': None
            }
        },
        404: OpenApiResponse(
            response=ErrorResponseSerializer,
            description='Version not found'
        )
    },
    tags=['API Information']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def version_info(request, version):
    """
    Get detailed information about a specific API version.
    
    Args:
        version (str): The API version (e.g., 'v1', 'v2')
    
    Returns:
        Response: Detailed version information including features,
                 support status, and migration guides.
    """
    version_data = APIVersionManager.get_version_info(version)
    
    if not version_data:
        return Response({
            'error': {
                'code': 'VERSION_NOT_FOUND',
                'message': f'API version {version} not found',
                'timestamp': '2024-01-15T10:30:00Z'
            }
        }, status=404)
    
    # Add additional metadata
    response_data = {
        'version': version,
        **version_data,
        'documentation_url': f'/api/docs/?version={version}',
        'schema_url': f'/api/schema/?version={version}',
    }
    
    # Add migration guide if available
    migration_key = f'v{int(version[1:]) - 1}_to_{version}' if version != 'v1' else None
    if migration_key and migration_key in VERSION_MIGRATION_GUIDE:
        response_data['migration_guide'] = VERSION_MIGRATION_GUIDE[migration_key]
    
    return Response(response_data)


@extend_schema(
    summary="Get API usage guides",
    description="Returns available API usage guides for different user roles.",
    responses={
        200: {
            'description': 'Available usage guides',
            'example': {
                'available_guides': ['customer', 'event_owner', 'theater_owner', 'admin', 'integration'],
                'guides': {
                    'customer': {
                        'title': 'Customer API Usage Guide',
                        'description': 'Guide for customers booking events and movies',
                        'url': '/api/guides/customer/'
                    }
                }
            }
        }
    },
    tags=['API Documentation']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def api_guides(request):
    """
    Get list of available API usage guides.
    
    Returns information about all available usage guides for different
    user roles and integration scenarios.
    """
    guides_info = {}
    
    guide_descriptions = {
        'customer': {
            'title': 'Customer API Usage Guide',
            'description': 'Complete guide for customers to discover, book, and manage entertainment experiences'
        },
        'event_owner': {
            'title': 'Event Owner API Usage Guide',
            'description': 'Guide for event owners to create, manage, and analyze their events'
        },
        'theater_owner': {
            'title': 'Theater Owner API Usage Guide',
            'description': 'Guide for theater owners to manage theaters, movies, and showtimes'
        },
        'admin': {
            'title': 'Admin API Usage Guide',
            'description': 'Administrative guide for system management and oversight'
        },
        'integration': {
            'title': 'Integration Examples',
            'description': 'Code examples and SDKs for different programming languages and platforms'
        }
    }
    
    for role, info in guide_descriptions.items():
        guides_info[role] = {
            **info,
            'url': f'/api/guides/{role}/',
            'format': 'markdown'
        }
    
    return Response({
        'available_guides': list(guides_info.keys()),
        'guides': guides_info
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def role_guide(request, role):
    """
    Get API usage guide for a specific role.
    
    Args:
        role (str): User role (customer, event_owner, theater_owner, admin, integration)
    
    Returns:
        HttpResponse: Markdown content of the usage guide
    """
    if role not in API_USAGE_GUIDES:
        return JsonResponse({
            'error': {
                'code': 'GUIDE_NOT_FOUND',
                'message': f'Usage guide for role {role} not found',
                'available_roles': list(API_USAGE_GUIDES.keys()),
                'timestamp': '2024-01-15T10:30:00Z'
            }
        }, status=404)
    
    guide_content = API_USAGE_GUIDES[role]
    
    # Check if client wants HTML or markdown
    accept_header = request.META.get('HTTP_ACCEPT', '')
    
    if 'text/html' in accept_header:
        # Convert markdown to HTML
        html_content = markdown.markdown(
            guide_content,
            extensions=['codehilite', 'fenced_code', 'tables', 'toc']
        )
        
        # Wrap in basic HTML template
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>API Usage Guide - {role.replace('_', ' ').title()}</title>
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
                pre {{ background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }}
                h1, h2, h3 {{ color: #333; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        return HttpResponse(full_html, content_type='text/html')
    else:
        # Return raw markdown
        return HttpResponse(guide_content, content_type='text/markdown')


# Health check endpoint for API documentation
@extend_schema(
    summary="API health check",
    description="Simple health check endpoint to verify API availability.",
    responses={
        200: {
            'description': 'API is healthy',
            'example': {
                'status': 'healthy',
                'version': 'v1',
                'timestamp': '2024-01-15T10:30:00Z'
            }
        }
    },
    tags=['API Information']
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint."""
    from django.utils import timezone
    
    return Response({
        'status': 'healthy',
        'version': 'v1',
        'timestamp': timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_documentation_index(request):
    """
    Get the main API documentation index.
    
    Returns the comprehensive API documentation index with navigation
    and quick start information.
    """
    accept_header = request.META.get('HTTP_ACCEPT', '')
    
    if 'text/html' in accept_header:
        # Convert markdown to HTML
        html_content = markdown.markdown(
            API_DOCUMENTATION_INDEX,
            extensions=['codehilite', 'fenced_code', 'tables', 'toc']
        )
        
        # Wrap in basic HTML template
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Movie & Event Booking API Documentation</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 1200px; 
                    margin: 0 auto; 
                    padding: 20px;
                    line-height: 1.6;
                    color: #333;
                }}
                code {{ 
                    background-color: #f4f4f4; 
                    padding: 2px 6px; 
                    border-radius: 3px;
                    font-family: 'Monaco', 'Consolas', monospace;
                }}
                pre {{ 
                    background-color: #f8f8f8; 
                    padding: 15px; 
                    border-radius: 5px; 
                    overflow-x: auto;
                    border-left: 4px solid #1976d2;
                }}
                h1, h2, h3 {{ color: #1976d2; }}
                h1 {{ border-bottom: 2px solid #1976d2; padding-bottom: 10px; }}
                table {{ 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin: 20px 0;
                }}
                th, td {{ 
                    border: 1px solid #ddd; 
                    padding: 12px; 
                    text-align: left; 
                }}
                th {{ 
                    background-color: #f2f2f2; 
                    font-weight: 600;
                }}
                a {{ color: #1976d2; text-decoration: none; }}
                a:hover {{ text-decoration: underline; }}
                .nav-section {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                }}
                .endpoint {{
                    background-color: #e8f5e8;
                    padding: 10px;
                    border-radius: 4px;
                    margin: 5px 0;
                }}
            </style>
        </head>
        <body>
            {html_content}
            <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
                <p>Movie & Event Booking API Documentation | Version 1.0.0 | Last Updated: January 15, 2024</p>
            </footer>
        </body>
        </html>
        """
        return HttpResponse(full_html, content_type='text/html')
    else:
        # Return raw markdown
        return HttpResponse(API_DOCUMENTATION_INDEX, content_type='text/markdown')


@api_view(['GET'])
@permission_classes([AllowAny])
def api_changelog(request):
    """Get API changelog."""
    accept_header = request.META.get('HTTP_ACCEPT', '')
    
    if 'text/html' in accept_header:
        html_content = markdown.markdown(
            CHANGELOG,
            extensions=['codehilite', 'fenced_code', 'tables']
        )
        
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>API Changelog - Movie & Event Booking API</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }}
                h1, h2, h3 {{ color: #1976d2; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        return HttpResponse(full_html, content_type='text/html')
    else:
        return HttpResponse(CHANGELOG, content_type='text/markdown')


@api_view(['GET'])
@permission_classes([AllowAny])
def postman_collection_info(request):
    """Get Postman collection information."""
    accept_header = request.META.get('HTTP_ACCEPT', '')
    
    if 'text/html' in accept_header:
        html_content = markdown.markdown(
            POSTMAN_COLLECTION_INFO,
            extensions=['codehilite', 'fenced_code', 'tables']
        )
        
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Postman Collection - Movie & Event Booking API</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }}
                h1, h2, h3 {{ color: #1976d2; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        return HttpResponse(full_html, content_type='text/html')
    else:
        return HttpResponse(POSTMAN_COLLECTION_INFO, content_type='text/markdown')


@api_view(['GET'])
@permission_classes([AllowAny])
def sdk_documentation(request, sdk_type):
    """Get SDK documentation for specific language/platform."""
    if sdk_type not in SDK_DOCUMENTATION:
        return JsonResponse({
            'error': {
                'code': 'SDK_NOT_FOUND',
                'message': f'SDK documentation for {sdk_type} not found',
                'available_sdks': list(SDK_DOCUMENTATION.keys()),
                'timestamp': '2024-01-15T10:30:00Z'
            }
        }, status=404)
    
    sdk_content = SDK_DOCUMENTATION[sdk_type]
    accept_header = request.META.get('HTTP_ACCEPT', '')
    
    if 'text/html' in accept_header:
        html_content = markdown.markdown(
            sdk_content,
            extensions=['codehilite', 'fenced_code', 'tables']
        )
        
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{sdk_type.title()} SDK - Movie & Event Booking API</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
                h1, h2, h3 {{ color: #1976d2; }}
                code {{ background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
                pre {{ background-color: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto; }}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """
        return HttpResponse(full_html, content_type='text/html')
    else:
        return HttpResponse(sdk_content, content_type='text/markdown')