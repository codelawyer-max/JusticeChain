const mongoose = require('mongoose');
const { Readable } = require('stream');
const axios = require('axios');
const pinataSDK = require('@pinata/sdk');

const Document = require('../models/document');
const DocumentVersion = require('../models/documentVersion');
const Case = require('../models/case');

const { calculateSHA256 } = require('../utils/documentHash');
const { logAudit } = require('../utils/auditLogger');

// URL of the blockchain sidecar — override via env if ports differ
const BLOCKCHAIN_BACKEND_URL =
    process.env.BLOCKCHAIN_BACKEND_URL || 'http://localhost:3000';


// Initialize Pinata using environment variables
const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_API_KEY
);


// Generate unique document ID
const generateDocumentId = () => {
    const year = new Date().getFullYear();
    const randomNumber = Math.floor(100000 + Math.random() * 900000);

    return `DOC-${year}-${randomNumber}`;
};


// Upload document
const uploadDocument = async (req, res) => {
    try {
        /*
         * 1. Validate uploaded file
         */
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a document'
            });
        }


        /*
         * 2. Validate required information
         */
        const {
            caseId,
            title,
            documentType,
            description,
            confidentialityLevel,
            tags,
            keywords
        } = req.body;

        if (!caseId || !title || !documentType) {
            return res.status(400).json({
                success: false,
                message:
                    'caseId, title and documentType are required'
            });
        }


        /*
         * 3. Validate MongoDB case ID
         */
        if (!mongoose.Types.ObjectId.isValid(caseId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case ID'
            });
        }


        /*
         * 4. Check whether case exists
         */
        const existingCase = await Case.findById(caseId);

        if (!existingCase) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }


        /*
         * 5. Validate authenticated user
         */
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const uploadedByModel =
            req.user.role === 'admin'
                ? 'Admin'
                : 'Citizen';


        /*
         * 6. Calculate SHA-256 hash
         *
         * This hash represents the exact contents
         * of the uploaded document.
         */
        const sha256Hash = calculateSHA256(
            req.file.buffer
        );


        /*
         * 7. Convert buffer into readable stream
         *
         * Pinata's existing SDK accepts a stream.
         */
        const fileStream = Readable.from(
            req.file.buffer
        );


        /*
         * 8. Upload to Pinata / IPFS
         */
        const pinataOptions = {
            pinataMetadata: {
                name: req.file.originalname,

                keyvalues: {
                    system: 'JusticeChain',
                    type: 'legal-document',
                    documentHash: sha256Hash
                }
            }
        };

        const uploadResult =
            await pinata.pinFileToIPFS(
                fileStream,
                pinataOptions
            );


        /*
         * 9. Verify Pinata returned an IPFS hash
         */
        if (
            !uploadResult ||
            !uploadResult.IpfsHash
        ) {
            return res.status(500).json({
                success: false,
                message:
                    'IPFS upload failed - no hash returned'
            });
        }

        const ipfsHash =
            uploadResult.IpfsHash;

        const gatewayDomain =
            process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

        const ipfsUrl =
            `https://${gatewayDomain}/ipfs/${ipfsHash}`;


        /*
         * 10. Generate unique document ID
         */
        let documentId =
            generateDocumentId();

        while (
            await Document.exists({
                documentId
            })
        ) {
            documentId =
                generateDocumentId();
        }


        /*
         * 11. Process tags and keywords
         */
        let processedTags = [];
        let processedKeywords = [];

        if (tags) {
            processedTags =
                Array.isArray(tags)
                    ? tags
                    : tags
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(Boolean);
        }

        if (keywords) {
            processedKeywords =
                Array.isArray(keywords)
                    ? keywords
                    : keywords
                        .split(',')
                        .map(keyword => keyword.trim())
                        .filter(Boolean);
        }


        /*
         * 12. Create Document
         */
        const document =
            await Document.create({
                documentId,

                case: caseId,

                title,

                documentType,

                description:
                    description || '',

                originalFileName:
                    req.file.originalname,

                fileType:
                    req.file.mimetype,

                fileSize:
                    req.file.size,

                currentVersion: 1,

                status:
                    'Pending Verification',

                confidentialityLevel:
                    confidentialityLevel ||
                    'Confidential',

                uploadedBy:
                    userId,

                uploadedByModel,

                storage: {
                    provider: 'IPFS',
                    ipfsHash,
                    ipfsUrl
                },

                integrity: {
                    sha256Hash,
                    blockchainTxHash: null,
                    blockchainVerified: false,
                    lastVerifiedAt: null
                },

                tags: processedTags,

                keywords: processedKeywords
            });


        /*
         * 13. Create first document version
         */
        const documentVersion =
            await DocumentVersion.create({
                document: document._id,

                versionNumber: 1,

                fileName:
                    req.file.originalname,

                fileType:
                    req.file.mimetype,

                fileSize:
                    req.file.size,

                storage: {
                    provider: 'IPFS',
                    ipfsHash,
                    ipfsUrl
                },

                integrity: {
                    sha256Hash,

                    blockchainTxHash: null,

                    blockchainVerified: false
                },

                uploadedBy:
                    userId,

                uploadedByModel,

                changeDescription:
                    'Initial document upload',

                isCurrent: true
            });

        /*
    * 13.5 Record audit trail entry
    */
        await logAudit({
            action: 'DOCUMENT_UPLOADED',
            performedBy: userId,
            performedByModel: uploadedByModel,
            case: caseId,
            document: document._id,
            documentVersion: documentVersion._id,
            description: `Document "${title}" (${documentType}) uploaded to case ${existingCase.caseId}`,
            metadata: {
                documentType,
                fileSize: req.file.size,
                ipfsHash
            },
            req
        });



        /*
         * 14. Return response
         */
        return res.status(201).json({
            success: true,

            message:
                'Document uploaded successfully',

            document: {
                id: document._id,

                documentId:
                    document.documentId,

                title:
                    document.title,

                documentType:
                    document.documentType,

                currentVersion:
                    document.currentVersion,

                status:
                    document.status
            },

            version: {
                id:
                    documentVersion._id,

                versionNumber:
                    documentVersion.versionNumber
            },

            storage: {
                provider: 'IPFS',

                ipfsHash,

                ipfsUrl
            },

            integrity: {
                sha256Hash,

                blockchainVerified:
                    false
            }
        });

    } catch (error) {

        console.error(
            'Document upload error:',
            error
        );

        // Always attempt to audit a failed upload — logAudit is fire-and-forget
        // and will silently swallow any write error, so this is safe even when
        // the failure occurred before userId was extracted (e.g. missing file).
        await logAudit({
            action: 'DOCUMENT_UPLOADED',
            performedBy: req.user?._id || req.user?.id || null,
            performedByModel:
                req.user?.role === 'admin' ? 'Admin' : 'Citizen',
            case: req.body?.caseId || null,
            description: `Document upload failed: ${error.message}`,
            metadata: {
                originalFileName: req.file?.originalname || null,
                documentType:    req.body?.documentType  || null,
                error:           error.message
            },
            req,
            status: 'FAILED'
        });

        return res.status(500).json({
            success: false,

            message:
                'Failed to upload document',

            error:
                error.message
        });
    }
};


