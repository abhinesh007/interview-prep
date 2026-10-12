# 11 — Case Study: Real-Time Chat (Slack / WhatsApp)

> End-to-End System Design of a Real-Time Messaging Client evaluated via the **RADIO Framework**: Real-Time Streaming, Bidirectional Virtualized Lists, Draft Preservation in IndexedDB, Connection Drop Recovery, and Delivery Status Receipts.

---

## 📑 Table of Contents
1. [Requirements & Scoping (R)](#1-requirements--scoping-r)
2. [High-Level Architecture & Client Topology (A)](#2-high-level-architecture--client-topology-a)
3. [Data Model & State Architecture (D)](#3-data-model--state-architecture-d)
4. [Component Hierarchy & Interface Design (I)](#4-component-hierarchy--interface-design-i)
5. [Optimizations, Resiliency & Disaster Scenarios (O)](#5-optimizations-resiliency--disaster-scenarios-o)
6. [🎯 Interviewer Probes & Senior Follow-ups](#6--interviewer-probes--senior-follow-ups)

---

## 1. Requirements & Scoping (R)

### Functional Requirements:
- **Real-Time 1:1 & Channel Messaging:** Instant message transmission and receipt over persistent bidirectional sockets.
- **Message Delivery Status Pipeline:** Visual receipts: `PENDING_LOCAL` ➔ `SENT_TO_SERVER` (single tick) ➔ `DELIVERED_TO_PEER` (double ticks) ➔ `READ_BY_PEER` (blue ticks).
- **Infinite Chat History & Search:** Smooth bidirectional scrolling through 100,000+ messages (scrolling up loads history; jumping to unread loads context).
- **Draft Preservation:** Auto-saving uncommitted text inputs per channel across browser reloads.
- **Typing Indicators & Presence:** Real-time feedback when other participants are typing.
- **Offline Resilience:** Queuing outbound messages while disconnected; auto-replaying upon reconnection.

### Non-Functional Requirements & Performance Budgets:
- **Perceived Latency:** Optimistic local rendering within **<16ms** of clicking "Send".
- **Scrolling Performance:** Strict **60fps** (frame time $\le 16.6\text{ms}$) with zero layout jumps during message prepends.
- **Memory Footprint:** DOM node count capped below **150 nodes** regardless of conversation length.
- **Bandwidth & Battery:** Zero continuous polling; background tab socket throttling.

---

## 2. High-Level Architecture & Client Topology (A)

```text
The Real-Time Chat Client Architecture:

┌────────────────────────────────────────────────────────────────────────┐
│                               Client App                               │
│                                                                        │
│  ┌───────────────────┐    ┌────────────────────┐    ┌────────────────┐ │
│  │ ChatHeaderBar     │    │ VirtualMessageList │    │ MessageInput   │ │
│  │ (Presence, Title) │    │ (Bidirectional)    │    │ (Draft Auto)   │ │
│  └───────────────────┘    └────────────────────┘    └────────────────┘ │
│            ▲                        ▲                        ▲         │
│            │                        │                        │         │
│  ┌─────────┴────────────────────────┴────────────────────────┴───────┐ │
│  │                    Normalized Chat Cache Layer                    │ │
│  │            channelsById, messagesById, draftsByChannel            │ │
│  └──────────────────────────────────┬────────────────────────────────┘ │
│                                     │                                  │
│                 ┌───────────────────┴───────────────────┐              │
│                 ▼                                       ▼              │
│     ┌───────────────────────┐               ┌───────────────────────┐  │
│     │ Offline Storage Engine│               │ Socket Connection     │  │
│     │ - IndexedDB Drafts    │               │ Manager (Multiplexer) │  │
│     │ - Outbound Mutation Q │               │ - Heartbeat Ping/Pong │  │
│     └───────────────────────┘               │ - Backoff with Jitter │  │
│                                             └───────────┬───────────┘  │
└─────────────────────────────────────────────────────────┼──────────────┘
                                                          │ WSS / TLS
                                                          ▼
                                              ┌───────────────────────┐
                                              │ Socket Gateway / SFU  │
                                              └───────────────────────┘
```

---

## 3. Data Model & State Architecture (D)

### Normalized State Schema:
```typescript
export type DeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface MessageEntity {
  id: string; // Real server ID or temp client UUID
  channelId: string;
  senderId: string;
  text: string;
  createdAt: number;
  status: DeliveryStatus;
  retryCount?: number;
}

export interface ChannelEntity {
  id: string;
  name: string;
  isDirectMessage: boolean;
  unreadCount: number;
  lastMessageId?: string;
}

export interface ChatNormalizedState {
  channels: {
    byId: Record<string, ChannelEntity>;
    allIds: string[];
  };
  messages: {
    byId: Record<string, MessageEntity>;
    byChannelId: Record<string, string[]>; // Sorted array of message IDs
  };
  drafts: Record<string, string>; // channelId -> draftText
  users: Record<string, { id: string; name: string; avatar: string; isOnline: boolean }>;
}
```

---

## 4. Component Hierarchy & Interface Design (I)

```text
<ChatAppContainer>
  ├── <SidebarChannelList>
  │     └── <ChannelListItem /> (Displays unread badges & active state)
  └── <ActiveChannelView>
        ├── <ChannelHeader /> (Presence & member count)
        ├── <BidirectionalVirtualList> ◄── Handles DOM windowing
        │     ├── <DateSeparator />
        │     └── <MessageBubbleItem /> (Renders ticks & attachments)
        ├── <TypingIndicatorBanner /> (Animated dots)
        └── <MessageInputComposer />
              └── Auto-saves draft to IndexedDB on debounced change
```

---

## 5. Optimizations, Resiliency & Disaster Scenarios (O)

### 1. The Prepend Scroll Jump Mitigation (Loading Older History):
When scrolling up, inserting 50 older messages increases the container's `scrollHeight`. Without programmatic correction, the user's viewport jumps disorientingly:

```typescript
export function handleHistoryPrepend(container: HTMLElement, olderMessages: MessageEntity[]) {
  const previousScrollHeight = container.scrollHeight;
  const previousScrollTop = container.scrollTop;

  // Render older messages into state synchronously
  dispatchPrependMessages(olderMessages);

  // Compensate scroll offset immediately in the next animation frame
  requestAnimationFrame(() => {
    const heightDifference = container.scrollHeight - previousScrollHeight;
    container.scrollTop = previousScrollTop + heightDifference;
    // User experiences ZERO visible jump!
  });
}
```

### 2. Typing Indicator Throttling:
Never emit a socket event on every keystroke. 
- Emit `user_typing_start` at most once every **3 seconds** while keys are pressed.
- Clear indicator automatically on backend if no ping is received after **4 seconds**, or when `message_sent` fires.

### 3. Draft Auto-Saver in IndexedDB:
To prevent losing drafted text when a user accidentally refreshes or switches channels:
- Buffer input in local component state for instant typing responsiveness.
- Debounce a write to **IndexedDB** (`drafts` table) by 400ms.
- Pre-populate input box from IndexedDB upon mounting the channel.

---

## 6. 🎯 Interviewer Probes & Senior Follow-ups

### *Interviewer:* "How do you handle a mobile client transitioning through a tunnel, dropping connection, and reconnecting with 50 unread messages?"
*Senior Answer:* "Upon socket reconnect, the client does not request all 50 messages individually. It sends a single **Sync Request** containing its last known sequence ID: `GET /api/channels/{id}/sync?last_seq_id=1482`. The server responds with a compact array of missed messages, unread counter deltas, and delivery receipt acknowledgments. Outbound queued messages in the client's IndexedDB are replayed with their original idempotency keys."

### *Interviewer:* "What happens if two users type in the same channel simultaneously and send messages at the exact same millisecond?"
*Senior Answer:* "The client generates temporary UUIDs for optimistic rendering, but the server's database (PostgreSQL with sequence generation or Raft log) acts as the ultimate ordering authority. The server assigns an immutable, monotonically increasing integer `seq_id` to each message before broadcasting it to channel subscribers. The client inserts messages into its normalized list ordered by `seq_id`."
