import { logger } from "../../utils";

while (true) {
  logger.info("Running......");
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
