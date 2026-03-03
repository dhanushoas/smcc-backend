const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FooterLink = sequelize.define('FooterLink', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    route: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.ENUM('quick_links', 'support', 'community'),
        allowNull: false
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    roleVisibility: {
        type: DataTypes.ENUM('PUBLIC', 'ADMIN', 'SUPER_ADMIN'),
        defaultValue: 'PUBLIC'
    }
});

module.exports = FooterLink;
