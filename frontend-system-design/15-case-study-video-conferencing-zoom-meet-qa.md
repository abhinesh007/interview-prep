# 15 — Case Study: Video Conferencing UI (Zoom / Meet)

> End-to-End System Design of a Video Conferencing Interface evaluated via the **RADIO Framework**: WebRTC Media Streams, Dynamic Video Grid Tiling Math ($16:9$), Dominant Speaker Detection, Canvas-Based Reaction Bursts, and Simulcast Degradation.

---

## 📑 Table of Contents
1. [Requirements & Scoping (R)](#1-requirements--scoping-r)
2. [High-Level WebRTC & UI Architecture (A)](#2-high-level-webrtc--ui-architecture-a)
3. [Dynamic Responsive Grid Math (D)](#3-dynamic-responsive-grid-math-d)
4. [Dominant Speaker & Audio Energy Processing (I)](#4-dominant-speaker--audio-energy-processing-i)
5. [Reaction Bursts & Performance Isolation (O)](#5-reaction-bursts--performance-isolation-o)
6. [🎯 Interviewer Probes & Senior Follow-ups](#6--interviewer-probes--senior-follow-ups)

---

## 1. Requirements & Scoping (R)

### Functional Requirements:
- **Responsive Multi-Party Video Grid:** Dynamically arranging 1 to 49 participant video tiles to maximize screen area without scrollbars.
- **Active / Dominant Speaker Spotlight:** Detecting the person talking and highlighting their video tile border in real time.
- **Low-Latency Reaction Bursts:** Floating emojis (hearts, thumbs up) animating across the screen without dropping video frame rates.
- **Audio / Video Stream Control:** Camera toggle, microphone mute state, device selector (headsets, webcams).
- **Network Health Indicators:** Visual quality warnings when packet loss exceeds thresholds.

### Non-Functional Requirements & Budgets:
- **Frame Budget:** Video playback and UI resizing locked at **60fps** ($16.6\text{ms}$ frame time).
- **Reaction Performance:** Zero DOM reflows; rendering 200 concurrent emoji animations must consume **<5% CPU**.
- **Aspect Ratio Fidelity:** Video tiles must maintain strict **$16:9$ aspect ratio** without letterboxing or cropping video feeds.

---

## 2. High-Level WebRTC & UI Architecture (A)

```text
The Video Conferencing UI Architecture:

┌────────────────────────────────────────────────────────────────────────┐
│                              Client App                                │
│                                                                        │
│ ┌───────────────────────────────────┐    ┌───────────────────────────┐ │
│ │ Optimal Grid Math Engine          │    │ Offscreen Reaction Canvas │ │
│ │ (Calculates optimal Cols & Rows)  │    │ (Particle physics loop)   │ │
│ └─────────────────┬─────────────────┘    └─────────────▲─────────────┘ │
│                   │                                    │               │
│                   ▼                                    │ Socket Events │
│ ┌───────────────────────────────────┐    ┌─────────────┴─────────────┐ │
│ │ HTML5 <video> Tile Binder         │    │ Low-Latency Event Channel │ │
│ │ videoEl.srcObject = mediaStream   │    │ (Chat, Mute, Reactions)   │ │
│ └─────────────────▲─────────────────┘    └───────────────────────────┘ │
│                   │ MediaStreamTracks (Audio / Video)                  │
└───────────────────┼────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Selective Forwarding Unit (SFU) Media Server (LiveKit / mediasoup)     │
│ - Routes incoming WebRTC tracks to active viewers                      │
│ - Dynamically switches between Simulcast layers (180p, 360p, 720p)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dynamic Responsive Grid Math (D)

### The Aspect-Ratio Tiling Problem:
Given $N$ participants, container width $W$, and container height $H$, compute the optimal number of columns $C$ and rows $R$ to maximize each video tile's area while preserving a strict $16:9$ aspect ratio ($1.777$).

```typescript
// Production Optimal Video Grid Tiling Algorithm
export interface GridDimensions {
  cols: number;
  rows: number;
  tileWidth: number;
  tileHeight: number;
}

export function calculateOptimalVideoGrid(
  participantCount: number,
  containerWidth: number,
  containerHeight: number,
  targetAspect = 16 / 9
): GridDimensions {
  if (participantCount <= 0) {
    return { cols: 1, rows: 1, tileWidth: 0, tileHeight: 0 };
  }

  let bestArea = 0;
  let bestCols = 1;
  let bestTileW = 0;
  let bestTileH = 0;

  // Test every candidate column count from 1 to N
  for (let cols = 1; cols <= participantCount; cols++) {
    const rows = Math.ceil(participantCount / cols);

    // Scenario A: Width-constrained tile calculation
    let tileW = containerWidth / cols;
    let tileH = tileW / targetAspect;

    // Scenario B: If height overflows container, clamp by height
    if (tileH * rows > containerHeight) {
      tileH = containerHeight / rows;
      tileW = tileH * targetAspect;
    }

    const totalArea = tileW * tileH * participantCount;

    if (totalArea > bestArea) {
      bestArea = totalArea;
      bestCols = cols;
      bestTileW = tileW;
      bestTileH = tileH;
    }
  }

  return {
    cols: bestCols,
    rows: Math.ceil(participantCount / bestCols),
    tileWidth: Math.floor(bestTileW),
    tileHeight: Math.floor(bestTileH),
  };
}
```

---

## 4. Dominant Speaker & Audio Energy Processing (I)

### Web Audio API Voice Energy Detection:
To detect who is speaking without burdening the backend, each participant tile monitors its incoming `AudioStreamTrack` using an `AnalyserNode`:

```typescript
export function useActiveSpeakerDetection(
  stream: MediaStream,
  onSpeakingChange: (isSpeaking: boolean) => void
) {
  useEffect(() => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId: number;

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const averageVolume = sum / dataArray.length;

      // Threshold: volume > 25 indicates human speech
      onSpeakingChange(averageVolume > 25);
      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      cancelAnimationFrame(animationFrameId);
      audioContext.close();
    };
  }, [stream, onSpeakingChange]);
}
```

#### Hysteresis Stabilization (Preventing Erratic Tile Jumps):
If two people speak simultaneously, flipping dominant speaker borders every 50ms is visually disorienting.
Implement a **1.5-second hysteresis window**: once a user is designated dominant speaker, hold that status for at least 1,500ms before switching.

---

## 5. Reaction Bursts & Performance Isolation (O)

### Why Creating 200 DOM Elements Freezes Video Decoding:
If participants trigger 50 thumbs-up emojis simultaneously, creating 200 `<div>` elements and animating them with CSS `@keyframes` triggers massive layout thrashing and DOM reflows. The browser's Main Thread freezes, causing incoming WebRTC video frames to drop.

#### The Solution: Single Canvas / OffscreenCanvas Particle Loop
Render all reaction animations on a single transparent `<canvas>` layer superimposed over the grid:

```typescript
export class ParticleReactionEngine {
  private particles: Array<{ x: number; y: number; vx: number; vy: number; emoji: string; alpha: number }> = [];

  constructor(private ctx: CanvasRenderingContext2D) {
    this.loop();
  }

  public emit(emoji: string, startX: number) {
    this.particles.push({
      x: startX,
      y: window.innerHeight - 50,
      vx: (Math.random() - 0.5) * 2,
      vy: -(Math.random() * 3 + 2), // Float upward
      emoji,
      alpha: 1.0,
    });
  }

  private loop = () => {
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.01;

      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.font = '24px sans-serif';
      this.ctx.fillText(p.emoji, p.x, p.y);

      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    requestAnimationFrame(this.loop);
  };
}
```

---

## 6. 🎯 Interviewer Probes & Senior Follow-ups

### *Interviewer:* "What is WebRTC Simulcast, and how does the frontend coordinate with the SFU to conserve CPU on a 25-person call?"
*Senior Answer:* "In Simulcast, each publisher client broadcasts 3 distinct resolutions simultaneously: Low (180p at 100kbps), Medium (360p at 300kbps), and High (720p at 1.5mbps). In a 25-person grid, receiving 25 high-def streams would require 37.5mbps of bandwidth and crash the client's CPU decoder. The client UI informs the SFU: *'Tiles 2 through 25 are rendered at 240px wide — send Low layer only. Tile 1 (Dominant Speaker) is rendered at 960px wide — send High layer.'* This slashes bandwidth and CPU load by over 80%."
