fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], intake: {} })
}).then(async res => {
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
});
