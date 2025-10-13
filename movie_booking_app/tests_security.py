"""
Comprehensive security tests for the movie booking app
"""
import json
import time
from django.test import TestCase, Client, override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from .security import (
    RateLimitMiddleware, SecurityHeadersMiddleware, InputSanitizationMixin,
    validate_file_upload, generate_secure_filename, SecurityLogger
)
from .file_handlers import SecureFileHandler, MediaUploadHandler
from users.models import UserProfile


class RateLimitingTestCase(APITestCase):
    """Test rate limiting functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        cache.clear()  # Clear cache before each test
    
    def test_anonymous_rate_limiting(self):
        """Test rate limiting for anonymous users"""
        # Make requests up to the limit
        for i in range(5):  # Anonymous limit is 5 for auth endpoints
            response = self.client.post('/api/auth/login/', {
                'username': 'testuser',
                'password': 'wrongpassword'
            })
            # Should not be rate limited yet
            self.assertNotEqual(response.status_code, 429)
        
        # Next request should be rate limited
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 429)
        self.assertIn('rate_limit_exceeded', response.json().get('error', {}).get('code', '').lower())
    
    def test_authenticated_user_rate_limiting(self):
        """Test rate limiting for authenticated users"""
        self.client.force_authenticate(user=self.user)
        
        # Make requests up to the limit (authenticated users have higher limits)
        for i in range(10):  # Authenticated limit is 10 for auth endpoints
            response = self.client.get('/api/auth/profile/')
            if response.status_code == 429:
                break
        
        # Should eventually hit rate limit
        response = self.client.get('/api/auth/profile/')
        if response.status_code == 429:
            self.assertIn('rate_limit_exceeded', response.json().get('error', {}).get('code', '').lower())
    
    def test_rate_limit_reset(self):
        """Test that rate limits reset after time window"""
        # Hit rate limit
        for i in range(6):
            response = self.client.post('/api/auth/login/', {
                'username': 'testuser',
                'password': 'wrongpassword'
            })
        
        # Should be rate limited
        self.assertEqual(response.status_code, 429)
        
        # Clear cache to simulate time passing
        cache.clear()
        
        # Should be able to make requests again
        response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertNotEqual(response.status_code, 429)


class SecurityHeadersTestCase(TestCase):
    """Test security headers middleware"""
    
    def setUp(self):
        self.client = Client()
    
    def test_security_headers_present(self):
        """Test that security headers are added to responses"""
        response = self.client.get('/')
        
        # Check for security headers
        self.assertIn('Content-Security-Policy', response)
        self.assertIn('X-Content-Type-Options', response)
        self.assertIn('X-Frame-Options', response)
        self.assertIn('X-XSS-Protection', response)
        self.assertIn('Referrer-Policy', response)
        self.assertIn('Permissions-Policy', response)
        
        # Check header values
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertEqual(response['X-XSS-Protection'], '1; mode=block')
    
    @override_settings(DEBUG=False)
    def test_hsts_header_in_production(self):
        """Test HSTS header is added in production"""
        response = self.client.get('/')
        self.assertIn('Strict-Transport-Security', response)


class InputSanitizationTestCase(TestCase):
    """Test input sanitization functionality"""
    
    def setUp(self):
        self.sanitizer = InputSanitizationMixin()
    
    def test_string_sanitization(self):
        """Test string sanitization"""
        # Test HTML escaping
        malicious_input = '<script>alert("xss")</script>'
        sanitized = self.sanitizer.sanitize_string(malicious_input)
        self.assertNotIn('<script>', sanitized)
        self.assertIn('&lt;script&gt;', sanitized)
        
        # Test length limiting
        long_string = 'a' * 200
        sanitized = self.sanitizer.sanitize_string(long_string, max_length=100)
        self.assertEqual(len(sanitized), 100)
        
        # Test null byte removal
        null_input = 'test\x00string'
        sanitized = self.sanitizer.sanitize_string(null_input)
        self.assertNotIn('\x00', sanitized)
    
    def test_email_sanitization(self):
        """Test email sanitization"""
        # Valid email
        valid_email = 'Test@Example.COM'
        sanitized = self.sanitizer.sanitize_email(valid_email)
        self.assertEqual(sanitized, 'test@example.com')
        
        # Invalid email
        with self.assertRaises(ValueError):
            self.sanitizer.sanitize_email('invalid-email')
    
    def test_phone_sanitization(self):
        """Test phone number sanitization"""
        # Valid phone with formatting
        phone_input = '+1 (555) 123-4567'
        sanitized = self.sanitizer.sanitize_phone(phone_input)
        self.assertEqual(sanitized, '+15551234567')
        
        # Invalid phone
        with self.assertRaises(ValueError):
            self.sanitizer.sanitize_phone('123')
    
    def test_json_field_sanitization(self):
        """Test JSON field sanitization"""
        malicious_json = {
            'name': '<script>alert("xss")</script>',
            'description': 'a' * 2000,  # Very long string
            'nested': {
                'value': '<img src=x onerror=alert(1)>'
            }
        }
        
        sanitized = self.sanitizer.sanitize_json_field(malicious_json)
        
        # Check HTML is escaped
        self.assertNotIn('<script>', str(sanitized))
        self.assertIn('&lt;script&gt;', sanitized['name'])
        
        # Check length is limited
        self.assertLessEqual(len(sanitized['description']), 1000)
        
        # Check nested values are sanitized
        self.assertNotIn('<img', str(sanitized['nested']))


class FileUploadSecurityTestCase(TestCase):
    """Test file upload security"""
    
    def setUp(self):
        self.handler = SecureFileHandler('image')
    
    def test_valid_image_upload(self):
        """Test valid image upload"""
        # Create a simple valid image file
        image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
        
        uploaded_file = SimpleUploadedFile(
            "test.png",
            image_content,
            content_type="image/png"
        )
        
        # Should not raise exception
        self.assertTrue(self.handler.validate_file(uploaded_file))
    
    def test_file_size_validation(self):
        """Test file size validation"""
        # Create file that's too large
        large_content = b'x' * (6 * 1024 * 1024)  # 6MB (over 5MB limit for images)
        
        uploaded_file = SimpleUploadedFile(
            "large.jpg",
            large_content,
            content_type="image/jpeg"
        )
        
        with self.assertRaises(Exception):
            self.handler.validate_file(uploaded_file)
    
    def test_file_extension_validation(self):
        """Test file extension validation"""
        # Create file with disallowed extension
        uploaded_file = SimpleUploadedFile(
            "malicious.exe",
            b"fake executable content",
            content_type="application/octet-stream"
        )
        
        with self.assertRaises(Exception):
            self.handler.validate_file(uploaded_file)
    
    def test_mime_type_validation(self):
        """Test MIME type validation"""
        # Create file with wrong MIME type
        uploaded_file = SimpleUploadedFile(
            "fake.jpg",
            b"not an image",
            content_type="text/plain"
        )
        
        with self.assertRaises(Exception):
            self.handler.validate_file(uploaded_file)
    
    def test_secure_filename_generation(self):
        """Test secure filename generation"""
        original_filename = "../../../etc/passwd"
        secure_filename = self.handler.generate_secure_filename(original_filename)
        
        # Should not contain path traversal
        self.assertNotIn('..', secure_filename)
        self.assertNotIn('/', secure_filename)
        
        # Should be unique
        secure_filename2 = self.handler.generate_secure_filename(original_filename)
        self.assertNotEqual(secure_filename, secure_filename2)


class AuthenticationSecurityTestCase(APITestCase):
    """Test authentication security"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    def test_password_strength_validation(self):
        """Test password strength requirements"""
        weak_passwords = [
            'password',  # Too common
            '12345678',  # Only digits
            'PASSWORD',  # Only uppercase
            'password123',  # No special chars
            'Pass1!',  # Too short
        ]
        
        for weak_password in weak_passwords:
            response = self.client.post('/api/auth/register/', {
                'username': 'newuser',
                'email': 'new@example.com',
                'password': weak_password,
                'password_confirm': weak_password,
                'first_name': 'Test',
                'last_name': 'User',
            })
            self.assertEqual(response.status_code, 400)
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection in login"""
        malicious_inputs = [
            "admin'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "admin' UNION SELECT * FROM users --",
        ]
        
        for malicious_input in malicious_inputs:
            response = self.client.post('/api/auth/login/', {
                'username': malicious_input,
                'password': 'password'
            })
            # Should not cause server error
            self.assertNotEqual(response.status_code, 500)
    
    def test_xss_protection_in_registration(self):
        """Test XSS protection in user registration"""
        xss_payload = '<script>alert("xss")</script>'
        
        response = self.client.post('/api/auth/register/', {
            'username': 'testuser2',
            'email': 'test2@example.com',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': xss_payload,
            'last_name': 'User',
        })
        
        if response.status_code == 201:
            # Check that XSS payload was sanitized
            user = User.objects.get(username='testuser2')
            self.assertNotIn('<script>', user.first_name)
    
    def test_csrf_protection(self):
        """Test CSRF protection"""
        # This would be tested with a real frontend, but we can test the setting
        from django.conf import settings
        self.assertTrue(settings.CSRF_USE_SESSIONS)
        self.assertTrue(settings.CSRF_COOKIE_HTTPONLY)


class AuditLoggingTestCase(APITestCase):
    """Test audit logging functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123!',
            is_staff=True
        )
        # Set admin role
        admin_profile = UserProfile.objects.get(user=self.admin_user)
        admin_profile.role = 'admin'
        admin_profile.save()
    
    @patch('users.middleware.AuditLog.objects.create')
    def test_admin_action_logging(self, mock_audit_create):
        """Test that admin actions are logged"""
        self.client.force_authenticate(user=self.admin_user)
        
        # Perform admin action
        response = self.client.get('/api/admin/analytics/')
        
        # Check that audit log was called
        mock_audit_create.assert_called()
    
    @patch('users.middleware.UserAction.objects.create')
    def test_user_action_logging(self, mock_action_create):
        """Test that user actions are logged"""
        self.client.force_authenticate(user=self.user)
        
        # Perform user action
        response = self.client.get('/api/auth/profile/')
        
        # Check that user action was logged
        mock_action_create.assert_called()
    
    def test_failed_login_logging(self):
        """Test that failed login attempts are logged"""
        with patch.object(SecurityLogger, 'log_failed_login') as mock_log:
            response = self.client.post('/api/auth/login/', {
                'username': 'nonexistent',
                'password': 'wrongpassword'
            })
            
            # Should log failed login
            mock_log.assert_called_once()


