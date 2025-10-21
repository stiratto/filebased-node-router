import Parser from "#/parsers/index";
import { defineMiddlewareProps } from "@/lib/utils"

export const props = defineMiddlewareProps({
	bubble: true
})

export const main = async (req, res, next) => {
	console.log("parser middleware global")
	const parsers = ['json', 'multipart']
	// parse the body if it's post method
	if (req.method === 'POST') {

		req.body = null;
		const parser = new Parser(req, res, parsers);
		await parser.init(req, res);
	}

	next()
}
