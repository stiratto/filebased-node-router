import { RequestWithPrototype } from "@/lib/request";

const main = (req: RequestWithPrototype) => {
  console.log(req.body)
  return { status: 200, data: "asdasd" }
};

export default {
  main
}