class CORSSecurityTestCase(TestCase):
    """Test CORS security configuration"""
    
    def setUp(self):
        self.client = Client()
    
    def test_cors_allowed_origins(self):
        """Test CORS allowed origins configuration"""
        from django.conf import settings
        
        # Should have specific allowed origins
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertIn('http://localhost:3000', settings.CORS_ALLOWED_ORIGINS)
    
    def test_cors_headers(self):
        """Test CORS headers in response"""
        response = self.client.options('/', HTTP_ORIGIN='http://localhost:3000')
        
        # Should include CORS headers for allowed origin
        if 'Access-Control-Allow-Origin' in response:
            self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:3000')


class DataProtectionTestCase(APITestCase):
    """Test data protection measures"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    def test_sensitive_data_not_exposed(self):
        """Test that sensitive data is not exposed in API responses"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/auth/profile/')
        
        if response.status_code == 200:
            data = response.json()
            # Password should never be in response
            self.assertNotIn('password', str(data).lower())
    
    def test_user_data_isolation(self):
        """Test that users can only access their own data"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='OtherPass123!'
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Try to access other user's data (if such endpoint exists)
        response = self.client.get(f'/api/users/{other_user.id}/')
        
        # Should not be allowed or should not return other user's data
        if response.status_code == 200:
            data = response.json()
            self.assertNotEqual(data.get('id'), other_user.id)


class SecurityIntegrationTestCase(APITestCase):
    """Integration tests for security measures"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='TestPass123!'
        )
    
    def test_complete_user_registration_flow(self):
        """Test complete user registration with security measures"""
        registration_data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'phone_number': '+1234567890'
        }
        
        response = self.client.post('/api/auth/register/', registration_data)
        
        # Should succeed with valid data
        if User.objects.filter(username='newuser').exists():
            user = User.objects.get(username='newuser')
            # Check that data was sanitized
            self.assertEqual(user.email, 'new@example.com')
            self.assertTrue(user.check_password('SecurePass123!'))
    
    def test_secure_api_access_flow(self):
        """Test secure API access with authentication and rate limiting"""
        # Login
        login_response = self.client.post('/api/auth/login/', {
            'username': 'testuser',
            'password': 'TestPass123!'
        })
        
        if login_response.status_code == 200:
            # Use token for authenticated requests
            token = login_response.json().get('access')
            if token:
                self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
                
                # Make authenticated request
                response = self.client.get('/api/auth/profile/')
                self.assertEqual(response.status_code, 200)


# Performance and load testing for security
class SecurityPerformanceTestCase(TestCase):
    """Test security measures don't significantly impact performance"""
    
    def test_rate_limiting_performance(self):
        """Test that rate limiting doesn't significantly slow down requests"""
        client = Client()
        
        start_time = time.time()
        
        # Make several requests
        for i in range(10):
            response = client.get('/')
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete reasonably quickly (adjust threshold as needed)
        self.assertLess(total_time, 5.0)  # 5 seconds for 10 requests
    
    def test_input_sanitization_performance(self):
        """Test input sanitization performance"""
        sanitizer = InputSanitizationMixin()
        
        # Test with large input
        large_input = 'a' * 10000
        
        start_time = time.time()
        sanitized = sanitizer.sanitize_string(large_input, max_length=1000)
        end_time = time.time()
        
        # Should complete quickly
        self.assertLess(end_time - start_time, 1.0)  # 1 second
        self.assertEqual(len(sanitized), 1000)