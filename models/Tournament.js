const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Tournament = sequelize.define('Tournament', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        defaultValue: ''
    },
    totalTeams: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 8
    },
    status: {
        type: DataTypes.ENUM('draft', 'ongoing', 'completed'),
        defaultValue: 'draft'
    },
    type: {
        type: DataTypes.ENUM('league', 'knockout', 'league_knockout'),
        defaultValue: 'league_knockout'
    },
    settings: {
        type: DataTypes.JSON,
        defaultValue: {
            pointsPerWin: 2,
            pointsPerTie: 1,
            pointsPerLoss: 0,
            pointsPerNoResult: 1,
            oversPerMatch: 20,
            qualificationSlots: 8
        }
    },
    // Venue & organizer details
    venue: {
        type: DataTypes.STRING,
        defaultValue: 'SMCC Ground'
    },
    organizer: {
        type: DataTypes.STRING,
        defaultValue: 'SMCC'
    },
    ballType: {
        type: DataTypes.ENUM('tennis', 'leather'),
        defaultValue: 'tennis'
    },
    // Scheduling fields
    startTime: {
        type: DataTypes.STRING, // e.g. "10:00 AM"
        defaultValue: '09:00 AM'
    },
    matchGapMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 60
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Tournament;
