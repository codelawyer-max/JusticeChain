const mongoose = require('mongoose');
const { Readable } = require('stream');
const pinataSDK = require('@pinata/sdk');

const Document = require('../models/document');
const DocumentVersion = require('../models/documentVersion');
const Case = require('../models/case');

const { calculateSHA256 } = require('../utils/documentHash');

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
            req.user.role === 'Admin'
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
)       ;


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

        const ipfsUrl =
            `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;


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

        return res.status(500).json({
            success: false,

            message:
                'Failed to upload document',

            error:
                error.message
        });
    }
};


module.exports = {
    uploadDocument
};