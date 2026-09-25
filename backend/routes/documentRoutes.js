const express = require('express');

const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

const {
    uploadDocument,
    getDocuments,
    getDocumentById
} = require('../controllers/documentController');

const router = express.Router();

// Upload a new document
router.post(
    '/upload',
    verifyToken,
    upload.single('document'),
    uploadDocument
);

// List/search documents (query params: caseId, documentType, status, search, page, limit)
router.get(
    '/',
    verifyToken,
    getDocuments
);

// Get a single document by ID (with version history)
router.get(
    '/:id',
    verifyToken,
    getDocumentById
);

module.exports = router;