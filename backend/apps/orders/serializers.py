from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    order_number = serializers.ReadOnlyField()
    client_name = serializers.SerializerMethodField()
    transporter_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = ['client', 'created_at', 'updated_at',
                            'validated_at', 'assigned_at', 'started_at', 'delivered_at']

    def get_client_name(self, obj):
        return f'{obj.client.first_name} {obj.client.last_name}'.strip() or obj.client.username

    def get_transporter_name(self, obj):
        return obj.transporter.company_name if obj.transporter else None

    def get_driver_name(self, obj):
        return f'{obj.driver.first_name} {obj.driver.last_name}' if obj.driver else None

    def get_vehicle_plate(self, obj):
        return obj.vehicle.plate_number if obj.vehicle else None

    def create(self, validated_data):
        validated_data['client'] = self.context['request'].user
        return super().create(validated_data)


class OrderGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Order
        geo_field = 'departure_point'
        fields = ['id', 'order_number', 'status', 'departure_city',
                  'destination_city', 'merchandise_type', 'priority']
