setTimeout(() => {
  fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], intake: {} })
  }).then(async res => {
    console.log('STATUS:', res.status);
    console.log('HEADERS:', res.headers);
    const text = await res.text();
    console.log('BODY LENGTH:', text.length);
    console.log('BODY PREVIEW:', text.slice(0, 500));
  }).catch(console.error);
}, 2000); // Wait 2s for server to start
