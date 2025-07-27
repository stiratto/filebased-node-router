import type { RequestWithPrototype } from '@/lib/request';
import { defineProps } from '@/lib/utils';

export const props = defineProps({
	bubble: true,
})

const main = (req: RequestWithPrototype, res, next) => {
	console.log('m2')
	next()
};

export { main };

