const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

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
    date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    venue: {
        type: DataTypes.STRING,
        defaultValue: 'SMCC Ground'
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'live', 'completed'),
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
    },
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
