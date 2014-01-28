
import { missing } from 'foo';
import { bar } from 'bar';

var bim = {
	property: true
};

export var baz = bim;

export { bim };

export default { bim: bim, baz: baz };