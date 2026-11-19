import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import prescriptionRoutes from './routes/prescriptions.js';
import purchaseRoutes from './routes/purchases.js';
import inventoryRoutes from './routes/inventory.js';
import doseRoutes from './routes/doses.js';
import notificationRoutes from './routes/notifications.js';
import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';
import caregiverRoutes from './routes/caregiver.js';
import reportRoutes from './routes/reports.js';
import { startCronJobs } from './services/cronJobs.js';
import { isCloudStorageEnabled } from './services/storageService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

function parseOrigins(value) {
  if (!value) return ['http://localhost:5173'];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.CLIENT_URL);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser clients (health checks, curl) with no Origin header
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'ok' : 'degraded',
    platform: 'DoseWise',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    storage: isCloudStorageEnabled() ? 'cloudinary' : 'local',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/doses', doseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ message: err.message });
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(String(userId));
      console.log(`[Socket] User ${userId} connected`);
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is required');
    }
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required');
    }

    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB');
    console.log(`[Storage] Using ${isCloudStorageEnabled() ? 'Cloudinary' : 'local uploads/'}`);

    startCronJobs(io);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] DoseWise API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
