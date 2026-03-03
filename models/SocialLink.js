const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const SocialLink = sequelize.define('SocialLink', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    platform: {
        type: DataTypes.STRING, // e.g., 'facebook', 'instagram', 'twitter-x', 'whatsapp'
        allowNull: false
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: true
        }
    },
    order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = SocialLink;
