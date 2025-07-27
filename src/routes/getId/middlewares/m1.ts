import { RequestWithPrototype } from "@/lib/request"
import { defineProps } from "@/lib/utils"

export const props = defineProps({
	bubble: true,
})

export const main = (req: RequestWithPrototype, res, next) => {
	console.log('middleware1 on getId/middlewares')
	next()
}


