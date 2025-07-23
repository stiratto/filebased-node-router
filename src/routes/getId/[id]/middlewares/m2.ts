export const props = { registerBefore: "m1" }

export const main = (req, res, next) => {
	console.log('m2 on [id]/middlewares')
	next()
}

