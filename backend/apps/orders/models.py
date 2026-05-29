from django.contrib.gis.db import models
from django.conf import settings
from django.utils import timezone


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('validated', 'Validated'),
        ('assigned', 'Assigned'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    MERCHANDISE_CHOICES = [
        ('electronics', 'Electronics'),
        ('furniture', 'Furniture'),
        ('food', 'Food Products'),
        ('industrial', 'Industrial'),
        ('other', 'Other'),
    ]

    PRIORITY_CHOICES = [
        ('standard', 'Standard'),
        ('express', 'Express'),
        ('urgent', 'Urgent'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        limit_choices_to={'role': 'client'}
    )

    transporter = models.ForeignKey(
        'transporters.Transporter',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )

    vehicle = models.ForeignKey(
        'vehicles.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )

    driver = models.ForeignKey(
        'vehicles.Driver',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )

    # Route
    departure_city = models.CharField(max_length=100)
    destination_city = models.CharField(max_length=100)

    departure_address = models.TextField()
    destination_address = models.TextField()

    departure_point = models.PointField(srid=4326, null=True, blank=True)
    destination_point = models.PointField(srid=4326, null=True, blank=True)

    route_line = models.LineStringField(srid=4326, null=True, blank=True)

    distance_km = models.FloatField(null=True, blank=True)
    estimated_duration_minutes = models.IntegerField(null=True, blank=True)

    # Cargo
    merchandise_type = models.CharField(
        max_length=20,
        choices=MERCHANDISE_CHOICES
    )

    quantity_kg = models.FloatField()

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='standard'
    )

    notes = models.TextField(blank=True)

    # Dates
    desired_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    validated_at = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} | {self.departure_city} → {self.destination_city}'

    @property
    def order_number(self):
        year = timezone.now().year

        if self.created_at:
            year = self.created_at.year

        pk = self.pk or 0

        return f'ORD-{year}-{pk:03d}'