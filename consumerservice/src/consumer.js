/*
 * consumer.js
 *
 * Summary:
 * --------
 * This consumer connects to the IBM MQ queue manager (QM1) and opens two queues:
 *   - DEV.QUEUE.1 (input): where it reads incoming JSON messages. Each message must contain:
 *         { "id": <record id>, "value": <number as a string> }
 *   - DEV.QUEUE.2 (output): where it posts a response JSON after processing.
 *
 * For each message from DEV.QUEUE.1, the consumer:
 *   1. Parses the JSON.
 *   2. Converts "value" to a BigInt.
 *   3. Runs the Miller–Rabin test to check for primality.
 *   4. Sends a response JSON to DEV.QUEUE.2 with { id, value, prime }.
 *
 * Annotated Sections:
 * -------------------
 * 1. Connection Setup: Reads environment variables and creates MQCD/MQCSP objects.
 * 2. Queue Open:
 *      - Input Queue (DEV.QUEUE.1) is opened for getting messages.
 *      - Output Queue (DEV.QUEUE.2) is opened for posting responses.
 * 3. Polling Loop: Retrieves messages from DEV.QUEUE.1 using a 1024-byte buffer.
 * 4. Message Processing: Parses the JSON message, computes the prime flag, and calls sendResponse().
 * 5. Response Posting: sendResponse() serializes the response object and posts it to DEV.QUEUE.2.
 * 6. Utility Functions: Contains the Miller–Rabin test and modular exponentiation.
 */
import dotenv from 'dotenv'; // Import dotenv to handle .env files

dotenv.config(); // Load environment variables from .env file

console.info(process.env)
import * as mq from 'ibmmq';  // IBM MQ client library
const MQC = mq.MQC;           // IBM MQ constants

// Define the target queue manager and queue names.
const qMgr = process.env.MQ_QMGR || 'QM1';
const inputQueueName = process.env.MQ_INPUT_QUEUE ||'DEV.QUEUE.1'; // Receives Messages sent from the API
const outputQueueName = process.env.MQ_OUTPUT_QUEUE ||'DEV.QUEUE.2'; //Sends responses to API

// Global variable to hold the output queue handle.
let outQueueHandle;

/**
 * processMessage
 * ---------------
 * Processes a JSON message from DEV.QUEUE.1.
 * The message should include "id" and "value" properties.
 * It converts "value" to a BigInt, checks for primality, and sends a response
 * (with the id, original value, and prime flag) to DEV.QUEUE.2.
 *
 * @param {Buffer} msg - The message content as a Buffer.
 */
function processMessage(msg) {
  console.log("Processing a message...");
  const msgText = msg.toString();
  try {
    const data = JSON.parse(msgText);
    if (!data.hasOwnProperty("id") || data.value === undefined) {
      console.error("Message JSON missing required fields:", msgText);
      return;
    }
    let value;
    try {
      value = BigInt(data.value);
    } catch (error) {
      console.error("Invalid value in message:", data.value);
      return;
    }
    const isPrime = millerRabin(value, 5);
    console.log(`Record ${data.id} with value ${value.toString()} is ${isPrime ? 'prime' : 'not prime'}.`);
    
    // Create the response object.
    const response = {
      id: data.id,
      value: data.value,
      prime: isPrime
    };
    // Post the response to the output queue.
    sendResponse(response);
  } catch (err) {
    console.error("Error parsing JSON:", err, msgText);
  }
}

/**
 * sendResponse
 * -------------
 * Serializes the response object as JSON and posts it to DEV.QUEUE.2.
 *
 * @param {Object} responseObj - The response containing { id, value, prime }.
 */
function sendResponse(responseObj) {
  const msgStr = JSON.stringify(responseObj);
  const buf = Buffer.from(msgStr);
  const mqmd = new mq.MQMD();
  const pmo = new mq.MQPMO();
  pmo.Options = MQC.MQPMO_NO_SYNCPOINT;
  if (!outQueueHandle) {
    console.error("Output queue handle is not available. Cannot send response.");
    return;
  }
  mq.PutSync(outQueueHandle, mqmd, pmo, buf, (err) => {
    if (err) {
      console.error("Error putting message to output queue:", err);
    } else {
      console.log(`Response sent to ${outputQueueName}: ${msgStr}`);
    }
  });
}

/**
 * millerRabin
 * ------------
 * Implements the Miller-Rabin probabilistic test to determine if a number is prime.
 *
 * @param {bigint} n - The number to test.
 * @param {number} k - The number of iterations for the test.
 * @returns {boolean} - True if n is probably prime, false otherwise.
 */
function millerRabin(n, k) {
  if (n === 2n || n === 3n) return true;
  if (n < 2n || n % 2n === 0n) return false;

  let s = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  WitnessLoop:
  for (let i = 0; i < k; i++) {
    const a = 2n + BigInt(Math.floor(Math.random() * Number(n - 4n)));
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    for (let r = 1n; r < s; r++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) continue WitnessLoop;
    }
    return false;
  }
  return true;
}

