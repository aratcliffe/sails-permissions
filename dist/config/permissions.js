'use strict';

module.exports.permissions = {
  name: 'permissions',

  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  adminOrganisation: process.env.ADMIN_ORGANISATION || 1,

  afterEvents: ['hook:auth:initialized']
};