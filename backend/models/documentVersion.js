const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
    {
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
            index: true
        },

        versionNumber: {
            type: Number,
            required: true
        },

        fileName: {
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
                required: true
            },

            blockchainTxHash: {
                type: String,
                default: null
            },

            blockchainVerified: {
                type: Boolean,
                default: false
            }
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

        changeDescription: {
            type: String,
            trim: true,
            default: ''
        },

        isCurrent: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

documentVersionSchema.index(
    {
        document: 1,
        versionNumber: 1
    },
    {
        unique: true
    }
);

documentVersionSchema.index({
    'integrity.sha256Hash': 1
});

documentVersionSchema.index({
    createdAt: -1
});

module.exports =
    mongoose.models.DocumentVersion ||
    mongoose.model('DocumentVersion', documentVersionSchema);