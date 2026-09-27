const express = require('express');
const { verifyToken, isAdmin, requireOfficerRole } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

router.get(
    '/',
    verifyToken,
    isAdmin,
    requireOfficerRole('SUPER_ADMIN', 'STATION_HOUSE_OFFICER'),
    getAuditLogs
);

module.exports = router;