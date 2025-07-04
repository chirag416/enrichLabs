const redis = require('redis');
const { MongoClient } = require('mongodb');
const axios = require('axios');

const redisClient = redis.createClient({ url: 'redis://redis:6379' });
const mongoClient = new MongoClient('mongodb://mongo:27017');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connect() {
  await redisClient.connect();
  await mongoClient.connect();
  console.log('✅ Worker connected to Redis & Mongo');
}

async function startWorker() {
  const db = mongoClient.db('jobs');
  const collection = db.collection('requests');

  while (true) {
    try {
      const streams = await redisClient.xRead(
        [{ key: 'jobs', id: '0' }],  // Reads from beginning; for production use '>'
        { block: 5000, count: 1 }
      );

      if (!streams) continue;

      for (const stream of streams) {
        for (const msg of stream.messages) {
          const job = msg.message;
          const payload = JSON.parse(job.payload);
          const request_id = job.request_id;

          console.log(`🔄 Processing job ${request_id}`);

          await collection.insertOne({
            request_id,
            status: 'processing',
            payload,
            createdAt: new Date()
          });

          try {
            if (payload.vendor === 'sync') {
              const res = await axios.post('http://vendor-mocks:5000/sync', payload);
              const result = cleanResponse(res.data);

              await collection.updateOne(
                { request_id },
                { $set: { status: 'complete', result } }
              );
              console.log(`✅ Completed sync job ${request_id}`);
            } else if (payload.vendor === 'async') {
              await axios.post('http://vendor-mocks:5000/async', {
                ...payload,
                callback_url: `http://webhook:4000/vendor-webhook/async/${request_id}`
              });
              console.log(`⏳ Waiting for async vendor response for ${request_id}`);
            }

          } catch (err) {
            console.error(`❌ Vendor call failed for ${request_id}:`, err.message);
            await collection.updateOne(
              { request_id },
              { $set: { status: 'failed', error: err.message } }
            );
          }

          await delay(1000); // ✅ Rate-limit 1 job per second
        }
      }

    } catch (err) {
      console.error('🔥 Worker error:', err.message);
      await delay(2000);
    }
  }
}

function cleanResponse(data) {
  delete data.ssn;
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      data[key] = data[key].trim();
    }
  });
  return data;
}

connect().then(startWorker).catch(err => {
  console.error('❌ Failed to connect:', err.message);
});
