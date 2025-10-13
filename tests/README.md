# Testing Suite Documentation

This directory contains a comprehensive testing suite for the Movie and Event Booking Application. The test suite covers unit tests, integration tests, performance tests, and end-to-end scenarios.

## Test Structure

```
tests/
├── __init__.py                 # Test package initialization
├── conftest.py                # Pytest configuration and fixtures
├── factories.py               # Test data factories using factory_boy
├── test_models.py             # Unit tests for all models
├── test_services.py           # Unit tests for service classes
├── test_integration.py        # API integration tests
├── test_performance.py        # Performance and load tests
├── test_e2e_scenarios.py      # End-to-end workflow tests
└── README.md                  # This documentation file
```

## Test Categories

### Unit Tests
- **Models**: Test model validation, properties, methods, and business logic
- **Services**: Test service layer functionality, business logic, and error handling
- **Utilities**: Test utility functions and helper classes

### Integration Tests
- **API Endpoints**: Test REST API functionality and responses
- **Authentication**: Test user authentication and authorization
- **Workflows**: Test complete API workflows and data flow

### Performance Tests
- **Concurrency**: Test concurrent operations and race condition prevention
- **Load Testing**: Test system behavior under high load
- **Database Performance**: Test query optimization and database efficiency
- **Memory Usage**: Test memory consumption patterns

### End-to-End Tests
- **User Journeys**: Test complete user workflows from start to finish
- **Error Handling**: Test error scenarios and recovery mechanisms
- **Cross-Feature Integration**: Test integration between different features

## Running Tests

### Prerequisites
```bash
pip install -r requirements.txt
```

### Basic Test Execution
```bash
# Run all tests
python -m pytest

# Run with verbose output
python -m pytest -v

# Run specific test categories
python -m pytest -m unit
python -m pytest -m integration
python -m pytest -m performance

# Run tests in parallel
python -m pytest -n auto

# Run with coverage
python -m pytest --cov=. --cov-report=html
```

### Using the Test Runner Script
```bash
# Run all tests with coverage
python run_tests.py --coverage

# Run only unit tests
python run_tests.py --unit

# Run integration tests
python run_tests.py --integration

# Run performance tests
python run_tests.py --performance

# Run fast tests only (exclude slow tests)
python run_tests.py --fast

# Run tests in parallel
python run_tests.py --parallel 4
```

### Test Markers

Tests are organized using pytest markers:

- `@pytest.mark.unit`: Unit tests
- `@pytest.mark.integration`: Integration tests
- `@pytest.mark.performance`: Performance tests
- `@pytest.mark.slow`: Slow running tests
- `@pytest.mark.concurrent`: Tests involving concurrency
- `@pytest.mark.django_db`: Tests requiring database access

## Test Data Management

### Factories
The test suite uses `factory_boy` for creating test data. Factories are defined in `factories.py` and provide:

- Consistent test data generation
- Realistic data relationships
- Customizable data attributes
- Batch data creation utilities

### Example Factory Usage
```python
from tests.factories import EventFactory, TicketTypeFactory, BookingFactory

# Create a single event
event = EventFactory()

# Create event with specific attributes
event = EventFactory(title='Special Concert', category='concert')

# Create related objects
ticket_type = TicketTypeFactory(event=event, price=Decimal('25.00'))
booking = BookingFactory(event=event)

# Create complete setups
event_setup = create_complete_event_setup()
theater_setup = create_complete_theater_setup()
```

### Fixtures
Common test fixtures are available in `conftest.py`:

- `api_client`: Unauthenticated API client
- `authenticated_client`: Authenticated customer client
- `event_owner_client`: Authenticated event owner client
- `theater_owner_client`: Authenticated theater owner client
- `admin_client`: Authenticated admin client
- `sample_event`: Pre-created event with ticket types
- `sample_theater_setup`: Pre-created theater with movies and showtimes

## Test Configuration

### Database
Tests use an in-memory SQLite database for speed. For tests requiring PostgreSQL-specific features, use the `@pytest.mark.postgresql` marker.

### Caching
Tests use local memory cache backend to avoid external dependencies.

### Email and SMS
Tests use mock backends for email and SMS to avoid sending real messages.

### External Services
External services (Stripe, Twilio) are mocked in tests to ensure reliability and speed.

## Performance Testing

