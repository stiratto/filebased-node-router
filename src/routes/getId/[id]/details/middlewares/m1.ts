import { defineMiddlewareProps } from "@/lib/utils";

export const props = defineMiddlewareProps({})

export const main = () => {
	console.log('middleware on details')
}
