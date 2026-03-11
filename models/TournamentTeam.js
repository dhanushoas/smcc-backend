const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TournamentTeam = sequelize.define('TournamentTeam', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    captain: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    captainMobile: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    district: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    manager: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    logo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Players: JSON array of { name, role, jerseyNumber, battingStyle, bowlingStyle, mobile }
    players: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    tournamentId: {
        type: DataTypes.INTEGER,
        allowNull: true // Allow pool teams not yet assigned to a tournament
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = TournamentTeam;
