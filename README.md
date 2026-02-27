# SMCC Cricket Backend

Backend API server for the S Mettur Cricket Council live scoring application.

## Features

- 🏏 Real-time cricket match scoring with Socket.IO
- 🔐 JWT-based authentication for admin access
- 📊 Comprehensive match statistics and scorecards
- 🌐 RESTful API endpoints
- 🔄 Live updates via WebSocket
- 📱 Support for both web and mobile clients

## Tech Stack

- **Node.js** + **Express.js** - Server framework
- **MySQL** - Database (via Sequelize ORM)
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - Secure authentication
- **Passport.js** - OAuth authentication (Google)
- **bcryptjs** - Password hashing

## Prerequisites

- Node.js (v14 or higher)
- MySQL database
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd smcc-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=5000
DATABASE_URL=mysql://username:password@host:port/database
JWT_SECRET=your_secret_key_here
SESSION_SECRET=your_session_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Running the Server

### Development Mode
```bash
npm start
```

The server will start on `http://localhost:5000`

### Production Mode
```bash
NODE_ENV=production npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new admin
- `POST /api/auth/login` - Admin login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get specific match
- `POST /api/matches` - Create new match (Admin only)
- `PUT /api/matches/:id` - Update match (Admin only)
- `DELETE /api/matches/:id` - Delete match (Admin only)

## WebSocket Events

### Client → Server
- Connect to `http://localhost:5000` with Socket.IO client

### Server → Client
- `matchUpdate` - Emitted when match data changes
- `matchDeleted` - Emitted when a match is deleted

## Database Schema

### Users Table
- `id` - Primary key
- `username` - Unique username
- `email` - User email (for OAuth)
- `password` - Hashed password (optional for OAuth users)
- `googleId` - Google OAuth ID
- `role` - 'admin' or 'viewer'

### Matches Table
- `id` - Primary key
- `title` - Match title
- `teamA` / `teamB` - Team names
- `status` - 'upcoming', 'live', 'completed'
- `score` - Current score (JSON)
- `innings` - Detailed innings data (JSON)
- `currentBatsmen` - Active batsmen (JSON)
- `currentBowler` - Active bowler
- `manOfTheMatch` - Player name
- And more...

## Security

- Passwords are hashed using bcryptjs
- JWT tokens expire after 100 hours
- Admin routes are protected with JWT middleware
- CORS enabled for frontend access

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and maintained by S Mettur Cricket Council.

## Contact

For issues or questions, please contact the development team.

---

**© 2026 S Mettur Cricket Council**
