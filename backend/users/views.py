from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import UserSerializer, LoginSerializer

# Maps role key → Django role value used in User.role
ROLE_USER_MAP = {
    'CTO':      'CTO',
    'MANAGER':  'Senior Project Manager',
    'TL':       'PM Team Lead',
    'SM':       'Scrum Master',
    'PM':       'Product Manager',
    'EMPLOYEE': 'Database Developer',
}


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email'].lower()
    password = serializer.validated_data['password']

    user = authenticate(request, username=email, password=password)
    if not user:
        return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    refresh_token = request.data.get('refresh')
    if not refresh_token:
        return Response({'detail': 'Refresh token required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        refresh = RefreshToken(refresh_token)
        return Response({'access': str(refresh.access_token)})
    except Exception:
        return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def role_login(request):
    """Password-free login by role key (CTO / MANAGER / TL / SM / PM / EMPLOYEE).
    Optional `name` param allows picking a specific user when multiple share the same role.
    """
    role_key = request.data.get('role', '').upper()
    name_filter = request.data.get('name', '').strip()
    role_value = ROLE_USER_MAP.get(role_key)
    if not role_value:
        return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)

    if name_filter:
        # When a specific name is requested, filter by perfiq (not exact role string)
        # so Project Managers, Architect Managers etc. are all found under 'MANAGER'
        qs = User.objects.filter(perfiq=role_key, name__icontains=name_filter, is_active=True)
    else:
        qs = User.objects.filter(role=role_value, is_active=True)

    user = qs.first()
    if not user:
        return Response({'detail': f'No active user found for role: {role_key}{" / " + name_filter if name_filter else ""}'}, status=status.HTTP_404_NOT_FOUND)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    users = User.objects.filter(is_active=True)
    return Response(UserSerializer(users, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def assign_manager(request, user_id):
    """Assign a user to a manager by updating their reports_to field."""
    try:
        target_user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    manager_id = request.data.get('reports_to')
    if manager_id is None:
        target_user.reports_to = None
    else:
        try:
            manager = User.objects.get(id=manager_id, is_active=True)
            target_user.reports_to = manager
        except User.DoesNotExist:
            return Response({'detail': 'Manager not found.'}, status=status.HTTP_404_NOT_FOUND)

    target_user.save(update_fields=['reports_to'])
    return Response(UserSerializer(target_user).data)
