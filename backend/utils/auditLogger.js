const AuditLog = require('../models/auditLog');

/**
 * Records an audit trail entry.
 *
 * This NEVER throws — a logging failure must never break
 * the actual request it's attached to. Failures are only
 * printed to the console for debugging.
 */
const logAudit = async ({
    action,
    performedBy,
    performedByModel,
    description,
    case: caseId = null,
    document = null,
    documentVersion = null,
    evidence = null,
    metadata = {},
    req = null,
    status = 'SUCCESS'
}) => {
    try {
        await AuditLog.create({
            action,
            performedBy,
            performedByModel,
            case: caseId,
            document,
            documentVersion,
            evidence,
            description,
            metadata,
            ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
            userAgent: req?.headers?.['user-agent'] || null,
            status
        });
    } catch (error) {
        console.error('Audit log write failed:', error.message);
    }
};

module.exports = { logAudit };