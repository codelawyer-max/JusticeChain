const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema(
    {
        evidenceId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            required: true,
            index: true
        },

        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ''
        },

        evidenceType: {
            type: String,
            required: true,
            enum: [
                'Digital',
                'Physical',
                'Photograph',
                'Video',
                'Audio',
                'Document',
                'Forensic',
                'Other'
            ]
        },

        status: {
            type: String,
            enum: [
                'Collected',
                'Under Examination',
                'Verified',
                'Submitted to Court',
                'Released',
                'Archived'
            ],
            default: 'Collected'
        },

        collectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'collectedByModel',
            required: true
        },

        collectedByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        collectedAt: {
            type: Date,
            default: Date.now
        },

        collectionLocation: {
            type: String,
            trim: true,
            default: ''
        },

        storageLocation: {
            type: String,
            trim: true,
            default: ''
        },

        // Digital evidence integrity
        integrity: {
            sha256Hash: {
                type: String,
                default: null,
                index: true
            },

            ipfsHash: {
                type: String,
                default: null
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

        chainOfCustody: [
            {
                transferredFrom: {
                    type: mongoose.Schema.Types.ObjectId,
                    refPath: 'chainOfCustody.transferredFromModel',
                    default: null
                },

                transferredFromModel: {
                    type: String,
                    enum: ['Admin', 'Citizen'],
                    default: null
                },

                transferredTo: {
                    type: mongoose.Schema.Types.ObjectId,
                    refPath: 'chainOfCustody.transferredToModel',
                    required: true
                },

                transferredToModel: {
                    type: String,
                    enum: ['Admin', 'Citizen'],
                    required: true
                },

                transferredAt: {
                    type: Date,
                    default: Date.now
                },

                reason: {
                    type: String,
                    required: true,
                    trim: true
                },

                location: {
                    type: String,
                    trim: true,
                    default: ''
                }
            }
        ],

        notes: {
            type: String,
            trim: true,
            default: ''
        }
    },
    {
        timestamps: true
    }
);

evidenceSchema.index({
    name: 'text',
    description: 'text',
    evidenceId: 'text'
});

evidenceSchema.index({ case: 1 });
evidenceSchema.index({ status: 1 });
evidenceSchema.index({ evidenceType: 1 });
evidenceSchema.index({ createdAt: -1 });

module.exports =
    mongoose.models.Evidence ||
    mongoose.model('Evidence', evidenceSchema);