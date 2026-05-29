from rest_framework import generics, permissions, serializers as drf_serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import TrackingPoint
from apps.orders.models import Order
from apps.vehicles.models import Vehicle


class TrackingPointSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = TrackingPoint
        geo_field = 'location'
        fields = ['id', 'order', 'vehicle', 'speed_kmh', 'heading', 'timestamp']


# ─── NEW: Simple REST serializer (no GeoJSON) for the update endpoint ───
class TrackingUpdateSerializer(drf_serializers.Serializer):
    order_id   = drf_serializers.IntegerField()
    vehicle_id = drf_serializers.IntegerField()
    latitude   = drf_serializers.FloatField()
    longitude  = drf_serializers.FloatField()
    speed_kmh  = drf_serializers.FloatField(default=0)
    heading    = drf_serializers.FloatField(default=0)


class OrderTrackingView(generics.ListAPIView):
    """GET /api/tracking/<order_id>/history/"""
    serializer_class = TrackingPointSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        order_id = self.kwargs['order_id']
        return TrackingPoint.objects.filter(order_id=order_id).order_by('-timestamp')[:100]


class LivePositionsView(APIView):
    """GET /api/tracking/live/  — active vehicles with current position"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        vehicles = Vehicle.objects.filter(
            status='on_mission',
            current_location__isnull=False
        )
        if request.user.role == 'transporter':
            vehicles = vehicles.filter(transporter__user=request.user)

        data = []
        for v in vehicles:
            # Get latest tracking point for extra info
            latest = TrackingPoint.objects.filter(vehicle=v).order_by('-timestamp').first()
            data.append({
                'vehicle_id': v.id,
                'plate':      v.plate_number,
                'latitude':   v.current_location.y,
                'longitude':  v.current_location.x,
                'speed_kmh':  latest.speed_kmh if latest else 0,
                'heading':    latest.heading   if latest else 0,
                'last_seen':  v.last_seen,
                'status':     v.status,
            })
        return Response(data)


class TrackingUpdateView(APIView):
    """
    POST /api/tracking/update/
    REST fallback for when WebSocket is unavailable.
    Body: { order_id, vehicle_id, latitude, longitude, speed_kmh, heading }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TrackingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            order   = Order.objects.get(pk=d['order_id'])
            vehicle = Vehicle.objects.get(pk=d['vehicle_id'])
        except (Order.DoesNotExist, Vehicle.DoesNotExist) as e:
            return Response({'error': str(e)}, status=404)

        point = Point(d['longitude'], d['latitude'], srid=4326)

        # Save tracking point
        tp = TrackingPoint.objects.create(
            order=order,
            vehicle=vehicle,
            location=point,
            speed_kmh=d.get('speed_kmh', 0),
            heading=d.get('heading', 0),
        )

        # Update vehicle live position
        vehicle.current_location = point
        vehicle.save(update_fields=['current_location', 'last_seen'])

        return Response({
            'status': 'ok',
            'id':     tp.id,
            'lat':    d['latitude'],
            'lng':    d['longitude'],
        }, status=201)