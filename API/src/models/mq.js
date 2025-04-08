/*
 * ibmmqModels.js
 *
 * Summary:
 * --------
 * This module provides helper functions for interacting with IBM MQ.
 * Currently, it exports a function `connectToQM1()` that establishes a connection
 * to the queue manager (QM1) using environment variables. The connection is created
 * using the ibmmq Promise-based API.
 *
 * Environment Variables (with defaults if not set):
 *   MQ_QMGR         - Queue Manager name (default: "QM1")
 *   MQ_CHANNEL      - Connection channel (default: "DEV.APP.SVRCONN")
 *   MQ_CONNNAME     - Connection name in the format "hostname(port)" (default: "localhost(1414)")
 *   MQ_USER         - Authentication user (default: "app")
 *   MQ_PASSWORD     - Authentication password (default: "appIsSecure")
 *
 * Annotated Sections:
 * -------------------
 * 1. Import & Constants: Loads the ibmmq module and defines constants.
 * 2. Configuration: Reads connection settings from the environment with fallbacks.
 * 3. connectToQM1(): The exported function which constructs the MQ connection options,
 *    then connects using the Promise API and returns the resulting promise.
 */

import * as mq from 'ibmmq';  // Import the IBM MQ client library
const MQC = mq.MQC;           // IBM MQ constants

// Configuration: read IBM MQ settings from environment variables, with defaults
const mqQmgr     = process.env.MQ_QMGR     || "QM1";
const mqChannel  = process.env.MQ_CHANNEL  || "DEV.APP.SVRCONN";
const mqConnname = process.env.MQ_CONNNAME || "localhost(1414)";
const mqUser     = process.env.MQ_USER     || "app";
const mqPassword = process.env.MQ_PASSWORD || "appIsSecure";

/**
 * connectToQM1
 * -------------
 * Establishes a connection to the IBM MQ queue manager (QM1) using the Promise-based API.
 *
 * This function constructs an MQCNO (connection options) object configured for client binding,
 * sets up the connection details (MQCD) using the channel and connection name, and attaches
 * security parameters (MQCSP) for authentication.
 *
 * Returns:
 *   A Promise that resolves to the connection handle if successful.
 */
export function connectToQM1() {
  // Create and configure the connection options (MQCNO).
  const cno = new mq.MQCNO();
  // Specify client binding since we are connecting remotely.
  cno.Options = MQC.MQCNO_CLIENT_BINDING;

  // Create an MQCD (Client Connection Details) structure and set the channel and connection name.
  const cd = new mq.MQCD();
  cd.ChannelName = mqChannel;
  cd.ConnectionName = mqConnname;
  cno.ClientConn = cd;

  // Set up security parameters using MQCSP with the provided user and password.
  const csp = new mq.MQCSP();
  csp.UserId = mqUser;
  csp.Password = mqPassword;
  cno.SecurityParms = csp;

  // Use the Promise-based connection method to connect to the queue manager.
  return mq.ConnxPromise(mqQmgr, cno);
}


// This function assumes you have already established a connection and
// opened the input queue (for example, DEV.QUEUE.1). You can either create
// a new queue object each time or, more efficiently, reuse a previously opened queue.
// For simplicity, here we assume you are using a Promise-based put method.

export function putRecordMessage(mqConn, record) {
  // Construct an MQOD object for the queue.
  const od = new mq.MQOD();
  od.ObjectName = 'DEV.QUEUE.1';
  od.ObjectType = MQC.MQOT_Q;

  // Set the open options to put messages.
  const openOptions = MQC.MQOO_OUTPUT;

  // Open the queue. (You may want to cache the handle for efficiency.)
  return mq.OpenPromise(mqConn, od, openOptions)
    .then(hObj => {
      // Create an MQMD for the message.
      const mqmd = new mq.MQMD();
      // Use a PMO configured for a simple put.
      const pmo = new mq.MQPMO();
      pmo.Options = MQC.MQPMO_NO_SYNCPOINT | MQC.MQPMO_NEW_MSG_ID | MQC.MQPMO_NEW_CORREL_ID;
      
      // Convert the record object to JSON.
      const msgStr = JSON.stringify(record);
      
      // Put the message.
      return mq.PutPromise(hObj, mqmd, pmo, msgStr)
        .then(() => {
          // Close the output queue handle after the put (or you could choose to reuse it).
          return mq.ClosePromise(hObj, 0);
        });
    });
}