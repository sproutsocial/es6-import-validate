'use strict';

var fs = require('fs'),
    path = require('path');

var _ = require('lodash-node'),
    Promise = require('bluebird'),
    esprima = require('esprima');

var readFile = Promise.promisify(fs.readFile);

function ES6ModuleFile(opts) {
    this.opts = _.defaults(opts || {}, ES6ModuleFile.Defaults);
}

_.extend(ES6ModuleFile.prototype, {
    analyzeFile: function (filePath) {
        return readFile(filePath).then(function (contents) {
            var name = this.getModuleName(filePath);

            return this.analyzeContents(contents, name, filePath);
        }.bind(this));
    },

    analyzeContents: function (contents, name, filePath) {
        var self = this;

        return this.getContentsSyntaxTree(contents).then(function (syntax) {
            var info = {
                    name: name,
                    filePath: filePath || name,
                    imports: [],
                    exports: []
                },
                handleImportToken = function (token) {
                    if (token.kind === 'named') {
                        _.each(token.specifiers, function (specifier) {
                            // Add imports for each named import
                            info.imports.push({
                                name: specifier.id.name,
                                from: token.source.value
                            });
                        });
                    } else {
                        // Add import just for default
                        info.imports.push({
                            name: 'default',
                            from: token.source.value
                        });
                    }
                },
                handleExportToken = function (token) {
                    if (token.specifiers) {
                        // Add each named export
                        _.each(token.specifiers, function (specifier) {
                            info.exports.push({
                                name: specifier.id.name
                            });
                        });
                    } else if (token.declaration) {
                        // Handle export var blah = bar;
                        // And export default bar;
                        // And export function blah() { ... }
                        var decls = token.declaration.declarations || token.declaration;

                        // Check for token.declaration case; FunctionDeclarataion
                        if (_.isObject(decls) && decls.id) {
                            // Handles export function blah() { ... }
                            info.exports.push({
                                name: decls.id.name
                            });
                        } else if (_.isArray(decls)) {
                            _.each(decls, function (decl) {
                                info.exports.push({
                                    name: decl.id.name
                                });
                            });
                        }
                    }
                };

            return _.reduce(syntax.body, function (info, token) {
                if (token.type === 'ImportDeclaration') {
                    handleImportToken(token);
                } else if (token.type === 'ExportDeclaration') {
                    handleExportToken(token);
                }

                return info;
            }, info);
        });
    },

    getModuleName: function (filePath) {
        // By default use the relative path (without extension) from the cwd.
        var name = this.getNameFromPath(filePath);

        // Normalize for windoze
        name = name.replace(/\\/g, '/');

        return name;
    },

    // Only broken out to stub for windows backslash in tests
    getNameFromPath: function (filePath) {
        var name = path.relative(this.opts.cwd, filePath);

        name = path.join(path.dirname(name), path.basename(name, this.opts.extension));

        return name;
    },

    getContentsSyntaxTree: function (contents) {
        return Promise.resolve(esprima.parse(contents));
    }
});

ES6ModuleFile.Defaults = {
    extension: '.js',
    cwd: process.cwd()
};

ES6ModuleFile.AnalyzeDefaults = {
    ES6ModuleFile: ES6ModuleFile
};

ES6ModuleFile.ValidateDefaults = {
    whitelist: {}
};

ES6ModuleFile.analyzeFiles = function (files, opts) {
    opts = _.defaults(opts || {}, ES6ModuleFile.AnalyzeDefaults);

    return Promise.reduce(files, function (result, fileName) {
        var moduleFile = new opts.ES6ModuleFile(opts);
        return moduleFile.analyzeFile(fileName)
            .then(function (info) {
                result[info.name] = info;

                return result;
            });
    }, {});
};

ES6ModuleFile.validateImports = function (files, opts) {
    opts = _.defaults(opts || {}, ES6ModuleFile.ValidateDefaults);

    return ES6ModuleFile.analyzeFiles(files, opts).then(function (infos) {
        // Add white listed modules to infos
        _.each(opts.whitelist, function (exportNames, name) {
            infos[name] = {
                name: name,
                filePath: name,
                imports: [],
                exports: _.map(exportNames, function (exportName) {
                        return {
                            name: exportName
                        };
                    })
            };
        });

        var errorsFound = _.reduce(infos, function (errors, info, name) {
            _.each(info.imports, function (imp) {
                if (!infos[imp.from]) {
                    errors.push({
                        name: info.name,
                        filePath: info.filePath,
                        message: 'Cannot find module "' + imp.from + '"'
                    });
                } else if (!_.contains(_.pluck(infos[imp.from].exports, 'name'), imp.name)) {
                    errors.push({
                        name: info.name,
                        filePath: info.filePath,
                        message: 'Cannot find "' + imp.name + '" export for "' + imp.from + '"'
                    });
                }
            });

            return errors;
        }, []);

        if (errorsFound.length) {
            return Promise.reject(errorsFound);
        }

        return Promise.resolve(infos);
    });
};

module.exports = ES6ModuleFile;