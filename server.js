const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
require('./config/passport')(passport);
const { Server } = require('socket.io');
const { connectDB, sequelize } = require('./config/db');
require('dotenv').config();

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Attach Socket.io instance to app for route access
app.set('socketio', io);

// Configure middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Setup session management and Passport authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'smcc_secret_production',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect Database
connectDB();

// Define API routes
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.use('/api/auth', require('./routes/auth')); // Authentication routes
app.use('/api/matches', require('./routes/matches')); // Match management
app.use('/api/footer', require('./routes/footer')); // Footer content
app.use('/api/interactions', require('./routes/misc')); // Miscellaneous interactions
app.use('/api/tournaments', require('./routes/tournaments')); // Tournament management
app.use('/api/series', require('./routes/series')); // Series management

// Sync Database
sequelize.sync({ alter: true })
    .then(() => console.log('✅ Database synchronized successfully'))
    .catch(err => console.error('❌ Database sync failed:', err.message));

// Expose public uploads folder explicitly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global error handling middleware for production-ready responses
app.use((err, req, res, next) => {
    // Log error stack locally for debugging
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // Send standardized JSON error response
    res.status(err.status || 500).json({
        success: false,
        message: (process.env.NODE_ENV === 'production' && !err.isPublic)
            ? 'Internal Server Error'
            : err.message,
        data: null
    });
});

// Socket.io connection
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
