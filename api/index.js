const express = require('express');
const { v4: uuidv4 } = require('uuid');
const redis = require('redis');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.json());

const redisClient = redis.createClient({ url: 'redis://redis:6379' });

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
})();

app.post('/jobs', async (req, res) => {
  try {
    const request_id = uuidv4();

    const job = {
      request_id,
      payload: JSON.stringify(req.body),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await redisClient.xAdd('jobs', '*', {
      request_id: job.request_id,
      payload: job.payload,
      status: job.status,
      createdAt: job.createdAt
    });

    res.json({ request_id });

  } catch (err) {
    console.error("POST /jobs failed:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/jobs/:id', async (req, res) => {
  const mongo = new MongoClient('mongodb://mongo:27017');
  await mongo.connect();
  const db = mongo.db('jobs');
  const job = await db.collection('requests').findOne({ request_id: req.params.id });
  if (!job) return res.status(404).json({ error: "Not found" });
  if (job.status === 'complete') {
    res.json({ status: 'complete', result: job.result });
  } else {
    res.json({ status: job.status });
  }
});

app.listen(3000, '0.0.0.0', () => console.log("API listening on port 3000"));
