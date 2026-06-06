# DoseWise — Smart Medicine Management Platform

DoseWise is a full-stack MERN healthcare SaaS platform that helps patients with chronic conditions track medicines, manage prescriptions, monitor inventory, and receive AI-powered refill predictions.

## Features

- **Authentication** — JWT-based auth with patient & caregiver roles
- **Patient Profiles** — Full health profile with family member support
- **AI Prescription Parser** — Upload prescriptions; OpenRouter AI extracts medicines, dosages & schedules
- **AI Bill Reader** — Upload pharmacy bills to auto-update inventory
- **Inventory Engine** — Automatic daily consumption tracking with low-stock alerts
- **Smart Reminders** — Morning/afternoon/night dose reminders with Taken/Skip/Snooze
- **Missed Dose Tracking** — Adherence analytics for doctor review
- **AI Health Assistant** — Context-aware chatbot using patient medicine data
- **Caregiver Dashboard** — Monitor family members' medicines remotely
- **Document Vault** — Store prescriptions, lab reports, scans & insurance docs
- **Real-time Updates** — Socket.io for live notifications & inventory updates
- **Drug Interaction Detection** — AI checks new medicines against existing ones

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Real-time | Socket.io |
| AI | OpenRouter API (GPT-4o-mini) |
| Auth | JWT + bcrypt |

## Prerequisites

- Node.js 18+
- MongoDB running locally (or MongoDB Atlas connection string)

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

Backend `.env` is pre-configured in `backend/.env`. Update if needed:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/dosewise
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_SITE_URL=http://localhost:5173/
CLIENT_URL=http://localhost:5173
```

### 3. Start MongoDB

Make sure MongoDB is running on `localhost:27017`, or update `MONGODB_URI` in `backend/.env`.

### 4. Run the app

```bash
# Terminal 1 — Backend
npm run dev:backend

# Terminal 2 — Frontend
npm run dev:frontend
```

Or run both together (after `npm install` in root):

```bash
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api

## Usage Flow

1. **Register** at `/register` — creates account + primary patient profile
2. **Upload Prescription** — paste text like:
   ```
   Metformin 500mg - 1 Morning + 1 Night (After Food)
   Telmisartan 40mg - 1 Morning
   Aspirin 75mg - 1 Night
   ```
3. **Upload Bill** — paste text like:
   ```
   Metformin 500mg x 60 tablets, Telmisartan 40mg x 30 tablets from Apollo Pharmacy
   ```
4. **Dashboard** — view stock levels, adherence, AI refill predictions
5. **Reminders** — mark doses as Taken/Skip/Snooze
6. **AI Assistant** — ask "How many Metformin tablets are left?"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/patients` | List patient profiles |
| POST | `/api/prescriptions/upload` | AI prescription parsing |
| POST | `/api/purchases/upload` | AI bill parsing |
| GET | `/api/inventory/patient/:id/dashboard` | Dashboard data |
| GET | `/api/inventory/patient/:id/reminders` | Today's dose reminders |
| PATCH | `/api/doses/:id/status` | Mark dose taken/skipped |
| POST | `/api/chat/message` | AI health assistant |
| GET | `/api/notifications` | User notifications |

## Project Structure

```
DoseWise/
├── backend/
│   ├── src/
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # Express routes
│   │   ├── services/     # AI, inventory, cron jobs
│   │   ├── middleware/   # Auth, file upload
│   │   └── server.js     # Entry point + Socket.io
│   └── uploads/          # Uploaded files
├── frontend/
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Route pages
│       ├── context/      # Auth context
│       └── lib/          # API, socket, utils
└── README.md
```

## License

MIT
