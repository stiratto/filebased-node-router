import type { RequestWithPrototype } from '@/lib/request';
import type { ResponseWithPrototype } from '@/lib/response';

const main = (req: RequestWithPrototype, res: ResponseWithPrototype) => {
  req.testField = '';
  return { req, res };
};

export { main };
