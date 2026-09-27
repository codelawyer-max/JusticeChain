const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', verifyToken, isAdmin, getAuditLogs);

module.exports = router;