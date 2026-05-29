from django.contrib import admin
from .models import TrackingPoint

@admin.register(TrackingPoint)
class TrackingPointAdmin(admin.ModelAdmin):
    list_display = ['order', 'vehicle', 'speed_kmh', 'heading', 'timestamp']
    list_filter = ['vehicle']
    ordering = ['-timestamp']