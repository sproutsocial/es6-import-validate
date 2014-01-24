'use strict';

var fs = require('fs'),
    path = require('path');

var _ = require('lodash-node'),
    Promise = require('bluebird'),
    esprima = require('esprima');

var readFile = Promise.promisify(fs.readFile);

function ES6ModuleFile(opts) {
    this.opts = _.defaults(opts || {}, {
        extension: '.js',
        cwd: process.cwd()
    });
}

_.extend(ES6ModuleFile.prototype, {
    analyzeFile: function (filePath) {
        var self = this,
            name = path.relative(this.opts.cwd, filePath);

        name = path.join(path.dirname(name), path.basename(name, this.opts.extension));

        return readFile(filePath).then(function (contents) {
            return self.analyzeContents(contents, name, filePath);
        });
    },

    analyzeContents: function (contents, name, filePath) {
        var self = this;

        return this.getContentsSyntaxTree(contents).then(function (syntax) {
            var info = {
                name: name,
                filePath: filePath || name,
                imports: [],
                exports: []
            };

            return _.reduce(syntax.body, function (info, token) {
                if (token.type === 'ImportDeclaration') {
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
                } else if (token.type === 'ExportDeclaration') {
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
                        var decls = token.declaration.declarations || token.declaration;

                        _.each(decls, function (decl) {
                            info.exports.push({
                                name: decl.id.name
                            });
                        });
                    }
                }

                return info;
            }, info);
        });
    },

    getContentsSyntaxTree: function (contents) {
        return Promise.resolve(esprima.parse(contents));
    }
});

ES6ModuleFile.analyzeFiles = function (files, opts) {
    return Promise.reduce(files, function (result, fileName) {
        return new ES6ModuleFile(opts).analyzeFile(fileName).then(function (info) {
            result[info.name] = info;

            return result;
        });
    }, {});
};

ES6ModuleFile.validateImports = function (files, opts) {
    return ES6ModuleFile.analyzeFiles(files, opts).then(function (infos) {
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