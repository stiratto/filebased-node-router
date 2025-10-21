import { RequestWithPrototype } from "@/lib/request"
import { defineMiddlewareProps } from "@/lib/utils"

export const props = defineMiddlewareProps({
	bubble: true,
	registerBefore: "m1"
})

export const main = (req: RequestWithPrototype, res, next) => {
	console.log('middleware on getId/middlewares')
	next()
}

