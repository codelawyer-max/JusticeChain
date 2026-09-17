const Case = require('../models/case');

// Generate unique Case ID
const generateCaseId = () => {
    const year = new Date().getFullYear();
    const randomNumber = Math.floor(100000 + Math.random() * 900000);

    return `CASE-${year}-${randomNumber}`;
};

// Create a new case
const createCase = async (req, res) => {
    try {
        const {
            title,
            caseType,
            description,
            department,
            policeStation,
            assignedOfficer,
            priority,
            confidentialityLevel
        } = req.body;

        if (!title || !caseType || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title, case type and description are required'
            });
        }

        let caseId = generateCaseId();

        // Make sure generated ID is unique
        while (await Case.exists({ caseId })) {
            caseId = generateCaseId();
        }

        // Determine logged-in user
        const userId = req.user?._id || req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const createdByModel =
            req.user.role === 'Admin'
                ? 'Admin'
                : 'Citizen';

        const newCase = await Case.create({
            caseId,
            title,
            caseType,
            description,
            department,
            policeStation,
            assignedOfficer: assignedOfficer || null,
            priority: priority || 'Medium',
            confidentialityLevel:
                confidentialityLevel || 'Confidential',
            createdBy: userId,
            createdByModel
        });

        return res.status(201).json({
            success: true,
            message: 'Case created successfully',
            case: newCase
        });

    } catch (error) {
        console.error('Create case error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to create case',
            error: error.message
        });
    }
};


// Get all cases
const getCases = async (req, res) => {
    try {
        const {
            status,
            caseType,
            priority,
            search
        } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (caseType) {
            filter.caseType = caseType;
        }

        if (priority) {
            filter.priority = priority;
        }

        if (search) {
            filter.$text = {
                $search: search
            };
        }

        const cases = await Case.find(filter)
            .populate('assignedOfficer', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: cases.length,
            cases
        });

    } catch (error) {
        console.error('Get cases error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch cases',
            error: error.message
        });
    }
};


// Get single case
const getCaseById = async (req, res) => {
    try {
        const caseData = await Case.findById(req.params.id)
            .populate('assignedOfficer', 'name email');

        if (!caseData) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        return res.status(200).json({
            success: true,
            case: caseData
        });

    } catch (error) {
        console.error('Get case error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch case',
            error: error.message
        });
    }
};


// Update case
const updateCase = async (req, res) => {
    try {
        const allowedFields = [
            'title',
            'caseType',
            'description',
            'department',
            'policeStation',
            'assignedOfficer',
            'priority',
            'confidentialityLevel'
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        ).populate('assignedOfficer', 'name email');

        if (!updatedCase) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Case updated successfully',
            case: updatedCase
        });

    } catch (error) {
        console.error('Update case error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update case',
            error: error.message
        });
    }
};


// Update case status
const updateCaseStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            'Open',
            'Under Investigation',
            'Pending Review',
            'Submitted to Court',
            'Closed',
            'Archived'
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case status'
            });
        }

        const update = {
            status
        };

        if (status === 'Closed' || status === 'Archived') {
            update.closedAt = new Date();
        } else {
            update.closedAt = null;
        }

        const updatedCase = await Case.findByIdAndUpdate(
            req.params.id,
            update,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedCase) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Case status updated successfully',
            case: updatedCase
        });

    } catch (error) {
        console.error('Update case status error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to update case status',
            error: error.message
        });
    }
};


// Delete case
const deleteCase = async (req, res) => {
    try {
        const caseData = await Case.findById(req.params.id);

        if (!caseData) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        await Case.findByIdAndDelete(req.params.id);

        return res.status(200).json({
            success: true,
            message: 'Case deleted successfully'
        });

    } catch (error) {
        console.error('Delete case error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to delete case',
            error: error.message
        });
    }
};


module.exports = {
    createCase,
    getCases,
    getCaseById,
    updateCase,
    updateCaseStatus,
    deleteCase
};