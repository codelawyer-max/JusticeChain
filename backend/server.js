/**
 * server.js
 * Justice Chain — Backend with Socket.IO rooms for admin + citizen
 *
 * Merge this pattern into your existing backend/index.js
 *
 * npm install socket.io  (in /backend)
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { emitComplaintRegistered, emitComplaintUpdated } from './complaintTrigger.js';

const app = express();
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

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

// ── Routes ─────────────────────────────────────────────────────────────────

// Citizen files a new FIR → notify admins
app.post('/api/fir/register', async (req, res) => {
  try {
    const data = req.body;
    // TODO: validate → save to DB → write to Hyperledger Fabric
    emitComplaintRegistered(io, data);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin/officer updates FIR status → notify citizen
app.put('/api/fir/:firId/status', async (req, res) => {
  try {
    const { firId } = req.params;
    const data = { firId, ...req.body };
    // TODO: update DB + blockchain record
    emitComplaintUpdated(io, data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`[Server] on port ${PORT}`));

export { io };
