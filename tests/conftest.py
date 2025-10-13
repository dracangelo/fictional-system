"""
Pytest configuration and fixtures for the movie booking application tests.
"""

import pytest
from django.conf import settings
from django.test import override_settings
from django.core.management import call_command
from django.db import transaction
import os

# Test database settings
TEST_DATABASE_SETTINGS = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'timeout': 20,
        },
    }
}

# Test cache settings
TEST_CACHE_SETTINGS = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Test email settings
TEST_EMAIL_SETTINGS = {
    'EMAIL_BACKEND': 'django.core.mail.backends.locmem.EmailBackend',
}

# Test Celery settings
TEST_CELERY_SETTINGS = {
    'CELERY_TASK_ALWAYS_EAGER': True,
    'CELERY_TASK_EAGER_PROPAGATES': True,
}


@pytest.fixture(scope='session')
def django_db_setup():
    """Set up test database"""
    settings.DATABASES = TEST_DATABASE_SETTINGS
    settings.CACHES = TEST_CACHE_SETTINGS
    
    # Apply test-specific settings
    for key, value in TEST_EMAIL_SETTINGS.items():
        setattr(settings, key, value)
    
    for key, value in TEST_CELERY_SETTINGS.items():
        setattr(settings, key, value)


@pytest.fixture
def api_client():
    """Provide API client for tests"""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client):
    """Provide authenticated API client"""
    from tests.factories import create_test_user_with_role
    
    user = create_test_user_with_role('customer')
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def event_owner_client(api_client):
    """Provide event owner authenticated client"""
    from tests.factories import create_test_user_with_role
    
    user = create_test_user_with_role('event_owner')
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def theater_owner_client(api_client):
    """Provide theater owner authenticated client"""
    from tests.factories import create_test_user_with_role
    
    user = create_test_user_with_role('theater_owner')
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def admin_client(api_client):
    """Provide admin authenticated client"""
    from tests.factories import create_test_user_with_role
    
    user = create_test_user_with_role('admin')
    api_client.force_authenticate(user=user)
    return api_client, user


@pytest.fixture
def sample_event():
    """Create a sample event for testing"""
    from tests.factories import EventFactory, TicketTypeFactory, create_test_user_with_role
    
    owner = create_test_user_with_role('event_owner')
    event = EventFactory(owner=owner)
    
    # Add ticket types
    general = TicketTypeFactory(event=event, name='General', price='25.00')
    vip = TicketTypeFactory(event=event, name='VIP', price='50.00')
    
    return {
        'event': event,
        'owner': owner,
        'ticket_types': [general, vip]
    }


@pytest.fixture
def sample_theater_setup():
    """Create a sample theater setup for testing"""
    from tests.factories import (
        TheaterFactory, MovieFactory, ShowtimeFactory, create_test_user_with_role
    )
    
    owner = create_test_user_with_role('theater_owner')
    theater = TheaterFactory(owner=owner)
    movie = MovieFactory()
    showtime = ShowtimeFactory(theater=theater, movie=movie)
    
    return {
        'theater': theater,
        'movie': movie,
        'showtime': showtime,
        'owner': owner
    }


@pytest.fixture
def mock_stripe_payment():
    """Mock Stripe payment for testing"""
    from unittest.mock import patch, Mock
    
    with patch('stripe.PaymentIntent.create') as mock_create:
        mock_create.return_value = Mock(
            id='pi_test123',
            client_secret='pi_test123_secret',
            status='requires_payment_method'
        )
        yield mock_create


@pytest.fixture
def mock_email_backend():
    """Mock email backend for testing"""
    from unittest.mock import patch
    
    with patch('django.core.mail.send_mail') as mock_send:
        mock_send.return_value = True
        yield mock_send


@pytest.fixture
def mock_sms_service():
    """Mock SMS service for testing"""
    from unittest.mock import patch, Mock
    
    with patch('twilio.rest.Client') as mock_client:
        mock_instance = Mock()
        mock_client.return_value = mock_instance
        mock_instance.messages.create.return_value = Mock(sid='test_sid')
        yield mock_instance


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Enable database access for all tests"""
    pass


@pytest.fixture
def transactional_db():
    """Provide transactional database access for concurrency tests"""
    from django.test import TransactionTestCase
    return TransactionTestCase


# Performance testing fixtures
@pytest.fixture
def performance_data():
    """Create performance test data"""
    from tests.factories import EventFactory, TheaterFactory, MovieFactory
    
    events = [EventFactory() for _ in range(50)]
    theaters = [TheaterFactory() for _ in range(10)]
    movies = [MovieFactory() for _ in range(20)]
    
    return {
        'events': events,
        'theaters': theaters,
        'movies': movies
    }


# Markers for different test types
pytest_plugins = ['pytest_django']

def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line(
        "markers", "unit: Unit tests"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests"
    )
    config.addinivalue_line(
        "markers", "performance: Performance tests"
    )
    config.addinivalue_line(
        "markers", "slow: Slow running tests"
    )
    config.addinivalue_line(
        "markers", "concurrent: Tests involving concurrency"
    )


# Test data cleanup
@pytest.fixture(autouse=True)
def cleanup_test_data():
    """Clean up test data after each test"""
    yield
    
    # Clear any cached data
    from django.core.cache import cache
    cache.clear()
    
    # Reset any global state if needed
    pass