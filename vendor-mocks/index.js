const express = require('express');
const app = express();
app.use(express.json());

app.post('/sync', (req, res) => {
  const result = { name: req.body.name, info: "Processed sync", ssn: "123-45-6789" };
  res.json(result);
});

app.post('/async', (req, res) => {
  const callback = req.body.callback_url;
  setTimeout(() => {
    const result = { name: req.body.name, info: "Processed async", ssn: "999-99-9999" };
    require('axios').post(callback, result);
  }, 3000);
  res.send("Accepted");
});

app.listen(5000, () => console.log("Vendors running on port 5000"));