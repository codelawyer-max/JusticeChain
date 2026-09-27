const mongoose = require('mongoose');

const DocumentPermission = require('../models/documentPermission');
const Document            = require('../models/document');
const { logAudit }        = require('../utils/auditLogger');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/permissions/grant
//
// Body:
//   documentId    – MongoDB ObjectId of the target document (required)
//   grantedTo     – MongoDB ObjectId of the user receiving access (required)
//   grantedToModel – 'Admin' | 'Citizen' (required)
//   permissions   – { view, download, uploadVersion, share } (all optional, view defaults true)
//   expiresAt     – ISO date string or null (optional)
//
// Guard: verifyToken + isAdmin (enforced in the route, not here)
// ─────────────────────────────────────────────────────────────────────────────
const grantPermission = async (req, res) => {
    const actorId    = req.user?._id || req.user?.id;
    const actorModel = 'Admin'; // route is admin-only

    try {
        const {
            documentId,
            grantedTo,
            grantedToModel,
            permissions = {},
            expiresAt   = null
        } = req.body;

        // ── Validate required fields ──────────────────────────────────────────
        if (!documentId || !grantedTo || !grantedToModel) {
            return res.status(400).json({
                success: false,
                message: 'documentId, grantedTo, and grantedToModel are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid documentId'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(grantedTo)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid grantedTo user ID'
            });
        }

        if (!['Admin', 'Citizen'].includes(grantedToModel)) {
            return res.status(400).json({
                success: false,
                message: 'grantedToModel must be "Admin" or "Citizen"'
            });
        }

        if (expiresAt !== null && expiresAt !== undefined) {
            const expDate = new Date(expiresAt);
            if (isNaN(expDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'expiresAt must be a valid ISO date string or null'
                });
            }
            if (expDate <= new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'expiresAt must be a future date'
                });
            }
        }

        // ── Confirm document exists ───────────────────────────────────────────
        const document = await Document.findById(documentId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // ── Prevent self-granting (admin granting themselves) ─────────────────
        if (
            grantedToModel === 'Admin' &&
            String(grantedTo) === String(actorId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Cannot grant a permission to yourself'
            });
        }

        // ── Upsert: if an existing record exists (any status), replace it ─────
        // This intentionally revives a previously REVOKED grant if an admin
        // re-grants — the audit trail captures both events.
        const resolvedPermissions = {
            view:          permissions.view          !== false, // default true
            download:      permissions.download      === true,
            uploadVersion: permissions.uploadVersion === true,
            share:         permissions.share         === true
        };

        const existing = await DocumentPermission.findOne({
            document:  documentId,
            grantedTo: grantedTo
        });

        let perm;

        if (existing) {
            // Re-activating or updating an existing record
            existing.permissions   = resolvedPermissions;
            existing.status        = 'ACTIVE';
            existing.expiresAt     = expiresAt ? new Date(expiresAt) : null;
            existing.grantedBy     = actorId;
            existing.grantedByModel = actorModel;
            existing.revokedAt     = null;
            existing.revokedBy     = null;
            existing.revokedByModel = null;
            perm = await existing.save();
        } else {
            perm = await DocumentPermission.create({
                document:       documentId,
                grantedTo:      grantedTo,
                grantedToModel: grantedToModel,
                permissions:    resolvedPermissions,
                grantedBy:      actorId,
                grantedByModel: actorModel,
                expiresAt:      expiresAt ? new Date(expiresAt) : null,
                status:         'ACTIVE'
            });
        }

        // ── Audit ─────────────────────────────────────────────────────────────
        await logAudit({
            action:           'DOCUMENT_ACCESS_GRANTED',
            performedBy:      actorId,
            performedByModel: actorModel,
            case:             document.case || null,
            document:         document._id,
            description:      `Admin granted ${grantedToModel} (${grantedTo}) access to document "${document.title}" (${document.documentId})`,
            metadata: {
                permissionId:   perm._id,
                grantedTo,
                grantedToModel,
                permissions:    resolvedPermissions,
                expiresAt:      perm.expiresAt
            },
            req
        });

        return res.status(200).json({
            success:    true,
            message:    'Permission granted',
            permission: perm
        });

    } catch (error) {
        console.error('Grant permission error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to grant permission',
            error:   error.message
        });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/permissions/:permId/revoke
//
// Guard: verifyToken + isAdmin (enforced in the route)
// ─────────────────────────────────────────────────────────────────────────────
const revokePermission = async (req, res) => {
    const actorId    = req.user?._id || req.user?.id;
    const actorModel = 'Admin';

    try {
        const { permId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(permId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid permission ID'
            });
        }

        const perm = await DocumentPermission.findById(permId);

        if (!perm) {
            return res.status(404).json({
                success: false,
                message: 'Permission record not found'
            });
        }

        if (perm.status === 'REVOKED') {
            return res.status(409).json({
                success: false,
                message: 'Permission is already revoked',
                revokedAt: perm.revokedAt
            });
        }

        // Fetch document for audit description
        const document = await Document.findById(perm.document);

        perm.status         = 'REVOKED';
        perm.revokedAt      = new Date();
        perm.revokedBy      = actorId;
        perm.revokedByModel = actorModel;
        await perm.save();

        // ── Audit ─────────────────────────────────────────────────────────────
        await logAudit({
            action:           'DOCUMENT_ACCESS_REVOKED',
            performedBy:      actorId,
            performedByModel: actorModel,
            case:             document?.case || null,
            document:         perm.document,
            description:      `Admin revoked ${perm.grantedToModel} (${perm.grantedTo}) access to document "${document?.title ?? perm.document}"`,
            metadata: {
                permissionId:   perm._id,
                grantedTo:      perm.grantedTo,
                grantedToModel: perm.grantedToModel,
                revokedAt:      perm.revokedAt
            },
            req
        });

        return res.status(200).json({
            success:    true,
            message:    'Permission revoked',
            permission: perm
        });

    } catch (error) {
        console.error('Revoke permission error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to revoke permission',
            error:   error.message
        });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/permissions/document/:docId
//
// Lists all permission records for a given document.
// Supports optional ?status=ACTIVE|REVOKED|EXPIRED query filter.
//
// Guard: verifyToken + isAdmin (enforced in the route)
// ─────────────────────────────────────────────────────────────────────────────
const listPermissions = async (req, res) => {
    try {
        const { docId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(docId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document ID'
            });
        }

        const document = await Document.findById(docId);
        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const filter = { document: docId };

        const { status } = req.query;
        if (status) {
            if (!['ACTIVE', 'REVOKED', 'EXPIRED'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'status must be ACTIVE, REVOKED, or EXPIRED'
                });
            }
            filter.status = status;
        }

        // Auto-expire records where expiresAt has passed but status is still ACTIVE.
        // We do this lazily on read rather than via a cron job, so the DB stays accurate
        // without a background process. The update is best-effort (fire-and-forget).
        await DocumentPermission.updateMany(
            {
                document:  docId,
                status:    'ACTIVE',
                expiresAt: { $lte: new Date() }
            },
            { $set: { status: 'EXPIRED' } }
        );

        const permissions = await DocumentPermission.find(filter)
            .sort({ createdAt: -1 })
            .select('-__v');

        return res.status(200).json({
            success:     true,
            count:       permissions.length,
            document: {
                id:         document._id,
                documentId: document.documentId,
                title:      document.title
            },
            permissions
        });

    } catch (error) {
        console.error('List permissions error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to list permissions',
            error:   error.message
        });
    }
};


module.exports = {
    grantPermission,
    revokePermission,
    listPermissions
};
