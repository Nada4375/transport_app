from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransporterViewSet

router = DefaultRouter()
router.register(r'', TransporterViewSet, basename='transporters')
urlpatterns = [path('', include(router.urls))]
