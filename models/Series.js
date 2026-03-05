const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Series = sequelize.define('Series', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    teamA: {
        type: DataTypes.STRING,
        allowNull: false
    },
    teamB: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('best_of_3', 'best_of_5', 'best_of_7'),
        defaultValue: 'best_of_3'
    },
    oversPerMatch: {
        type: DataTypes.INTEGER,
        defaultValue: 20
    },
    status: {
        type: DataTypes.ENUM('upcoming', 'ongoing', 'completed'),
        defaultValue: 'upcoming'
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    venue: {
        type: DataTypes.STRING,
        defaultValue: 'SMCC Ground'
    },
    teamAWins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    teamBWins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    winner: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = Series;
