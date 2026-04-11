/**
 * useCitizenNotifications.js
 * Justice Chain — Citizen Portal Hook
 *
 * Listens for:
 *   complaint:updated  → status update on the citizen's own FIR
 *
 * Usage:
 *   const { toasts, dismissToast } = useCitizenNotifications(citizenId);
 *   <FIRToastStack toasts={toasts} onDismiss={dismissToast} />
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useCitizenNotifications(citizenId) {
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!citizenId) return;

    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join a room scoped to this citizen so they only get their own updates
      socket.emit('join:citizen', { citizenId });
    });

    // Status update on citizen's complaint
    socket.on('complaint:updated', (payload) => {
      setToasts((prev) => [
        {
          id:          `citizen-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          eventLabel:  'Your complaint was updated',
          firId:       payload.firId,
          category:    payload.category,
          complainant: payload.complainant,
          priority:    payload.priority,
          status:      payload.status,
          location:    payload.location || '',
          txHash:      payload.txHash || null,
          timestamp:   payload.timestamp || new Date().toISOString(),
          updatedBy:   payload.updatedBy || null,
        },
        ...prev,
      ].slice(0, 10));
    });

    return () => socket.disconnect();
  }, [citizenId]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismissToast };
}
