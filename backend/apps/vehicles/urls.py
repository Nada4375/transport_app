from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, DriverViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicles')
router.register(r'drivers', DriverViewSet, basename='drivers')
urlpatterns = [path('', include(router.urls))]
