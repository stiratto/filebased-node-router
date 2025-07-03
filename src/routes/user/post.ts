import type { RequestWithPrototype } from '@/lib/request';
import type { ResponseWithPrototype } from '@/lib/response';

const main = (req: RequestWithPrototype, res: ResponseWithPrototype) => {
  const { name, password } = req.body;

  console.log(password);
  const connectedUsers = ['user1'];
  connectedUsers.push(name);
  return { status: 200, data: connectedUsers };
};

module.exports = {
  main,
};
