/**
 * Creates default Roles
 *
 * @public
 */
'use strict';

module.exports.create = function () {
  return Promise.all([sails.models.role.findOrCreate({ name: 'admin' }, { name: 'admin' }), sails.models.role.findOrCreate({ name: 'user' }, { name: 'user' })]);
};