import type { RequestWithPrototype } from '@/lib/request';

export const props = { prop1: 'asd', prop2: 'asd2' }

const main = (req: RequestWithPrototype, res, next) => {
	console.log('m2')
	next()
};

export { main };

