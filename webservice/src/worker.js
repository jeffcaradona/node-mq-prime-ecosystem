import { connectToQueueManager, openQueue, disconnect } from './mqConnection.mjs';

const qMgr = 'QM1';
const queueName = 'DEV.QUEUE.1';

async function startConsumer() {
  try {
    const hConn = await connectToQueueManager(qMgr);
    console.log(`Connected to ${qMgr}`);
    const hObj = await openQueue(hConn, queueName);
    console.log(`Opened queue ${queueName}`);

    // ... your message retrieval and processing logic goes here ...

    // When done, disconnect:
    await disconnect(hConn);
    console.log('Disconnected from MQ.');
  } catch (err) {
    console.error('MQ operation error:', err);
  }
}

startConsumer();