# WMS Project

This workspace contains a React frontend and a Java Spring Boot backend for a Warehouse Management System (WMS).

## Project structure

- `wms-frontend/` — Vite + React frontend
- `wms-backend-java/` — Spring Boot backend with Google OAuth, JWT, and Supabase integration

## Development setup

### 1. Frontend

```bash
cd wms-frontend
npm install
npm run dev
```

Default frontend URL: `http://localhost:5173`

### 2. Backend

```bash
cd wms-backend-java
mvn clean package
mvn spring-boot:run
```

Default backend URL: `http://localhost:8080`

### Environment variables

Copy `.env.example` inside `wms-backend-java/` to `.env` and configure:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BASE_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change_this_secret_change_this_secret_change_this_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Start both services together

Option 1: Run each service in a separate terminal

```bash
cd wms-frontend
npm run dev
```

```bash
cd wms-backend-java
mvn spring-boot:run
```

Option 2: Use the provided root npm scripts (if Node and Maven are available)

```bash
npm run dev
```

### API endpoints

- `GET /auth/google` — Redirect to Google OAuth sign-in
- `POST /auth/login` — Local email/password login
- `GET /api/me` — Get current user from JWT bearer token

### Notes

- Frontend uses `VITE_API_BASE_URL` to point to the backend.
- Local login currently accepts `email` and `password` and returns a JWT.
- Google login integration uses backend OAuth callback and JWT issuance.
