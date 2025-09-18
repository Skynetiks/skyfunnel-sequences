import amqlib from "amqplib";
import { env } from "../config/env";
import { logger } from "./logger";

class RabbitMQ {
  url: string;
  connection: amqlib.ChannelModel | null;
  channel: amqlib.Channel | null;
  maxRetries = 3; // configurable

  constructor() {
    this.url = env.RABBIT_MQ_URL;
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    if (!this.connection) {
      this.connection = await amqlib.connect(this.url);
    }

    if (!this.connection) {
      throw new Error("Failed to connect to RabbitMQ");
    }

    if (!this.channel) {
      this.channel = await this.connection.createChannel();
    }

    if (!this.channel) {
      throw new Error("Failed to connect to RabbitMQ");
    }

    this.channel.prefetch(1);
  }

  async send(queue: string, message: unknown) {
    try {
      if (this.channel) {
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message), "utf-8"), { persistent: true });
      }
    } catch (error) {
      logger.error("Something Went Wrong While Publishing Message", { error });
    }
  }

  async consume(queue: string, callback: (message: amqlib.ConsumeMessage) => Promise<void>) {
    try {
      if (this.channel) {
        await this.channel.assertQueue(queue, { durable: true });

        this.channel.consume(
          queue,
          async (msg) => {
            if (!msg) {
              return;
            }

            try {
              await callback(msg);
              this.channel!.ack(msg);
            } catch {
              const retries = (msg.properties.headers?.["x-retries"] as number) || 0;

              if (retries < this.maxRetries) {
                logger.warn(`Retrying message from ${queue}, attempt ${retries + 1}`);

                this.channel!.sendToQueue(queue, msg.content, {
                  persistent: true,
                  headers: { "x-retries": retries + 1 },
                });

                this.channel!.ack(msg);
              } else {
                logger.error(`Message from ${queue} failed after ${this.maxRetries} attempts, sending to DLQ`);

                this.channel!.reject(msg, false);
              }
            }
          },
          { noAck: false },
        );
      }
    } catch (error) {
      logger.error("Something Went Wrong While Consuming Message", { error });
    }
  }
}

class RabbitMQService {
  static instance: RabbitMQ | null = null;
  static async getInstance() {
    if (!RabbitMQService.instance) {
      const instance = new RabbitMQ();
      await instance.connect();
      RabbitMQService.instance = instance;
    }
    return RabbitMQService.instance;
  }
}

export { RabbitMQService };
