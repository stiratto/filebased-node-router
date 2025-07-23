export const props = {
	bubble: false,
}

export const main = (req, res, next) => {
	console.log("at middleware in profile/")
	next()
}
