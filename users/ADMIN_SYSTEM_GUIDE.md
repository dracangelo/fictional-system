# Admin Dashboard and System Management Guide

This guide explains how to use the comprehensive admin dashboard and system management features implemented for the Movie and Event Booking App.

## Overview

The admin system provides:
- **System-wide analytics** with comprehensive metrics
- **User management** with role-based access control
- **Audit logging** for tracking all system actions
- **Content moderation** for events, movies, and user-generated content
- **System health monitoring** with real-time metrics and alerts
- **Automated management commands** for maintenance tasks

## Getting Started

### 1. Set Up the Admin System

Run the setup command to initialize the admin system:

```bash
python manage.py setup_admin_system --create-superuser --admin-email admin@yoursite.com
```

This will:
- Set up role-based permissions
- Create an admin superuser account
- Initialize system health monitoring
- Create initial audit logs

### 2. Configure System Health Monitoring

Set up periodic system health monitoring:

```bash
# Collect metrics manually
python manage.py collect_system_metrics --verbose

# Set up a cron job for automatic collection (every 5 minutes)
*/5 * * * * /path/to/your/venv/bin/python /path/to/your/project/manage.py collect_system_metrics
```

## API Endpoints

All admin endpoints require authentication and admin role permissions.

### Analytics Endpoints

#### Get System Overview
```http
GET /api/auth/admin/analytics/?type=overview
```

#### Get User Analytics
```http
GET /api/auth/admin/analytics/?type=users
```

#### Get Booking Analytics
```http
GET /api/auth/admin/analytics/?type=bookings
```

#### Get Content Analytics
```http
GET /api/auth/admin/analytics/?type=content
```

#### Get Performance Metrics
```http
GET /api/auth/admin/analytics/?type=performance
```

### User Management Endpoints

#### List Users with Filtering
```http
GET /api/auth/admin/users/?role=customer&is_active=true&search=john
```

#### Update User Status
```http
PATCH /api/auth/admin/users/{user_id}/
Content-Type: application/json

{
    "action": "update_status",
    "is_active": false
}
```

#### Update User Role
```http
PATCH /api/auth/admin/users/{user_id}/
Content-Type: application/json

{
    "action": "update_role",
    "role": "event_owner"
}
```

#### Get User Activity
```http
GET /api/auth/admin/users/{user_id}/activity/?days=30
```

### Audit Log Endpoints

#### Get Audit Logs
```http
GET /api/auth/admin/audit-logs/?action_type=create&severity=high&page=1
```

### Content Moderation Endpoints

#### Get Moderation Queue
```http
GET /api/auth/admin/moderation/?status=pending&priority=high
```

#### Moderate Content
```http
PATCH /api/auth/admin/moderation/{item_id}/
Content-Type: application/json

{
    "action": "approve",
    "notes": "Content looks good"
}
```

### System Health Endpoints

#### Get System Health Status
```http
GET /api/auth/admin/health/?include_history=true
```

#### Trigger Metrics Collection
```http
POST /api/auth/admin/health/
```

### Dashboard Summary

#### Get Complete Dashboard Data
```http
GET /api/auth/admin/dashboard/summary/
```

## Features in Detail

### 1. System Analytics

The analytics system provides comprehensive insights into:

- **User Metrics**: Registration trends, role distribution, activity patterns
- **Booking Metrics**: Revenue trends, conversion rates, popular events/movies
- **Content Metrics**: Event/movie statistics, category distribution
- **Performance Metrics**: Response times, error rates, system health

### 2. User Management

Admins can:
- View all users with advanced filtering
- Update user status (activate/deactivate)
- Change user roles
- View detailed user activity history
- Track user actions and behavior patterns

### 3. Audit Logging

All important system actions are automatically logged:
- User authentication events
- Content creation/modification
- Permission changes
- Payment transactions
- Admin actions

Each log entry includes:
- User who performed the action
- Action type and description
- IP address and user agent
- Timestamp and severity level
- Success/failure status
- Additional context data

### 4. Content Moderation

The moderation system handles:
- **Events**: New event submissions
- **Movies**: Movie information updates
- **Reviews**: Customer reviews and ratings
- **User Profiles**: Profile information changes

Moderation workflow:
1. Content is automatically added to moderation queue
2. Admins review pending items
3. Content can be approved, rejected, or flagged
4. Actions are logged for audit trail

### 5. System Health Monitoring

Real-time monitoring of:
- **Database Performance**: Query response times
- **System Resources**: CPU, memory, disk usage
- **Application Metrics**: Active users, error rates
- **Business Metrics**: Booking rates, payment success

Health status levels:
- **Healthy**: All metrics within normal ranges
- **Warning**: Some metrics approaching thresholds
- **Critical**: Metrics exceeding critical thresholds

