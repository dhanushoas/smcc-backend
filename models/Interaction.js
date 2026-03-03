const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Interaction = sequelize.define('Interaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    type: {
        type: DataTypes.ENUM('contact', 'feedback', 'report', 'improvement', 'join_council', 'sponsorship'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: { isEmail: true }
    },
    phone: {
        type: DataTypes.STRING(20),
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
        type: DataTypes.JSON, // For extra fields like rating, report type, company, budget, etc.
        allowNull: true
    },
    files: {
        type: DataTypes.JSON, // Array of file paths/URLs
        allowNull: true
    },
    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('new', 'read', 'resolved'),
        defaultValue: 'new'
    }
});

module.exports = Interaction;
