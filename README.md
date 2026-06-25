# Digital Vault - Premium Digital Marketplace

Digital Vault is a production-ready, modern, high-performance digital marketplace built to sell digital product assets (editing luts, vector graphics, printable t-shirts, mockups, books, etc.) under a flat licensing fee structure:
- **Single Category Access** = ₹99
- **Full Vault Access** = ₹499

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS (v4), Zustand, Lucide React, Framer Motion.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM.
- **Database**: PostgreSQL.
- **Storage**: Cloudflare R2 (S3-compatible API).
- **Payments**: Razorpay Gateway Integration.
- **Packaging**: Docker & Docker Compose.

---

## 📂 Project Architecture

```
digital product/
├── backend/                  # Node/Express TypeScript backend service
│   ├── src/
│   │   ├── controllers/      # Route request/response logics
│   │   ├── middleware/       # JWT auth guards, rate limiters, error handling
│   │   ├── routes/           # Auth, payments, downloads, tickets, admin routers
│   │   ├── services/         # Mail notifications, R2 SDK presigners, Razorpay
│   │   └── index.ts          # Express server configuration
│   ├── prisma/
│   │   ├── schema.prisma     # Postgres database models
│   │   └── seed.ts           # DB catalog seed scripts
│   ├── package.json
│   └── Dockerfile
├── frontend/                 # Next.js 15 App Router client app
│   ├── src/
│   │   ├── app/              # PWA manifest, sitemaps, layouts, routers
│   │   ├── components/       # Responsive navbar, footers, shared loaders
│   │   └── store/            # Zustand auth stores
│   ├── public/               # Static assets & icons
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml        # Multi-container local deployment orchestrator
├── README.md                 # Project handbook (this file)
└── .gitignore                # Workspace git ignore configurations
```

---

## ⚙️ Environment Variables Documentation

### Backend (.env)

Create `backend/.env` copying from `backend/.env.example`:

| Key | Description | Example Value |
|---|---|---|
| `PORT` | API Listening port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/digital_vault?schema=public` |
| `JWT_SECRET` | Cryptographic signature string | `your-jwt-signing-secret` |
| `FRONTEND_URL` | Client origin CORS authorization | `http://localhost:3000` |
| `RAZORPAY_KEY_ID` | Razorpay API checkout key ID | `rzp_test_xxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay webhook cryptographic secret | `xxxxxx` |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare credentials account hash | `xxxxxx` |
| `CLOUDFLARE_R2_ACCESS_KEY` | Storage Access Key Credentials | `xxxxxx` |
| `CLOUDFLARE_R2_SECRET` | Storage Secret Key Credentials | `xxxxxx` |
| `CLOUDFLARE_R2_BUCKET` | Dedicated private asset bucket | `digital-vault-assets` |

---

## 🚀 Local Run Installation Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL server

### 1. Database setup & Seeding
1. Spin up your local PostgreSQL database server.
2. Initialize environment configurations in `backend/.env` with your credentials.
3. Open a terminal in the `/backend` folder:
   ```bash
   # Install NPM dependencies
   npm install
   
   # Synchronize Prisma Models with database schema tables
   npx prisma migrate dev --name init
   
   # Run seeding script to fill mock categories, 3 products each, and coupons
   npm run prisma:seed
   ```

### 2. Launch Backend API
In `/backend` directory:
```bash
# Start backend in development mode (hot reloading)
npm run dev
```
The Express server will start on `http://localhost:5000`.

### 3. Launch Frontend Client
Open a new terminal in `/frontend` directory:
```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev
```
The client website will load on `http://localhost:3000`.

---

## 🐳 Containerized Build & Run (Docker Compose)

The easiest way to boot up all services (PostgreSQL database, Express backend API, Next.js frontend client) concurrently is using Docker:

```bash
# In the workspace root folder:
docker-compose up --build
```
This commands builds local images and boots up:
- Next.js client website on `http://localhost:3000`
- Express API server on `http://localhost:5000`
- PostgreSQL server on port `5432`

---

## 🔒 Post-Launch Root Setup Instructions

To avoid dangerous hardcoded credentials:
1. When launched for the first time, navigate to: **`http://localhost:3000/admin/setup`**.
2. The site detects that no administrative user records exist in the database and unlocks the **Root Provisioning Form**.
3. Create your administrative name, email, and password.
4. Once completed, the setup form locks itself, and you are redirected to the Admin Control Panel.

---

## 💳 Razorpay & Secure R2 Presign Downloads Flow

1. **Checkout**: When purchasing access, the client requests `/payments/create-order`. It calls the Razorpay SDK to spawn checkout prompts.
2. **Webhook/Verify**: On successful payment, client sends signature coordinates to `/payments/verify`. Backend cryptographically checks the HMAC token using the `RAZORPAY_KEY_SECRET`. On match, it saves user category permissions.
3. **Signed Downloads**: To request a download, user requests `/downloads/request/:id`. The API checks their DB category permissions. If allowed, it queries the private Cloudflare R2 bucket using `@aws-sdk/s3-request-presigner` and generates a temporary signed GET download link expiring in 15 minutes, tracking the download action log.
