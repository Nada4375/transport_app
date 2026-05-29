from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from .models import Order
from .serializers import OrderSerializer, OrderGeoSerializer
from apps.transporters.models import Transporter
from apps.vehicles.models import Vehicle


class IsClientOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        
        if request.user.role == 'admin':
            return True
        if request.user.role == 'client':
            return obj.client == request.user
        if request.user.role == 'transporter':
            return obj.transporter and obj.transporter.user == request.user
        return False


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            qs = Order.objects.all()
        elif user.role == 'client':
            qs = Order.objects.filter(client=user)
        elif user.role == 'transporter':
            qs = Order.objects.filter(transporter__user=user)
        else:
            qs = Order.objects.none()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs.select_related('client', 'transporter', 'vehicle', 'driver')

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsClientOwner()]
        return super().get_permissions()

    @action(detail=True, methods=['post'], url_path='validate')
    def validate_order(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        order = self.get_object()
        if order.status != 'pending':
            return Response({'error': 'Order is not pending.'}, status=400)
        order.status = 'validated'
        order.validated_at = timezone.now()
        order.save()
        return Response({'message': 'Order validated.', 'order': OrderSerializer(order).data})

    @action(detail=True, methods=['post'], url_path='assign')
    def assign_order(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        order = self.get_object()
        transporter_id = request.data.get('transporter_id')
        vehicle_id = request.data.get('vehicle_id')
        driver_id = request.data.get('driver_id')

        try:
            transporter = Transporter.objects.get(pk=transporter_id)
            vehicle = Vehicle.objects.get(pk=vehicle_id, transporter=transporter)
        except (Transporter.DoesNotExist, Vehicle.DoesNotExist):
            return Response({'error': 'Invalid transporter or vehicle.'}, status=400)

        order.transporter = transporter
        order.vehicle = vehicle
        if driver_id:
            from apps.vehicles.models import Driver
            order.driver = Driver.objects.get(pk=driver_id)
        order.status = 'assigned'
        order.assigned_at = timezone.now()
        order.save()
        return Response({'message': 'Order assigned.', 'order': OrderSerializer(order).data})

    @action(detail=True, methods=['post'], url_path='start')
    def start_delivery(self, request, pk=None):
        order = self.get_object()
        if request.user.role != 'transporter':
            return Response({'error': 'Transporter only.'}, status=403)
        if order.status != 'assigned':
            return Response({'error': 'Order not yet assigned.'}, status=400)
        order.status = 'in_transit'
        order.started_at = timezone.now()
        order.save()
        return Response({'message': 'Delivery started.', 'order': OrderSerializer(order).data})

    @action(detail=True, methods=['post'], url_path='deliver')
    def mark_delivered(self, request, pk=None):
        order = self.get_object()
        if request.user.role != 'transporter':
            return Response({'error': 'Transporter only.'}, status=403)
        if order.status != 'in_transit':
            return Response({'error': 'Order not in transit.'}, status=400)
        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()
        if order.vehicle:
            order.vehicle.status = 'available'
            order.vehicle.save()
        return Response({'message': 'Order delivered!', 'order': OrderSerializer(order).data})

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        order_id = request.data.get('order_id')
        try:
            order = Order.objects.get(pk=order_id, status='validated')
        except Order.DoesNotExist:
            return Response({'error': 'Validated order not found.'}, status=404)

        available_vehicles = Vehicle.objects.filter(
            status='available',
            capacity_kg__gte=order.quantity_kg
        ).select_related('transporter')

        if not available_vehicles.exists():
            return Response({'error': 'No available vehicle found matching capacity.'}, status=404)

        vehicle = available_vehicles.first()
        order.transporter = vehicle.transporter
        order.vehicle = vehicle
        order.status = 'assigned'
        order.assigned_at = timezone.now()
        order.save()
        vehicle.status = 'on_mission'
        vehicle.save()
        return Response({'message': 'Auto-assigned.', 'order': OrderSerializer(order).data})

    @action(detail=False, methods=['get'], url_path='geo')
    def geo_view(self, request):
        qs = self.get_queryset().filter(departure_point__isnull=False)
        return Response(OrderGeoSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        from django.db.models import Count
        total = Order.objects.count()
        by_status = Order.objects.values('status').annotate(count=Count('id'))
        return Response({'total': total, 'by_status': list(by_status)})