/**
 * modPow
 * -------
 * Computes (base^exponent) mod modulus using exponentiation by squaring.
 *
 * @param {bigint} base - The base number.
 * @param {bigint} exponent - The exponent.
 * @param {bigint} modulus - The modulus.
 * @returns {bigint} - The result of (base^exponent) mod modulus.
 */
function modPow(base, exponent, modulus) {
  if (modulus === 1n) return 0n;
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent / 2n;
    base = (base * base) % modulus;
  }
  return result;
}

/**
 * startConsumer
 * ---------------
 * Connects to QM1, opens both the input (DEV.QUEUE.1) and output (DEV.QUEUE.2) queues,
 * and begins polling for messages from the input queue. For each message, it processes
 * the JSON and posts the result to the output queue.
 */
function startConsumer() {
  console.log("Starting consumer...");

  // Create connection options and specify client binding.
  const cno = new mq.MQCNO();
  cno.Options = MQC.MQCNO_CLIENT_BINDING;

  // Set up connection details using an MQCD structure.
  const cd = new mq.MQCD();
  cd.ChannelName = process.env.MQ_CHANNEL || "DEV.APP.SVRCONN";
  cd.ConnectionName = process.env.MQ_CONNNAME || "localhost(1414)";
  cno.ClientConn = cd;

  // Set up security parameters using MQCSP.
  const csp = new mq.MQCSP();
  csp.UserId = process.env.MQ_USER || "app";
  csp.Password = process.env.MQ_PASSWORD || "appIsSecure";
  cno.SecurityParms = csp;

  // Connect asynchronously to the queue manager.
  mq.Connx(qMgr, cno, (err, hConn) => {
    if (err) {
      console.error("Error connecting to MQ:", err);
      console.log("Retrying connection in 5 seconds...");
      setTimeout(startConsumer, 5000); // Retry after 5 seconds
      return;
    }
    console.log(`Connected to queue manager ${qMgr}`);

    // --- Open the input queue (DEV.QUEUE.1) ---
    const odIn = new mq.MQOD();
    odIn.ObjectName = inputQueueName;
    odIn.ObjectType = MQC.MQOT_Q;
    const openOptionsIn = MQC.MQOO_INPUT_AS_Q_DEF | MQC.MQOO_OUTPUT;
    mq.Open(hConn, odIn, openOptionsIn, (err, hIn) => {
      if (err) {
        console.error("Error opening input queue:", err);
        mq.Disc(hConn, (discErr) => { if (discErr) console.error("Disconnect error:", discErr); });
        console.log("Retrying connection in 5 seconds...");
        setTimeout(startConsumer, 5000); // Retry after 5 seconds
        return;
      }
      console.log(`Input queue ${inputQueueName} opened.`);

      // --- Open the output queue (DEV.QUEUE.2) for posting responses ---
      const odOut = new mq.MQOD();
      odOut.ObjectName = outputQueueName;
      odOut.ObjectType = MQC.MQOT_Q;
      const openOptionsOut = MQC.MQOO_OUTPUT;
      mq.Open(hConn, odOut, openOptionsOut, (err, hOut) => {
        if (err) {
          console.error("Error opening output queue:", err);
          mq.Disc(hConn, (discErr) => { if (discErr) console.error("Disconnect error:", discErr); });
          console.log("Retrying connection in 5 seconds...");
          setTimeout(startConsumer, 5000); // Retry after 5 seconds
          return;
        }
        console.log(`Output queue ${outputQueueName} opened.`);
        outQueueHandle = hOut;  // Save the output queue handle for later use.

        // --- Start polling for messages from the input queue ---
        function getMessage() {
          console.log("Polling for a message...");
          const md = new mq.MQMD();
          const gmo = new mq.MQGMO();
          // Set options: wait up to 3 seconds and perform conversion.
          gmo.Options = MQC.MQGMO_WAIT | MQC.MQGMO_CONVERT;
          gmo.WaitInterval = 3000;
          const buf = Buffer.alloc(1024);
        
          mq.GetSync(hIn, md, gmo, buf, (err, len) => {
            if (err) {
              if (err.mqrc === MQC.MQRC_NO_MSG_AVAILABLE) {
                console.log("No message available. Polling again...");
                // Use setImmediate to schedule getMessage() after the stack clears.
                return setImmediate(getMessage);
              } else {
                console.error("Error getting message:", err);
                return;
              }
            }
            console.log(`Message received, length: ${len} bytes.`);
            const msgBuffer = buf.slice(0, len);
            processMessage(msgBuffer);
            // Again, schedule the next polling iteration with setImmediate.
            setImmediate(getMessage);
          });
        }
        // Begin polling for messages.
        getMessage();
      });
    });
  });
}

// Start the consumer service.
startConsumer();
