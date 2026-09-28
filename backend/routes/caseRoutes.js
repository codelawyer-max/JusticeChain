const express = require('express');

const {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    updateCaseStatus,
    deleteCase
} = require('../controllers/caseController');

const { verifyToken, isAdmin, requireOfficerRole } = require('../middleware/auth');

const router = express.Router();

// Create case — Investigating Officer, Station House Officer, or Super Admin
router.post(
    '/',
    verifyToken,
    isAdmin,
    requireOfficerRole('INVESTIGATING_OFFICER', 'STATION_HOUSE_OFFICER', 'SUPER_ADMIN'),
    createCase
);

// Get all cases — admin only (case-assignment scoping deferred to Phase 3)
router.get('/', verifyToken, isAdmin, getCases);

// Get single case — admin only
router.get('/:id', verifyToken, isAdmin, getCaseById);

// Update case — Investigating Officer, Station House Officer, or Super Admin
router.put(
    '/:id',
    verifyToken,
    isAdmin,
    requireOfficerRole('INVESTIGATING_OFFICER', 'STATION_HOUSE_OFFICER', 'SUPER_ADMIN'),
    updateCase
);

// Update case status — Station House Officer or Super Admin
router.patch(
    '/:id/status',
    verifyToken,
    isAdmin,
    requireOfficerRole('STATION_HOUSE_OFFICER', 'SUPER_ADMIN'),
    updateCaseStatus
);

// Delete case — Super Admin only
router.delete(
    '/:id',
    verifyToken,
    isAdmin,
    requireOfficerRole('SUPER_ADMIN'),
    deleteCase
);

module.exports = router;