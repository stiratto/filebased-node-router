export const pad = (n: number) => {
  return n < 10 ? '0' + n : n.toString()
}
