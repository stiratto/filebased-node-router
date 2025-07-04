import { type ServerResponse } from 'http';
import type { RequestWithPrototype } from '@/lib/request';

const index = (req: RequestWithPrototype, res: ServerResponse) => {
  const id = crypto.randomUUID();

  const response = {
    id,
  };

  return { status: 200, data: response };
};

export default {
  index,
};
