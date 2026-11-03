# 13 — Case Study: Infinite Feed (Instagram / X)

> End-to-End System Design of an Infinite Social Media Feed evaluated via the **RADIO Framework**: Windowed Feed Virtualization, Cursor-Based Pagination vs Offset Traps, Progressive Media Pipelines (BlurHash & LQIP), Optimistic Interactions, and Layout Stability.

---

## 📑 Table of Contents
1. [Requirements & Scoping (R)](#1-requirements--scoping-r)
2. [High-Level Feed Architecture (A)](#2-high-level-feed-architecture-a)
3. [Data Model & Cursor-Based Pagination (D)](#3-data-model--cursor-based-pagination-d)
4. [Media Pipeline: BlurHash, Progressive Images & Video Decoders (I)](#4-media-pipeline-blurhash-progressive-images--video-decoders-i)
5. [Memory Pruning & Scroll Restoration (O)](#5-memory-pruning--scroll-restoration-o)
6. [🎯 Interviewer Probes & Senior Follow-ups](#6--interviewer-probes--senior-follow-ups)

---

## 1. Requirements & Scoping (R)

### Functional Requirements:
- **Infinite Scrolling Feed:** Smoothly loading endless posts as the user scrolls.
- **Rich Media Cards:** High-resolution photos, carousels, and autoplaying videos with audio muted.
- **Optimistic Interactions:** Liking, bookmarking, and commenting reflect instantaneously.
- **New Posts Pill Banner:** Floating pill notification: *"5 new posts — Click to view"* without disrupting active reading position.
- **Scroll Restoration:** Preserving exact scroll position when returning from a post detail view.

### Non-Functional Requirements & Budgets:
- **Cumulative Layout Shift (CLS):** Strict **0.0** (zero content jumping or layout movement).
- **Largest Contentful Paint (LCP):** Under **<2.0s** on mobile 4G networks.
- **Memory Cap:** Tab memory usage must stay **under 150MB** even after 2 hours of continuous scrolling (5,000+ posts).
- **Frame Rate:** Locked at **60fps** during rapid momentum scrolling.

---

## 2. High-Level Feed Architecture (A)

```text
The Infinite Social Media Feed Architecture:

┌────────────────────────────────────────────────────────────────────────┐
│                              Client Feed                               │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Windowed Virtualizer Viewport (TanStack Virtual / react-window)    │ │
│ │  - Mounts 4-6 post cards in DOM at any instant                     │ │
│ │  - Detaches offscreen media nodes to prevent OOM memory crashes    │ │
│ └──────────────────────────────────┬─────────────────────────────────┘ │
│                                    │                                   │
│                 ┌──────────────────┴──────────────────┐                │
│                 ▼                                     ▼                │
│     ┌───────────────────────┐             ┌───────────────────────┐    │
│     │ Media Loader Pipeline │             │ Sentinel Observer     │    │
│     │ - Inline BlurHash (1ms)│             │ - IntersectionObserver│    │
│     │ - Lazy AVIF/WebP      │             │ - Triggers fetch next │    │
│     │ - Pause offscreen vid │             │   page at 80% scroll  │    │
│     └───────────────────────┘             └───────────────────────┘    │
│                                                       │                │
│                                                       ▼                │
│                                           ┌───────────────────────┐    │
│                                           │ Cursor-Based Feed API │    │
│                                           │ /api/feed?cursor=xyz  │    │
│                                           └───────────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model & Cursor-Based Pagination (D)

### Why Offset Pagination (`page=2&limit=20`) Breaks Social Feeds:
In a dynamic feed, users are constantly creating new posts at the top of the timeline:
1. User loads Page 1 (Posts 1–20).
2. While user reads, 5 new posts are published globally.
3. User scrolls to trigger Page 2 (`page=2&limit=20`).
4. Because 5 new items shifted the database index, Posts 16–20 are returned again on Page 2!
5. **The User experiences duplicate posts and visual glitches.**

#### The Solution: Cursor-Based Pagination
The client passes an opaque cursor token representing the unique timestamp and ID of the last post rendered:

```text
Cursor Pagination Sequence:
Request:  GET /api/feed?cursor=1710029302_post948&limit=20
Response: {
  "posts": [...20 items],
  "nextCursor": "1710028100_post928",
  "hasMore": true
}
```

```typescript
export interface FeedPostEntity {
  id: string;
  author: { id: string; username: string; avatarUrl: string };
  media: {
    type: 'IMAGE' | 'VIDEO';
    url: string;
    blurHash: string; // Compact 25-character color representation
    aspectRatio: number; // e.g., 1.333 (4:3) or 0.8 (4:5)
  };
  stats: { likesCount: number; commentsCount: number; isLiked: boolean };
  createdAt: number;
}
```

---

## 4. Media Pipeline: BlurHash, Progressive Images & Video Decoders (I)

### Eliminating Layout Shift (CLS = 0):
Never allow an image to load without a pre-calculated layout box.
Use the CSS `aspect-ratio` property computed from the post metadata:
```css
.media-container {
  width: 100%;
  aspect-ratio: var(--post-aspect-ratio); /* e.g., 4 / 5 */
  position: relative;
  overflow: hidden;
  background-color: #262626; /* Dark mode placeholder */
}
```

### Progressive Image Loading with BlurHash:
```text
Phase 1: Render 32x32 BlurHash on Canvas (0ms, 25 bytes inline payload)
                │
                ▼
Phase 2: IntersectionObserver enters viewport (300px ahead) ──► Fetch AVIF
                │
                ▼
Phase 3: img.decode() completes in background ──► Smooth 200ms opacity fade-in
```

### Offscreen Video Resource Management:
Mobile hardware decoders are limited. If a user scrolls past 10 HTML5 `<video>` elements without pausing them, the smartphone's GPU decoder crashes:
```typescript
export function useVideoAutoplay(videoRef: RefObject<HTMLVideoElement>) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {/* Handle autoplay policy */});
        } else {
          video.pause(); // Release hardware decoder when scrolled away!
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [videoRef]);
}
```

---

## 5. Memory Pruning & Scroll Restoration (O)

### Preventing Browser Out-of-Memory (OOM) Crashes:
In an infinite feed, retaining thousands of high-resolution images in DOM memory exhausts browser RAM.
1. **Windowing DOM Recycling:** Render only the 4–6 posts visible on screen.
2. **Revoking Object URLs:** When a media card unmounts, release any cached blob URLs via `URL.revokeObjectURL()`.
3. **Image Cache Pruning:** Offscreen image elements are unmounted, allowing the browser's internal image memory cache to release decoded bitmap buffers.

---

## 6. 🎯 Interviewer Probes & Senior Follow-ups

### *Interviewer:* "How do you implement the '5 New Posts Available' banner without shifting the user's active reading scroll position?"
*Senior Answer:* "We poll an endpoint: `GET /api/feed/new?since_cursor={topPostCursor}` every 30 seconds. When new posts are detected, we **do not** inject them into the active feed array (which would push existing content down and destroy the user's reading spot). Instead, we store the new items in an unmounted staging buffer and display a floating pill: `<NewPostsBanner count={5} onClick={scrollToTopAndFlush} />`. When clicked, we scroll smoothly to `Y = 0` and prepend the staged items."

### *Interviewer:* "What happens if a user navigates from the feed to a profile page, clicks back, and the feed has to reload from scratch?"
*Senior Answer:* "We serialize both the **feed post cache** and the exact **`scrollTop` coordinate** in `sessionStorage` (or keep the feed route alive in memory using a Persistent Route Cache). Upon route mount, we restore the cached feed array synchronously before rendering, and apply `window.scrollTo(0, savedY)` in a `useLayoutEffect` to guarantee instant restoration with zero visual flickering."
