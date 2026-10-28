import { startProducer } from "./producer";

const DEFAULT_PORT = 5176;
const port = Number(process.env.LAB_PRODUCER_PORT ?? DEFAULT_PORT);

startProducer({ port }).then((producer) => {
  process.stdout.write(`agui-activity-lab producer listening on ${producer.url}\n`);
});
