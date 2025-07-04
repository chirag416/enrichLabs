import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  duration: '60s',
  vus: 200, // 200 virtual users
};

export default function () {
  const url = 'http://localhost:3000/jobs';

  // 50% POST, 50% GET
  if (Math.random() < 0.5) {
    let payload = JSON.stringify({ name: "Test User " + Math.random() });
    let headers = { 'Content-Type': 'application/json' };
    let res = http.post(url, payload, { headers: headers });
    check(res, {
      'POST successful': (r) => r.status === 200,
    });
  } else {
    // Replace with real or dummy IDs if needed
    let res = http.get(`${url}/dummy-id`);
    check(res, {
      'GET response valid': (r) => r.status === 200 || r.status === 404,
    });
  }

  sleep(0.1);
}
