const io = require('C:\\Users\\Lenovo\\Desktop\\Project\\QueueExpress\\apps\\web\\node_modules\\socket.io-client');
const socket = io('http://localhost:4000/queue', { transports: ['websocket', 'polling'] });

let eventsReceived = [];

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('store:subscribe', { storeId: '6dda8911-2a6e-4f1e-aee5-84d10a29f5c5' });
  
  socket.on('queue:called', (data) => {
    console.log('queue:called received:', JSON.stringify(data, null, 2));
    eventsReceived.push({ name: 'queue:called', data });
  });
  
  socket.on('display:refresh', (data) => {
    console.log('display:refresh received:', JSON.stringify(data, null, 2));
    eventsReceived.push({ name: 'display:refresh', data });
  });
  
  socket.on('queue:created', (data) => {
    console.log('queue:created received:', JSON.stringify(data, null, 2));
    eventsReceived.push({ name: 'queue:created', data });
  });
  
  socket.on('connect_error', (err) => {
    console.log('connect_error:', err);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected total events:', eventsReceived.length);
    console.log('Events:', JSON.stringify(eventsReceived, null, 2));
    process.exit(0);
  });
});

setTimeout(() => {
  console.log('Timeout - disconnecting');
  socket.disconnect();
  process.exit(0);
}, 5000);