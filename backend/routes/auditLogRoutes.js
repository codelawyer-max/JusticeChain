const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getAuditLogs } = require('../controllers/auditLogController');

const router = express.Router();

router.get('/', verifyToken, getAuditLogs);

module.exports = router;