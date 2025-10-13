from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db import transaction

from .models import UserProfile
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordChangeSerializer,
    UserProfileUpdateSerializer
)


class UserRegistrationView(APIView):
    """User registration endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    user = serializer.save()
                    
                    # Generate JWT tokens
                    refresh = RefreshToken.for_user(user)
                    access_token = refresh.access_token
                    
                    # Serialize user data
                    user_serializer = UserSerializer(user)
                    
                    return Response({
                        'message': 'User registered successfully',
                        'user': user_serializer.data,
                        'tokens': {
                            'access': str(access_token),
                            'refresh': str(refresh),
                        }
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'error': 'Registration failed',
                    'details': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'error': 'Invalid data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Serialize user data
            user_serializer = UserSerializer(user)
            
            return Response({
                'message': 'Login successful',
                'user': user_serializer.data,
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh),
                }
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': 'Invalid credentials',
            'details': serializer.errors
        }, status=status.HTTP_401_UNAUTHORIZED)


class UserLogoutView(APIView):
    """User logout endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Logout failed',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """User profile view and update endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response({
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    def put(self, request):
        """Update current user profile"""
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({
                'error': 'User profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Return updated user data
            user_serializer = UserSerializer(request.user)
            return Response({
                'message': 'Profile updated successfully',
                'user': user_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': 'Invalid data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """Password change endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        
        return Response({
            'error': 'Password change failed',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """List all users (admin only)"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter users based on user role"""
        user = self.request.user
        
        # Only admins can view all users
        if hasattr(user, 'profile') and user.profile.role == 'admin':
            return User.objects.all().select_related('profile')
        
        # Other users can only see their own profile
        return User.objects.filter(id=user.id).select_related('profile')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_permissions(request):
    """Get current user's permissions"""
    user = request.user
    
    # Get user permissions
    user_permissions = user.get_all_permissions()
    
    # Get group permissions
    group_permissions = set()
    for group in user.groups.all():
        group_permissions.update(group.permissions.values_list('codename', flat=True))
    
    # Get role information
    role_info = {
        'role': user.profile.role if hasattr(user, 'profile') else 'customer',
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }
    
    return Response({
        'user_permissions': list(user_permissions),
        'group_permissions': list(group_permissions),
        'role_info': role_info,
        'groups': [group.name for group in user.groups.all()]
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_token(request):
    """Verify JWT token validity"""
    return Response({
        'message': 'Token is valid',
        'user_id': request.user.id,
        'username': request.user.username
    }, status=status.HTTP_200_OK)
