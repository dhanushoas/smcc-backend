const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TournamentMatch = sequelize.define('TournamentMatch', {
    round: {
        type: DataTypes.STRING, // 'Round 1', 'Round 2', 'Quarter Final', 'Semi Final', 'Final'
        allowNull: false
    },
    match_number: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    team1_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    team2_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    team1_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    team2_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    winner_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    match_id: {
        type: DataTypes.INTEGER, // Reference to the actual Match object in Match table
        allowNull: true
    },
    next_match_number: {
        type: DataTypes.INTEGER, // Which match the winner moves to
        allowNull: true
    },
    next_match_position: {
        type: DataTypes.ENUM('1', '2'), // Whether winner becomes team1 or team2 in next match
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'TournamentMatches'
});

module.exports = TournamentMatch;
