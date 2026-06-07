import requests
import logging
from django.contrib.gis.geos import LineString

logger = logging.getLogger(__name__)

OSRM_URL = "http://router.project-osrm.org/route/v1/driving"


def get_route(departure_point, destination_point):
    """
    Call OSRM API to get real road route between two GPS points.
    Returns {
        'route_line': LineString (GeoDjango),
        'distance_km': float,
        'duration_minutes': int,
        'geometry': list of [lng, lat] pairs
    } or None if failed.
    """
    if not departure_point or not destination_point:
        return None

    dep_lng = departure_point.x
    dep_lat = departure_point.y
    dst_lng = destination_point.x
    dst_lat = destination_point.y

    url = f"{OSRM_URL}/{dep_lng},{dep_lat};{dst_lng},{dst_lat}"

    try:
        resp = requests.get(
            url,
            params={
                'overview': 'full',
                'geometries': 'geojson',
                'steps': 'false',
            },
            timeout=10,
            headers={'User-Agent': 'TransportHub/1.0'}
        )
        data = resp.json()

        if data.get('code') != 'Ok' or not data.get('routes'):
            logger.warning(f'OSRM returned no route: {data.get("code")}')
            return None

        route = data['routes'][0]
        coords = route['geometry']['coordinates']  # list of [lng, lat]
        distance_m = route['distance']
        duration_s = route['duration']

        # Build GeoDjango LineString
        if len(coords) >= 2:
            line = LineString(coords, srid=4326)
        else:
            line = None

        result = {
            'route_line': line,
            'distance_km': round(distance_m / 1000, 2),
            'duration_minutes': round(duration_s / 60),
            'geometry': coords,  # raw list for frontend
        }

        logger.info(
            f'OSRM route: {result["distance_km"]} km, '
            f'{result["duration_minutes"]} min, '
            f'{len(coords)} points'
        )
        return result

    except requests.Timeout:
        logger.warning('OSRM request timed out')
        return None
    except Exception as e:
        logger.warning(f'OSRM error: {e}')
        return None


def get_route_for_order(order):
    """
    Calculate and save OSRM route for an order.
    Updates order.route_line, order.distance_km, order.estimated_duration_minutes
    """
    if not order.departure_point or not order.destination_point:
        logger.warning(f'Order #{order.id} missing GPS points for routing')
        return None

    result = get_route(order.departure_point, order.destination_point)

    if result:
        update_fields = []

        if result['route_line']:
            order.route_line = result['route_line']
            update_fields.append('route_line')

        order.distance_km = result['distance_km']
        order.estimated_duration_minutes = result['duration_minutes']
        update_fields += ['distance_km', 'estimated_duration_minutes']

        if update_fields:
            order.save(update_fields=update_fields)
            logger.info(
                f'Order #{order.id} route saved: '
                f'{result["distance_km"]} km, {result["duration_minutes"]} min'
            )

    return result