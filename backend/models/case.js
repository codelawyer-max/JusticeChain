const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema(
    {
        caseId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        caseType: {
            type: String,
            required: true,
            enum: [
                'Criminal',
                'Civil',
                'Cyber Crime',
                'Fraud',
                'Theft',
                'Missing Person',
                'Murder',
                'Assault',
                'Financial Crime',
                'Drug Related',
                'Other'
            ]
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        department: {
            type: String,
            trim: true
        },

        policeStation: {
            type: String,
            trim: true
        },

        assignedOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null
        },

        priority: {
            type: String,
            enum: ['Low', 'Medium', 'High', 'Critical'],
            default: 'Medium'
        },

        status: {
            type: String,
            enum: [
                'Open',
                'Under Investigation',
                'Pending Review',
                'Submitted to Court',
                'Closed',
                'Archived'
            ],
            default: 'Open'
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

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'createdByModel',
            required: true
        },

        createdByModel: {
            type: String,
            enum: ['Admin', 'Citizen'],
            required: true
        },

        closedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

caseSchema.index({
    title: 'text',
    description: 'text',
    caseId: 'text'
});

caseSchema.index({ status: 1 });
caseSchema.index({ caseType: 1 });
caseSchema.index({ priority: 1 });
caseSchema.index({ assignedOfficer: 1 });
caseSchema.index({ createdAt: -1 });

module.exports =
    mongoose.models.Case ||
    mongoose.model('Case', caseSchema);