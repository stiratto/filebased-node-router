import { Controller } from "@/lib/interfaces";

const main: Controller['handler'] = (req, res) => {
	console.log(req?.params)
	console.log('pene')
	return { status: 200, data: req?.params }
}

export default {
	main
}
