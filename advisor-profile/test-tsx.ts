import { POST } from './app/api/chat/route';

async function main() {
  const req = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
  });
  
  try {
    const res = await POST(req);
    console.log('STATUS:', res.status);
    console.log('BODY:', await res.text());
  } catch (err) {
    console.error('CAUGHT ERROR:', err);
  }
}
main();
