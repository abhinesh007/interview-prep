# 05 — BI Dashboard Architecture (System Design)

> Full RADIO-framework system design for a Business Intelligence Dashboard — real-time data visualization, configurable widget grids, drill-down capabilities, SVG vs Canvas vs WebGL engine selection, and high-frequency data streaming patterns.

---

## 📑 Table of Contents
1. [System Design: Architect a BI Dashboard Platform](#1-system-design-architect-a-bi-dashboard-platform)
2. [Visualization Engine Selection](#2-visualization-engine-selection)
3. [Real-Time Data Streaming Architecture](#3-real-time-data-streaming-architecture)
4. [Widget Component Architecture](#4-widget-component-architecture)
5. [Dashboard Layout & Responsiveness](#5-dashboard-layout--responsiveness)
6. [🎯 Quick-Fire & Trap Questions](#6--quick-fire--trap-questions)

---

## 1. System Design: Architect a BI Dashboard Platform

### Q1: System Design: Architect a configurable Business Intelligence Dashboard that displays real-time KPIs, interactive charts, and supports user-customizable widget layouts.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `Architecture` `BI Dashboard` `Real-Time` `Scale`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)

**Functional Requirements:**
- Display 10-20 configurable widgets per dashboard (KPI cards, line charts, bar charts, tables, heatmaps)
- Real-time data updates (stock tickers, live metrics, sensor data) with sub-second latency
- User-customizable dashboard layouts (drag-and-drop widget positioning and resizing)
- Cross-filtering: clicking a region on a map filters all other widgets by that region
- Date range picker affecting all widgets globally
- Drill-down: clicking a KPI opens a detailed breakdown view
- Export to PDF/CSV

**Non-Functional Requirements:**
- Initial load < 3 seconds (including chart rendering)
- Smooth 60fps during widget drag-and-drop
- Support 50,000+ data points per chart without UI freezing
- Zero memory leaks during prolonged sessions (analyst workstations running 8+ hours)
- Bundle budget: < 300KB gzipped for initial route

#### 2. High-Level Architecture & Topology (A)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT ARCHITECTURE                            │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Dashboard    │    │  Filter      │    │  Widget Registry         │  │
│  │  Layout       │    │  Context     │    │  (Lazy-loaded chart      │  │
│  │  (react-grid  │    │  (Date range,│    │   components)            │  │
│  │   -layout)    │    │  region,     │    │                          │  │
│  │              │    │  segment)    │    │  ┌────┐ ┌────┐ ┌────┐   │  │
│  │              │    │              │    │  │KPI │ │Line│ │Bar │   │  │
│  │              │    │              │    │  │Card│ │Chrt│ │Chrt│   │  │
│  │              │    │              │    │  └────┘ └────┘ └────┘   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────────┘  │
│         │                   │                        │                   │
│         └───────────────────┼────────────────────────┘                   │
│                             │                                            │
│  ┌──────────────────────────▼──────────────────────────────────────────┐│
│  │                    DATA LAYER                                       ││
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐ ││
│  │  │ TanStack     │  │ WebSocket    │  │ Memoized Selectors        │ ││
│  │  │ Query        │  │ Manager      │  │ (Data transformation      │ ││
│  │  │ (REST/GQL    │  │ (Real-time   │  │  & aggregation layer)     │ ││
│  │  │  endpoints)  │  │  streaming)  │  │                           │ ││
│  │  └──────┬───────┘  └──────┬───────┘  └───────────────────────────┘ ││
│  └─────────┼─────────────────┼────────────────────────────────────────┘│
│            │                 │                                          │
└────────────┼─────────────────┼──────────────────────────────────────────┘
             │                 │
     ┌───────▼─────────────────▼──────────┐
     │       BACKEND / API LAYER          │
     │                                    │
     │  ┌──────────┐  ┌──────────┐       │
     │  │ REST API │  │ WebSocket│       │
     │  │ (Queries,│  │ Server   │       │
     │  │  exports)│  │ (Push)   │       │
     │  └────┬─────┘  └────┬─────┘       │
     │       │              │             │
     │  ┌────▼──────────────▼──────┐      │
     │  │  Semantic / Analytics    │      │
     │  │  Layer (Cube, Metabase)  │      │
     │  │  Aggregation, caching,   │      │
     │  │  rollups, materialized   │      │
     │  │  views                   │      │
     │  └──────────────────────────┘      │
     └────────────────────────────────────┘
```

#### 3. Data Model & State Strategy (D)

**Query Key Architecture (TanStack Query):**
```tsx
// Every widget's data is scoped by dashboard ID + widget config + global filters
const useWidgetData = (widgetId: string, widgetConfig: WidgetConfig) => {
  const { dateRange, region, segment } = useDashboardFilters();

  return useQuery({
    queryKey: [
      'widget-data',
      widgetId,
      widgetConfig.dataSource,
      widgetConfig.metric,
      { dateRange, region, segment },  // Global filters
    ],
    queryFn: () => fetchWidgetData(widgetConfig, { dateRange, region, segment }),
    staleTime: widgetConfig.isRealTime ? 0 : 5 * 60 * 1000,
    refetchInterval: widgetConfig.isRealTime ? 10_000 : false,
  });
};
```

**Dashboard Layout Persistence:**
```tsx
// Layout saved per user per dashboard
interface DashboardLayout {
  dashboardId: string;
  userId: string;
  widgets: Array<{
    widgetId: string;
    type: 'kpi' | 'line-chart' | 'bar-chart' | 'table' | 'heatmap';
    config: WidgetConfig;
    layout: { x: number; y: number; w: number; h: number };
  }>;
  globalFilters: {
    dateRange: { start: string; end: string };
    region?: string;
    segment?: string;
  };
}
```

#### 4. Interface & Component Hierarchy (I)

```text
<DashboardPage>
  ├── <DashboardHeader>
  │     ├── <DashboardTitle />
  │     ├── <GlobalDateRangePicker />      ← Updates filter context
  │     ├── <RegionSelector />             ← Updates filter context
  │     ├── <RefreshButton />
  │     └── <ExportMenu />                 ← PDF / CSV / PNG
  │
  ├── <DashboardFilterContext.Provider>     ← Provides global filters to all widgets
  │     └── <DashboardGrid>                ← react-grid-layout
  │           ├── <WidgetContainer key="revenue">
  │           │     ├── <WidgetHeader title="Monthly Revenue" />
  │           │     ├── <WidgetToolbar>
  │           │     │     ├── <ChartTypeToggle />
  │           │     │     └── <WidgetSettingsMenu />
  │           │     └── <WidgetBody>
  │           │           └── <LineChart data={...} />    ← Lazy loaded
  │           │
  │           ├── <WidgetContainer key="users-kpi">
  │           │     └── <KPICard value={...} trend={...} />
  │           │
  │           └── <WidgetContainer key="sales-table">
  │                 └── <DataTable columns={...} data={...} />
  │
  └── <AddWidgetPanel />                   ← Widget catalog for adding new widgets
```

**Compound Component API for Widgets:**
```tsx
// Widget compound component — flexible, composable
<DashboardWidget id="revenue-chart">
  <DashboardWidget.Header title="Q3 Regional Sales">
    <DateRangePicker />
    <ExportButton />
  </DashboardWidget.Header>
  <DashboardWidget.Body>
    <Suspense fallback={<ChartSkeleton />}>
      <BarChart data={data} />
    </Suspense>
  </DashboardWidget.Body>
  <DashboardWidget.Footer>
    <span>Last updated: {lastUpdated}</span>
  </DashboardWidget.Footer>
</DashboardWidget>
```

#### 5. Optimizations, Resiliency & Disaster Scenarios (O)

**Performance Optimizations:**
1. **Lazy-load chart libraries:** Only load `recharts`, `echarts`, or `visx` when a widget using them is visible
2. **Virtualize off-screen widgets:** In dashboards with 20+ widgets, lazy-mount widgets below the viewport fold
3. **Memoize data transformations:** Heavy aggregation (rollups, pivot tables) wrapped in `useMemo` with dependency arrays on the raw data + filter state
4. **Web Workers for heavy computation:** Offload CSV generation, PDF rendering, and data aggregation to Web Workers

**Error Resilience:**
```tsx
// Each widget is wrapped in an independent Error Boundary
<ErrorBoundary
  fallback={<WidgetErrorFallback widgetId={widget.id} onRetry={refetch} />}
  onError={(error) => reportToSentry(error, { widgetId: widget.id })}
>
  <Suspense fallback={<WidgetSkeleton type={widget.type} />}>
    <WidgetRenderer widget={widget} />
  </Suspense>
</ErrorBoundary>
```
**Key principle:** If one widget's API fails, only that widget shows an error state. The rest of the dashboard remains fully functional.

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens when the user changes the global date range and all 15 widgets fire API requests simultaneously?"  
*Senior Answer:* Three mitigations: (1) **Request batching** — combine multiple widget data requests into a single batch API call if your backend supports it (e.g., GraphQL's query batching or a custom batch endpoint). (2) **Staggered fetching** — prioritize above-the-fold widgets with `priority: 'high'` and delay off-screen widget fetches by 200-500ms. (3) **Request deduplication** — TanStack Query automatically deduplicates identical query keys, so if two widgets request the same metric with the same filters, only one API call is made.

---

## 2. Visualization Engine Selection

### Q2: How do you choose between SVG, Canvas, and WebGL for chart rendering in a BI dashboard?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual & Deep-Dive  
**Tags:** `Visualization` `SVG` `Canvas` `WebGL` `Performance`

**Answer:**

The rendering engine choice is driven by **data volume** and **update frequency**:

| Rendering Engine | Data Points | Update Frequency | Interactivity | Libraries |
|---|---|---|---|---|
| **SVG (DOM-based)** | < 1,000 | Low (user-triggered) | Excellent (native DOM events, CSS hover, tooltips) | Recharts, Visx, Nivo |
| **Canvas (2D)** | 1,000 - 100,000 | Medium (periodic refresh) | Good (requires hit-testing math) | Chart.js, ECharts, Plotly |
| **WebGL (GPU)** | 100,000 - millions | High (streaming/real-time) | Limited (custom hit-testing) | SciChart, LightningChart, Deck.gl |

**Why this matters for BI dashboards:**

```text
Standard Corporate Dashboard (10 widgets, periodic refresh):
→ SVG (Recharts / Visx) is perfect
→ Each chart has < 500 data points
→ Rich tooltips, hover effects, CSS animations

Trading / Monitoring Dashboard (live streaming data):
→ Canvas (ECharts) for time-series with 10K+ points
→ WebGL (SciChart) for high-frequency tickers with 1M+ points
→ Cannot use SVG — DOM node count would destroy performance

Geospatial / Map Dashboard (heatmaps, scatter plots):
→ WebGL (Deck.gl / Mapbox GL) for GPU-accelerated rendering
→ Millions of geographic data points rendered in real-time
```

**SVG Performance Breakdown:**
```tsx
// SVG — each data point creates a DOM element
// 500 points = 500 <circle> elements = fine
// 50,000 points = 50,000 <circle> elements = BROWSER TAB CRASHES
<svg>
  {data.map((point) => (
    <circle
      key={point.id}
      cx={xScale(point.x)}
      cy={yScale(point.y)}
      r={3}
      onMouseEnter={() => showTooltip(point)}  // ← Free DOM events!
    />
  ))}
</svg>
```

**Canvas Alternative for Large Datasets:**
```tsx
// Canvas — draws pixels, NOT DOM elements
// 50,000 points = 50,000 draw calls = fast (no DOM overhead)
const ChartCanvas = ({ data }: { data: Point[] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw all points in a single render pass
    data.forEach((point) => {
      ctx.beginPath();
      ctx.arc(xScale(point.x), yScale(point.y), 3, 0, Math.PI * 2);
      ctx.fillStyle = point.color;
      ctx.fill();
    });
  }, [data]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};
```

**Hybrid Approach (Best of Both Worlds):**
```text
┌─────────────────────────────────────────┐
│           Hybrid Rendering              │
│                                         │
│  Canvas Layer: Render data points       │
│  (fast, handles 50K+ points)            │
│          +                              │
│  SVG Overlay: Tooltips, axes, labels    │
│  (interactive, accessible, styleable)   │
│          +                              │
│  HTML Overlay: Complex tooltips, menus  │
│  (rich content, form inputs)            │
└─────────────────────────────────────────┘
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "An analyst complains that the chart becomes unresponsive when they load 6 months of daily data (~180 points). Your chart uses SVG. What's wrong?"  
*Senior Answer:* 180 SVG data points is negligible — the issue is elsewhere. Common culprits: (1) The component re-renders on every mouse move (unbounded `onMouseMove` handler updating React state). Fix: throttle mouse events or use refs. (2) The data transformation is being recomputed on every render without `useMemo`. (3) The tooltip component is expensive to render and isn't memoized. Profile with React DevTools Profiler before switching rendering engines — the problem is likely in React, not SVG.

---

## 3. Real-Time Data Streaming Architecture

### Q3: How do you architect real-time data streaming for a BI dashboard without crashing the browser?

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ Architecture / System Design  
**Tags:** `WebSocket` `Real-Time` `Performance` `Streaming`

**Answer:**

**The cardinal rule:** Never stream high-frequency data directly into React state (`useState`). Each `setState` triggers a re-render, and at 10+ updates per second across multiple widgets, React's reconciliation becomes the bottleneck.

```text
┌─────────────────────────────────────────────────────────────┐
│         WRONG: Direct State Updates                         │
│                                                              │
│  WebSocket tick → setState(newData) → React re-render        │
│  10 ticks/sec × 15 widgets = 150 re-renders/sec = 💀 JANK   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│         RIGHT: Buffered Imperative Updates                  │
│                                                              │
│  WebSocket tick → Internal buffer → requestAnimationFrame    │
│                                     → Chart.appendData()     │
│  60fps cap, zero React re-renders for data updates = ✅     │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Pattern:**
```tsx
import { useRef, useEffect, useCallback } from 'react';

interface StreamingChartProps {
  socketUrl: string;
  maxDataPoints: number;  // FIFO buffer size
}

const StreamingChart = ({ socketUrl, maxDataPoints = 500 }: StreamingChartProps) => {
  const chartRef = useRef<ChartInstance | null>(null);
  const bufferRef = useRef<DataPoint[]>([]);
  const rafIdRef = useRef<number>(0);

  // Render loop — decoupled from WebSocket frequency
  const renderLoop = useCallback(() => {
    if (bufferRef.current.length > 0 && chartRef.current) {
      // Batch all buffered points into a single chart update
      chartRef.current.appendData(bufferRef.current);
      bufferRef.current = [];

      // Enforce FIFO cap to prevent memory growth
      const currentData = chartRef.current.getData();
      if (currentData.length > maxDataPoints) {
        chartRef.current.setData(currentData.slice(-maxDataPoints));
      }
    }
    rafIdRef.current = requestAnimationFrame(renderLoop);
  }, [maxDataPoints]);

  useEffect(() => {
    const ws = new WebSocket(socketUrl);

    ws.onmessage = (event) => {
      const point: DataPoint = JSON.parse(event.data);
      bufferRef.current.push(point);  // Buffer, don't setState!
    };

    // Start render loop
    rafIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      ws.close(1000, 'Component unmounted');
      cancelAnimationFrame(rafIdRef.current);
    };
  }, [socketUrl, renderLoop]);

  return (
    <div>
      <canvas ref={(el) => {
        if (el && !chartRef.current) {
          chartRef.current = new ChartLibrary(el, chartConfig);
        }
      }} />
    </div>
  );
};
```

**Three Key Patterns:**

1. **FIFO Buffering:** Keep only the last N data points to prevent unbounded memory growth
2. **RAF Batching:** Use `requestAnimationFrame` to sync chart updates with the browser's paint cycle (~60fps)
3. **Imperative Chart API:** Bypass React's rendering pipeline by mutating the chart instance directly

**WebSocket Reconnection Strategy:**
```tsx
const useReconnectingWebSocket = (url: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      attemptRef.current = 0;  // Reset backoff on successful connection
    };

    ws.onclose = (event) => {
      if (event.code !== 1000) {  // Not a clean close
        // Exponential backoff with jitter (prevent thundering herd)
        const delay = Math.min(
          30_000,
          2 ** attemptRef.current * 1000 + Math.random() * 1000
        );
        attemptRef.current++;
        setTimeout(connect, delay);
      }
    };

    wsRef.current = ws;
  }, [url]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close(1000, 'Cleanup');
  }, [connect]);

  return wsRef;
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens when the WebSocket server crashes and 50,000 dashboard clients all try to reconnect simultaneously?"  
*Senior Answer:* This is the **thundering herd problem**. If all clients use the same reconnection delay, they'll all hit the server at the same instant, crashing it again in a loop. The fix is **jittered exponential backoff**: `reconnectDelay = min(30s, 2^attempt * 1000 + random(0, 1000))`. The random jitter spreads reconnection attempts across a time window. Additionally, the server should implement **connection rate limiting** and return HTTP 503 with a `Retry-After` header during recovery.

---

### Q4: How do you implement cross-filtering in a dashboard where clicking a chart segment filters all other widgets?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Cross-Filtering` `Dashboard` `State Coordination`

**Answer:**

Cross-filtering requires a **shared filter context** that all widgets subscribe to. When one widget applies a filter (e.g., clicking "Europe" on a map), all other widgets re-query with that filter applied.

```tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

// --- Filter State ---
interface DashboardFilters {
  dateRange: { start: string; end: string };
  region: string | null;
  segment: string | null;
  product: string | null;
  crossFilter: {
    sourceWidgetId: string | null;
    dimension: string | null;
    value: string | null;
  };
}

type FilterAction =
  | { type: 'SET_DATE_RANGE'; payload: { start: string; end: string } }
  | { type: 'SET_CROSS_FILTER'; payload: { widgetId: string; dimension: string; value: string } }
  | { type: 'CLEAR_CROSS_FILTER' }
  | { type: 'RESET_ALL' };

const filterReducer = (state: DashboardFilters, action: FilterAction): DashboardFilters => {
  switch (action.type) {
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: action.payload };
    case 'SET_CROSS_FILTER':
      return {
        ...state,
        crossFilter: {
          sourceWidgetId: action.payload.widgetId,
          dimension: action.payload.dimension,
          value: action.payload.value,
        },
      };
    case 'CLEAR_CROSS_FILTER':
      return { ...state, crossFilter: { sourceWidgetId: null, dimension: null, value: null } };
    case 'RESET_ALL':
      return initialFilters;
    default:
      return state;
  }
};

// --- Context ---
const DashboardFilterContext = createContext<{
  filters: DashboardFilters;
  dispatch: React.Dispatch<FilterAction>;
} | null>(null);

export const useDashboardFilters = () => {
  const ctx = useContext(DashboardFilterContext);
  if (!ctx) throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  return ctx;
};

// --- Widget consuming cross-filter ---
const SalesChart = ({ widgetId }: { widgetId: string }) => {
  const { filters, dispatch } = useDashboardFilters();

  // Include cross-filter in query key so data auto-refreshes
  const { data } = useQuery({
    queryKey: ['widget-data', widgetId, filters.dateRange, filters.crossFilter],
    queryFn: () => fetchSalesData({
      dateRange: filters.dateRange,
      regionFilter: filters.crossFilter.dimension === 'region'
        ? filters.crossFilter.value
        : null,
    }),
  });

  const handleBarClick = (segment: { region: string }) => {
    dispatch({
      type: 'SET_CROSS_FILTER',
      payload: { widgetId, dimension: 'region', value: segment.region },
    });
  };

  return (
    <BarChart
      data={data}
      onClick={handleBarClick}
      highlightedSegment={
        filters.crossFilter.dimension === 'region'
          ? filters.crossFilter.value
          : undefined
      }
    />
  );
};
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "The source widget (the one clicked) shouldn't re-filter itself. How do you prevent that?"  
*Senior Answer:* Check `filters.crossFilter.sourceWidgetId !== widgetId` before applying the cross-filter to the source widget's query. The source widget should only visually highlight the clicked segment, not re-fetch filtered data. This also prevents circular filtering loops.

---

## 4. Widget Component Architecture

### Q5: How do you design a widget registry system that supports lazy-loading different chart types?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Widget Registry` `Lazy Loading` `Code Splitting`

**Answer:**

A widget registry maps widget type strings to lazy-loaded components, keeping the initial bundle lean and loading chart libraries only when needed.

```tsx
import { lazy, Suspense, ComponentType } from 'react';

// --- Widget Type Registry ---
interface WidgetComponentProps {
  data: unknown;
  config: Record<string, unknown>;
  onCrossFilter?: (dimension: string, value: string) => void;
}

type WidgetType = 'kpi-card' | 'line-chart' | 'bar-chart' | 'data-table' | 'heatmap' | 'pie-chart';

// Lazy load chart components — each chart library is code-split
const widgetRegistry: Record<WidgetType, () => Promise<{ default: ComponentType<WidgetComponentProps> }>> = {
  'kpi-card': () => import('./widgets/KPICard'),
  'line-chart': () => import('./widgets/LineChartWidget'),     // Loads recharts
  'bar-chart': () => import('./widgets/BarChartWidget'),       // Loads recharts
  'data-table': () => import('./widgets/DataTableWidget'),     // Loads @tanstack/table
  'heatmap': () => import('./widgets/HeatmapWidget'),          // Loads d3-scale
  'pie-chart': () => import('./widgets/PieChartWidget'),       // Loads recharts
};

// --- Dynamic Widget Renderer ---
const WidgetRenderer = ({ type, data, config, onCrossFilter }: {
  type: WidgetType;
  data: unknown;
  config: Record<string, unknown>;
  onCrossFilter?: (dimension: string, value: string) => void;
}) => {
  const loader = widgetRegistry[type];

  if (!loader) {
    return <WidgetErrorFallback message={`Unknown widget type: ${type}`} />;
  }

  const LazyWidget = lazy(loader);

  return (
    <ErrorBoundary fallback={<WidgetErrorFallback message="Widget failed to load" />}>
      <Suspense fallback={<WidgetSkeleton type={type} />}>
        <LazyWidget data={data} config={config} onCrossFilter={onCrossFilter} />
      </Suspense>
    </ErrorBoundary>
  );
};
```

**Bundle impact:**
```text
WITHOUT registry (everything imported eagerly):
├── main.js ............. 850KB (recharts + d3 + tanstack-table all loaded upfront)

WITH registry (lazy-loaded):
├── main.js ............. 180KB (shell + layout + TanStack Query)
├── line-chart.chunk.js . 120KB (loaded when first line chart widget renders)
├── data-table.chunk.js . 95KB  (loaded when first table widget renders)
├── heatmap.chunk.js .... 80KB  (loaded when first heatmap widget renders)
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "The `lazy()` call inside the render function creates a new lazy component on every render. Is that a problem?"  
*Senior Answer:* Yes — `React.lazy()` should be called **outside the component** or memoized. Calling it inside the render function creates a new lazy wrapper each render, causing the component to unmount and remount (losing state). Fix: pre-create lazy components or cache them:
```tsx
const lazyCache = new Map<string, ComponentType<WidgetComponentProps>>();

const getLazyWidget = (type: WidgetType) => {
  if (!lazyCache.has(type)) {
    lazyCache.set(type, lazy(widgetRegistry[type]));
  }
  return lazyCache.get(type)!;
};
```

---

## 5. Dashboard Layout & Responsiveness

### Q6: How do you implement a drag-and-drop configurable dashboard grid with responsive breakpoints?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Layout` `Drag-and-Drop` `react-grid-layout` `Responsive`

**Answer:**

Use `react-grid-layout` with responsive breakpoints and persistent layout storage:

```tsx
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  widgets: DashboardWidget[];
  isEditing: boolean;
  onLayoutChange: (layouts: Layouts) => void;
}

const DashboardGrid = ({ widgets, isEditing, onLayoutChange }: DashboardGridProps) => {
  // Define responsive breakpoints
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480 };
  const cols = { lg: 12, md: 8, sm: 4, xs: 2 };

  // Generate responsive layouts from widget configs
  const layouts: Layouts = {
    lg: widgets.map((w) => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
      minW: 2,
      minH: 2,
    })),
    md: widgets.map((w) => ({
      i: w.id,
      x: w.layout.x % 8,
      y: w.layout.y,
      w: Math.min(w.layout.w, 8),
      h: w.layout.h,
    })),
    sm: widgets.map((w) => ({
      i: w.id,
      x: 0,
      y: w.layout.y,
      w: 4,  // Full width on small screens
      h: w.layout.h,
    })),
  };

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      breakpoints={breakpoints}
      cols={cols}
      rowHeight={80}
      isDraggable={isEditing}
      isResizable={isEditing}
      onLayoutChange={(_, allLayouts) => onLayoutChange(allLayouts)}
      draggableHandle=".widget-drag-handle"
      compactType="vertical"
      margin={[16, 16]}
    >
      {widgets.map((widget) => (
        <div key={widget.id} className="widget-wrapper">
          <WidgetContainer widget={widget} isEditing={isEditing}>
            <WidgetRenderer
              type={widget.type}
              data={widget.data}
              config={widget.config}
            />
          </WidgetContainer>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};
```

**CSS Grid Alternative (for simpler dashboards):**
```css
/* CSS Grid with named areas — no JS library needed */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: auto;
  gap: 16px;
  grid-template-areas:
    "kpi1 kpi1 kpi1 kpi2 kpi2 kpi2 kpi3 kpi3 kpi3 kpi4 kpi4 kpi4"
    "chart1 chart1 chart1 chart1 chart1 chart1 chart2 chart2 chart2 chart2 chart2 chart2"
    "table table table table table table table table table table table table";
}

/* Container queries for widget-level responsiveness */
.widget-container {
  container-type: inline-size;
}

@container (max-width: 300px) {
  .chart-legend {
    display: none;  /* Hide legend when widget is too narrow */
  }
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "How do you handle performance when 15 widgets all resize simultaneously during a window resize event?"  
*Senior Answer:* Two strategies: (1) **Debounce the resize observer** — don't recompute chart dimensions on every pixel change. Use `ResizeObserver` with a 150ms debounce. (2) **Use Container Queries** (`@container`) for CSS-level responsiveness, which doesn't trigger JavaScript at all — the browser handles it natively at the layout level.

---

## 6. 🎯 Quick-Fire & Trap Questions

### Q7: Why should you never use `setInterval` for polling dashboard data?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Polling` `Data Fetching`

**Answer:**
`setInterval` fires on a fixed cadence regardless of whether the previous request completed. If an API call takes 8 seconds but the interval is 5 seconds, you'll stack up pending requests, eventually overwhelming the browser and backend. Use TanStack Query's `refetchInterval` (which waits for the previous request to complete before scheduling the next) or implement a recursive `setTimeout` pattern.

---

### Q8: A dashboard shows stale data after the user's laptop wakes from sleep. Why, and how do you fix it?

**Difficulty:** 🟡 Mid  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Stale Data` `Visibility`

**Answer:**
When a laptop sleeps, `setInterval` and WebSocket connections freeze. Upon wake, timers may fire multiple queued callbacks with stale data, and WebSocket connections are silently broken. Fix: (1) Use `document.visibilitychange` event to detect wake and trigger immediate data refresh. (2) TanStack Query's `refetchOnWindowFocus: true` handles this automatically. (3) WebSocket: implement a heartbeat/ping mechanism that detects dead connections and triggers reconnection.

---

### Q9: You're rendering a pie chart with 200 segments. The chart is unreadable. What's your architectural recommendation?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `Data Visualization` `UX`

**Answer:**
This is a data problem, not a rendering problem. 200 segments in a pie chart is a UX anti-pattern regardless of technology. The solution: (1) **Aggregate** — show the top 10 segments and group the rest into "Other". (2) **Change chart type** — use a horizontal bar chart (supports many categories) or a treemap. (3) **Add drill-down** — clicking "Other" shows a sub-chart with the remaining 190 segments. The architectural takeaway: always include a **data transformation/aggregation layer** between raw API data and chart components.

---

### Q10: What's the difference between `staleTime` and `gcTime` in TanStack Query for dashboard widgets?

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `QuickFire` `TanStack Query` `Caching`

**Answer:**
- **`staleTime`**: How long data is considered "fresh." During this window, TanStack Query returns cached data instantly without triggering a background refetch. For dashboards: set to 5 minutes for slow-changing metrics, 0 for real-time feeds.
- **`gcTime`** (formerly `cacheTime`): How long inactive (no active subscribers) cache entries are kept in memory before garbage collection. For dashboards: set to 30 minutes so switching between dashboard tabs doesn't re-fetch data that was loaded moments ago.

```text
Timeline:
  0s ─── Data fetched ──────── 5min (stale) ──────── 30min (gc) ──► Data removed from cache
         │                      │                     │
         └─ Returns instantly   └─ Returns + refetches └─ Must fetch fresh
```

---

### Q11: How do you handle chart rendering when the BI dashboard container resizes (e.g., sidebar collapse)?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical  
**Tags:** `QuickFire` `Resize` `Charts`

**Answer:**
Use **Container Queries** (`@container`) for CSS-based adaptations, and **`ResizeObserver`** for JavaScript-driven chart resize. Key pattern:

```tsx
const useContainerSize = (ref: RefObject<HTMLDivElement>) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(
      // Debounce to avoid excessive repaints
      debounce(([entry]) => {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }, 150)
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};
```

Pass `width` and `height` to chart components so they re-render with correct dimensions after a sidebar collapse/expand. Never use `window.innerWidth` — it doesn't reflect the actual widget container size.

---

### Q12: An analyst reports that their dashboard tab consumes 2GB of memory after running for 4 hours. What do you investigate?

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug  
**Tags:** `QuickFire` `Memory Leak` `Debugging`

**Answer:**
Systematic investigation:
1. **WebSocket/EventSource handlers:** Are old handlers being cleaned up when widgets unmount? Uncleaned listeners hold references to detached DOM trees.
2. **Chart data accumulation:** Is the FIFO buffer enforced? If streaming data appends without trimming, arrays grow unbounded.
3. **TanStack Query cache:** Is `gcTime` set appropriately? Cached data from hours ago may still be in memory.
4. **Detached DOM nodes:** Profile with Chrome DevTools Memory tab → Take heap snapshot → Filter by "Detached" to find DOM nodes that were removed from the tree but still referenced by JavaScript closures.
5. **Canvas/WebGL contexts:** Are old chart instances being disposed? Canvas elements retain GPU memory until explicitly released.

**Tool:** Chrome DevTools → Performance Monitor → Watch JS Heap Size over time. If it grows linearly, there's a leak. If it plateaus, it's just normal cache usage.
