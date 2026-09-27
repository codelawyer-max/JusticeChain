const express = require('express');

const { verifyToken, isAdmin } = require('../middleware/auth');
const {
    grantPermission,
    revokePermission,
    listPermissions
} = require('../controllers/permissionController');

const router = express.Router();

// Grant access to a document — admin only
// POST /api/permissions/grant
router.post(
    '/grant',
    verifyToken,
    isAdmin,
    grantPermission
);

// Revoke an existing permission record — admin only
// DELETE /api/permissions/:permId/revoke
router.delete(
    '/:permId/revoke',
    verifyToken,
    isAdmin,
    revokePermission
);

// List all permissions for a document — admin only
// GET /api/permissions/document/:docId?status=ACTIVE|REVOKED|EXPIRED
router.get(
    '/document/:docId',
    verifyToken,
    isAdmin,
    listPermissions
);

module.exports = router;
