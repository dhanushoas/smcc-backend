const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
// If you have a service account JSON, place it in 'config/serviceAccountKey.json'
try {
    const serviceAccount = require('../config/serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized');
} catch (error) {
    console.warn('⚠️ Firebase Admin could not be initialized. Service account key missing?');
    console.warn('Push notifications will be simulated (logged to console).');
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
                const response = await admin.messaging().send(message);
                console.log('✅ Notification sent successfully:', response);
            } else {
                console.log('📢 [SIMULATED NOTIFICATION]', { title, body, topic: 'matches' });
            }
        } catch (error) {
            console.error('❌ Error sending notification:', error);
        }
    }
}

module.exports = NotificationService;
