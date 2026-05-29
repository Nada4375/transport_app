# 🚛 TransportHub — Logistics & Delivery Management App

## Stack
- **Backend**: Django 4.2 + GeoDjango + Django REST Framework + Django Channels (WebSockets)
- **Database**: PostgreSQL + PostGIS (geospatial)
- **Cache / Realtime**: Redis
- **Frontend**: React 18 + React Router + Zustand + Leaflet.js + Recharts
- **Auth**: JWT (SimpleJWT)
- **Container**: Docker + Docker Compose

---

## 🚀 Quick start with Docker (recommended)

```bash
# 1. Clone / open the folder
cd transport_app

# 2. Start all services (DB + Redis + Backend + Frontend)
docker-compose up --build

# 3. Open in browser
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:8000
#    API docs:  http://localhost:8000/api/
```

---

## 🛠 Manual setup (without Docker)

### Backend
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Make sure PostgreSQL + PostGIS is running, then:
createdb transport_db

# Run migrations
python manage.py migrate

# Create superuser (admin role)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## 📁 Project structure

```
transport_app/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── transport_project/
│   │   ├── settings.py       ← DB, JWT, Channels config
│   │   ├── urls.py           ← API root URL config
│   │   ├── asgi.py           ← WebSocket (Channels) entry
│   │   └── wsgi.py
│   └── apps/
│       ├── accounts/         ← Users, roles, JWT auth
│       ├── orders/           ← Orders CRUD, validate, assign
│       ├── transporters/     ← Transporter profiles
│       ├── vehicles/         ← Vehicles + Drivers
│       ├── tracking/         ← GPS tracking + WebSocket consumer
│       └── notifications/    ← In-app notifications
│
├── frontend/
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── App.jsx           ← Routes by role
│       ├── index.js
│       ├── services/api.js   ← All Axios API calls
│       ├── store/authStore.js← Zustand auth state
│       ├── hooks/
│       │   └── useTracking.js← WebSocket real-time hook
│       ├── components/
│       │   ├── common/Layout.jsx   ← Sidebar + navigation
│       │   └── map/MapView.jsx     ← Leaflet map component
│       ├── pages/
│       │   ├── LandingPage.jsx     ← Role selector + auth
│       │   ├── client/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Orders.jsx
│       │   │   ├── NewOrder.jsx
│       │   │   └── Map.jsx
│       │   ├── transporter/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Orders.jsx
│       │   │   ├── Fleet.jsx
│       │   │   └── Map.jsx
│       │   └── admin/
│       │       ├── Dashboard.jsx   ← Charts + analytics
│       │       ├── Orders.jsx      ← All orders table
│       │       ├── Validation.jsx  ← Validate + assign panel
│       │       └── Map.jsx         ← Live map overview
│       └── assets/styles/global.css
│
└── docker-compose.yml
```

---

## 🔑 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/auth/register/` | Register (client / transporter) |
| POST | `/api/auth/login/` | Login → JWT tokens |
| GET/PATCH | `/api/auth/profile/` | View / update profile |
| GET/POST | `/api/orders/` | List / create orders |
| POST | `/api/orders/{id}/validate/` | Admin: validate order |
| POST | `/api/orders/{id}/assign/` | Admin: assign manually |
| POST | `/api/orders/auto-assign/` | Admin: auto-assign |
| POST | `/api/orders/{id}/start/` | Transporter: start delivery |
| POST | `/api/orders/{id}/deliver/` | Transporter: mark delivered |
| GET | `/api/orders/stats/` | Admin: order statistics |
| GET/POST | `/api/vehicles/vehicles/` | Transporter: manage fleet |
| GET/POST | `/api/vehicles/drivers/` | Transporter: manage drivers |
| GET | `/api/tracking/{id}/history/` | GPS tracking history |
| GET | `/api/tracking/live/` | Live vehicle positions |
| WS | `ws://localhost:8000/ws/tracking/{id}/` | WebSocket live tracking |

---

## 👤 Roles

| Role | Access |
|------|--------|
| **Client** | Create/edit/delete orders, track own deliveries |
| **Transporter** | View assigned orders, start/deliver, manage fleet |
| **Admin** | Full access: validate, assign, analytics, map overview |
