es6-import-validate [![Build Status](https://travis-ci.org/sproutsocial/es6-import-validate.png?branch=master)](https://travis-ci.org/sproutsocial/es6-import-validate)
===================

A simple ES6 Harmony Module import statement validator.

### Example

Taken from the unit tests.

```javascript
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
```

### License

The MIT License (MIT)

Copyright (c) 2014 [Sprout Social](http://sproutsocial.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
