const http = require('http');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: chunks, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  try {
    console.log('Registering test user...');
    const reg = await post('/api/auth/citizen/register', { fullName: 'Test User', email: 'testuser@example.com', phone: '9876543210', password: 'Password123' });
    console.log('Register:', reg.status, reg.body);

    console.log('Logging in...');
    const login = await post('/api/auth/citizen/login', { email: 'testuser@example.com', password: 'Password123' });
    console.log('Login status:', login.status);
    console.log('Login response headers:', login.headers);
    console.log('Login response body:', login.body);
    const loginData = JSON.parse(login.body || '{}');
    const token = loginData.token;
    if (!token) {
      console.error('No token returned; cannot continue.');
      process.exit(1);
    }

    console.log('Submitting FIR...');
    const fir = {
      fullName: 'Test User',
      fatherName: 'Father',
      age: '30',
      gender: 'Male',
      phone: '9876543210',
      email: 'testuser@example.com',
      incidentType: 'Theft/Burglary',
      incidentDate: new Date().toISOString().split('T')[0],
      incidentLocation: 'Test Location',
      incidentDescription: 'This is a test FIR submitted by automated script to validate backend.'
    };

    const submit = await post('/api/uploadFIR', fir, token);
    console.log('UploadFIR:', submit.status, submit.body);

  } catch (e) {
    console.error('Error:', e.message || e);
  }
})();
