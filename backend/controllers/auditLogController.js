const mongoose = require('mongoose');
const AuditLog = require('../models/auditLog');

// Get audit logs (filterable by case, document, action, performedBy)
const getAuditLogs = async (req, res) => {
    try {
        const {
            caseId,
            documentId,
            action,
            performedBy,
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

        if (documentId) {
            if (!mongoose.Types.ObjectId.isValid(documentId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid document ID'
                });
            }
            filter.document = documentId;
        }

        if (action) {
            filter.action = action;
        }

        if (performedBy) {
            if (!mongoose.Types.ObjectId.isValid(performedBy)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid performedBy ID'
                });
            }
            filter.performedBy = performedBy;
        }

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * pageSize)
                .limit(pageSize),
            AuditLog.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page: pageNumber,
            totalPages: Math.ceil(total / pageSize),
            logs
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message
        });
    }
};

module.exports = { getAuditLogs };