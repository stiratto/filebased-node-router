import type { RequestWithPrototype } from '@/lib/request';
import { ResponseWithPrototype } from '@/lib/response';

export const props = { prop1: 'asd', prop2: 'asd2' }

const main = (req: RequestWithPrototype, res: ResponseWithPrototype, next) => {
  console.log('m1')
  next()
};

export { main };
