from django.urls import path
from .views import update_position, live_positions

urlpatterns = [
    path('update-position/', update_position, name='update-position'),
    path('live/', live_positions, name='live-positions'),
]