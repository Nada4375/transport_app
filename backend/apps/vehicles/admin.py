from django.contrib import admin
from .models import Vehicle, Driver

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['plate_number', 'brand', 'model', 'transporter', 'vehicle_type', 'capacity_kg', 'status']
    list_filter = ['status', 'vehicle_type']
    search_fields = ['plate_number', 'brand', 'model']

@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'transporter', 'license_number', 'phone', 'is_available']
    list_filter = ['is_available']
    search_fields = ['first_name', 'last_name', 'license_number']