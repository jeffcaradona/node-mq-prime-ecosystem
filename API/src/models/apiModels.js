/*
 * apiModels.js
 *
 * Summary:
 * --------
 * This module provides utility functions for generating application-specific models.
 * It now includes:
 *
 * 1. generateRecords(count): Generates an array of record objects. Each record looks like:
 *      { "id": <record id>, "value": <number as a string> }
 *    with sequential ids (starting at 1) and a random number between 1 and 1,000,000.
 *
 * 2. initializeRecords(count): Generates records and populates the Redis database with them
 *    by calling the populateRecords() helper from db.js.
 *
 * Annotated Sections:
 * -------------------
 * - generateRecords(count): Loops from 1 to count, generating each record with a sequential id and a random value.
 * - initializeRecords(count): Calls generateRecords() to create the records, then calls populateRecords() to write them into Redis.
 */

import { populateRecords, getRecord } from "./db.js";

/**
 * generateRecords
 * ----------------
 * Generates an array of record objects.
 *
 * @param {number} count - The number of records to generate.
 * @returns {Array<Object>} An array of records in the format:
 *                          { "id": <record id>, "value": <number as a string> }
 */
export function generateRecords(count) {
  const records = [];
  for (let i = 1; i <= count; i++) {
    // Generate a random integer between 1 and 1,000,000.
    const randomNumber = BigInt(Math.floor(Math.random() * 1000000) + 1);
    records.push({
      id: i,
      value: randomNumber.toString(), // Store the value as a string
    });
  }
  return records;
}

/**
 * initializeRecords
 * -----------------
 * Generates the specified number of records and populates the Redis database with them.
 *
 * @param {number} count - The number of records to generate.
 * @returns {Promise<Array<Object>>} A promise that resolves to the generated records once they have been populated.
 */
export async function initializeRecords(count) {
  console.log(`Generating ${count} records...`);
  const records = generateRecords(count);

  console.log("Populating Redis with records...");
  await populateRecords(records);
  console.log(`Successfully added ${records.length} records to Redis.`);

  // --- Debug section: Retrieve and log the top 10 records ---
  console.log("DEBUG: Retrieving top 10 records for verification...");
  const topRecords = [];
  for (let i = 1; i <= 10; i++) {
    const record = await getRecord(i);
    if (record) {
      topRecords.push(record);
    }
  }
  console.log("Top 10 records:", topRecords);
  return records;
}
