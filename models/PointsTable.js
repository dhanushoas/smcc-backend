const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PointsTable = sequelize.define('PointsTable', {
    team_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    team_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    matches_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    net_run_rate: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    }
}, {
    timestamps: true,
    tableName: 'PointsTable'
});

module.exports = PointsTable;
