require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const caseRoutes = require('./routes/caseRoutes');
const documentRoutes = require('./routes/documentRoutes');

const { emitComplaintRegistered, emitComplaintUpdated } = require('./complaintTrigger');
const authRoutes = require('./routes/auth');
const firRoutes = require('./routes/FIR');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
  },
});

const PORT = process.env.PORT || 5000;

// ── Socket.IO rooms ────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] connected:', socket.id);

  // Admin portal clients → join 'admins' room
  socket.on('join:admin', () => {
    socket.join('admins');
    console.log(`[Socket] ${socket.id} → admins room`);
  });

  // Citizen portal clients → join their personal room
  socket.on('join:citizen', ({ citizenId }) => {
    const room = `citizen:${citizenId}`;
    socket.join(room);
    console.log(`[Socket] ${socket.id} → ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

const MONGO_CONN = process.env.MONGO_URL || process.env.MONGODB_URI || '';

if (!MONGO_CONN) {
  console.error('ERROR: No MongoDB connection string found. Set MONGO_URL or MONGODB_URI in your .env');
}

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Advanced CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.headers.authorization) {
    console.log('✓ Authorization header present');
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', upload.array('files'), firRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

const startServer = () => {
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

if (!MONGO_CONN) {
  startServer();
} else {
  mongoose.connect(MONGO_CONN)
    .then(() => {
      console.log('MongoDB connected');
      startServer();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err && err.message ? err.message : err);
      startServer();
    });
}


