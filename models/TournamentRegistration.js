const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TournamentRegistration = sequelize.define('TournamentRegistration', {
    team_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    captain_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mobile: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    village: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending'
    }
}, {
    timestamps: true,
    underscored: true
});

module.exports = TournamentRegistration;
