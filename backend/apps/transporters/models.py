from django.contrib.gis.db import models
from django.conf import settings


class Transporter(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transporter_profile'
    )

    company_name = models.CharField(max_length=200)
    responsable_name = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=50, unique=True)

    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)

    city = models.CharField(max_length=120, blank=True)
    local_address = models.TextField(blank=True)

    latitude = models.FloatField(default=0)
    longitude = models.FloatField(default=0)
    service_radius_km = models.FloatField(default=20)

    is_available = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    rating = models.FloatField(default=0)
    total_deliveries = models.IntegerField(default=0)
    max_daily_orders = models.IntegerField(default=20)
    current_active_orders = models.IntegerField(default=0)

    coverage_area = models.PolygonField(srid=4326, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transporters'

    def __str__(self):
        return self.company_name