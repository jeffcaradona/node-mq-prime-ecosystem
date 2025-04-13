/*
 * api.js
 *
 * Summary:
 * --------
 * This Express API server waits for three connections/actions to complete before starting:
 *
 *   1. Connect to the IBM MQ queue manager (QM1) using connectToQM1() from ./models/mq.js.
 *   2. Confirm the Redis connection by pinging the Redis client.
 *   3. Initialize the Redis database with a set number of random records by calling
 *      initializeRecords(x) from ./models/apiModels.js.
 *
 * Once all are done, the connections are attached to app.locals, and the server starts.
 * Routes are imported from ./routes/apiRoutes.js.
 */
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { connectToQM1 } from './models/mq.js'; // IBM MQ connection function
import { client as redisClient } from './models/redis.js'; // Redis client
import { initializeRecords } from './models/apiModels.js'; // Record generation and population function
import apiRoutes from './routes/apiRoutes.js'; // Import routes

const app = express();

// Middleware to parse JSON request bodies.
app.use(express.json());

// Use the routes from apiRoutes.js
app.use('/', apiRoutes);

// Wait for IBM MQ connection, Redis ping, and record initialization before starting the server.
Promise.all([
  connectToQM1().then(hConn => {
    console.log('Connected to QM1:', hConn);
    return hConn;
  }).catch(err => {
    console.error('Failed to connect to QM1:', err);
    throw err;
  }),
  Promise.resolve(redisClient.ping()),
  initializeRecords(1000)
])
  .then(([mqConn, redisPong, records]) => {
    console.log('IBM MQ connection confirmed:', mqConn);
    console.log('Redis ping response:', redisPong);
    console.log(`Initialized ${records.length} records in Redis.`);

    app.locals.mqConn = mqConn;
    app.locals.redis = redisClient;

    const PORT = process.env.API_PORT || 3102;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Error establishing connections or initializing records:", err);
  });
