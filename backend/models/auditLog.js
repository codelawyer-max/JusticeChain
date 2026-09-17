const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'LOGIN',
                'LOGOUT',

                'CASE_CREATED',
                'CASE_UPDATED',
                'CASE_CLOSED',

                'DOCUMENT_UPLOADED',
                'DOCUMENT_VIEWED',
                'DOCUMENT_DOWNLOADED',
                'DOCUMENT_UPDATED',
                'DOCUMENT_DELETED',
                'DOCUMENT_ARCHIVED',

                'VERSION_CREATED',

                'DOCUMENT_SHARED',
                'DOCUMENT_ACCESS_GRANTED',
                'DOCUMENT_ACCESS_REVOKED',

                'INTEGRITY_CHECK',
                'INTEGRITY_VERIFIED',
                'INTEGRITY_FAILED',

                'BLOCKCHAIN_REGISTERED',
                'BLOCKCHAIN_VERIFIED',

                'EVIDENCE_ADDED',
                'EVIDENCE_UPDATED',
                'EVIDENCE_TRANSFERRED',

                'USER_CREATED',
                'USER_UPDATED',
                'USER_DEACTIVATED',

                'OTHER'
            ]
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'performedByModel',
            required: true
        },

        performedByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        case: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            default: null,
            index: true
        },

        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
            index: true
        },

        documentVersion: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DocumentVersion',
            default: null
        },

        evidence: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Evidence',
            default: null
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        ipAddress: {
            type: String,
            default: null
        },

        userAgent: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ['SUCCESS', 'FAILED'],
            default: 'SUCCESS'
        }
    },
    {
        timestamps: true
    }
);

// Useful indexes for audit investigations
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ case: 1, createdAt: -1 });
auditLogSchema.index({ document: 1, createdAt: -1 });
auditLogSchema.index({ evidence: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

module.exports =
    mongoose.models.AuditLog ||
    mongoose.model('AuditLog', auditLogSchema);