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

// Get all cases
router.get('/', verifyToken, getCases);

// Get single case
router.get('/:id', verifyToken, getCaseById);

// Update case — admin only
router.put('/:id', verifyToken, isAdmin, updateCase);

// Update case status — admin only
router.patch('/:id/status', verifyToken, isAdmin, updateCaseStatus);

// Delete case — admin only
router.delete('/:id', verifyToken, isAdmin, deleteCase);

module.exports = router;