import { config } from "dotenv";
config();

import express from "express";
import { createServer, Server as HttpServer } from "http";

import { env } from "./config/globals";
import { logger } from "./config/logger";

import { Server } from "./api/server";

(async function main() {
  try {
    const app: express.Application = new Server().app;
    const server: HttpServer = createServer(app);

    server.listen(env.PORT);

    server.on("listening", () => {
      logger.info(
        `Carezy node server is listening on port ${env.PORT} in ${env.NODE_ENV} mode`
      );
    });

    server.on("close", async () => {
      logger.info("Carezy node server closed");
    });
  } catch (err) {
    logger.error(err.stack);
  }
})();
