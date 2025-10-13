"""
Test factories for creating test data consistently across all test cases.
Uses factory_boy to create model instances with realistic data.
"""

import factory
from factory.django import DjangoModelFactory
from factory import Faker, SubFactory, LazyAttribute, LazyFunction
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import random
from datetime import timedelta

from users.models import UserProfile
from events.models import Event, TicketType, Discount
from theaters.models import Theater, Movie, Showtime
from bookings.models import Booking, Ticket, CustomerReview, WaitlistEntry


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances"""
    
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    is_active = True
    is_staff = False
    is_superuser = False


class AdminUserFactory(UserFactory):
    """Factory for creating admin users"""
    
    is_staff = True
    is_superuser = True


class UserProfileFactory(DjangoModelFactory):
    """Factory for creating UserProfile instances"""
    
    class Meta:
        model = UserProfile
        django_get_or_create = ('user',)
    
    user = SubFactory(UserFactory)
    role = 'customer'
    phone_number = Faker('phone_number')
    preferences = factory.LazyFunction(lambda: {
        'notification_settings': {
            'email': True,
            'sms': True,
            'push': True
        },
        'favorite_genres': random.sample(['action', 'comedy', 'drama', 'horror'], 2),
        'preferred_locations': ['downtown', 'mall']
    })
    is_verified = True


class EventOwnerProfileFactory(UserProfileFactory):
    """Factory for creating event owner profiles"""
    
    role = 'event_owner'


class TheaterOwnerProfileFactory(UserProfileFactory):
    """Factory for creating theater owner profiles"""
    
    role = 'theater_owner'


class AdminProfileFactory(UserProfileFactory):
    """Factory for creating admin profiles"""
    
    role = 'admin'
    user = SubFactory(AdminUserFactory)


class EventFactory(DjangoModelFactory):
    """Factory for creating Event instances"""
    
    class Meta:
        model = Event
    
    owner = SubFactory(UserFactory)
    title = Faker('sentence', nb_words=4)
    description = Faker('text', max_nb_chars=500)
    venue = Faker('company')
    address = Faker('address')
    category = factory.Iterator(['concert', 'theater', 'sports', 'conference', 'workshop'])
    start_datetime = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=random.randint(1, 30))
    )
    end_datetime = LazyAttribute(
        lambda obj: obj.start_datetime + timedelta(hours=random.randint(2, 8))
    )
    media = factory.LazyFunction(lambda: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
    ])
    status = 'published'
    is_active = True


class PastEventFactory(EventFactory):
    """Factory for creating past events"""
    
    start_datetime = factory.LazyFunction(
        lambda: timezone.now() - timedelta(days=random.randint(1, 30))
    )
    end_datetime = LazyAttribute(
        lambda obj: obj.start_datetime + timedelta(hours=random.randint(2, 8))
    )
    status = 'completed'


class TicketTypeFactory(DjangoModelFactory):
    """Factory for creating TicketType instances"""
    
    class Meta:
        model = TicketType
    
    event = SubFactory(EventFactory)
    name = factory.Iterator(['General', 'VIP', 'Student', 'Senior'])
    description = Faker('text', max_nb_chars=200)
    price = factory.LazyFunction(lambda: Decimal(str(random.uniform(10.0, 200.0))))
    quantity_available = factory.LazyFunction(lambda: random.randint(50, 500))
    quantity_sold = 0
    is_active = True


class DiscountFactory(DjangoModelFactory):
    """Factory for creating Discount instances"""
    
    class Meta:
        model = Discount
    
    event = SubFactory(EventFactory)
    name = Faker('word')
    description = Faker('text', max_nb_chars=200)
    discount_type = factory.Iterator(['percentage', 'fixed_amount'])
    discount_value = factory.LazyAttribute(
        lambda obj: Decimal('10.0') if obj.discount_type == 'percentage' else Decimal('5.00')
    )
    category = factory.Iterator(['promo_code', 'early_bird', 'group', 'student'])
    promo_code = factory.LazyAttribute(
        lambda obj: Faker('word').generate() if obj.category == 'promo_code' else None
    )
    max_uses = factory.LazyFunction(lambda: random.randint(10, 100))
    current_uses = 0
    valid_from = factory.LazyFunction(lambda: timezone.now())
    valid_until = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=random.randint(7, 30))
    )
    is_active = True


class TheaterFactory(DjangoModelFactory):
    """Factory for creating Theater instances"""
    
    class Meta:
        model = Theater
    
    owner = SubFactory(UserFactory)
    name = Faker('company')
    address = Faker('address')
    city = Faker('city')
    state = Faker('state')
    zip_code = Faker('zipcode')
    phone_number = Faker('phone_number')
    screens = factory.LazyFunction(lambda: random.randint(1, 10))
    seating_layout = factory.LazyAttribute(lambda obj: {
        'screens': [
            {
                'screen_number': i + 1,
                'rows': 15,
                'seats_per_row': 20,
                'vip_rows': ['A', 'B', 'C'],
                'disabled_seats': [],
                'pricing': {
                    'regular': 12.00,
                    'vip': 18.00
                }
            }
            for i in range(obj.screens)
        ]
    })
    amenities = factory.LazyFunction(lambda: [
        'IMAX', '3D', 'Dolby Atmos', 'Reclining Seats', 'Concessions'
    ])
    is_active = True


class MovieFactory(DjangoModelFactory):
    """Factory for creating Movie instances"""
    
    class Meta:
        model = Movie
    
    title = Faker('sentence', nb_words=3)
    description = Faker('text', max_nb_chars=500)
    genre = factory.Iterator(['action', 'comedy', 'drama', 'horror', 'sci-fi'])
    duration = factory.LazyFunction(lambda: random.randint(90, 180))
    rating = factory.Iterator(['G', 'PG', 'PG-13', 'R'])
    cast = factory.LazyFunction(lambda: [
        Faker('name').generate() for _ in range(random.randint(3, 8))
    ])
    director = Faker('name')
    producer = Faker('name')
    poster_url = Faker('image_url')
    trailer_url = Faker('url')
    release_date = factory.LazyFunction(
        lambda: timezone.now().date() - timedelta(days=random.randint(0, 365))
    )
    language = 'English'
    is_active = True


class ShowtimeFactory(DjangoModelFactory):
    """Factory for creating Showtime instances"""
    
    class Meta:
        model = Showtime
    
    theater = SubFactory(TheaterFactory)
    movie = SubFactory(MovieFactory)
    screen_number = 1
    start_time = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=random.randint(1, 7), hours=random.randint(10, 22))
    )
    end_time = LazyAttribute(
        lambda obj: obj.start_time + timedelta(minutes=obj.movie.duration + 30)
    )
    base_price = factory.LazyFunction(lambda: Decimal(str(random.uniform(8.0, 25.0))))
    seat_pricing = factory.LazyFunction(lambda: {
        'vip': {
            'rows': ['A', 'B', 'C'],
            'price': 18.00
        },
        'regular': {
            'rows': ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'],
            'price': 12.00
        }
    })
    total_seats = 300
    available_seats = 300
    booked_seats = factory.LazyFunction(list)
    is_active = True


class BookingFactory(DjangoModelFactory):
    """Factory for creating Booking instances"""
    
    class Meta:
        model = Booking
    
    customer = SubFactory(UserFactory)
    booking_type = 'event'
    event = SubFactory(EventFactory)
    showtime = None
    booking_reference = factory.LazyFunction(
        lambda: ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=8))
    )
    subtotal = factory.LazyFunction(lambda: Decimal(str(random.uniform(20.0, 200.0))))
    discount_amount = Decimal('0.00')
    fees = factory.LazyFunction(lambda: Decimal(str(random.uniform(2.0, 10.0))))
    total_amount = LazyAttribute(
        lambda obj: obj.subtotal + obj.fees - obj.discount_amount
    )
    payment_status = 'completed'
    booking_status = 'confirmed'
    payment_method = 'stripe'
    customer_email = LazyAttribute(lambda obj: obj.customer.email)
    customer_phone = Faker('phone_number')


class MovieBookingFactory(BookingFactory):
    """Factory for creating movie bookings"""
    
    booking_type = 'movie'
    event = None
    showtime = SubFactory(ShowtimeFactory)


class TicketFactory(DjangoModelFactory):
    """Factory for creating Ticket instances"""
    
    class Meta:
        model = Ticket
    
    booking = SubFactory(BookingFactory)
    ticket_type = SubFactory(TicketTypeFactory)
    seat_number = factory.LazyFunction(
        lambda: f"{random.choice('ABCDEFGHIJ')}{random.randint(1, 20)}"
    )
    ticket_number = factory.LazyFunction(
        lambda: f"TKT-{timezone.now().strftime('%Y%m%d')}-{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=8))}"
    )
    qr_code_data = LazyAttribute(lambda obj: f"ticket:{obj.ticket_number}")
    qr_code_image = ''
    price = factory.LazyFunction(lambda: Decimal(str(random.uniform(10.0, 50.0))))
    status = 'valid'


class CustomerReviewFactory(DjangoModelFactory):
    """Factory for creating CustomerReview instances"""
    
    class Meta:
        model = CustomerReview
    
    booking = SubFactory(BookingFactory)
    reviewer = LazyAttribute(lambda obj: obj.booking.customer)
    rating = factory.LazyFunction(lambda: random.randint(1, 5))
    review_text = Faker('text', max_nb_chars=300)
    is_verified_purchase = True
    is_approved = True


class WaitlistEntryFactory(DjangoModelFactory):
    """Factory for creating WaitlistEntry instances"""
    
    class Meta:
        model = WaitlistEntry
    
    customer = SubFactory(UserFactory)
    event = SubFactory(EventFactory)
    showtime = None
    ticket_type = SubFactory(TicketTypeFactory)
    ticket_type_name = LazyAttribute(lambda obj: obj.ticket_type.name if obj.ticket_type else 'General')
    quantity_requested = factory.LazyFunction(lambda: random.randint(1, 4))
    max_price_willing_to_pay = factory.LazyFunction(lambda: Decimal(str(random.uniform(20.0, 100.0))))
    notify_email = True
    notify_sms = False
    status = 'active'
    expires_at = factory.LazyFunction(
        lambda: timezone.now() + timedelta(days=random.randint(1, 7))
    )


# Batch factories for creating multiple related objects
class EventWithTicketsFactory(EventFactory):
    """Factory for creating events with multiple ticket types"""
    
    @factory.post_generation
    def ticket_types(self, create, extracted, **kwargs):
        if not create:
            return
        
        if extracted:
            for ticket_type_data in extracted:
                TicketTypeFactory(event=self, **ticket_type_data)
        else:
            # Create default ticket types
            TicketTypeFactory(event=self, name='General', price=Decimal('25.00'), quantity_available=200)
            TicketTypeFactory(event=self, name='VIP', price=Decimal('50.00'), quantity_available=50)


class TheaterWithMoviesFactory(TheaterFactory):
    """Factory for creating theaters with movies and showtimes"""
    
    @factory.post_generation
    def movies(self, create, extracted, **kwargs):
        if not create:
            return
        
        if extracted:
            for movie_data in extracted:
                movie = MovieFactory(**movie_data)
                ShowtimeFactory(theater=self, movie=movie)
        else:
            # Create default movies and showtimes
            for _ in range(3):
                movie = MovieFactory()
                ShowtimeFactory(theater=self, movie=movie)


class BookingWithTicketsFactory(BookingFactory):
    """Factory for creating bookings with multiple tickets"""
    
    @factory.post_generation
    def tickets(self, create, extracted, **kwargs):
        if not create:
            return
        
        ticket_count = extracted or random.randint(1, 4)
        for _ in range(ticket_count):
            TicketFactory(booking=self)


# Utility functions for test data creation
def create_test_user_with_role(role='customer', **kwargs):
    """Create a user with a specific role"""
    user = UserFactory(**kwargs)
    profile = UserProfileFactory(user=user, role=role)
    return user


def create_complete_event_setup():
    """Create a complete event setup with owner, event, ticket types, and discounts"""
    owner = create_test_user_with_role('event_owner')
    event = EventFactory(owner=owner)
    
    # Create ticket types
    general_tickets = TicketTypeFactory(
        event=event, 
        name='General', 
        price=Decimal('25.00'), 
        quantity_available=200
    )
    vip_tickets = TicketTypeFactory(
        event=event, 
        name='VIP', 
        price=Decimal('50.00'), 
        quantity_available=50
    )
    
    # Create discounts
    early_bird = DiscountFactory(
        event=event,
        name='Early Bird',
        category='early_bird',
        discount_type='percentage',
        discount_value=Decimal('15.0')
    )
    
    return {
        'owner': owner,
        'event': event,
        'ticket_types': [general_tickets, vip_tickets],
        'discounts': [early_bird]
    }


def create_complete_theater_setup():
    """Create a complete theater setup with owner, theater, movies, and showtimes"""
    owner = create_test_user_with_role('theater_owner')
    theater = TheaterFactory(owner=owner)
    
    movies = []
    showtimes = []
    
    for _ in range(3):
        movie = MovieFactory()
        movies.append(movie)
        
        # Create multiple showtimes for each movie
        for day in range(3):
            for hour in [14, 17, 20]:  # 2 PM, 5 PM, 8 PM
                showtime = ShowtimeFactory(
                    theater=theater,
                    movie=movie,
                    start_time=timezone.now() + timedelta(days=day, hours=hour)
                )
                showtimes.append(showtime)
    
    return {
        'owner': owner,
        'theater': theater,
        'movies': movies,
        'showtimes': showtimes
    }


def create_booking_scenario(booking_type='event', with_tickets=True):
    """Create a complete booking scenario"""
    customer = create_test_user_with_role('customer')
    
    if booking_type == 'event':
        event_setup = create_complete_event_setup()
        booking = BookingFactory(
            customer=customer,
            booking_type='event',
            event=event_setup['event']
        )
        
        if with_tickets:
            for ticket_type in event_setup['ticket_types']:
                TicketFactory(
                    booking=booking,
                    ticket_type=ticket_type,
                    price=ticket_type.price
                )
    
    else:  # movie booking
        theater_setup = create_complete_theater_setup()
        showtime = theater_setup['showtimes'][0]
        booking = MovieBookingFactory(
            customer=customer,
            showtime=showtime
        )
        
        if with_tickets:
            for _ in range(2):  # Create 2 movie tickets
                TicketFactory(
                    booking=booking,
                    ticket_type=None,
                    price=showtime.base_price
                )
    
    return booking