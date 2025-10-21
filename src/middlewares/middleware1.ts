import type { RequestWithPrototype } from '@/lib/request';
import { ResponseWithPrototype } from '@/lib/response';
import { defineMiddlewareProps } from '@/lib/utils';

export const props = defineMiddlewareProps({
  bubble: false,
})

const main = (req: RequestWithPrototype, res: ResponseWithPrototype, next) => {
  console.log('m1')
  next()
};

export { main };
