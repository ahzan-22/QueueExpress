const io = require('C:\\Users\\Lenovo\\Desktop\\Project\\QueueExpress\\apps\\web\\node_modules\\socket.io-client');

// First connect and subscribe
const socket = io('http://localhost:4000/queue', { 
  transports: ['websocket', 'polling'],
  timeout: 3000 
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('store:subscribe', { storeId: '6dda8911-2a6e-4f1e-aee5-84d10a29f5c5' });
  console.log('Subscribed to store');
});

socket.on('queue:called', (data) => {
  console.log('>>> queue:called received:', JSON.stringify(data, null, 2));
});

socket.on('display:refresh', (data) => {
  console.log('>>> display:refresh received:', JSON.stringify(data, null, 2));
});

socket.on('queue:created', (data) => {
  console.log('>>> queue:created received:', JSON.stringify(data, null, 2));
});

socket.on('connect_error', (err) => {
  console.log('connect_error:', err);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

// Wait a bit then trigger API events
setTimeout(() => {
  console.log('Triggering API events...');
}, 1000);