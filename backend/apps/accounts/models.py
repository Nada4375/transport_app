from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('transporter', 'Transporter'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    location = models.PointField(null=True, blank=True, srid=4326)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f'{self.username} ({self.role})'

    @property
    def is_client(self):
        return self.role == 'client'

    @property
    def is_transporter(self):
        return self.role == 'transporter'

    @property
    def is_admin_user(self):
        return self.role == 'admin'
