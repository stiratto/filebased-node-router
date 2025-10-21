import { defineMiddlewareProps } from "@/lib/utils";

export const props = defineMiddlewareProps({
	bubble: true
})

export const main = (req, res, next) => {
	console.log("middleware on :id")
	next()
}
