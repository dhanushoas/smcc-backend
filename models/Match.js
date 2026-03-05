const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Define Match Schema with dynamic competition features
const Match = sequelize.define('Match', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    series: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    matchType: {
        type: DataTypes.STRING,
        defaultValue: 'ODI'
    },
    competitionType: {
        type: DataTypes.ENUM('head-to-head', 'series', 'tournament'),
        defaultValue: 'head-to-head'
    },
    seriesId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    overs_per_match: {
        type: DataTypes.INTEGER,
        defaultValue: 20
    },
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    venue: {
        type: DataTypes.STRING,
        defaultValue: 'SMCC Ground'
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'live', 'completed', 'cancelled'),
        defaultValue: 'upcoming'
    },
    teamA: {
        type: DataTypes.STRING,
        allowNull: false
    },
    teamB: {
        type: DataTypes.STRING,
        allowNull: false
    },
    teamASquad: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    teamBSquad: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    totalOvers: {
        type: DataTypes.INTEGER,
        defaultValue: 20
    },
    toss: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    officials: {
        type: DataTypes.JSON,
        defaultValue: {}
    },
    score: {
        type: DataTypes.JSON,
        defaultValue: {
            battingTeam: '',
            runs: 0,
            wickets: 0,
            overs: 0,
            target: null
        }
    }, // Current live score state
    currentBowler: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    currentBatsmen: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    innings: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    manOfTheMatch: {
        type: DataTypes.STRING,
        defaultValue: ''
    },
    lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }, // Timestamp for synchronization
    tournamentId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    groupId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tournamentRound: {
        type: DataTypes.STRING,
        defaultValue: 'none' // 'group', 'quarter-final', 'semi-final', 'final'
    },
    matchNumber: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: false,
    getterMethods: {
        _id() {
            return this.id;
        }
    }
});

// For JSON serialization
Match.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = Match;
