import { Ratelimit } from "@unkey/ratelimit";
import { env } from "@/env.mjs";

const limiter = new Ratelimit({
  namespace: "gemish",
  limit: 5,
  duration: "30s",
  rootKey: env.UNKEY_ROOT_KEY,
});

export default limiter;
