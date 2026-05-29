import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import apps.tracking.routing as tracking_routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transport_project.settings')

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(tracking_routing.websocket_urlpatterns)
    ),
})
