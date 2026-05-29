from django.urls import path
from .views import OrderTrackingView, LivePositionsView, TrackingUpdateView

urlpatterns = [
    path('<int:order_id>/history/', OrderTrackingView.as_view(), name='tracking-history'),
    path('live/',                   LivePositionsView.as_view(),  name='live-positions'),
    path('update/',                 TrackingUpdateView.as_view(), name='tracking-update'),  # NEW
]