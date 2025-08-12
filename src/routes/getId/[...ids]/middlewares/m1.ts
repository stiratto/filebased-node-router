export const main = (req, res, next) => {
  console.log("middleware on [...ids]")
  next()
}
