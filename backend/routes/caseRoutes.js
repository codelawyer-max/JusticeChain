const express = require('express');

const {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    updateCaseStatus,
    deleteCase
} = require('../controllers/caseController');

const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Create case
router.post('/', verifyToken, createCase);

// Get all cases
router.get('/', verifyToken, getCases);

// Get single case
router.get('/:id', verifyToken, getCaseById);

// Update case
router.put('/:id', verifyToken, updateCase);

// Update case status
router.patch('/:id/status', verifyToken, updateCaseStatus);

// Delete case
router.delete('/:id', verifyToken, deleteCase);

module.exports = router;