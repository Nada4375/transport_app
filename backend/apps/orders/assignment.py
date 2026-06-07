from math import radians, sin, cos, sqrt, atan2
from apps.transporters.models import Transporter
from apps.vehicles.models import Vehicle, Driver
import logging

logger = logging.getLogger(__name__)


def haversine_km(lat1, lng1, lat2, lng2):
    """Calculate straight-line distance in km between two GPS points."""
    R = 6371
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    return round(R * 2 * atan2(sqrt(a), sqrt(1 - a)), 3)


def find_best_transporter(order):
    """
    Finds the nearest available transporter to the order pickup point.

    Steps:
    1. Get pickup GPS from order.departure_point
    2. Calculate distance from every transporter HQ to pickup point
    3. Sort nearest first
    4. For each transporter check:
       - Has available vehicle with enough capacity
       - Has available driver
    5. Return first match

    Returns: (transporter, vehicle, driver, reason_if_failed)
    """
    pickup_point = order.departure_point
    logs = []

    if not pickup_point:
        msg = 'Order has no GPS coordinates. Client must select pickup from the map.'
        logger.warning(f'Order #{order.id}: {msg}')
        return None, None, None, msg

    pickup_lat = pickup_point.y
    pickup_lng = pickup_point.x

    logs.append(
        f'Pickup: ({pickup_lat:.4f}, {pickup_lng:.4f}) | Cargo: {order.quantity_kg} kg'
    )

    # Get all active transporters
    all_transporters = list(Transporter.objects.filter(is_available=True))
    if not all_transporters:
        return None, None, None, 'No active transporters in the system.'

    # Calculate distance for each and sort nearest first
    with_coords = []
    without_coords = []

    for t in all_transporters:
        if t.latitude is not None and t.longitude is not None:
            dist = haversine_km(pickup_lat, pickup_lng, float(t.latitude), float(t.longitude))
            with_coords.append((t, dist))
        else:
            without_coords.append((t, None))

    # Sort by distance ascending (nearest first)
    with_coords.sort(key=lambda x: x[1])

    logs.append(
        f'{len(with_coords)} transporter(s) with coords | '
        f'{len(without_coords)} without coords'
    )

    for company, dist in with_coords:
        logs.append(f'  → {company.company_name}: {dist} km')

    # Check each candidate nearest first
    all_candidates = with_coords + without_coords

    for (t, dist) in all_candidates:
        dist_label = f'{dist} km' if dist is not None else 'no GPS'
        name = f'{t.company_name} [{dist_label}]'

        # Check vehicles
        all_v = Vehicle.objects.filter(transporter=t)
        if not all_v.exists():
            logs.append(f'  ✗ {name}: no vehicles registered')
            continue

        available_v = all_v.filter(status='available')
        if not available_v.exists():
            logs.append(f'  ✗ {name}: all {all_v.count()} vehicle(s) busy')
            continue

        vehicle = available_v.filter(
            capacity_kg__gte=order.quantity_kg
        ).order_by('capacity_kg').first()

        if not vehicle:
            max_cap = available_v.order_by('-capacity_kg').first().capacity_kg
            logs.append(f'  ✗ {name}: max capacity {max_cap} kg < needed {order.quantity_kg} kg')
            continue

        # Check drivers
        all_d = Driver.objects.filter(transporter=t)
        if not all_d.exists():
            logs.append(f'  ✗ {name}: no drivers registered')
            continue

        driver = all_d.filter(is_available=True).first()
        if not driver:
            logs.append(f'  ✗ {name}: all {all_d.count()} driver(s) on duty')
            continue

        # ✅ Match
        logs.append(
            f'  ✓ ASSIGNED: {name} | '
            f'Vehicle: {vehicle.plate_number} ({vehicle.capacity_kg} kg) | '
            f'Driver: {driver.first_name} {driver.last_name}'
        )
        logger.info('\n'.join(logs))
        return t, vehicle, driver, None

    reason = '\n'.join(logs)
    logger.warning(f'Order #{order.id}: no match.\n{reason}')
    return None, None, None, reason


def auto_assign_order(order):
    """
    Called after admin validates an order.
    1. Finds nearest available transporter
    2. Assigns vehicle + driver
    3. Calls OSRM to calculate real road route + distance + ETA
    Returns (success: bool, message: str)
    """
    from django.utils import timezone

    if order.status != 'validated':
        return False, f'Order status is "{order.status}" — must be "validated" first.'

    transporter, vehicle, driver, reason = find_best_transporter(order)

    if not transporter:
        return False, f'No available transporter found.\n{reason}'

    # Assign
    order.transporter = transporter
    order.vehicle = vehicle
    order.driver = driver
    order.status = 'assigned'
    order.assigned_at = timezone.now()
    order.save()

    # Mark resources as busy
    vehicle.status = 'on_mission'
    vehicle.save()

    driver.is_available = False
    driver.save()

    # Calculate real road route via OSRM
    route_info = ''
    if order.departure_point and order.destination_point:
        try:
            from apps.orders.routing import get_route_for_order
            route = get_route_for_order(order)
            if route:
                route_info = (
                    f' · Route: {route["distance_km"]} km via road'
                    f' · ETA: {route["duration_minutes"]} min'
                )
        except Exception as e:
            logger.warning(f'OSRM failed for order #{order.id}: {e}')

    # Build distance from transporter HQ to pickup
    dist_str = ''
    if transporter.latitude is not None and transporter.longitude is not None and order.departure_point:
        try:
            dist = haversine_km(
                order.departure_point.y, order.departure_point.x,
                float(transporter.latitude), float(transporter.longitude)
            )
            dist_str = f' · {dist} km from pickup'
        except Exception:
            pass

    return True, (
        f'Assigned to {transporter.company_name}{dist_str} | '
        f'Vehicle: {vehicle.plate_number} ({vehicle.capacity_kg} kg) | '
        f'Driver: {driver.first_name} {driver.last_name}'
        f'{route_info}'
    )