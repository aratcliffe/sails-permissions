var permissionPolicies = [
  'ModelPolicy',
  'OwnerPolicy',
  'PermissionPolicy',
  'RolePolicy'
]
var path = require('path');
var _ = require('lodash');

module.exports = function (sails) {
    var loader = require('sails-util-mvcsloader')(sails, 'orm-offshore');

    loader.configure({
        policies: path.resolve(__dirname, '../../policies'),
        config: path.resolve(__dirname, '../../../config')
    });

    function validatePolicyConfig () {
        var policies = sails.config.policies;
        return _.all([
            _.isArray(policies['*']),
            _.intersection(permissionPolicies, policies['*']).length === permissionPolicies.length
        ]);
    }

    function installModelOwnership () {
        var models = sails.models;
        
        if (sails.config.models.autoCreatedBy === false) return;

        _.each(models, function (model) {
            if (model.autoCreatedBy === false) return;

            _.defaults(model.attributes, {
                createdBy: {
                    model: 'User',
                    index: true
                },
                owner: {
                    model: 'User',
                    index: true
                }
            });
        });
    }

    function initializeFixtures () {
        var fixturesPath = path.resolve(__dirname, '../../../config/fixtures/'),
            models, roles;
        
        return require(path.resolve(fixturesPath, 'model')).createModels()
            .then(function (m) {
                models = m;
                sails.hooks.permissions._modelCache = _.indexBy(models, 'identity');

                return require(path.resolve(fixturesPath, 'role')).create();
            })
            .then(function (r) {
                roles = r;
                var userModel = _.find(models, { name: 'User' });
                return require(path.resolve(fixturesPath, 'user')).create(roles, userModel);
            })
            .then(function () {
                return sails.models.user.findOne({ email: sails.config.permissions.adminEmail });
            })
            .then(function (user) {
                sails.log('sails-permissions: created admin user:', user);
                user.createdBy = user.id;
                user.owner = user.id;
                return user.save();
            })
            .then(function (admin) {
                return require(path.resolve(fixturesPath, 'permission')).create(roles, models, admin, sails.config.permissions);
            })
            .catch(function (error) {
                sails.log.error(error);
            });
    }        
    
    return {
        configure: function () {
            if (!_.isObject(sails.config.permissions)) sails.config.permissions = {};

            /**
             * Local cache of Model name -> id mappings to avoid excessive database lookups.
             */
            sails.config.blueprints.populate = false
        },
        
        initialize: function (next) {
            var config = sails.config.permissions;

            loader.inject({
                controllers: path.resolve(__dirname, '../../controllers'),
                models: path.resolve(__dirname, '../../models'),
                services: path.resolve(__dirname, '../../services'),
            }, function (error) {
                if (error) {
                    return next(error);
                }

                installModelOwnership();
                sails.after(config.afterEvent, function () {
                    if (!validatePolicyConfig()) {
                        sails.log.warn('One or more required policies are missing.');
                        sails.log.warn('Please see README for installation instructions: https://github.com/tjwebb/sails-permissions');
                    }
                });

                sails.after('hook:orm-offshore:loaded', function () {
                    sails.models.model.count()
                        .then(function (count) {
                            if (count === _.keys(sails.models).length) return next();
                            
                            return initializeFixtures()
                                .then(function () {
                                    next();
                                });
                        })
                        .catch(function (error) {
                            sails.log.error(error);
                            next(error);
                        })
                });
            });
        }               
    };
};