### Concurrency Tests
Test concurrent operations to ensure data consistency:
- Concurrent booking creation
- Seat selection race conditions
- Discount usage limits
- Payment processing

### Load Tests
Test system performance under load:
- High-volume booking creation
- Search performance with large datasets
- Database query optimization
- Memory usage patterns

### Benchmarking
Performance benchmarks are included to ensure:
- API response times < 2 seconds
- Search operations < 3 seconds
- Database queries optimized (< 10 queries per request)
- Memory usage within acceptable limits

## Continuous Integration

### GitHub Actions
The test suite runs automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled runs (nightly)

### Test Matrix
Tests run against multiple Python versions:
- Python 3.9
- Python 3.10
- Python 3.11

### Coverage Requirements
- Minimum coverage: 90%
- Critical paths: 95%
- New code: 100%

## Writing New Tests

### Guidelines
1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Test Structure**: Follow Arrange-Act-Assert pattern
3. **Test Isolation**: Each test should be independent and not rely on other tests
4. **Mock External Services**: Always mock external API calls and services
5. **Use Factories**: Use factories for creating test data instead of manual creation
6. **Test Edge Cases**: Include tests for error conditions and edge cases

### Example Test Structure
```python
class BookingServiceTest(TestCase):
    """Test BookingService functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.customer = create_test_user_with_role('customer')
        self.event = EventFactory()
        self.ticket_type = TicketTypeFactory(event=self.event)
    
    def test_create_booking_success(self):
        """Test successful booking creation"""
        # Arrange
        booking_data = {
            'customer': self.customer,
            'event': self.event,
            'tickets': [{'ticket_type': self.ticket_type, 'quantity': 2}]
        }
        
        # Act
        booking = BookingService.create_booking(booking_data)
        
        # Assert
        self.assertIsNotNone(booking)
        self.assertEqual(booking.customer, self.customer)
        self.assertEqual(booking.event, self.event)
        self.assertEqual(booking.tickets.count(), 2)
    
    def test_create_booking_insufficient_tickets(self):
        """Test booking creation with insufficient tickets"""
        # Arrange
        self.ticket_type.quantity_available = 1
        self.ticket_type.save()
        
        booking_data = {
            'customer': self.customer,
            'event': self.event,
            'tickets': [{'ticket_type': self.ticket_type, 'quantity': 5}]
        }
        
        # Act & Assert
        with self.assertRaises(ValidationError):
            BookingService.create_booking(booking_data)
```

## Debugging Tests

### Running Individual Tests
```bash
# Run specific test file
python -m pytest tests/test_models.py

# Run specific test class
python -m pytest tests/test_models.py::EventModelTest

# Run specific test method
python -m pytest tests/test_models.py::EventModelTest::test_event_creation
```

### Debug Mode
```bash
# Run with pdb debugger
python -m pytest --pdb

# Stop on first failure
python -m pytest -x

# Show local variables in tracebacks
python -m pytest -l
```

### Test Output
```bash
# Capture print statements
python -m pytest -s

# Show test durations
python -m pytest --durations=10
```

## Test Data Cleanup

Tests automatically clean up:
- Database records (handled by Django's test framework)
- Cache data (cleared after each test)
- Mock objects (reset automatically)
- File uploads (cleaned up in tearDown methods)

## Best Practices

1. **Keep Tests Fast**: Use mocks for external services and optimize database queries
2. **Test Behavior, Not Implementation**: Focus on testing what the code does, not how it does it
3. **Use Meaningful Assertions**: Use specific assertions that clearly indicate what failed
4. **Test Error Conditions**: Include tests for error scenarios and edge cases
5. **Maintain Test Data**: Keep test data minimal and focused on the test scenario
6. **Document Complex Tests**: Add comments for complex test logic or setup
7. **Regular Test Maintenance**: Update tests when requirements change
8. **Monitor Test Performance**: Keep an eye on test execution time and optimize slow tests

## Troubleshooting

### Common Issues

1. **Database Errors**: Ensure migrations are up to date
2. **Import Errors**: Check Python path and installed dependencies
3. **Mock Issues**: Verify mock patches are correctly applied
4. **Timing Issues**: Use appropriate waits for asynchronous operations
5. **Data Conflicts**: Ensure test data doesn't conflict between tests

### Getting Help

- Check test logs for detailed error messages
- Use pytest's verbose mode for more information
- Review factory definitions for data creation issues
- Consult Django testing documentation for framework-specific issues