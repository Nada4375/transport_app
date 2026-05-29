from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'client', 'departure_city', 'destination_city', 'status', 'priority', 'desired_date', 'created_at']
    list_filter = ['status', 'priority', 'merchandise_type']
    search_fields = ['client__username', 'departure_city', 'destination_city']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'validated_at', 'assigned_at', 'started_at', 'delivered_at']