### 6. Middleware Integration

The system includes middleware for:
- **Audit Logging**: Automatic logging of API requests
- **User Action Tracking**: Detailed user behavior tracking
- **Content Moderation**: Automatic queue management

## Security Features

### Role-Based Access Control
- **Admin**: Full system access
- **Event Owner**: Manage own events only
- **Theater Owner**: Manage own theaters only
- **Customer**: Basic user functions only

### Permission Enforcement
- All admin endpoints require authentication
- Role-based permissions are enforced at the API level
- Sensitive operations require admin privileges
- Audit trail for all administrative actions

### Data Protection
- Sensitive data is filtered from logs
- IP addresses and user agents are tracked
- Session management and token validation
- Secure password handling

## Monitoring and Alerts

### Automated Monitoring
- System health metrics collected every 5 minutes
- Automatic status determination based on thresholds
- Historical data retention with configurable cleanup

### Alert Conditions
- Critical system metrics (CPU > 90%, Memory > 95%)
- High error rates (> 10% in 1 hour)
- Database performance issues (> 500ms response time)
- Failed authentication attempts

### Maintenance Commands

#### Setup Admin System
```bash
python manage.py setup_admin_system [options]
```

Options:
- `--create-superuser`: Create admin account
- `--admin-username`: Set admin username
- `--admin-email`: Set admin email
- `--admin-password`: Set admin password
- `--collect-metrics`: Collect initial metrics

#### Collect System Metrics
```bash
python manage.py collect_system_metrics [options]
```

Options:
- `--cleanup-days`: Days to keep old metrics (default: 30)
- `--verbose`: Show detailed output

## Best Practices

### 1. Regular Monitoring
- Check dashboard summary daily
- Review critical alerts immediately
- Monitor user activity patterns
- Track system performance trends

### 2. Content Moderation
- Review moderation queue regularly
- Set clear moderation guidelines
- Document moderation decisions
- Train moderation team on policies

### 3. User Management
- Regular user activity audits
- Prompt role updates when needed
- Monitor for suspicious activity
- Maintain user data accuracy

### 4. System Maintenance
- Run health checks regularly
- Clean up old audit logs periodically
- Monitor disk space usage
- Update system thresholds as needed

### 5. Security
- Regular password updates for admin accounts
- Monitor failed login attempts
- Review audit logs for suspicious activity
- Keep system dependencies updated

## Troubleshooting

### Common Issues

#### High Error Rates
1. Check recent audit logs for error patterns
2. Review system health metrics
3. Check database performance
4. Verify external service connectivity

#### Performance Issues
1. Monitor database query times
2. Check system resource usage
3. Review concurrent user load
4. Analyze slow API endpoints

#### Moderation Queue Backlog
1. Check moderation team availability
2. Review queue priorities
3. Consider auto-approval rules
4. Optimize moderation workflow

### Getting Help

For technical issues:
1. Check system health dashboard
2. Review audit logs for errors
3. Monitor system metrics
4. Contact system administrator

## API Response Examples

### Analytics Response
```json
{
    "analytics_type": "overview",
    "data": {
        "users": {
            "total": 1250,
            "new_30d": 45,
            "active_30d": 320,
            "growth_rate": 3.7
        },
        "bookings": {
            "total": 2840,
            "bookings_30d": 156,
            "growth_rate": 5.8
        },
        "revenue": {
            "total": 142500.00,
            "revenue_30d": 7800.00,
            "average_booking_value": 50.18
        }
    },
    "generated_at": "2024-01-15T10:30:00Z"
}
```

### User Management Response
```json
{
    "users": [
        {
            "id": 123,
            "username": "john_doe",
            "email": "john@example.com",
            "profile": {
                "role": "customer",
                "is_verified": true,
                "created_at": "2024-01-10T08:00:00Z"
            },
            "is_active": true,
            "last_login": "2024-01-15T09:45:00Z"
        }
    ],
    "pagination": {
        "total_count": 1250,
        "page": 1,
        "page_size": 20,
        "total_pages": 63
    }
}
```

### System Health Response
```json
{
    "health_summary": {
        "overall_status": "healthy",
        "critical_count": 0,
        "warning_count": 1,
        "metrics": {
            "database": {
                "value": 45.2,
                "unit": "ms",
                "status": "healthy"
            },
            "cpu_usage": {
                "value": 75.5,
                "unit": "%",
                "status": "warning"
            }
        }
    },
    "timestamp": "2024-01-15T10:30:00Z"
}
```

This admin system provides comprehensive tools for managing and monitoring the Movie and Event Booking platform, ensuring smooth operations and excellent user experience.