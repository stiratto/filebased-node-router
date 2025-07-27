import { RequestWithPrototype } from "@/lib/request"
import { defineProps } from "@/lib/utils"

export const props = defineProps({
	bubble: true,
	registerBefore: "m1"
})

export const main = (req: RequestWithPrototype, res, next) => {
	console.log('middleware on getId/middlewares')
	next()
}

