WMS Backend (skeleton)

สรุป: โปรเจกต์ตัวอย่าง backend ใช้ Express, รองรับ Google OAuth และออก JWT ของเราเองเพื่อให้ frontend แลกใช้

เริ่มใช้งาน:

1. ติดตั้ง dependencies
```bash
cd wms-backend
npm install
```

2. ตั้งค่า environment
- คัดลอก `.env.example` เป็น `.env` และเติมค่า `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`
- ตั้ง `BASE_URL` ให้ตรงกับ domain ที่จะใช้ (เช่น http://localhost:4000 หรือ https://your-backend.onrender.com)
- ตัวอย่าง `.env`:
  ```bash
  PORT=4000
  BASE_URL=http://localhost:4000
  GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
  JWT_SECRET=replace_with_a_strong_secret
  SUPABASE_URL=https://your-project-ref.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
  ```

3. ตั้งค่า Google OAuth ใน Google Cloud Console
- ไปที่ https://console.cloud.google.com/apis/credentials
- สร้าง OAuth 2.0 Client ID ใหม่
- ใส่ `Authorized redirect URIs` เป็น:
  - `http://localhost:4000/auth/google/callback`
- ใช้ `Client ID` และ `Client Secret` ที่ได้กรอกลง `.env`

4. รันในเครื่อง
```bash
npm run dev
```

ลิงก์สำคัญ:
- GET `/auth/google` — เริ่ม OAuth flow (redirect ไป Google)
- GET `/auth/google/callback` — Google callback, backend แลก code แล้วคืน JWT ของเรา
- POST `/auth/exchange` — ตัวอย่าง route รับ provider access_token แล้วคืน JWT ของเรา
- GET `/api/me` — ตัวอย่าง route ที่ต้องการ Authorization header `Bearer <jwt>` เพื่อเข้าถึง

ถัดไป: ผมจะแสดงวิธีเชื่อมต่อกับ Supabase (เก็บ user/role) และเขียน middleware RBAC ถ้าต้องการ
