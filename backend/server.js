require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Trust proxy for Railway/Vercel (needed for express-rate-limit)
app.set('trust proxy', 1);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://customer-support-system-git-main-prempareesh798-9343s-projects.vercel.app",
    "https://customer-support-system-rho.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.includes(origin) || 
                         (origin && origin.endsWith('.vercel.app')) || 
                         (origin && origin.startsWith('http://localhost:'));

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed for this origin"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: false })); // allows image loading
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Test Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: "UP",
        deployment_status: "SUCCESSFUL"
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
