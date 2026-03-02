const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const EXPIRE_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE_IN || '7d';

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Create JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET || 'secret-placeholder',
            { expiresIn: EXPIRE_IN }
        );

        // Fetch user data based on role
        let userData = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        if (user.role === 'CUSTOMER') {
            const customer = await prisma.customer.findUnique({
                where: { userId: user.id }
            });
            if (customer) {
                userData.name = customer.name;
                userData.customerId = customer.id;
            }
        } else {
            const admin = await prisma.adminSettings.findUnique({
                where: { userId: user.id }
            });
            if (admin) {
                userData.name = admin.profileName;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: userData
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, role: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        let userData = { ...user };

        if (user.role === 'CUSTOMER') {
            const customer = await prisma.customer.findUnique({
                where: { userId: user.id }
            });
            if (customer) {
                userData.name = customer.name;
                userData.customerId = customer.id;
            }
        } else {
            const admin = await prisma.adminSettings.findUnique({
                where: { userId: user.id }
            });
            if (admin) {
                userData.name = admin.profileName;
            }
        }

        res.status(200).json({
            success: true,
            user: userData
        });

    } catch (err) {
        console.error('getMe error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * @desc    Get extended profile for the user (includes settings)
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, role: true, createdAt: true }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        let profileData = { ...user };

        if (user.role === 'ADMIN') {
            const admin = await prisma.adminSettings.findUnique({
                where: { userId: user.id }
            });
            if (admin) {
                profileData = { ...profileData, settings: admin };
                profileData.name = admin.profileName;
            }
        } else if (user.role === 'CUSTOMER') {
            const customer = await prisma.customer.findUnique({
                where: { userId: user.id }
            });
            if (customer) {
                profileData = { ...profileData, customer };
                profileData.name = customer.name;
            }
        }

        res.status(200).json({ success: true, profile: profileData });
    } catch (err) {
        console.error('getProfile error:', err);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * @desc    Update user profile & settings
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        // Destructure ONLY fields that exist in the AdminSettings / Customer schema
        const {
            name,
            phone,
            bio,
            company,
            // AdminSettings fields (from schema)
            emailAlerts,
            smsAlerts,
            browserNotif,
            language,
            timezone,
            currency,
        } = req.body;

        if (req.user.role === 'ADMIN') {
            // Build update payload with ONLY valid schema fields
            const updateData = {};
            if (name !== undefined) updateData.profileName = name;
            if (phone !== undefined) updateData.phone = phone;
            if (bio !== undefined) updateData.bio = bio;
            if (company !== undefined) updateData.company = company;
            if (emailAlerts !== undefined) updateData.emailAlerts = Boolean(emailAlerts);
            if (smsAlerts !== undefined) updateData.smsAlerts = Boolean(smsAlerts);
            if (browserNotif !== undefined) updateData.browserNotif = Boolean(browserNotif);
            if (language !== undefined) updateData.language = language;
            if (timezone !== undefined) updateData.timezone = timezone;
            if (currency !== undefined) updateData.currency = currency;

            const admin = await prisma.adminSettings.upsert({
                where: { userId: req.user.id },
                update: updateData,
                create: {
                    userId: req.user.id,
                    profileName: name || 'Administrator',
                    phone: phone || null,
                    bio: bio || null,
                    company: company || 'Sales Manager Pro',
                    emailAlerts: emailAlerts !== undefined ? Boolean(emailAlerts) : true,
                    smsAlerts: smsAlerts !== undefined ? Boolean(smsAlerts) : false,
                    browserNotif: browserNotif !== undefined ? Boolean(browserNotif) : true,
                    language: language || 'en',
                    timezone: timezone || 'Asia/Kolkata',
                    currency: currency || 'INR',
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                settings: admin,
                user: { id: req.user.id, name: admin.profileName, role: 'ADMIN' }
            });
        }

        // For customers — update name, phone only (Customer schema fields)
        if (req.user.role === 'CUSTOMER') {
            const customerData = {};
            if (name !== undefined) customerData.name = name;
            if (phone !== undefined) customerData.phone = phone;

            const customer = await prisma.customer.update({
                where: { userId: req.user.id },
                data: customerData
            });

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                customer,
                user: { id: req.user.id, name: customer.name, role: 'CUSTOMER' }
            });
        }

        res.status(400).json({ success: false, message: 'Invalid role.' });

    } catch (err) {
        console.error('updateProfile error:', err.message, err.code);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    login,
    getMe,
    getProfile,
    updateProfile
};
