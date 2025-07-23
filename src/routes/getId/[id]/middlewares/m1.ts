import { RequestWithPrototype } from "@/lib/request"

export const props = {}

export const main = (req: RequestWithPrototype, res, next) => {
	console.log('m1 on [id]/middlewares')
	req.body = {
		asd: 'asd'
	}

	next()
}
