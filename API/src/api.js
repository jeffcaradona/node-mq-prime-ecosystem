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
 * A sample route (/records) is provided to retrieve all records from Redis.
 */

import express from 'express';                        // Import Express using ES6 style
import { connectToQM1,putRecordMessage  } from './models/mq.js';          // IBM MQ connection function
import { client as redisClient, getAllRecords } from './models/db.js';  // Redis client and helper
import { initializeRecords } from './models/apiModels.js';  // Record generation and population function

const app = express();

// Middleware to parse JSON request bodies.
app.use(express.json());

// Simple health-check route.
app.get('/', (req, res) => {
  res.send('Hello! API is running.');
});

// Example route to retrieve all records from Redis.
app.get('/records', async (req, res) => {
  try {
    const records = await getAllRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/spamrecords', async (req, res) => {
    try {
      const records = await getAllRecords(); // Get all records from Redis
  
      // Get the IBM MQ connection from app.locals.
      // (We assume that your connection has been attached during server initialization.)
      const mqConn = app.locals.mqConn;
      if (!mqConn) {
        return res.status(500).json({ error: 'IBM MQ connection not available' });
      }
  
      // For each record, send it as a message to the queue.
      // Use Promise.all to wait for all puts.
      await Promise.all(
        records.map(record => {
          return putRecordMessage(mqConn, record);
        })
      );
      res.json({ message: `Sent ${records.length} records to QM1.` });
    } catch (error) {
      console.error('Error in /records route:', error);
      res.status(500).json({ error: error.message });
    }
  });

// Wait for IBM MQ connection, Redis ping, and record initialization before starting the server.
Promise.all([
  // Connect to IBM MQ.
  connectToQM1().then(hConn => {
    console.log('Connected to QM1:', hConn);
    return hConn; // Return the MQ connection so it gets propagated.
  }).catch(err => {
    console.error('Failed to connect to QM1:', err);
    throw err;
  }),

  // Ping Redis to confirm connectivity.
  Promise.resolve(redisClient.ping()),

  // Generate and populate 1,000,000 records in Redis.
  // You can adjust the number of records as needed.
  initializeRecords(1000)
])
  .then(([mqConn, redisPong, records]) => {
    console.log('IBM MQ connection confirmed:', mqConn);
    console.log('Redis ping response:', redisPong); // Should be "PONG"
    console.log(`Initialized ${records.length} records in Redis.`);

    // Attach the connections and initialization result to app.locals.
    app.locals.mqConn = mqConn;
    app.locals.redis = redisClient;

    // Start the server.
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Error establishing connections or initializing records:", err);
  });
