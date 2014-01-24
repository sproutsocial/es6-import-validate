'use strict';

var path = require('path');

var ES6ModuleFile = require('../lib/ES6ModuleFile'),
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
                should.exist(info.imports);
                should.exist(info.exports);

                info.name.should.equal('baz');

                info.filePath.should.equal(path.join(file.opts.cwd, 'baz.js'));

                info.imports.length.should.equal(2);
                info.imports[0].name.should.equal('missing');
                info.imports[0].from.should.equal('foo');

                info.imports[1].name.should.equal('bar');
                info.imports[1].from.should.equal('bar');

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

                result.foo.imports.length.should.equal(0);
                result.foo.exports.length.should.equal(1);

                result.bar.imports.length.should.equal(1);
                result.bar.exports.length.should.equal(2);

                result.baz.imports.length.should.equal(2);
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

        ES6ModuleFile.validateImports(files, { cwd: cwd })
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

        ES6ModuleFile.validateImports(files, { cwd: cwd })
            .then(function (result) {
                done(new Error('Should reject when errors are found'));
            })
            .catch(function (errors) {
                should.exist(errors);
                
                errors.length.should.equal(1);

                errors[0].name.should.equal('baz');
                errors[0].filePath.should.equal(files[2]);
                errors[0].message.should.equal('Cannot find "missing" export for "foo"');

                done();
            });
    });
});