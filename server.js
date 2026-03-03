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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Attach io to app to use in routes
app.set('socketio', io);

// Middleware
app.use(cors());
app.use(express.json());

// Session and Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect Database
connectDB();

// Routes
app.get('/ping', (req, res) => res.status(200).send('pong'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/footer', require('./routes/footer'));
app.use('/api/interactions', require('./routes/misc'));

// Sync Database
sequelize.sync({ alter: true })
    .then(() => console.log('MySQL Tables Synced'))
    .catch(err => console.error('Error syncing MySQL tables:', err));

// Expose public uploads folder explicitly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -------------------------------------------
// Global Error Handler (Standardized JSON)
// -------------------------------------------
app.use((err, req, res, next) => {
    console.error('-------------------------------------------');
    console.error('GLOBAL ERROR CAUGHT:');
    console.error(err.stack);
    console.error('-------------------------------------------');

    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : err.message,
        data: null
    });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log('-------------------------------------------');
    console.log(`🚀 SMCC Backend Listening on port ${PORT}`);
    console.log(`ENVIRONMENT: ${process.env.NODE_ENV || 'development'}`);
    console.log('-------------------------------------------');
});
