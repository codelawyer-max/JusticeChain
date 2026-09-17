const mongoose = require('mongoose');

const documentPermissionSchema = new mongoose.Schema(
    {
        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            required: true,
            index: true
        },

        grantedTo: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'grantedToModel',
            required: true,
            index: true
        },

        grantedToModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        permissions: {
            view: {
                type: Boolean,
                default: true
            },

            download: {
                type: Boolean,
                default: false
            },

            uploadVersion: {
                type: Boolean,
                default: false
            },

            share: {
                type: Boolean,
                default: false
            }
        },

        grantedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'grantedByModel',
            required: true
        },

        grantedByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        expiresAt: {
            type: Date,
            default: null
        },

        status: {
            type: String,
            enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
            default: 'ACTIVE'
        },

        revokedAt: {
            type: Date,
            default: null
        },

        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'revokedByModel',
            default: null
        },

        revokedByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate active permission records
documentPermissionSchema.index({
    document: 1,
    grantedTo: 1
});

documentPermissionSchema.index({
    status: 1,
    expiresAt: 1
});

module.exports =
    mongoose.models.DocumentPermission ||
    mongoose.model(
        'DocumentPermission',
        documentPermissionSchema
    );