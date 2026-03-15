const { db } = require('../firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

const registerSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('customer', 'admin').default('customer'),
    college: Joi.string().max(100).required(),
    registration_number: Joi.string().max(100).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

exports.register = async (req, res, next) => {
    try {
        // Validate request body
        const { error } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { name, email, password, role = 'customer', college, registration_number } = req.body;

        // Check if user exists
        const usersRef = db.collection('Users');
        const snapshot = await usersRef.where('email', '==', email).get();
        if (!snapshot.empty) {
            return res.status(400).json({ success: false, message: 'User already exists with this email.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const newUserRef = usersRef.doc();
        const newUserId = newUserRef.id;

        const userData = {
            user_id: newUserId,
            name,
            email,
            password: hashedPassword,
            role,
            college,
            registration_number,
            created_at: new Date()
        };

        await newUserRef.set(userData);

        // Generate token
        const token = generateToken(newUserId, role);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: newUserId,
                name,
                email,
                role
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        // Validate request body
        const { error } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error.details[0].message });
        }

        const { email, password } = req.body;

        // Check for user
        const usersRef = db.collection('Users');
        const snapshot = await usersRef.where('email', '==', email).limit(1).get();
        if (snapshot.empty) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Create token
        const token = generateToken(user.user_id, user.role);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
};
