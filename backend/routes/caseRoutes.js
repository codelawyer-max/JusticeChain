const express = require('express');

const {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    updateCaseStatus,
    deleteCase
} = require('../controllers/caseController');

const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Create case
router.post('/', verifyToken, createCase);

// Get all cases — admin only (case-assignment scoping deferred to Phase 3)
router.get('/', verifyToken, isAdmin, getCases);

// Get single case — admin only
router.get('/:id', verifyToken, isAdmin, getCaseById);

// Update case — admin only
router.put('/:id', verifyToken, isAdmin, updateCase);

// Update case status — admin only
router.patch('/:id/status', verifyToken, isAdmin, updateCaseStatus);

// Delete case — admin only
router.delete('/:id', verifyToken, isAdmin, deleteCase);

module.exports = router;