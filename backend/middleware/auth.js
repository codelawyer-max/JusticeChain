const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Get token from "Bearer token"
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware to check if user is a citizen
const isCitizen = (req, res, next) => {
    if (req.user?.role !== 'citizen') {
        return res.status(403).json({ message: 'Access denied. Citizen only.' });
    }
    next();
};

// Middleware to check if user is an admin
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Middleware factory — restricts to specific officer roles.
// SUPER_ADMIN always passes (they're the platform owner).
// Must be used after verifyToken + isAdmin.
//
// Usage: requireOfficerRole('INVESTIGATING_OFFICER', 'STATION_HOUSE_OFFICER')
const requireOfficerRole = (...roles) => (req, res, next) => {
    const officerRole = req.user?.officerRole;

    // SUPER_ADMIN bypasses every role gate
    if (officerRole === 'SUPER_ADMIN') return next();

    if (!officerRole || !roles.includes(officerRole)) {
        return res.status(403).json({
            message: `Access denied. Required role(s): ${roles.join(', ')}`,
            yourRole: officerRole || 'none'
        });
    }
    next();
};

// Middleware factory — restricts to specific departments (free-text match
// against the 'department' field stored in the JWT).
// Must be used after verifyToken + isAdmin.
//
// Usage: requireDepartment('Forensics', 'Police')
const requireDepartment = (...departments) => (req, res, next) => {
    // SUPER_ADMIN bypasses department gates too
    if (req.user?.officerRole === 'SUPER_ADMIN') return next();

    const dept = req.user?.department;
    if (!dept || !departments.includes(dept)) {
        return res.status(403).json({
            message: `Access denied. Required department(s): ${departments.join(', ')}`,
            yourDepartment: dept || 'none'
        });
    }
    next();
};

module.exports = { verifyToken, isCitizen, isAdmin, requireOfficerRole, requireDepartment };
