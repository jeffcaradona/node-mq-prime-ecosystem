import { Router } from "express";
import { getAllRecords } from '../models/redis.js';
import { putRecordMessage } from '../models/mq.js';

const router = Router();

// Simple health-check route.
router.get('/', (req, res) => {
  res.send('Hello! API is running.');
});

// Route to retrieve all records from Redis.
router.get('/records', async (req, res) => {
  try {
    const records = await getAllRecords();
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to send all records to the IBM MQ queue.
router.get('/spamrecords', async (req, res) => {
  try {
    const records = await getAllRecords();
    const mqConn = req.app.locals.mqConn;
    if (!mqConn) {
      return res.status(500).json({ error: 'IBM MQ connection not available' });
    }
    await Promise.all(
      records.map(record => putRecordMessage(mqConn, record))
    );
    res.json({ message: `Sent ${records.length} records to QM1.` });
  } catch (error) {
    console.error('Error in /spamrecords route:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;