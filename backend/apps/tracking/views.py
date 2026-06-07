from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.gis.geos import Point
from django.utils import timezone
from apps.orders.models import Order
from apps.vehicles.models import Vehicle


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_position(request):
    """
    Transporter sends GPS position for an active order.
    Body: { order_id, latitude, longitude, speed_kmh (optional) }
    """
    order_id = request.data.get('order_id')
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')

    if not all([order_id, lat, lng]):
        return Response({'error': 'order_id, latitude, longitude required.'}, status=400)

    try:
        order = Order.objects.get(pk=order_id, status='in_transit')
    except Order.DoesNotExist:
        return Response({'error': 'Active in_transit order not found.'}, status=404)

    if order.transporter and order.transporter.user != request.user:
        return Response({'error': 'Not your order.'}, status=403)

    point = Point(float(lng), float(lat), srid=4326)

    if order.vehicle:
        order.vehicle.current_location = point
        order.vehicle.last_seen = timezone.now()
        order.vehicle.save(update_fields=['current_location', 'last_seen'])

    return Response({'status': 'position updated'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_positions(request):
    """
    Returns live positions with OSRM route geometry for all active vehicles.
    - Admin: all vehicles on mission
    - Transporter: only their vehicles
    - Client: only vehicles on their orders
    """
    user = request.user

    if user.role == 'client':
        active_orders = Order.objects.filter(
            client=user,
            status='in_transit',
            vehicle__isnull=False
        ).select_related('vehicle', 'transporter', 'driver')

        result = []
        for order in active_orders:
            v = order.vehicle
            if not v or not v.current_location:
                continue
            eta = estimate_eta_from_current(order)
            result.append({
                'order_id': order.id,
                'order_number': order.order_number,
                'vehicle_id': v.id,
                'plate': v.plate_number,
                'latitude': v.current_location.y,
                'longitude': v.current_location.x,
                'last_seen': v.last_seen,
                'departure_city': order.departure_city,
                'destination_city': order.destination_city,
                'departure_lat': order.departure_point.y if order.departure_point else None,
                'departure_lng': order.departure_point.x if order.departure_point else None,
                'destination_lat': order.destination_point.y if order.destination_point else None,
                'destination_lng': order.destination_point.x if order.destination_point else None,
                'route_geometry': get_route_geometry(order),
                'distance_km': order.distance_km,
                'eta_minutes': eta,
                'transporter_name': order.transporter.company_name if order.transporter else None,
                'driver_name': f'{order.driver.first_name} {order.driver.last_name}' if order.driver else None,
            })
        return Response(result)

    elif user.role == 'transporter':
        vehicles = Vehicle.objects.filter(
            transporter__user=user,
            status='on_mission',
            current_location__isnull=False
        ).select_related('transporter')

    elif user.role == 'admin':
        vehicles = Vehicle.objects.filter(
            status='on_mission',
            current_location__isnull=False
        ).select_related('transporter')

    else:
        return Response([])

    result = []
    for v in vehicles:
        order = Order.objects.filter(
            vehicle=v, status='in_transit'
        ).select_related('transporter', 'driver', 'client').first()

        eta = estimate_eta_from_current(order) if order else None

        result.append({
            'vehicle_id': v.id,
            'plate': v.plate_number,
            'latitude': v.current_location.y,
            'longitude': v.current_location.x,
            'last_seen': v.last_seen,
            'transporter_name': v.transporter.company_name if v.transporter else None,
            'order_id': order.id if order else None,
            'order_number': order.order_number if order else None,
            'departure_city': order.departure_city if order else None,
            'destination_city': order.destination_city if order else None,
            'departure_lat': order.departure_point.y if order and order.departure_point else None,
            'departure_lng': order.departure_point.x if order and order.departure_point else None,
            'destination_lat': order.destination_point.y if order and order.destination_point else None,
            'destination_lng': order.destination_point.x if order and order.destination_point else None,
            'route_geometry': get_route_geometry(order) if order else None,
            'distance_km': order.distance_km if order else None,
            'eta_minutes': eta,
            'client_name': f'{order.client.first_name} {order.client.last_name}' if order and order.client else None,
            'driver_name': f'{order.driver.first_name} {order.driver.last_name}' if order and order.driver else None,
        })

    return Response(result)


def get_route_geometry(order):
    """
    Returns the OSRM route as list of [lat, lng] pairs for Leaflet.
    Falls back to straight line if no route saved.
    """
    if not order:
        return None

    # Use saved OSRM route if available
    if order.route_line:
        try:
            coords = list(order.route_line.coords)
            return [[lat, lng] for lng, lat in coords]  # flip to [lat,lng] for Leaflet
        except Exception:
            pass

    # Fallback: straight line between departure and destination
    if order.departure_point and order.destination_point:
        return [
            [order.departure_point.y, order.departure_point.x],
            [order.destination_point.y, order.destination_point.x],
        ]

    return None


def estimate_eta_from_current(order):
    """
    Estimate remaining time using current vehicle position → destination.
    Uses saved OSRM duration as base, adjusted by remaining distance.
    """
    if not order:
        return None

    vehicle = order.vehicle
    if not vehicle or not vehicle.current_location:
        # No live GPS yet — return planned duration
        return order.estimated_duration_minutes

    if not order.destination_point:
        return order.estimated_duration_minutes

    # Calculate remaining distance from current position to destination
    from math import radians, sin, cos, sqrt, atan2
    lat1 = vehicle.current_location.y
    lng1 = vehicle.current_location.x
    lat2 = order.destination_point.y
    lng2 = order.destination_point.x

    R = 6371
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    remaining_km = R * 2 * atan2(sqrt(a), sqrt(1 - a))

    avg_speed_kmh = 60
    return round((remaining_km / avg_speed_kmh) * 60)