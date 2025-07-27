import { defineProps } from "@/lib/utils";

export const props = defineProps({
	bubble: true
})

export const main = (req, res, next) => {
	console.log("middleware on :id")
	next()
}
