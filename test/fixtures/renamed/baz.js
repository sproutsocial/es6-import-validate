
import { missing } from 'appkit/foo';
import { bar } from 'appkit/bar';

var bim = {
	property: true
};

export var baz = bim;

export { bim };

export default { bim: bim, baz: baz };