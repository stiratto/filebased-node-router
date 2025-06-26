import { RequestWithPrototype } from '@/lib/request'
import { IncomingMessage, ServerResponse } from 'http'
//

const index = (req: RequestWithPrototype, res: ServerResponse) => {
  let id = crypto.randomUUID()

  let response = {
    id,
  }

  return { status: 200, data: response }
}

export default {
  index,
}
