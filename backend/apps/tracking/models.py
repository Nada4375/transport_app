from django.contrib.gis.db import models
from apps.orders.models import Order
from apps.vehicles.models import Vehicle


class TrackingPoint(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tracking_points')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='tracking_points')
    location = models.PointField(srid=4326)
    speed_kmh = models.FloatField(default=0)
    heading = models.FloatField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tracking_points'
        ordering = ['-timestamp']

    def __str__(self):
        return f'Track {self.order} @ {self.timestamp}'
