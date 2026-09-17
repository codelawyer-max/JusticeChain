const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
        documentId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        documentType: {
            type: String,
            required: true,
            enum: [
                'FIR',
                'Police Report',
                'Investigation Report',
                'Witness Statement',
                'Charge Sheet',
                'Court Filing',
                'Evidence',
                'Forensic Report',
                'Legal Notice',
                'Judgment',
                'Other'
            ]
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        originalFileName: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            required: true
        },

        fileSize: {
            type: Number,
            default: 0
        },

        currentVersion: {
            type: Number,
            default: 1
        },

        status: {
            type: String,
            enum: [
                'Draft',
                'Pending Verification',
                'Verified',
                'Rejected',
                'Archived'
            ],
            default: 'Draft'
        },

        confidentialityLevel: {
            type: String,
            enum: [
                'Public',
                'Internal',
                'Confidential',
                'Highly Confidential'
            ],
            default: 'Confidential'
        },

        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'uploadedByModel',
            required: true
        },

        uploadedByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        storage: {
            provider: {
                type: String,
                enum: ['Local', 'IPFS'],
                default: 'IPFS'
            },

            ipfsHash: {
                type: String,
                default: null
            },

            ipfsUrl: {
                type: String,
                default: null
            }
        },

        integrity: {
            sha256Hash: {
                type: String,
                default: null,
                index: true
            },

            blockchainTxHash: {
                type: String,
                default: null
            },

            blockchainVerified: {
                type: Boolean,
                default: false
            },

            lastVerifiedAt: {
                type: Date,
                default: null
            }
        },

        tags: {
            type: [String],
            default: []
        },

        keywords: {
            type: [String],
            default: []
        },

        aiClassification: {
            type: String,
            default: null
        },

        aiSummary: {
            type: String,
            default: null
        },

        archivedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

documentSchema.index({
    title: 'text',
    description: 'text',
    documentId: 'text',
    originalFileName: 'text',
    keywords: 'text',
    tags: 'text'
});

documentSchema.index({ case: 1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ status: 1 });
documentSchema.index({ confidentialityLevel: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ createdAt: -1 });

module.exports =
    mongoose.models.Document ||
    mongoose.model('Document', documentSchema);