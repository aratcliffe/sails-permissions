'use strict';

var permissionPolicies = ['passport', 'sessionAuth', 'ModelPolicy', 'OwnerPolicy', 'PermissionPolicy', 'RolePolicy'];
var path = require('path');
var _ = require('lodash');

module.exports = function (sails) {
    var loader = require('sails-util-mvcsloader')(sails);

    return {
        configure: function configure() {
            if (!_.isObject(sails.config.permissions)) sails.config.permissions = {};

            /**
             * Local cache of Model name -> id mappings to avoid excessive database lookups.
             */
            this.sails.config.blueprints.populate = false;
        },

        initialize: function initialize(next) {
            var config = this.sails.config.permissions;

            loader.inject(function (error) {
                if (error) {
                    return next(error);
                }

                this.installModelOwnership();
                this.sails.after(config.afterEvent, function () {
                    if (!this.validatePolicyConfig()) {
                        this.sails.log.warn('One or more required policies are missing.');
                        this.sails.log.warn('Please see README for installation instructions: https://github.com/tjwebb/sails-permissions');
                    }
                });

                this.sails.after('hook:orm-offshore:loaded', function () {
                    sails.models.model.count().then(function (count) {
                        if (count === _.keys(this.sails.models).length) return next();

                        return this.initializeFixtures().then(function () {
                            next();
                        });
                    })['catch'](function (error) {
                        this.sails.log.error(error);
                        next(error);
                    });
                });
            });
        },

        validatePolicyConfig: function validatePolicyConfig() {
            var policies = this.sails.config.policies;
            return _.all([_.isArray(policies['*']), _.intersection(permissionPolicies, policies['*']).length === permissionPolicies.length, policies.AuthController && _.contains(policies.AuthController['*'], 'passport')]);
        },

        installModelOwnership: function installModelOwnership() {
            var models = this.sails.models;

            if (this.sails.config.models.autoCreatedBy === false) return;

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
        },

        initializeFixtures: function initializeFixtures() {
            var fixturesPath = path.resolve(__dirname, '../../../config/fixtures/');

            return require(path.resolve(fixturesPath, 'model')).createModels().then(function (models) {
                this.models = models;
                this.sails.hooks.permissions._modelCache = _.indexBy(models, 'identity');

                return require(path.resolve(fixturesPath, 'role')).create();
            }).then(function (roles) {
                this.roles = roles;
                var userModel = _.find(this.models, { name: 'User' });
                return require(path.resolve(fixturesPath, 'user')).create(this.roles, userModel);
            }).then(function () {
                return sails.models.user.findOne({ email: this.sails.config.permissions.adminEmail });
            }).then(function (user) {
                this.sails.log('sails-permissions: created admin user:', user);
                user.createdBy = user.id;
                user.owner = user.id;
                return user.save();
            }).then(function (admin) {
                return require(path.resolve(fixturesPath, 'permission')).create(this.roles, this.models, admin, this.sails.config.permissions);
            })['catch'](function (error) {
                this.sails.log.error(error);
            });
        }

    };
};