// Get all documents (supports filtering, search, pagination)
const getDocuments = async (req, res) => {
    try {
        const {
            caseId,
            documentType,
            status,
            search,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (caseId) {
            if (!mongoose.Types.ObjectId.isValid(caseId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid case ID'
                });
            }
            filter.case = caseId;
        }

        if (documentType) {
            filter.documentType = documentType;
        }

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        const [documents, total] = await Promise.all([
            Document.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize)
                .select('-__v'),
            Document.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: documents.length,
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / pageSize),
            documents
        });

    } catch (error) {
        console.error('Get documents error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch documents',
            error: error.message
        });
    }
};


// Get a single document by its MongoDB ID, including version history
const getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document ID'
            });
        }

        const document = await Document.findById(id)
            .populate('case', 'caseId title status');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const versions = await DocumentVersion.find({
            document: document._id
        }).sort({ versionNumber: -1 });

        const viewerId = req.user?._id || req.user?.id;
        const viewerModel = req.user?.role === 'admin' ? 'Admin' : 'Citizen';

        await logAudit({
            action: 'DOCUMENT_VIEWED',
            performedBy: viewerId,
            performedByModel: viewerModel,
            case: document.case?._id || document.case,
            document: document._id,
            description: `Document "${document.title}" (${document.documentId}) viewed`,
            req
        });

        return res.status(200).json({
            success: true,
            document,
            versions
        });

    } catch (error) {
        console.error('Get document by ID error:', error);

        // Always attempt to audit a failed view — fire-and-forget, safe even
        // when the error occurred before the document or viewerId were resolved.
        await logAudit({
            action: 'DOCUMENT_VIEWED',
            performedBy: req.user?._id || req.user?.id || null,
            performedByModel:
                req.user?.role === 'admin' ? 'Admin' : 'Citizen',
            description:
                `Document view failed for id=${req.params?.id ?? 'unknown'}: ${error.message}`,
            metadata: {
                documentId: req.params?.id || null,
                error:      error.message
            },
            req,
            status: 'FAILED'
        });

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch document',
            error: error.message
        });
    }
};


