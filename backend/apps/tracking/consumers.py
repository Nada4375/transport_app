import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.gis.geos import Point
from .models import TrackingPoint
from apps.orders.models import Order
from apps.vehicles.models import Vehicle


class TrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.group_name = f'tracking_{self.order_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'location_update':
            await self.save_location(data)
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'broadcast_location',
                    'latitude': data['latitude'],
                    'longitude': data['longitude'],
                    'speed_kmh': data.get('speed_kmh', 0),
                    'heading': data.get('heading', 0),
                    'order_id': self.order_id,
                }
            )

    async def broadcast_location(self, event):
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'speed_kmh': event['speed_kmh'],
            'heading': event['heading'],
            'order_id': event['order_id'],
        }))

    @database_sync_to_async
    def save_location(self, data):
        try:
            order = Order.objects.get(pk=self.order_id)
            if order.vehicle:
                point = Point(data['longitude'], data['latitude'], srid=4326)
                TrackingPoint.objects.create(
                    order=order,
                    vehicle=order.vehicle,
                    location=point,
                    speed_kmh=data.get('speed_kmh', 0),
                    heading=data.get('heading', 0),
                )
                order.vehicle.current_location = point
                order.vehicle.save(update_fields=['current_location', 'last_seen'])
        except Order.DoesNotExist:
            pass
