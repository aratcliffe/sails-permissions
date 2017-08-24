'use strict';

var _ = require('lodash');

var grants = {
    admin: [{
        action: 'create'
    }, {
        action: 'read'
    }, {
        action: 'update'
    }, {
        action: 'delete'
    }],
    user: [{
        action: 'create'
    }, {
        action: 'read',
        relation: 'owner'
    }, {
        action: 'update',
        relation: 'owner'
    }, {
        action: 'delete',
        relation: 'owner'
    }]
};

/**
 * Create default Role permissions
 */
module.exports.create = function (roles, models, admin, config) {
    return Promise.all([grantAdminPermissions(roles, models, admin, config), grantUserPermissions(roles, models, admin, config)]).then(function (permissions) {
        //sails.log.verbose('created', permissions.length, 'permissions');
        return permissions;
    });
};

function grantAdminPermissions(roles, models, admin, config) {
    var adminRole = _.find(roles, { name: 'admin' });
    var permissions = _.flatten(_.map(models, function (modelEntity) {
        grants.admin = _.get(config, 'grants.admin') || grants.admin;

        return _.map(grants.admin, function (permission) {
            var newPermission = {
                model: modelEntity.id,
                action: permission.action,
                role: adminRole.id
            };
            return sails.models.permission.findOrCreate(newPermission, newPermission);
        });
    }));

    return Promise.all(permissions);
}

function grantUserPermissions(roles, models, admin, config) {
    var userRole = _.find(roles, { name: 'user' });
    var basePermissions = [{
        model: _.find(models, { name: 'Permission' }).id,
        action: 'read',
        role: userRole.id
    }, {
        model: _.find(models, { name: 'Model' }).id,
        action: 'read',
        role: userRole.id
    }, {
        model: _.find(models, { name: 'User' }).id,
        action: 'update',
        role: userRole.id,
        relation: 'owner'
    }, {
        model: _.find(models, { name: 'User' }).id,
        action: 'read',
        role: userRole.id,
        relation: 'owner'
    }];
    
    var permittedModels = _.filter(models, function (model) {
        return _.contains(['Report'], model.name);
    });
    
    var grantPermissions = _.flatten(_.map(permittedModels, function (modelEntity) {

        grants.user = _.get(config, 'grants.user') || grants.user;

        return _.map(grants.user, function (permission) {
            return {
                model: modelEntity.id,
                action: permission.action,
                relation: permission.relation || 'role',
                role: userRole.id
            };
        });
    }));

    return Promise.all([].concat(basePermissions, grantPermissions).map(function (permission) {
        return sails.models.permission.findOrCreate(permission, permission);
    }));
}
