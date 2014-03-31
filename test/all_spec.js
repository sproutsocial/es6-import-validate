'use strict';

var path = require('path');

var ES6ModuleFile = require('../lib/ES6ModuleFile'),
    _ = require('lodash-node'),
    should = require('should'),
    sinon = require('sinon');

describe('ES6ModuleFile', function () {
    it('takes options', function () {
        var file = new ES6ModuleFile({ test: true });

        file.opts.test.should.equal(true);
    });

    it('reads a file and returns imports/exports info', function (done) {
        var file = new ES6ModuleFile({
            cwd: path.join(__dirname, 'fixtures')
        });

        file.analyzeFile(path.join(__dirname, 'fixtures', 'baz.js'))
            .then(function (info) {
                should.exist(info.name);
                should.exist(info.contents);
                should.exist(info.syntax);
                should.exist(info.imports);
                should.exist(info.exports);

                info.name.should.equal('baz');

                info.filePath.should.equal(path.join(file.opts.cwd, 'baz.js'));

                info.imports.length.should.equal(3);
                info.imports[0].name.should.equal('missing');
                info.imports[0].from.should.equal('foo');

                info.imports[1].name.should.equal('bar');
                info.imports[1].from.should.equal('bar');

                info.imports[2].name.should.equal('default');
                info.imports[2].from.should.equal('notfound');

                info.exports.length.should.equal(3);
                info.exports[0].name.should.equal('baz');
                info.exports[1].name.should.equal('bim');
                info.exports[2].name.should.equal('default');

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('reads a file and returns imports/exports info with named function exports', function (done) {
        var file = new ES6ModuleFile({
            cwd: path.join(__dirname, 'fixtures')
        });

        file.analyzeFile(path.join(__dirname, 'fixtures', 'foo.js'))
            .then(function (info) {
                should.exist(info.name);
                should.exist(info.contents);
                should.exist(info.syntax);
                should.exist(info.imports);
                should.exist(info.exports);

                info.name.should.equal('foo');

                info.filePath.should.equal(path.join(file.opts.cwd, 'foo.js'));

                info.imports.length.should.equal(1);
                
                info.exports.length.should.equal(2);
                info.exports[0].name.should.equal('namedFoo');
                info.exports[1].name.should.equal('default');

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('allows passing a white list for modules', function (done) {
        var file = new ES6ModuleFile({
            cwd: path.join(__dirname, 'fixtures')
        });

        file.analyzeFile(path.join(__dirname, 'fixtures', 'foo.js'))
            .then(function (info) {
                should.exist(info.name);
                should.exist(info.contents);
                should.exist(info.syntax);
                should.exist(info.imports);
                should.exist(info.exports);

                info.name.should.equal('foo');

                info.filePath.should.equal(path.join(file.opts.cwd, 'foo.js'));

                info.imports.length.should.equal(1);
                info.imports[0].name.should.equal('default');
                
                info.exports.length.should.equal(2);
                info.exports[0].name.should.equal('namedFoo');
                info.exports[1].name.should.equal('default');

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('takes a list of files and analyzes them in bulk', function (done) {
        var cwd = path.join(__dirname, 'fixtures'),
            files = [
                path.join(cwd, 'foo.js'),
                path.join(cwd, 'bar.js'),
                path.join(cwd, 'baz.js')
            ];

        ES6ModuleFile.analyzeFiles(files, { cwd: cwd })
            .then(function (result) {
                should.exist(result);
                should.exist(result.foo);
                should.exist(result.bar);
                should.exist(result.baz);

                result.foo.imports.length.should.equal(1);
                result.foo.exports.length.should.equal(2);

                result.bar.imports.length.should.equal(1);
                result.bar.exports.length.should.equal(2);

                result.baz.imports.length.should.equal(3);
                result.baz.exports.length.should.equal(3);

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('validates import statements for a group of files', function (done) {
        var cwd = path.join(__dirname, 'fixtures'),
            files = [
                path.join(cwd, 'foo.js'),
                path.join(cwd, 'bar.js')
            ];

        ES6ModuleFile.validateImports(files, { 
                cwd: cwd,
                whitelist: {
                    resolver: ['default']
                }
            })
            .then(function (result) {
                should.exist(result);
                should.exist(result.foo);
                should.exist(result.bar);

                done();
            })
            .catch(function (err) {
                done(err);
            });
    });

    it('gives errors for each invalid import it finds', function (done) {
        var cwd = path.join(__dirname, 'fixtures'),
            files = [
                path.join(cwd, 'foo.js'),
                path.join(cwd, 'bar.js'),
                path.join(cwd, 'baz.js')
            ];

        ES6ModuleFile.validateImports(files, { 
                cwd: cwd,
                whitelist: {
                    resolver: ['default']
                }
            })
            .then(function (result) {
                done(new Error('Should reject when errors are found'));
            })
            .catch(function (errors) {
                should.exist(errors);
                
                errors.length.should.equal(2);

                errors[0].name.should.equal('baz');
                errors[0].filePath.should.equal(files[2]);
                errors[0].message.should.equal('Cannot find "missing" export for "foo"');

                errors[1].message.should.equal('Cannot find module "notfound"');

                done();
            });
    });

    it('allows you to override module names', function (done) {
        var cwd = path.join(__dirname, 'fixtures', 'renamed'),
            files = [
                path.join(cwd, 'foo.js'),
                path.join(cwd, 'bar.js'),
                path.join(cwd, 'nested', 'thing.js')
            ],
            RenamedES6ModuleFile = function () {
                ES6ModuleFile.apply(this, _.toArray(arguments));
            };

        RenamedES6ModuleFile.prototype = Object.create(ES6ModuleFile.prototype);

        RenamedES6ModuleFile.prototype.getModuleName = function (filePath) {
            var origName = ES6ModuleFile.prototype.getModuleName.apply(this, _.toArray(arguments));

            return 'appkit/' + origName;
        };

        ES6ModuleFile.validateImports(files, { 
                cwd: cwd,
                ES6ModuleFile: RenamedES6ModuleFile
            })
            .then(function (result) {
                should.exist(result);
                should.exist(result['appkit/foo']);
                should.exist(result['appkit/bar']);
                should.exist(result['appkit/nested/thing']);

                done();
            })
            .catch(function (err) {
                console.log(err);
                done(err);
            });
    });

    it('handles windows backslashes in paths', function (done) {
        // via https://github.com/stefanpenner/ember-app-kit/issues/525
        var cwd = path.join(__dirname, 'fixtures', 'renamed'),
            files = [
                path.join(cwd, 'foo.js'),
                path.join(cwd, 'bar.js'),
                path.join(cwd, 'nested', 'thing.js')
            ],
            RenamedES6ModuleFile = function () {
                ES6ModuleFile.apply(this, _.toArray(arguments));
            };

        RenamedES6ModuleFile.prototype = Object.create(ES6ModuleFile.prototype);

        RenamedES6ModuleFile.prototype.getModuleName = function (filePath) {
            var origName = ES6ModuleFile.prototype.getModuleName.apply(this, _.toArray(arguments));

            return 'appkit/' + origName;
        };

        RenamedES6ModuleFile.prototype.getNameFromPath = function (filePath) {
            // Change file paths to use backslashes
            return ES6ModuleFile.prototype.getNameFromPath.call(this, filePath).replace(/\//g, '\\');
        };

        ES6ModuleFile.validateImports(files, { 
                cwd: cwd,
                ES6ModuleFile: RenamedES6ModuleFile
            })
            .then(function (result) {
                should.exist(result);
                should.exist(result['appkit/foo']);
                should.exist(result['appkit/bar']);
                should.exist(result['appkit/nested/thing']);

                done();
            })
            .catch(function (err) {
                console.log(err);
                done(err);
            });
    });

    it('handles relative paths', function (done) {
        var cwd = path.join(__dirname, 'fixtures', 'relative'),
            files = [
                path.join(cwd, 'some', 'module1.js'),
                path.join(cwd, 'other', 'module2.js'),
                path.join(cwd, 'more', 'module3.js'),
                path.join(cwd, 'more', 'module4.js')
            ];

        ES6ModuleFile.validateImports(files, { 
                cwd: cwd
            })
            .then(function (result) {
                should.exist(result);
                should.exist(result['some/module1']);
                should.exist(result['other/module2']);
                should.exist(result['more/module3']);
                should.exist(result['more/module4']);

                result['some/module1'].imports.length.should.equal(2);
                result['some/module1'].imports[0].from.should.equal('other/module2');

                result['other/module2'].imports.length.should.equal(1);
                result['other/module2'].imports[0].from.should.equal('more/module4');

                result['more/module3'].imports.length.should.equal(1);
                result['more/module3'].imports[0].from.should.equal('more/module4');

                result['more/module4'].imports.length.should.equal(0);

                done();
            })
            .catch(function (err) {
                console.log(err);
                done(err);
            });
    });
});