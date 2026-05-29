# ============================================================
#  vehicles/views.py  —  TransportHub
#  Modifications :
#   - Filtrage strict : chaque transporteur voit uniquement
#     SES véhicules et SES chauffeurs (transporter__user == request.user)
#   - DriverSerializer expose le champ `status` (nouveau)
#   - Endpoint PATCH /drivers/{id}/toggle-availability/ conservé
# ============================================================

from rest_framework import serializers, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Vehicle, Driver


# ────────────────────────────────────────────────
#  Serializers
# ────────────────────────────────────────────────

class VehicleSerializer(serializers.ModelSerializer):
    # Nom du transporteur en lecture seule (utile pour l'admin)
    transporter_name = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['transporter', 'created_at']

    def get_transporter_name(self, obj):
        return obj.transporter.company_name

    def create(self, validated_data):
        user = self.context['request'].user
        try:
            validated_data['transporter'] = user.transporter_profile
        except Exception:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                'Vous n\'avez pas encore de profil transporteur. '
                'Créez-en un via /api/transporters/'
            )
        return super().create(validated_data)


class DriverSerializer(serializers.ModelSerializer):
    full_name        = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = '__all__'
        read_only_fields = ['transporter', 'created_at', 'is_available']

    def get_full_name(self, obj):
        return f'{obj.first_name} {obj.last_name}'.strip()

    def get_transporter_name(self, obj):
        return obj.transporter.company_name

    def create(self, validated_data):
        user = self.context['request'].user
        try:
            validated_data['transporter'] = user.transporter_profile
        except Exception:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Profil transporteur introuvable.')
        return super().create(validated_data)


# ────────────────────────────────────────────────
#  Permission
# ────────────────────────────────────────────────

class IsTransporterOwner(permissions.BasePermission):
    """
    Seul l'admin ou le transporteur propriétaire peut accéder à l'objet.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj.transporter.user == request.user


# ────────────────────────────────────────────────
#  ViewSets
# ────────────────────────────────────────────────

class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class    = VehicleSerializer
    permission_classes  = [permissions.IsAuthenticated, IsTransporterOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Vehicle.objects.all().select_related('transporter')
        # Filtrage strict : uniquement les véhicules de CE transporteur
        return Vehicle.objects.filter(
            transporter__user=user
        ).select_related('transporter')


class DriverViewSet(viewsets.ModelViewSet):
    serializer_class    = DriverSerializer
    permission_classes  = [permissions.IsAuthenticated, IsTransporterOwner]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Driver.objects.all().select_related('transporter')
        # Filtrage strict : uniquement les chauffeurs de CE transporteur
        return Driver.objects.filter(
            transporter__user=user
        ).select_related('transporter')

    # --------------------------------------------------
    #  PATCH /drivers/{id}/toggle-availability/
    #  Bascule entre available ↔ offline
    # --------------------------------------------------
    @action(detail=True, methods=['patch'], url_path='toggle-availability')
    def toggle_availability(self, request, pk=None):
        driver = self.get_object()
        # Ne pas toucher un chauffeur en livraison
        if driver.status == 'on_delivery':
            return Response(
                {'error': 'Impossible de modifier un chauffeur en cours de livraison.'},
                status=400
            )
        driver.status = 'offline' if driver.status == 'available' else 'available'
        driver.save()  # save() synchronise is_available automatiquement
        return Response({
            'success': True,
            'status': driver.status,
            'is_available': driver.is_available,
        })