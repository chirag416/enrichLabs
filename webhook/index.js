const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
app.use(express.json());

const mongo = new MongoClient('mongodb://mongo:27017');

app.post('/vendor-webhook/:vendor/:id', async (req, res) => {
  await mongo.connect();
  const db = mongo.db('jobs');
  const collection = db.collection('requests');

  const cleaned = clean(req.body);
  await collection.updateOne({ request_id: req.params.id }, {
    $set: { status: 'complete', result: cleaned }
  });

  res.sendStatus(200);
});

function clean(data) {
  delete data.ssn;
  Object.keys(data).forEach(k => {
    if (typeof data[k] === 'string') data[k] = data[k].trim();
  });
  return data;
}

app.listen(4000, () => console.log("Webhook on 4000"));