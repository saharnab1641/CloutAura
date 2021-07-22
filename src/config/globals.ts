export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.NODE_PORT || process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/test",
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL || "localhost:4200",
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "passwordexample",
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: process.env.REDIS_PORT || "6379",
};
