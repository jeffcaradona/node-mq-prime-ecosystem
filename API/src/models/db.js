/*
 * db.js
 *
 * Summary:
 * --------
 * This module abstracts the Redis I/O for our API. It:
 *   - Connects to Redis using the official redis client.
 *   - Provides helper functions to store, retrieve, and bulk‑populate
 *     records. Each record is stored as a JSON string under a key formatted
 *     as "record:<id>".
 *
 * Annotated Sections:
 * -------------------
 * 1. Connection Setup: Uses the redis package to create and connect a client.
 * 2. Helper Functions:
 *      - setRecord(record): Stores a single record.
 *      - getRecord(id): Retrieves a record by id.
 *      - getAllRecords(): Retrieves all records (matching key "record:*").
 *      - populateRecords(records): Bulk‑populates the database with an array
 *        of records.
 * 3. Exports: The module exports these helper functions (and the client if needed).
 *
 * Note: Top‑level await is used, so ensure Node.js v14+ and `"type": "module"`
 * is set in your package.json.
 */

import { createClient } from 'redis';

// Read connection settings from environment or use defaults.
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'appIsSecure';

// Build the Redis URL. (The official image uses a password via the --requirepass option.)
const redisUrl = `redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}`;

// Create a Redis client.
const client = createClient({
  url: redisUrl,
});

// Attach event listeners.
client.on('error', (err) => {
    console.error('Redis Client Error', err);
  });
  
  client.on('ready', () => {
    console.log('Redis client is ready and connected.');
  });

// Attach an error handler.
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Connect to Redis (top-level await works in Node.js modules)
await client.connect();
console.log('Connected to Redis');
await client.flushAll();
console.log('Redis cache flushed.');

// Helper function to store a record.
// Each record is expected to be an object with an "id" property.
export async function setRecord(record) {
  const key = `record:${record.id}`;
  await client.set(key, JSON.stringify(record));
  // Optionally, log success:
  // console.log(`Record ${record.id} stored.`);
}

// Helper function to get a record by its id.
export async function getRecord(id) {
  const key = `record:${id}`;
  const result = await client.get(key);
  return result ? JSON.parse(result) : null;
}

// Helper function to retrieve all records stored in Redis.
export async function getAllRecords() {
  const keys = await client.keys('record:*');
  const records = [];
  for (const key of keys) {
    const data = await client.get(key);
    if (data) {
      records.push(JSON.parse(data));
    }
  }
  return records;
}

// Bulk-populate Redis with an array of record objects.
export async function populateRecords(records) {
  for (const rec of records) {
    await setRecord(rec);
  }
  console.log(`${records.length} records have been populated in Redis.`);
}

// Export the client, in case you need lower-level access.
export { client };
