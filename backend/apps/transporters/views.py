from rest_framework import serializers, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count

from .models import Transporter


class TransporterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Transporter
        fields = '__all__'
        read_only_fields = [
            'user',
            'created_at',
            'rating',
            'total_deliveries',
        ]

    def create(self, validated_data):
        request = self.context.get('request')

        if request and request.user and request.user.is_authenticated:
            validated_data['user'] = request.user

        return super().create(validated_data)


class TransporterViewSet(viewsets.ModelViewSet):
    serializer_class = TransporterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'admin':
            return Transporter.objects.all()

        return Transporter.objects.filter(user=user)

    @action(detail=False, methods=['get'], url_path='profile')
    def profile(self, request):
        try:
            transporter = Transporter.objects.get(user=request.user)
        except Transporter.DoesNotExist:
            return Response(
                {'error': 'Profil transporteur introuvable.'},
                status=404
            )

        return Response(TransporterSerializer(transporter).data)

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def dashboard_stats(self, request):
        try:
            transporter = Transporter.objects.get(user=request.user)
        except Transporter.DoesNotExist:
            return Response(
                {'error': 'Profil transporteur introuvable.'},
                status=404
            )

        orders_by_status = transporter.orders.values('status').annotate(
            count=Count('id')
        )

        return Response({
            'company_name': transporter.company_name,
            'username': transporter.user.username,
            'responsable_name': transporter.responsable_name,
            'phone': transporter.phone,
            'email': transporter.email,
            'city': transporter.city,
            'local_address': transporter.local_address,
            'rating': transporter.rating,
            'total_deliveries': transporter.total_deliveries,
            'current_active_orders': transporter.current_active_orders,
            'orders_by_status': list(orders_by_status),
        })

    @action(detail=True, methods=['patch'])
    def toggle_availability(self, request, pk=None):
        transporter = self.get_object()
        transporter.is_available = not transporter.is_available
        transporter.save()

        return Response({
            'success': True,
            'is_available': transporter.is_available
        })