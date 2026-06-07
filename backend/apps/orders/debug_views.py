from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.transporters.models import Transporter
from apps.orders.models import Order
from math import radians, sin, cos, sqrt, atan2


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    return round(R * 2 * atan2(sqrt(a), sqrt(1 - a)), 3)


@api_view(['GET'])
@permission_classes([AllowAny])
def debug_distances(request):
    """
    Debug endpoint — shows distances from all transporters to an order pickup point.
    Usage: /api/debug/distances/?order_id=5
    """
    order_id = request.query_params.get('order_id')
    if not order_id:
        return Response({'error': 'Pass ?order_id=X'})

    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        # Try to find by listing available IDs
        ids = list(Order.objects.values_list('id', flat=True))
        return Response({
            'error': f'Order {order_id} not found',
            'available_order_ids': ids
        })

    pickup = order.departure_point
    if not pickup:
        return Response({
            'error': 'Order has no GPS coordinates (departure_point is null)',
            'fix': 'Client must select pickup location from the map when creating the order'
        })

    pickup_lat = pickup.y
    pickup_lng = pickup.x

    result = {
        'order_id': order.id,
        'order_number': str(order),
        'pickup': {'lat': pickup_lat, 'lng': pickup_lng},
        'cargo_kg': order.quantity_kg,
        'transporters': []
    }

    for t in Transporter.objects.all():
        from apps.vehicles.models import Vehicle, Driver

        lat = getattr(t, 'latitude', None)
        lng = getattr(t, 'longitude', None)

        dist = None
        if lat and lng:
            try:
                dist = haversine_km(pickup_lat, pickup_lng, float(lat), float(lng))
            except Exception as e:
                dist = f'error: {e}'

        vehicles = Vehicle.objects.filter(transporter=t)
        available_v = vehicles.filter(status='available')
        capable_v = available_v.filter(capacity_kg__gte=order.quantity_kg)
        drivers = Driver.objects.filter(transporter=t)
        available_d = drivers.filter(is_available=True)

        result['transporters'].append({
            'id': t.id,
            'company': t.company_name,
            'city': getattr(t, 'city', ''),
            'hq_lat': float(lat) if lat else None,
            'hq_lng': float(lng) if lng else None,
            'distance_km': dist,
            'is_active': getattr(t, 'is_active', True),
            'vehicles_total': vehicles.count(),
            'vehicles_available': available_v.count(),
            'vehicles_with_capacity': capable_v.count(),
            'drivers_total': drivers.count(),
            'drivers_available': available_d.count(),
            'qualifies': bool(capable_v.exists() and available_d.exists()),
        })

    # Sort by distance in response so it's easy to read
    result['transporters'].sort(key=lambda x: x['distance_km'] if isinstance(x['distance_km'], float) else 9999)

    return Response(result)
