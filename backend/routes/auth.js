const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  // <-- added
const Citizen = require('../models/citizen');
const Admin = require('../models/admin');
const router = express.Router();
console.log('Loaded auth routes file');

// Citizen Register
router.post('/citizen/register', async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        const existingUser = await Citizen.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Citizen with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Citizen({
            fullName,
            email,
            phone,
            password: hashedPassword
        });
        await newUser.save();

        res.json({ message: 'Citizen registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Citizen Login
router.post('/citizen/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Citizen.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Citizen not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // ---- ADD JWT HERE ----
        const token = jwt.sign(
            { id: user._id, email: user.email, role: "citizen" },
            process.env.JWT_SECRET,
            { expiresIn: "10h" }
        );
        // -----------------------
        console.log('Generated JWT for citizen:', token ? '✓ token created' : '✗ no token');

        const resp = {
            message: 'Citizen logged in successfully',
            token: token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone
            }
        };
        res.setHeader('Content-Type', 'application/json');

        return res.send(JSON.stringify(resp));

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Register
router.post('/admin/register', async (req, res) => {
    try {
        console.log("Admin register request received:", { 
            email: req.body.email,
            hasPassword: !!req.body.password,
            bodyKeys: Object.keys(req.body)
        });

        const { 
            email, 
            password, 
            fullName, 
            phone, 
            empId, 
            department, 
            designation,
            officerRole,
            officeAddress, 
            state, 
            city 
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // officerRole is required — no silent defaulting to SUPER_ADMIN
        const VALID_ROLES = [
            'SUPER_ADMIN',
            'INVESTIGATING_OFFICER',
            'STATION_HOUSE_OFFICER',
            'PUBLIC_PROSECUTOR',
            'FORENSIC_ANALYST',
            'COURT_REGISTRAR'
        ];

        if (!officerRole) {
            return res.status(400).json({
                message: 'officerRole is required',
                validRoles: VALID_ROLES
            });
        }

        if (!VALID_ROLES.includes(officerRole)) {
            return res.status(400).json({
                message: `Invalid officerRole "${officerRole}"`,
                validRoles: VALID_ROLES
            });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({
            email,
            password: hashedPassword,
            fullName,
            phone,
            empId,
            department,
            designation,
            officerRole,
            officeAddress,
            state,
            city
        });
        
        console.log("Saving new admin:", { email, fullName, empId, officerRole });
        await newAdmin.save();
        console.log("Admin saved successfully");

        res.json({ message: 'Admin registered successfully' });
    } catch (err) {
        console.error("ADMIN REGISTER ERROR:", {
            message: err.message,
            code: err.code,
            name: err.name,
            stack: err.stack
        });

        if (err.code === 11000) {
            return res.status(400).json({ message: "Admin with this email already exists" });
        }

        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // ---- ADD JWT HERE ----
        const token = jwt.sign(
            {
                id:          admin._id,
                email:       admin.email,
                role:        'admin',
                officerRole: admin.officerRole || null,
                department:  admin.department  || null
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        // -----------------------

        const adminResp = {
            message: 'Admin logged in successfully',
            token: token,
            admin: { 
                id: admin._id,
                email: admin.email 
            }
        };
        console.log('Login response object (admin):', adminResp);
        res.setHeader('Content-Type', 'application/json');
        return res.send(JSON.stringify(adminResp));

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
