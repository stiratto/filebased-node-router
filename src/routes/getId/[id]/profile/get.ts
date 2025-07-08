const main = (req, _) => {
	console.log(req.params)

	return { status: 200, data: `${req.params.id}/profile` }
}

export default {
	main
}
