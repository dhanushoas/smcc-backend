const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'viewer'),
    defaultValue: 'viewer'
  },
  isLoggedIn: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  activePlatform: {
    type: DataTypes.ENUM('web', 'mobile'),
    allowNull: true,
    defaultValue: null
  },
  activeToken: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null
  }
}, {
  timestamps: false
});

User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  values._id = values.id;
  return values;
};

module.exports = User;
