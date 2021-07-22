import { createClient, RedisClient } from "redis";
import { env } from "../config/globals";
import { logger } from "../config/logger";
import { promisify } from "util";

export const cacheClient: RedisClient = createClient({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
});

export const cacheGetAsync = promisify(cacheClient.get).bind(cacheClient);

cacheClient.on("ready", (message) => {
  logger.info("Redis Client is connected");
});

cacheClient.on("error", (error) => {
  logger.error("Error connecting to cache");
});
