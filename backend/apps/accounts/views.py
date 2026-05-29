from django.contrib.auth import get_user_model

from rest_framework import generics, permissions
from rest_framework.response import Response

from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenSerializer
)

User = get_user_model()


class LoginView(TokenObtainPairView):

    serializer_class = CustomTokenSerializer


class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer

    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):

    serializer_class = UserSerializer

    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):

        return self.request.user


class UserListView(generics.ListAPIView):

    queryset = User.objects.all()

    serializer_class = UserSerializer

    permission_classes = [permissions.IsAdminUser]