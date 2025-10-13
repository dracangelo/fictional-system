# User Authentication and Role Management System

This module implements a comprehensive authentication and role management system for the Movie and Event Booking App using Django REST Framework and JWT tokens.

## Features

### 🔐 Authentication
- **User Registration**: Email/password signup with role selection
- **JWT Authentication**: Secure token-based authentication
- **Login/Logout**: Support for username or email login
- **Password Management**: Secure password change functionality
- **Token Management**: Access and refresh token handling

### 👥 Role-Based Access Control
- **Admin**: Full system access and user management
- **Event Owner**: Can create and manage events, view analytics
- **Theater Owner**: Can create and manage theaters, view analytics  
- **Customer**: Can create bookings and manage their account

### 🛡️ Security Features
- Password validation and strength requirements
- JWT token expiration and refresh
- Role-based permission checking
- Audit logging for sensitive operations
- CORS configuration for frontend integration

## Models

### UserProfile
Extended user profile with role-based access control:
```python
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=USER_ROLES)
    phone_number = models.CharField(max_length=15)
    preferences = models.JSONField(default=dict)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `POST /api/auth/token/verify/` - Verify JWT token

### Profile Management
- `GET /api/auth/profile/` - Get current user profile
- `PUT /api/auth/profile/` - Update user profile
- `POST /api/auth/password/change/` - Change password

### User Management
- `GET /api/auth/list/` - List users (admin only)
- `GET /api/auth/permissions/` - Get user permissions

## Usage Examples

### User Registration
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "eventowner",
    "email": "owner@example.com",
    "password": "strongpassword123",
    "password_confirm": "strongpassword123",
    "first_name": "Event",
    "last_name": "Owner",
    "role": "event_owner",
    "phone_number": "+1234567890"
  }'
```

### User Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "eventowner",
    "password": "strongpassword123"
  }'
```

### Accessing Protected Endpoints
```bash
curl -X GET http://localhost:8000/api/auth/profile/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Permissions

### Admin Permissions
- `can_view_system_analytics`
- `can_manage_all_users`
- `can_moderate_content`
- All other permissions

### Event Owner Permissions
- `can_create_event`
- `can_manage_own_events`
- `can_view_event_analytics`
- `can_create_booking`
- `can_view_own_bookings`
- `can_cancel_booking`

### Theater Owner Permissions
- `can_create_theater`
- `can_manage_own_theaters`
- `can_view_theater_analytics`
- `can_create_booking`
- `can_view_own_bookings`
- `can_cancel_booking`

### Customer Permissions
- `can_create_booking`
- `can_view_own_bookings`
- `can_cancel_booking`

## Custom Permission Classes

The system includes several custom permission classes for fine-grained access control:

```python
from users.permissions import IsEventOwner, IsTheaterOwner, IsAdminUser

class EventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsEventOwner]
    # Only event owners and admins can access
```

## Setup and Configuration

### 1. Install Dependencies
```bash
pip install Django djangorestframework djangorestframework-simplejwt django-cors-headers
```

### 2. Add to INSTALLED_APPS
```python
INSTALLED_APPS = [
    # ... other apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'users',
]
```

### 3. Configure JWT Settings
```python
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

### 4. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Setup Role Permissions
```bash
python manage.py setup_permissions
```

## Testing

Run the comprehensive test suite:
```bash
python manage.py test users
```

Test the system manually:
```bash
python test_auth_system.py
```

## Security Considerations

1. **Password Security**: Uses Django's built-in password validation
2. **JWT Security**: Tokens have expiration and can be blacklisted
3. **Permission Checking**: All endpoints check user permissions
4. **Input Validation**: All user inputs are validated and sanitized
5. **CORS Configuration**: Properly configured for frontend integration

## Integration with Other Apps

The authentication system is designed to integrate seamlessly with other apps:

```python
# In your views
from users.permissions import IsEventOwner

class EventCreateView(CreateAPIView):
    permission_classes = [IsEventOwner]
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
```

## Admin Interface

The system includes a custom Django admin interface for user management:
- Extended user admin with profile inline
- Role-based filtering and search
- Bulk operations for user management

## Future Enhancements

- Social authentication (Google, Facebook)
- Two-factor authentication (2FA)
- Email verification system
- Password reset via email
- User activity tracking
- Advanced audit logging