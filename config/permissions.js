module.exports.permissions = {
  name: 'permissions',

  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin1234',
  adminOrganization: process.env.ADMIN_ORGANIZATION || 1,

  afterEvents: [
    'hook:auth:initialized'
  ]
};
