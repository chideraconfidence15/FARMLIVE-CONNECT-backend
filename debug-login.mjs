import './server.js';
setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chideraconfidence15@gmail.com', password: 'Dera4394@' })
    });
    const text = await res.text();
    console.log('STATUS', res.status, res.statusText);
    console.log(text);
    process.exit(0);
  } catch (err) {
    console.error('FETCH_ERR');
    console.error(err);
    process.exit(1);
  }
}, 2000);
