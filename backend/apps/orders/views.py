from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count

from .models import Order
from .serializers import OrderSerializer, OrderGeoSerializer
from apps.transporters.models import Transporter
from apps.vehicles.models import Vehicle, Driver


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

        return qs.select_related(
            'client',
            'transporter',
            'vehicle',
            'driver'
        )

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

        # Step 1: validate
        order.status = 'validated'
        order.validated_at = timezone.now()
        order.save()

        # Step 2: immediately auto-assign using nearest transporter
        from .assignment import auto_assign_order
        success, message = auto_assign_order(order)
        order.refresh_from_db()

        if success:
            return Response({
                'message': f'✅ Validated & assigned. {message}',
                'status': order.status,
                'order': OrderSerializer(order).data
            })
        else:
            return Response({
                'message': f'✅ Validated. ⚠️ Auto-assignment failed: {message}',
                'status': order.status,
                'order': OrderSerializer(order).data
            })
    
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
            vehicle = Vehicle.objects.get(
                pk=vehicle_id,
                transporter=transporter
            )
        except (Transporter.DoesNotExist, Vehicle.DoesNotExist):
            return Response(
                {'error': 'Invalid transporter or vehicle.'},
                status=400
            )

        driver = None

        if driver_id:
            try:
                driver = Driver.objects.get(
                    pk=driver_id,
                    transporter=transporter
                )
            except Driver.DoesNotExist:
                return Response(
                    {'error': 'Invalid driver.'},
                    status=400
                )
        else:
            driver = Driver.objects.filter(
                transporter=transporter,
                status='available'
            ).first()

        if not driver:
            return Response(
                {'error': 'No available driver found.'},
                status=404
            )

        order.transporter = transporter
        order.vehicle = vehicle
        order.driver = driver
        order.status = 'assigned'
        order.assigned_at = timezone.now()
        order.save()

        vehicle.status = 'on_mission'
        vehicle.save()

        driver.status = 'on_delivery'
        driver.save()

        return Response({
            'message': 'Order assigned.',
            'order': OrderSerializer(order).data
        })

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        order_id = request.data.get('order_id')

        try:
            order = Order.objects.get(pk=order_id, status='validated')
        except Order.DoesNotExist:
            return Response(
                {'error': 'Validated order not found.'},
                status=404
            )

        available_vehicles = Vehicle.objects.filter(
            status='available',
            capacity_kg__gte=order.quantity_kg,
            transporter__is_available=True,
            transporter__status='active'
        ).select_related('transporter').order_by('capacity_kg')

        for vehicle in available_vehicles:
            driver = Driver.objects.filter(
                transporter=vehicle.transporter,
                status='available'
            ).first()

            if driver:
                order.transporter = vehicle.transporter
                order.vehicle = vehicle
                order.driver = driver
                order.status = 'assigned'
                order.assigned_at = timezone.now()
                order.save()

                vehicle.status = 'on_mission'
                vehicle.save()

                driver.status = 'on_delivery'
                driver.save()

                return Response({
                    'message': 'Auto-assigned.',
                    'order': OrderSerializer(order).data
                })

        return Response(
            {'error': 'No available vehicle with available driver found.'},
            status=404
        )
    @action(detail=True, methods=['post'], url_path='retry-assign')
    def retry_assign(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Admin only.'}, status=403)
        order = self.get_object()
        if order.status != 'validated':
            return Response({'error': 'Order must be validated first.'}, status=400)
        from .assignment import auto_assign_order
        success, message = auto_assign_order(order)
        order.refresh_from_db()
        if success:
            return Response({'message': message, 'order': OrderSerializer(order).data})
        else:
            return Response({'error': message}, status=404)
    @action(detail=True, methods=['post'], url_path='start')
    def start_delivery(self, request, pk=None):
        order = self.get_object()
        if request.user.role != 'transporter':
            return Response({'error': 'Transporter only.'}, status=403)
        if not order.transporter or order.transporter.user != request.user:
            return Response({'error': 'This order is not assigned to you.'}, status=403)
        if order.status != 'assigned':
            return Response({'error': 'Order not yet assigned.'}, status=400)

        order.status = 'in_transit'
        order.started_at = timezone.now()
        order.save()

        # ── Auto-set vehicle GPS to pickup point when delivery starts ──
        if order.vehicle and order.departure_point:
            order.vehicle.current_location = order.departure_point
            order.vehicle.last_seen = timezone.now()
            order.vehicle.save(update_fields=['current_location', 'last_seen'])

        return Response({
            'message': 'Delivery started.',
            'order': OrderSerializer(order).data
        })

    @action(detail=True, methods=['post'], url_path='deliver')
    def mark_delivered(self, request, pk=None):
        order = self.get_object()

        if request.user.role != 'transporter':
            return Response({'error': 'Transporter only.'}, status=403)

        if not order.transporter or order.transporter.user != request.user:
            return Response({'error': 'This order is not assigned to you.'}, status=403)

        if order.status != 'in_transit':
            return Response({'error': 'Order not in transit.'}, status=400)

        order.status = 'delivered'
        order.delivered_at = timezone.now()
        order.save()

        if order.vehicle:
            order.vehicle.status = 'available'
            order.vehicle.save()

        if order.driver:
            order.driver.status = 'available'
            order.driver.save()

        if order.transporter:
            order.transporter.total_deliveries += 1
            order.transporter.current_active_orders = max(
                0,
                order.transporter.current_active_orders - 1
            )
            order.transporter.save()

        return Response({
            'message': 'Order delivered!',
            'order': OrderSerializer(order).data
        })

    @action(detail=False, methods=['get'], url_path='geo')
    def geo_view(self, request):
        qs = self.get_queryset().filter(departure_point__isnull=False)
        return Response(OrderGeoSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        print("USER:", request.user)
        print("ROLE:", getattr(request.user, "role", None))

        if getattr(request.user, "role", None) != 'admin':
            return Response({'error': 'Admin only.'}, status=403)

        from django.db.models import Count
        total = Order.objects.count()
        by_status = Order.objects.values('status').annotate(count=Count('id'))
        return Response({'total': total, 'by_status': list(by_status)})