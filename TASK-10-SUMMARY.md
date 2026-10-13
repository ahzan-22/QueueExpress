# TASK-10: QueueExpress Application Summary & Demo Script

## Overview

**QueueExpress** (formerly AntriLokal) is a real-time digital queue system for local businesses, built as a Turborepo monorepo with:

- **apps/api**: NestJS backend (port 4000) - REST + WebSocket via Socket.IO
- **apps/web**: Next.js frontend (port 3000) - Operator, customer, and TV display views
- **packages/db**: Prisma ORM with Supabase PostgreSQL
- **packages/shared**: Shared types, DTOs, SOCKET_EVENTS, queue-status

## Architecture

### Phase 1: Core Queue (Completed)
- Ticket creation, start, complete, skip operations via REST API
- Queue service with in-memory store management

### Phase 2: Real-Time (Completed)
- Socket.IO gateway (`apps/api/src/realtime/queue.gateway.ts`)
- Store subscription/unsubscribe for real-time updates
- Broadcast events: `queue:created`, `queue:called`, `queue:completed`, `queue:skipped`, `queue:updated`, `display:refresh`, `stats:updated`

### Phase 3: UI/UX (Completed)
- Operator dashboard with ticket calling controls
- Customer live status card
- TV display board preview
- Demo dual-screen mode

### Phase 4: Polish (TASK-09)
- Framer Motion animations with `reducedMotion="user"` support

## Key APIs

| Endpoint | Method | Description |
|---|---|---|
| `/api/tickets/:id/start` | POST | Start a ticket |
| `/api/tickets/:id/complete` | POST | Complete a ticket |
| `/api/tickets/:id/call-again` | POST | Call again a ticket |
| `/api/stores/:slug/queue/display` | GET | Get display board data |
| `/api/stores/:slug/queue/stats` | GET | Get daily stats |
| `/api/stores/:slug` | GET | Get store info |

## WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `store:subscribe` | Client → Server | `{ storeId: string }` |
| `store:unsubscribe` | Client → Server | `{ storeId: string }` |
| `queue:created` | Server → Client | New ticket created |
| `queue:called` | Server → Client | Ticket called |
| `queue:completed` | Server → Client | Ticket completed |
| `queue:skipped` | Server → Client | Ticket skipped |
| `display:refresh` | Server → Client | Display board update |
| `stats:updated` | Server → Client | Stats refresh |

## Demo Page

`apps/web/app/demo/page.tsx` - Dual-screen showcase with:
- Left: Operator controls (call next, call again, complete, skip)
- Right: Customer view with live status
- TV display board preview
- Real-time synchronization via Socket.IO

## Demo Script (TASK-10)

Created `test_demo_standalone.js` - a standalone script that demonstrates QueueExpress functionality **without requiring the server to be running**, bypassing the server listener hang issue by mocking API responses and simulating WebSocket events.

### Usage
```bash
bun run test_demo_standalone.js
# or
node test_demo_standalone.js
```

### What It Demonstrates
1. **Ticket lifecycle**: Create → Start → Complete → Skip
2. **WebSocket event flow**: Subscribe → Receive events
3. **API integration pattern**: POST/GET requests structure
4. **Error handling**: Graceful fallback when server unavailable
5. **Demo mode synchronization**: Both sides updating in sync

### Key Design Decisions to Avoid Hang
- **No blocking server wait**: Immediately proceeds with mock data if server not reachable
- **Timeout-bound WebSocket**: 5-second timeout prevents infinite hang
- **Mock data structure**: Uses actual DTO types from `@queueexpress/shared`
- **Graceful degradation**: Falls back to static demo state if API/WS fails