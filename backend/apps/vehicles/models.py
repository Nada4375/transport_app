# ============================================================
#  vehicles/models.py  —  TransportHub
#  Modification :
#   - Driver : ajout du champ `status` (available / on_delivery / offline)
#     Le champ is_available est GARDÉ pour compatibilité, mais status
#     est la source de vérité utilisée par auto-assign et deliver.
# ============================================================

from django.contrib.gis.db import models
from apps.transporters.models import Transporter


class Vehicle(models.Model):
    TYPE_CHOICES = [
        ('truck', 'Truck'),
        ('van', 'Van'),
        ('semi', 'Semi-Trailer'),
        ('pickup', 'Pickup'),
    ]
    STATUS_CHOICES = [
        ('available',   'Available'),
        ('on_mission',  'On Mission'),
        ('maintenance', 'Maintenance'),
        ('idle',        'Idle'),
    ]

    transporter   = models.ForeignKey(Transporter, on_delete=models.CASCADE, related_name='vehicles')
    brand         = models.CharField(max_length=100)
    model         = models.CharField(max_length=100)
    plate_number  = models.CharField(max_length=20, unique=True)
    vehicle_type  = models.CharField(max_length=20, choices=TYPE_CHOICES)
    capacity_kg   = models.FloatField()
    year          = models.IntegerField()
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    current_location = models.PointField(srid=4326, null=True, blank=True)
    last_seen     = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vehicles'

    def __str__(self):
        return f'{self.brand} {self.model} · {self.plate_number}'


class Driver(models.Model):
    # ── Statuts possibles ─────────────────────────────────────
    # available   → chauffeur libre, éligible à l'auto-assign
    # on_delivery → chauffeur en cours de livraison
    # offline     → chauffeur indisponible (congé, absent…)
    STATUS_CHOICES = [
        ('available',   'Available'),
        ('on_delivery', 'On Delivery'),
        ('offline',     'Offline'),
    ]

    transporter    = models.ForeignKey(Transporter, on_delete=models.CASCADE, related_name='drivers')
    first_name     = models.CharField(max_length=100)
    last_name      = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    phone          = models.CharField(max_length=20)

    # Nouveau champ : remplace is_available (plus expressif)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')

    # Gardé pour compatibilité avec l'ancien code
    is_available   = models.BooleanField(default=True)

    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'drivers'

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    def save(self, *args, **kwargs):
        # Synchroniser is_available avec status automatiquement
        self.is_available = (self.status == 'available')
        super().save(*args, **kwargs)