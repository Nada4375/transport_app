from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
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
        read_only_fields = [
            'client', 'created_at', 'updated_at',
            'validated_at', 'assigned_at', 'started_at', 'delivered_at',
            'departure_point', 'destination_point',
        ]

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

        # Read GPS points from raw request data (not validated_data
        # because they are in read_only_fields)
        dep = self.initial_data.get('departure_point')
        dst = self.initial_data.get('destination_point')

        # Convert GeoJSON dict → Django Point
        if isinstance(dep, dict) and dep.get('type') == 'Point':
            coords = dep.get('coordinates', [])
            if len(coords) == 2:
                try:
                    validated_data['departure_point'] = Point(
                        float(coords[0]), float(coords[1]), srid=4326
                    )
                except (ValueError, TypeError):
                    pass

        if isinstance(dst, dict) and dst.get('type') == 'Point':
            coords = dst.get('coordinates', [])
            if len(coords) == 2:
                try:
                    validated_data['destination_point'] = Point(
                        float(coords[0]), float(coords[1]), srid=4326
                    )
                except (ValueError, TypeError):
                    pass

        return super().create(validated_data)


class OrderGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Order
        geo_field = 'departure_point'
        fields = [
            'id', 'order_number', 'status',
            'departure_city', 'destination_city',
            'merchandise_type', 'priority',
        ]
