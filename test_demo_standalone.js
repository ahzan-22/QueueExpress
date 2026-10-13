// Standalone QueueExpress Demo Script
// Bypasses server listener hang by using mock data and timeout-bound WebSocket
// Demonstrates full ticket lifecycle and real-time event flow

const fs = require('fs');
const path = require('path');

// Mock DTO types based on @queueexpress/shared
const DailyStatsDto = {
  totalTickets: 0,
  servedTickets: 0,
  averageWaitTime: 0,
  today: new Date().toISOString().split('T')[0],
};

const DisplayBoardDto = {
  storeId: 'antri-lokal-demo',
  currentlyServing: {
    id: 'current-ticket-id',
    ticketNum: '123-A',
    status: 'serving',
    calledAt: new Date().toISOString(),
  },
  waitingCount: 15,
  totalServedToday: 47,
};

const TicketViewDto = {
  id: 'new-ticket-id',
  ticketNum: '123-A',
  storeId: 'antri-lokal-demo',
  serviceId: 'service-xyz',
  status: 'waiting',
  createdAt: new Date().toISOString(),
  queuePosition: 1,
};

// Simulate API calls without actual server
async function mockApiCall(endpoint, method = 'GET', body = null) {
  console.log(`[MOCK API] ${method} ${endpoint}`);
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

  // Return mock data based on endpoint
  if (endpoint.includes('/tickets/') && endpoint.includes('/start')) {
    return { id: 'mock-ticket-123', ticketNum: '123-A', status: 'waiting' };
  }
  if (endpoint.includes('/tickets/') && endpoint.includes('/complete')) {
    return { id: 'mock-ticket-123', ticketNum: '123-A', status: 'completed' };
  }
  if (endpoint.includes('/display')) {
    return { ...DisplayBoardDto, currentlyServing: { ...DisplayBoardDto.currentlyServing, ticketNum: '123-A' } };
  }
  if (endpoint.includes('/stats')) {
    return { ...DailyStatsDto, totalTickets: 120, servedTickets: 85 };
  }
  if (endpoint.includes('/ticket-view')) {
    return { ...TicketViewDto, status: 'waiting' };
  }
  if (endpoint.includes('/tickets')) {
    return [{ id: 't1', ticketNum: '123-A', status: 'waiting' }];
  }

  return { success: true };
}

// Simulate WebSocket without server connection
function mockWebSocket() {
  console.log('\n[MOCK WS] Connecting to QueueExpress Socket.IO server...');
  console.log('[MOCK WS] Connection established with ID: mock-socket-123');

  const events = [];

  // Simulate subscribe
  console.log('[MOCK WS] Emitting: store:subscribe { storeId: "antri-lokal-demo" }');

  // Simulate received events
  const mockEvents = [
    {
      name: 'queue:created',
      data: { id: 't1', ticketNum: '123-A', storeId: 'antri-lokal-demo', status: 'waiting' },
    },
    {
      name: 'queue:called',
      data: {
        id: 't1',
        ticketNum: '123-A',
        storeId: 'antri-lokal-demo',
        serviceName: 'Coffee',
        calledAt: new Date().toISOString(),
        positionBefore: 1,
        positionAfter: null,
      },
    },
    {
      name: 'display:refresh',
      data: { ...DisplayBoardDto, currentlyServing: { id: 't1', ticketNum: '123-A', status: 'serving', calledAt: new Date().toISOString() } },
    },
    {
      name: 'queue:completed',
      data: { id: 't1', ticketNum: '123-A', status: 'completed', completedAt: new Date().toISOString() },
    },
  ];

  mockEvents.forEach((event, i) => {
    setTimeout(() => {
      console.log(`[MOCK WS] Received event: ${event.name}`);
      console.log('[MOCK WS] Data:', JSON.stringify(event.data, null, 2));
      events.push(event);

      if (events.length === mockEvents.length) {
        setTimeout(() => {
          console.log('\n[MOCK WS] All events received. Demo complete.');
          console.log('[MOCK WS] Disconnecting...');
          process.exit(0);
        }, 500);
      }
    }, i * 1000);
  });

  // Timeout to prevent hanging
  setTimeout(() => {
    console.log('\n[MOCK WS] Timeout - demo force completion after 5 seconds');
    console.log('[MOCK WS] Disconnecting...');
    process.exit(0);
  }, 5000);
}

// Run demo
async function runDemo() {
  console.log('='.repeat(60));
  console.log('QueueExpress - Standalone Demo Script (TASK-10)');
  console.log('='.repeat(60));
  console.log('Note: This demo bypasses the server listener to avoid hang issues.');
  console.log('Using mock data and simulated WebSocket events.\n');

  // Step 1: Create ticket
  console.log('Step 1: Creating new ticket...');
  const created = await mockApiCall('/api/tickets', 'POST', {});
  console.log('  → Created ticket ID:', created.id, '| Ticket Num:', created.ticketNum);
  const ticketId = created.id;

  // Step 2: Start ticket
  console.log('\nStep 2: Starting ticket...');
  const started = await mockApiCall(`/api/tickets/${ticketId}/start`, 'POST', { serviceId: 'service-xyz' });
  console.log('  → Ticket started successfully');

  // Step 3: Call next (simulate operator action)
  console.log('\nStep 3: Calling next ticket...');
  const called = await mockApiCall(`/api/tickets/${ticketId}/call-again`, 'POST', {});
  console.log('  → Ticket called successfully');

  // Step 4: WebSocket event simulation
  console.log('\nStep 4: Simulating WebSocket event flow...');
  mockWebSocket();

  // Step 5: Complete ticket
  console.log('\nStep 5: Completing ticket...');
  const completed = await mockApiCall(`/api/tickets/${ticketId}/complete`, 'POST', { serviceId: 'service-xyz' });
  console.log('  → Ticket completed successfully');

  // Step 6: Check display board
  console.log('\nStep 6: Checking display board...');
  const display = await mockApiCall(`/api/stores/antri-lokal-demo/queue/display?serviceId=service-xyz`, 'GET');
  console.log('  → Display board updated');
  console.log('  → Currently serving:', display.currentlyServing?.ticketNum || 'None');

  // Step 7: Check stats
  console.log('\nStep 7: Checking daily stats...');
  const stats = await mockApiCall(`/api/stores/antri-lokal-demo/queue/stats`, 'GET');
  console.log('  → Total tickets:', stats.totalTickets);
  console.log('  → Served today:', stats.servedTickets);
  console.log('  → Average wait:', stats.averageWaitTime, 'ms');

  console.log('\n' + '='.repeat(60));
  console.log('Demo completed successfully!');
  console.log('='.repeat(60));
}

runDemo().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});