/**
 * complaintTrigger.js
 * Justice Chain — Backend trigger emitter
 */

/**
 * Fire when a NEW complaint is registered by a citizen.
 * Notifies all admins.
 */
function emitComplaintRegistered(io, data) {
  const payload = buildPayload(data, 'Complaint Registered');
  io.to('admins').emit('complaint:registered', payload);
  console.log(`[Trigger] complaint:registered → FIR ${payload.firId}`);
}

/**
 * Fire when a complaint STATUS is updated by admin/officer.
 * Notifies the specific citizen who filed it.
 */
function emitComplaintUpdated(io, data) {
  const payload = buildPayload(data, data.status);
  // Emit to citizen's personal room: "citizen:<citizenId>"
  const room = `citizen:${data.citizenId}`;
  io.to(room).emit('complaint:updated', { ...payload, updatedBy: data.updatedBy || 'Officer' });
  console.log(`[Trigger] complaint:updated → FIR ${payload.firId} → room ${room}`);
}

function buildPayload(data, status) {
  return {
    firId:       data.firId       || data.fir_id          || generateFirId(),
    category:    data.category    || data.crimeType        || 'Uncategorized',
    complainant: data.complainant || data.complainantName  || 'Unknown',
    priority:    normalizePriority(data.priority || data.severity),
    status:      status,
    location:    data.location    || data.district         || '',
    txHash:      data.txHash      || data.blockchainTxHash || null,
    citizenId:   data.citizenId   || data.citizen_id       || null,
    timestamp:   new Date().toISOString(),
  };
}

function normalizePriority(raw) {
  if (!raw) return 'medium';
  const v = raw.toString().toLowerCase();
  if (['high', 'critical', 'urgent'].includes(v)) return 'high';
  if (['low', 'minor'].includes(v))               return 'low';
  return 'medium';
}

function generateFirId() {
  return `FIR${new Date().getFullYear()}${Math.floor(Math.random() * 9e9 + 1e9)}`;
}

module.exports = {
  emitComplaintRegistered,
  emitComplaintUpdated
};
