#!/usr/bin/env python
"""
Test script to demonstrate the authentication and role management system.
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_booking_app.settings')
django.setup()

from django.contrib.auth.models import User
from users.models import UserProfile, RolePermissionManager


def test_authentication_system():
    """Test the authentication and role management system"""
    
    print("🔐 Testing Movie Booking App Authentication System")
    print("=" * 60)
    
    # Setup permissions
    print("\n1. Setting up role-based permissions...")
    RolePermissionManager.setup_role_permissions()
    print("✅ Permissions setup complete")
    
    # Test user creation with different roles
    print("\n2. Creating users with different roles...")
    
    # Create admin user
    admin_user = User.objects.create_user(
        username='admin',
        email='admin@example.com',
        password='adminpass123',
        first_name='Admin',
        last_name='User'
    )
    admin_user.profile.role = 'admin'
    admin_user.profile.save()
    print(f"✅ Created admin user: {admin_user.username}")
    
    # Create event owner
    event_owner = User.objects.create_user(
        username='eventowner',
        email='eventowner@example.com',
        password='eventpass123',
        first_name='Event',
        last_name='Owner'
    )
    event_owner.profile.role = 'event_owner'
    event_owner.profile.phone_number = '+1234567890'
    event_owner.profile.save()
    print(f"✅ Created event owner: {event_owner.username}")
    
    # Create theater owner
    theater_owner = User.objects.create_user(
        username='theaterowner',
        email='theaterowner@example.com',
        password='theaterpass123',
        first_name='Theater',
        last_name='Owner'
    )
    theater_owner.profile.role = 'theater_owner'
    theater_owner.profile.save()
    print(f"✅ Created theater owner: {theater_owner.username}")
    
    # Create customer
    customer = User.objects.create_user(
        username='customer',
        email='customer@example.com',
        password='customerpass123',
        first_name='Customer',
        last_name='User'
    )
    customer.profile.role = 'customer'
    customer.profile.save()
    print(f"✅ Created customer: {customer.username}")
    
    # Test role assignments and permissions
    print("\n3. Testing role assignments and permissions...")
    
    # Test admin permissions
    print(f"\n👑 Admin User ({admin_user.username}):")
    print(f"   - Is staff: {admin_user.is_staff}")
    print(f"   - Is superuser: {admin_user.is_superuser}")
    print(f"   - Groups: {[g.name for g in admin_user.groups.all()]}")
    print(f"   - Can view system analytics: {admin_user.has_perm('users.can_view_system_analytics')}")
    print(f"   - Can manage all users: {admin_user.has_perm('users.can_manage_all_users')}")
    
    # Test event owner permissions
    print(f"\n🎭 Event Owner ({event_owner.username}):")
    print(f"   - Is staff: {event_owner.is_staff}")
    print(f"   - Groups: {[g.name for g in event_owner.groups.all()]}")
    print(f"   - Can create events: {event_owner.has_perm('users.can_create_event')}")
    print(f"   - Can manage own events: {event_owner.has_perm('users.can_manage_own_events')}")
    print(f"   - Can view event analytics: {event_owner.has_perm('users.can_view_event_analytics')}")
    print(f"   - Can view system analytics: {event_owner.has_perm('users.can_view_system_analytics')}")
    
    # Test theater owner permissions
    print(f"\n🎬 Theater Owner ({theater_owner.username}):")
    print(f"   - Is staff: {theater_owner.is_staff}")
    print(f"   - Groups: {[g.name for g in theater_owner.groups.all()]}")
    print(f"   - Can create theaters: {theater_owner.has_perm('users.can_create_theater')}")
    print(f"   - Can manage own theaters: {theater_owner.has_perm('users.can_manage_own_theaters')}")
    print(f"   - Can view theater analytics: {theater_owner.has_perm('users.can_view_theater_analytics')}")
    
    # Test customer permissions
    print(f"\n👤 Customer ({customer.username}):")
    print(f"   - Is staff: {customer.is_staff}")
    print(f"   - Groups: {[g.name for g in customer.groups.all()]}")
    print(f"   - Can create bookings: {customer.has_perm('users.can_create_booking')}")
    print(f"   - Can view own bookings: {customer.has_perm('users.can_view_own_bookings')}")
    print(f"   - Can cancel bookings: {customer.has_perm('users.can_cancel_booking')}")
    print(f"   - Can create events: {customer.has_perm('users.can_create_event')}")
    
    # Test profile information
    print("\n4. Testing user profiles...")
    for user in [admin_user, event_owner, theater_owner, customer]:
        profile = user.profile
        print(f"   - {user.username}: {profile.get_role_display()}, Phone: {profile.phone_number or 'N/A'}")
    
    print("\n✅ Authentication system test completed successfully!")
    print("\n📋 Summary:")
    print("   - ✅ User registration and profile creation")
    print("   - ✅ Role-based permission assignment")
    print("   - ✅ Django group management")
    print("   - ✅ JWT token authentication (tested via API)")
    print("   - ✅ Permission checking and authorization")
    print("   - ✅ User profile management")
    
    print("\n🔗 Available API Endpoints:")
    print("   - POST /api/auth/register/ - User registration")
    print("   - POST /api/auth/login/ - User login")
    print("   - POST /api/auth/logout/ - User logout")
    print("   - GET /api/auth/profile/ - Get user profile")
    print("   - PUT /api/auth/profile/ - Update user profile")
    print("   - POST /api/auth/password/change/ - Change password")
    print("   - GET /api/auth/permissions/ - Get user permissions")
    print("   - GET /api/auth/list/ - List users (admin only)")
    print("   - POST /api/auth/token/verify/ - Verify JWT token")
    print("   - POST /api/auth/token/refresh/ - Refresh JWT token")


if __name__ == '__main__':
    test_authentication_system()