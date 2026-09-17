const express = require('express');

const {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    updateCaseStatus,
    deleteCase
} = require('../controllers/caseController');

const router = express.Router();

// Create case
router.post('/', createCase);

// Get all cases
router.get('/', getCases);

// Get single case
router.get('/:id', getCaseById);

// Update case
router.put('/:id', updateCase);

// Update case status
router.patch('/:id/status', updateCaseStatus);

// Delete case
router.delete('/:id', deleteCase);

module.exports = router;