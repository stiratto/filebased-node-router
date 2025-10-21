import { RequestWithPrototype } from "@/lib/request"
import { defineMiddlewareProps } from "@/lib/utils"

export const props = defineMiddlewareProps({
	bubble: true,
})

export const main = (req: RequestWithPrototype, res, next) => {
	console.log('middleware1 on getId/middlewares')
	next()
}


