const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TournamentGroup = sequelize.define('TournamentGroup', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tournamentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = TournamentGroup;
