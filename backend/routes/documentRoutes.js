const express = require('express');

const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

const {
    uploadDocument,
    getDocuments,
    getDocumentById,
    anchorDocument
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

// Anchor a document's SHA-256 hash on-chain (admin only).
// Calls the blockchain sidecar, which sends a 0-ETH self-tx with the hash
// encoded in tx.data.  On success, patches integrity.blockchainTxHash and
// integrity.blockchainVerified on the Document and writes a BLOCKCHAIN_REGISTERED
// audit entry.
router.post(
    '/:id/anchor',
    verifyToken,
    (req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only admins can anchor documents on-chain'
            });
        }
        next();
    },
    anchorDocument
);

module.exports = router;