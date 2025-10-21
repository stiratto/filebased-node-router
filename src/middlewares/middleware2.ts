import type { RequestWithPrototype } from '@/lib/request';
import { defineMiddlewareProps } from '@/lib/utils';

export const props = defineMiddlewareProps({
	bubble: true,
})

const main = (req: RequestWithPrototype, res, next) => {
	console.log('m2')
	next()
};

export { main };

