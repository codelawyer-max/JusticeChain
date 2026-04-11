/**
 * useAdminNotifications.js
 * Justice Chain — Admin Portal Hook
 *
 * Listens for:
 *   complaint:registered  → new FIR filed by any citizen
 *
 * Usage:
 *   const { toasts, dismissToast } = useAdminNotifications();
 *   <FIRToastStack toasts={toasts} onDismiss={dismissToast} />
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useAdminNotifications() {
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:admin');
    });

    // New complaint registered by a citizen
    socket.on('complaint:registered', (payload) => {
      setToasts((prev) => [
        {
          id:          `admin-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          eventLabel:  'New complaint registered',
          firId:       payload.firId,
          category:    payload.category,
          complainant: payload.complainant,
          priority:    payload.priority,
          status:      payload.status || 'Complaint Registered',
          location:    payload.location || '',
          txHash:      payload.txHash || null,
          timestamp:   payload.timestamp || new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 10));
    });

    return () => socket.disconnect();
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismissToast };
}
