
import { missing } from 'foo';
import { bar } from 'bar';
import something from 'notfound';

var bim = {
	property: true
};

export var baz = bim;

export { bim };

export default { bim: bim, baz: baz };