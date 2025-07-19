import { Parser } from "@/lib/parser";

export const props = { registerBefore: "*" }

export const main = async (req, res, next) => {
	const parsers = ['json', 'multipart']
	// parse the body if it's post method
	if (req.method === 'POST') {

		req.body = null;
		const parser = new Parser(req, res, parsers);
		await parser.init(req, res);
		console.log(req.body)
	}

	next()
}
