const express = require('express');

const upload = require('../middleware/upload');

const {
    uploadDocument
} = require('../controllers/documentController');

const router = express.Router();

// Upload a new document
router.post(
    '/upload',
    upload.single('document'),
    uploadDocument
);

module.exports = router;