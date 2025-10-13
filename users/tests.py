from django.test import TestCase
from django.contrib.auth.models import User, Group, Permission
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import UserProfile, RolePermissionManager
from .serializers import UserRegistrationSerializer, UserLoginSerializer


class UserProfileModelTest(TestCase):
    """Test cases for UserProfile model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_profile_creation(self):
        """Test that UserProfile is created when User is created"""
        self.assertTrue(hasattr(self.user, 'profile'))
        self.assertEqual(self.user.profile.role, 'customer')
        self.assertFalse(self.user.profile.is_verified)
    
    def test_user_profile_str_representation(self):
        """Test UserProfile string representation"""
        expected = f"{self.user.username} - Customer"
        self.assertEqual(str(self.user.profile), expected)
    
    def test_role_assignment(self):
        """Test role assignment and group membership"""
        # Set up permissions first
        RolePermissionManager.setup_role_permissions()
        
        # Test admin role assignment
        self.user.profile.role = 'admin'
        self.user.profile.save()
        
        self.assertTrue(self.user.groups.filter(name='admin').exists())
        self.assertTrue(self.user.is_staff)
        self.assertTrue(self.user.is_superuser)
        
        # Test event_owner role assignment
        self.user.profile.role = 'event_owner'
        self.user.profile.save()
        
        self.assertTrue(self.user.groups.filter(name='event_owner').exists())
        self.assertFalse(self.user.groups.filter(name='admin').exists())
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)


class RolePermissionManagerTest(TestCase):
    """Test cases for RolePermissionManager"""
    
    def test_setup_role_permissions(self):
        """Test role permissions setup"""
        RolePermissionManager.setup_role_permissions()
        
        # Check that groups are created
        self.assertTrue(Group.objects.filter(name='admin').exists())
        self.assertTrue(Group.objects.filter(name='event_owner').exists())
        self.assertTrue(Group.objects.filter(name='theater_owner').exists())
        self.assertTrue(Group.objects.filter(name='customer').exists())
        
        # Check that permissions are created
        admin_group = Group.objects.get(name='admin')
        event_owner_group = Group.objects.get(name='event_owner')
        customer_group = Group.objects.get(name='customer')
        
        # Admin should have all permissions
        self.assertTrue(admin_group.permissions.filter(codename='can_view_system_analytics').exists())
        self.assertTrue(admin_group.permissions.filter(codename='can_manage_all_users').exists())
        
        # Event owner should have event-related permissions
        self.assertTrue(event_owner_group.permissions.filter(codename='can_create_event').exists())
        self.assertTrue(event_owner_group.permissions.filter(codename='can_manage_own_events').exists())
        
        # Customer should have basic permissions
        self.assertTrue(customer_group.permissions.filter(codename='can_create_booking').exists())
        self.assertTrue(customer_group.permissions.filter(codename='can_view_own_bookings').exists())


class UserRegistrationSerializerTest(TestCase):
    """Test cases for UserRegistrationSerializer"""
    
    def test_valid_registration_data(self):
        """Test serializer with valid registration data"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'John',
            'last_name': 'Doe',
            'role': 'customer',
            'phone_number': '+1234567890'
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        user = serializer.save()
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertEqual(user.profile.role, 'customer')
        self.assertEqual(user.profile.phone_number, '+1234567890')
    
    def test_password_mismatch(self):
        """Test serializer with password mismatch"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'differentpassword',
            'first_name': 'John',
            'last_name': 'Doe',
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('Password and password confirmation do not match', str(serializer.errors))
    
    def test_duplicate_email(self):
        """Test serializer with duplicate email"""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='password123'
        )
        
        data = {
            'username': 'newuser',
            'email': 'existing@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'John',
            'last_name': 'Doe',
        }
        
        serializer = UserRegistrationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('email', serializer.errors)


class UserLoginSerializerTest(TestCase):
    """Test cases for UserLoginSerializer"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_valid_login_with_username(self):
        """Test login with valid username"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['user'], self.user)
    
    def test_valid_login_with_email(self):
        """Test login with valid email"""
        data = {
            'username': 'test@example.com',
            'password': 'testpass123'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['user'], self.user)
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        
        serializer = UserLoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('Invalid credentials', str(serializer.errors))


class AuthenticationAPITest(APITestCase):
    """Test cases for authentication API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        RolePermissionManager.setup_role_permissions()
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        url = reverse('users:register')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'event_owner',
            'phone_number': '+1234567890'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['profile']['role'], 'event_owner')
        
        # Verify user was created
        user = User.objects.get(username='newuser')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertEqual(user.profile.role, 'event_owner')
    
    def test_user_login(self):
        """Test user login endpoint"""
        url = reverse('users:login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')
    
    def test_user_login_with_email(self):
        """Test user login with email"""
        url = reverse('users:login')
        data = {
            'username': 'test@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        url = reverse('users:login')
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_profile_access(self):
        """Test accessing user profile"""
        # Authenticate user
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'testuser')
        self.assertEqual(response.data['user']['profile']['role'], 'customer')
    
    def test_user_profile_update(self):
        """Test updating user profile"""
        # Authenticate user
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:profile')
        data = {
            'first_name': 'Updated',
            'last_name': 'Name',
            'phone_number': '+9876543210'
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify update
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated')
        self.assertEqual(self.user.last_name, 'Name')
        self.assertEqual(self.user.profile.phone_number, '+9876543210')
    
    def test_password_change(self):
        """Test password change endpoint"""
        # Authenticate user
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:password_change')
        data = {
            'old_password': 'testpass123',
            'new_password': 'newstrongpassword123',
            'new_password_confirm': 'newstrongpassword123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newstrongpassword123'))
    
    def test_user_permissions_endpoint(self):
        """Test user permissions endpoint"""
        # Set user as event owner
        self.user.profile.role = 'event_owner'
        self.user.profile.save()
        
        # Authenticate user
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:user_permissions')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role_info']['role'], 'event_owner')
        self.assertIn('event_owner', response.data['groups'])
    
    def test_token_verification(self):
        """Test token verification endpoint"""
        # Authenticate user
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:token_verify')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_id'], self.user.id)
        self.assertEqual(response.data['username'], self.user.username)
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        url = reverse('users:profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_list_access_control(self):
        """Test user list endpoint access control"""
        # Test as regular customer
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        url = reverse('users:user_list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Customer should only see their own profile
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.user.id)
        
        # Test as admin
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        admin_user.profile.role = 'admin'
        admin_user.profile.save()
        
        admin_refresh = RefreshToken.for_user(admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_refresh.access_token}')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Admin should see all users
        self.assertEqual(len(response.data['results']), 2)


class AuthorizationTest(TestCase):
    """Test cases for role-based authorization"""
    
    def setUp(self):
        RolePermissionManager.setup_role_permissions()
        
        # Create users with different roles
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.admin_user.profile.role = 'admin'
        self.admin_user.profile.save()
        
        self.event_owner = User.objects.create_user(
            username='eventowner',
            email='eventowner@example.com',
            password='eventpass123'
        )
        self.event_owner.profile.role = 'event_owner'
        self.event_owner.profile.save()
        
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@example.com',
            password='customerpass123'
        )
        self.customer.profile.role = 'customer'
        self.customer.profile.save()
    
    def test_admin_permissions(self):
        """Test admin user permissions"""
        self.assertTrue(self.admin_user.has_perm('users.can_view_system_analytics'))
        self.assertTrue(self.admin_user.has_perm('users.can_manage_all_users'))
        self.assertTrue(self.admin_user.has_perm('users.can_create_event'))
        self.assertTrue(self.admin_user.is_staff)
        self.assertTrue(self.admin_user.is_superuser)
    
    def test_event_owner_permissions(self):
        """Test event owner permissions"""
        self.assertTrue(self.event_owner.has_perm('users.can_create_event'))
        self.assertTrue(self.event_owner.has_perm('users.can_manage_own_events'))
        self.assertTrue(self.event_owner.has_perm('users.can_view_event_analytics'))
        self.assertFalse(self.event_owner.has_perm('users.can_view_system_analytics'))
        self.assertFalse(self.event_owner.is_staff)
    
    def test_customer_permissions(self):
        """Test customer permissions"""
        self.assertTrue(self.customer.has_perm('users.can_create_booking'))
        self.assertTrue(self.customer.has_perm('users.can_view_own_bookings'))
        self.assertFalse(self.customer.has_perm('users.can_create_event'))
        self.assertFalse(self.customer.has_perm('users.can_view_system_analytics'))
        self.assertFalse(self.customer.is_staff)
    
    def test_group_membership(self):
        """Test user group membership"""
        self.assertTrue(self.admin_user.groups.filter(name='admin').exists())
        self.assertTrue(self.event_owner.groups.filter(name='event_owner').exists())
        self.assertTrue(self.customer.groups.filter(name='customer').exists())
        
        # Ensure users are not in multiple role groups
        self.assertFalse(self.event_owner.groups.filter(name='admin').exists())
        self.assertFalse(self.customer.groups.filter(name='event_owner').exists())
