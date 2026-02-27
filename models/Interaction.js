const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Interaction = sequelize.define('Interaction', {
    type: {
        type: DataTypes.ENUM('contact', 'feedback', 'improvement', 'report'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON, // For extra fields like rating, report type, etc.
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('new', 'read', 'resolved'),
        defaultValue: 'new'
    }
});

module.exports = Interaction;
