const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// If you have a service account JSON, place it in 'config/serviceAccountKey.json'
try {
    const serviceAccount = require('../config/serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
}

class NotificationService {
    static async sendMatchNotification(match, type) {
        let title = '';
        let body = '';

        if (type === 'live') {
            title = 'MATCH STARTED! 🏏';
            body = `${match.teamA} vs ${match.teamB} is now LIVE! Stay tuned for ball-by-ball updates.`;
        } else if (type === 'completed') {
            title = 'MATCH COMPLETED! 🏆';
            body = `Final Result: ${match.title}. Tap to see the full scorecard!`;
        } else if (type === 'innings_break') {
            title = 'INNINGS BREAK ☕';
            body = `First innings completed. Target for ${match.score?.battingTeam}: ${match.score?.target}.`;
        }

        if (!title) return;

        const message = {
            notification: { title, body },
            topic: 'matches',
            data: {
                matchId: match.id.toString(),
                status: match.status
            }
        };

        try {
            if (admin.apps.length > 0) {
                await admin.messaging().send(message);
            }
        } catch (error) {
        }
    }
}

module.exports = NotificationService;