// Anchor a document's SHA-256 hash on-chain via the blockchain sidecar.
//
// Flow:
//   1. Load the document and verify it hasn't been anchored already.
//   2. POST to the blockchain backend's /api/anchorDocument with the hash +
//      IPFS hash. The sidecar sends a 0-ETH self-transaction whose `data`
//      field encodes the payload; returns a txHash once the tx is confirmed.
//   3. Patch Document.integrity with the txHash, set blockchainVerified = true.
//   4. Write a BLOCKCHAIN_REGISTERED audit entry.
//
// POST /api/documents/:id/anchor
const anchorDocument = async (req, res) => {
    const actorId    = req.user?._id || req.user?.id || null;
    const actorModel = req.user?.role === 'admin' ? 'Admin' : 'Citizen';

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document ID'
            });
        }

        const document = await Document.findById(id);

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Guard: already anchored — return the existing record rather than
        // spending gas on a duplicate transaction.
        if (document.integrity?.blockchainVerified && document.integrity?.blockchainTxHash) {
            return res.status(409).json({
                success:  false,
                message:  'Document is already anchored on-chain',
                txHash:   document.integrity.blockchainTxHash,
                anchoredAt: document.integrity.lastVerifiedAt
            });
        }

        const sha256Hash = document.integrity?.sha256Hash;

        if (!sha256Hash) {
            return res.status(422).json({
                success: false,
                message: 'Document has no SHA-256 hash — cannot anchor'
            });
        }

        // ── Call the blockchain sidecar ──────────────────────────────────────
        let chainResult;
        try {
            const response = await axios.post(
                `${BLOCKCHAIN_BACKEND_URL}/api/anchorDocument`,
                {
                    documentId:     document.documentId,
                    sha256Hash,
                    ipfsHash:       document.storage?.ipfsHash || null,
                    officerAddress: req.body?.officerAddress || null
                },
                { timeout: 120_000 }   // Sepolia can be slow — 2-minute ceiling
            );
            chainResult = response.data;
        } catch (chainErr) {
            const errMsg = chainErr.response?.data?.error
                || chainErr.message
                || String(chainErr);

            await logAudit({
                action:          'BLOCKCHAIN_REGISTERED',
                performedBy:     actorId,
                performedByModel: actorModel,
                case:            document.case  || null,
                document:        document._id,
                description:     `Blockchain anchoring FAILED for "${document.title}": ${errMsg}`,
                metadata:        { sha256Hash, error: errMsg },
                req,
                status:          'FAILED'
            });

            return res.status(502).json({
                success: false,
                message: 'Blockchain sidecar error',
                error:   errMsg
            });
        }

        // ── Patch the Document integrity fields ──────────────────────────────
        document.integrity.blockchainTxHash   = chainResult.txHash;
        document.integrity.blockchainVerified = true;
        document.integrity.lastVerifiedAt     = new Date(chainResult.anchoredAt);
        await document.save();

        // ── Audit trail ──────────────────────────────────────────────────────
        await logAudit({
            action:           'BLOCKCHAIN_REGISTERED',
            performedBy:      actorId,
            performedByModel: actorModel,
            case:             document.case  || null,
            document:         document._id,
            description:      `Document "${document.title}" (${document.documentId}) anchored on-chain`,
            metadata: {
                sha256Hash,
                txHash:      chainResult.txHash,
                blockNumber: chainResult.blockNumber,
                ipfsHash:    document.storage?.ipfsHash || null,
                officer:     chainResult.payload?.officer || null
            },
            req,
            status: 'SUCCESS'
        });

        return res.status(200).json({
            success:    true,
            message:    'Document anchored on-chain',
            document: {
                id:         document._id,
                documentId: document.documentId,
                title:      document.title
            },
            integrity: {
                sha256Hash,
                blockchainTxHash:   chainResult.txHash,
                blockchainVerified: true,
                lastVerifiedAt:     chainResult.anchoredAt,
                blockNumber:        chainResult.blockNumber
            }
        });

    } catch (error) {
        console.error('Anchor document error:', error);

        await logAudit({
            action:           'BLOCKCHAIN_REGISTERED',
            performedBy:      actorId,
            performedByModel: actorModel,
            document:         req.params?.id || null,
            description:      `Blockchain anchoring error for id=${req.params?.id}: ${error.message}`,
            metadata:         { error: error.message },
            req,
            status:           'FAILED'
        });

        return res.status(500).json({
            success: false,
            message: 'Failed to anchor document',
            error:   error.message
        });
    }
};


module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentById,
    anchorDocument
};