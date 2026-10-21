# 07 — SaaS Multi-Tenant Architecture (System Design)

> Full RADIO-framework system design for an Enterprise SaaS Multi-Tenant Platform — Tenant resolution, RBAC/PBAC access control, organization switching, runtime white-label theming, query cache isolation, and tiered feature entitlements.

---

## 📑 Table of Contents
1. [System Design: Architect an Enterprise SaaS Multi-Tenant Platform](#1-system-design-architect-an-enterprise-saas-multi-tenant-platform)
2. [Tenant Resolution & Context Management](#2-tenant-resolution--context-management)
3. [Authentication & RBAC (Role-Based Access Control)](#3-authentication--rbac-role-based-access-control)
4. [Dynamic Theming & White-Labeling](#4-dynamic-theming--white-labeling)
5. [Data Scoping & Cache Isolation](#5-data-scoping--cache-isolation)
6. [Feature Flagging & Plan Entitlements](#6-feature-flagging--plan-entitlements)
7. [🎯 Quick-Fire & Trap Questions](#7--quick-fire--trap-questions)

---

## 1. System Design: Architect an Enterprise SaaS Multi-Tenant Platform

### Q1: System Design: Architect the frontend for an Enterprise SaaS Multi-Tenant B2B platform supporting subdomain/custom domain resolution, organization switching, fine-grained RBAC, and runtime white-label customization.

**Difficulty:** 🟣 Principal / Lead  
**Type:** 🏗️ System Design  
**Tags:** `Architecture` `Multi-Tenant` `SaaS` `RBAC` `Theming`

**Answer Breakdown:**

#### 1. Requirements & Constraints (R)

**Functional Requirements:**
- **Tenant Resolution:** Identify tenant via subdomain (`tenant-a.app.com`), custom apex domain (`portal.customer.com`), or path (`app.com/orgs/tenant-a`).
- **Org Switching:** Seamlessly switch active organization context for multi-org users without requiring full re-authentication or data bleeding.
- **RBAC & PBAC:** Granular role and permission-based UI gating (`viewer`, `editor`, `admin`, custom permission strings like `billing:invoice:read`).
- **White-Labeling / Theming:** Dynamic brand injection (primary colors, font family, tenant logo, custom favicon) loaded dynamically at runtime.
- **Plan Entitlements:** Feature tiering (Free, Team, Enterprise) disabling or hiding features based on tenant subscription limits.
- **Data Isolation:** Zero cross-tenant data leakage in client-side caches (TanStack Query, IndexedDB, LocalStorage).

**Non-Functional Requirements:**
- **First Contentful Paint (FCP):** < 1.2s despite tenant config preloading.
- **Security Guarantee:** Defense-in-depth: frontend guards exist strictly for UX; every request injects cryptographic tenant identity (`X-Tenant-Id` validated via backend JWT claims).
- **Cache Eviction:** Switching organizations must deterministically purge sensitive in-memory queries in < 16ms without race conditions.
- **Zero Flash of Unstyled Content (FOUC):** Tenant theme must apply before initial paint.

---

#### 2. Architecture & Project Structure (A)

```text
src/
├── core/
│   ├── tenant/
│   │   ├── TenantProvider.tsx       ← Resolves & distributes tenant metadata
│   │   ├── useTenant.ts             ← Hook exposing active tenant state
│   │   ├── tenantResolver.ts        ← Hostname / Path regex resolution logic
│   │   └── types.ts                 ← TenantConfig, ThemeConfig, PlanLimits
│   ├── auth/
│   │   ├── AuthProvider.tsx         ← JWT token lifecycle & session management
│   │   ├── Protect.tsx              ← Declarative permission / role gate component
│   │   ├── usePermission.ts         ← Imperative permission checking hook
│   │   └── rbac.ts                  ← Permission matrix & evaluation engine
│   ├── theme/
│   │   ├── ThemeProvider.tsx        ← Injects CSS custom properties dynamically
│   │   └── themeGenerator.ts        ← Calculates contrast ratios, hover shades
│   └── http/
│       └── apiClient.ts             ← Axios/Fetch instance injecting X-Tenant-Id
├── features/
│   ├── org-switcher/
│   │   ├── OrgSwitcherDropdown.tsx  ← Dropdown to switch organizations
│   │   └── useOrgSwitch.ts          ← Cache purge + route transition workflow
│   ├── billing/
│   │   ├── EntitlementGate.tsx      ← Up-sell blocker if plan tier lacks feature
│   │   └── usePlanLimits.ts         ← Validates usage against quota
│   └── dashboard/
│       └── DashboardView.tsx
└── App.tsx                          ← Provider composition pipeline
```

```
                        ┌──────────────────────────────────────────────┐
                        │              Browser URL Request             │
                        │ (e.g. acme.platform.com or app.com/org/acme) │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │          Tenant Resolution Engine            │
                        │ (Extracts slug from Hostname/Path/Storage)   │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │            TenantProvider (Context)          │
                        │ - Fetches /api/v1/tenants/{slug}/config      │
                        │ - Injects Theme Variables to :root           │
                        │ - Configures ApiClient headers:              │
                        │     headers['X-Tenant-ID'] = tenant.id       │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
         ┌─────────────────────────────────────┴─────────────────────────────────────┐
         ▼                                     ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│  Auth & RBAC     │                 │ Dynamic Theming  │                 │ Query Scoping    │
│  - User Session  │                 │ - CSS Variables  │                 │ - Query keys:    │
│  - Active Org    │                 │ - Logo / Favicon │                 │   ['tenant',     │
│  - <Protect />   │                 │ - Font Injection │                 │    orgId, data]  │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
```

---

#### 3. Data Model (D)

```typescript
export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  planTier: 'free' | 'starter' | 'pro' | 'enterprise';
  features: Record<string, boolean>; // e.g. { 'audit_logs': true, 'sso': false }
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily?: string;
    logoUrl: string;
    faviconUrl: string;
    darkModeAllowed: boolean;
  };
  settings: {
    mfaRequired: boolean;
    sessionTimeoutMinutes: number;
    ipAllowlist?: string[];
  };
}

export interface UserSession {
  userId: string;
  email: string;
  activeOrgId: string;
  memberships: {
    orgId: string;
    orgName: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    permissions: string[]; // e.g., ['analytics:view', 'members:invite']
  }[];
}
```

---

#### 4. Interface & Implementation (I)

**Dynamic Provider Composition Pipeline:**

```tsx
// src/App.tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './core/tenant/TenantProvider';
import { AuthProvider } from './core/auth/AuthProvider';
import { ThemeProvider } from './core/theme/ThemeProvider';
import { AppRoutes } from './routes';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <TenantProvider>
      <ThemeProvider>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
            <AppRoutes />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </TenantProvider>
  );
};
```

---

#### 5. Optimizations & Edge Cases (O)

1. **DNS Pre-resolution & SSR Tenant Preload:** In SSR/Next.js frameworks, read `Host` headers in Middleware and inject tenant metadata directly into initial HTML state to avoid client-side configuration waterfall.
2. **Deterministic Query Invalidation:** When calling `switchOrganization(nextOrgId)`, query cache for `['tenant', previousOrgId]` is not just marked stale—it is immediately erased from client memory to prevent cross-tenant inspection via DevTools.

---

## 2. Tenant Resolution & Context Management

### Q2: Compare Subdomain vs Path-based vs Header/Cookie tenant resolution strategies. Which is superior for Enterprise B2B SaaS?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `Architecture` `Multi-Tenant` `Routing` `DNS`

**Answer:**

| Strategy | Pattern Example | Pros | Cons | Ideal Use Case |
|---|---|---|---|---|
| **Subdomain** | `acme.app.com` | - Total cookie isolation per tenant<br>- Clean enterprise branding<br>- Easy CDN routing | - Requires wildcard SSL certificates (`*.app.com`)<br>- CORS setup across subdomains | Enterprise B2B with high brand sensitivity |
| **Path-Based** | `app.com/org/acme` | - Single SSL certificate<br>- No cross-origin cookie issues<br>- Simpler routing & CI/CD deployment | - Cookies shared across all tenants unless scoped<br>- Path prefix pollution in all route links | Self-serve B2B / Developer tools (e.g. GitHub, Vercel) |
| **Custom Domain** | `portal.acme.com` (CNAME to `app.com`) | - Maximum white-label customer trust<br>- Looks like customer's internal tool | - Requires dynamic TLS termination (e.g. Cloudflare for SaaS, AWS CloudFront custom SSL) | White-label enterprise portals |
| **Session Header / Cookie** | `app.com` + `X-Tenant-ID` cookie | - No URL mutation required<br>- Simplest routing layout | - Hard to share deep links between colleagues<br>- User cannot have 2 orgs open in 2 tabs simultaneously | Single-tenant feel with internal multi-org switching |

**Architectural Recommendation:**
The best enterprise pattern is a **Hybrid Subdomain + Custom Domain** strategy:
- Default: `tenant-slug.app.io`
- Enterprise Tier: CNAME mapping to customer domain `analytics.customer.com`
- Client routing stays agnostic: a resolution layer parses `window.location.hostname` once at boot and sets a unified `tenantId`.

---

### Q3: Implement a production-grade `TenantProvider` that dynamically resolves tenant info, injects HTTP client headers, and handles resolution failures.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `TenantProvider` `Context` `Axios` `Interceptors`

**Answer:**

```tsx
// src/core/tenant/TenantProvider.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { TenantConfig } from './types';

interface TenantContextValue {
  tenant: TenantConfig | null;
  isLoading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

// Shared singleton Axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
});

function resolveTenantSlug(): string {
  const hostname = window.location.hostname; // e.g., "acme.platform.com" or "localhost"
  const parts = hostname.split('.');

  // Local development override via query param or localStorage
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const params = new URLSearchParams(window.location.search);
    return params.get('tenant') || localStorage.getItem('dev_tenant_slug') || 'default-corp';
  }

  // Apex or main app (e.g., app.platform.com or platform.com)
  if (parts.length <= 2 || parts[0] === 'app' || parts[0] === 'www') {
    return 'root';
  }

  // Subdomain resolution (e.g., "acme" from "acme.platform.com")
  return parts[0];
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const slug = useMemo(() => resolveTenantSlug(), []);

  useEffect(() => {
    let isCancelled = false;

    async function loadTenantConfiguration() {
      setIsLoading(true);
      try {
        const response = await axios.get<TenantConfig>(`/api/v1/public/tenants/${slug}`);
        if (!isCancelled) {
          setTenant(response.data);
          setError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error('Tenant resolution failed'));
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    loadTenantConfiguration();
    return () => { isCancelled = true; };
  }, [slug]);

  // Inject X-Tenant-Id to all outgoing API requests dynamically
  useEffect(() => {
    if (!tenant) return;

    const interceptorId = apiClient.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['X-Tenant-Id'] = tenant.id;
      return config;
    });

    return () => {
      apiClient.interceptors.request.eject(interceptorId);
    };
  }, [tenant]);

  if (isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Loading organization workspace...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>Organization Not Found</h1>
        <p>We could not find an organization for domain: <code>{window.location.hostname}</code></p>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside <TenantProvider>');
  return ctx;
}
```

**⚠️ Gotcha / Follow-up:**
*Interviewer:* "What happens if a malicious user alters the `X-Tenant-Id` header in DevTools to impersonate another company?"  
*Senior Answer:* "Client headers provide routing metadata only. The backend API **must never authorize access based on the unverified `X-Tenant-Id` header alone**. The backend validates the user's signed JWT token, checks their claims, and verifies whether the user is an active member of the requested tenant ID in the database. If not, the server immediately returns `403 Forbidden`."

---

## 3. Authentication & RBAC (Role-Based Access Control)

### Q4: Design a declarative RBAC and PBAC (Policy-Based Access Control) system in React with `<Protect>` component and `usePermission` hook.

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `RBAC` `Security` `Component-Design` `TypeScript`

**Answer:**

Granular systems need both **Roles** (broad classifications like `admin`, `editor`) and **Permissions** (fine-grained atomic actions like `invoice:refund`, `user:invite`).

```tsx
// src/core/auth/rbac.ts

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface UserAuthContext {
  userId: string;
  activeRole: Role;
  permissions: Set<string>;
}

export function checkPermission(
  user: UserAuthContext | null,
  options: {
    requiredPermission?: string | string[];
    requiredRole?: Role | Role[];
    requireAll?: boolean; // Default is false (ANY match allows access)
  }
): boolean {
  if (!user) return false;
  if (user.activeRole === 'owner') return true; // Superuser bypass

  const { requiredPermission, requiredRole, requireAll = false } = options;

  // Check Role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.includes(user.activeRole);
    if (!hasRole && requireAll) return false;
    if (hasRole && !requiredPermission) return true;
  }

  // Check Permissions
  if (requiredPermission) {
    const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const matches = perms.map((p) => user.permissions.has(p));

    return requireAll ? matches.every(Boolean) : matches.some(Boolean);
  }

  return true;
}
```

```tsx
// src/core/auth/Protect.tsx
import React from 'react';
import { useAuth } from './AuthProvider';
import { checkPermission, Role } from './rbac';

interface ProtectProps {
  permission?: string | string[];
  role?: Role | Role[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Protect: React.FC<ProtectProps> = ({
  permission,
  role,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  const isAllowed = checkPermission(user, {
    requiredPermission: permission,
    requiredRole: role,
    requireAll,
  });

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

**Usage in components:**

```tsx
// In an Admin billing settings page
export const BillingDashboard: React.FC = () => {
  return (
    <section>
      <h2>Billing & Invoices</h2>
      
      {/* Read-only list for any viewer */}
      <Protect permission="billing:invoices:read" fallback={<p>Unauthorized to view invoices</p>}>
        <InvoiceTable />
      </Protect>

      {/* Sensitive action restricted to admin/owner or specific permission */}
      <Protect 
        permission="billing:invoices:refund" 
        role={['owner', 'admin']}
        fallback={<p className="text-muted">You require financial admin privileges to issue refunds.</p>}
      >
        <button onClick={() => issueRefund()}>Issue Refund</button>
      </Protect>
    </section>
  );
};
```

---

### Q5: How do you architect seamless Organization Switching without a full page reload, while guaranteeing NO cached data from the previous org bleeds into the new org?

**Difficulty:** 🔴 Senior  
**Type:** 🏗️ Architecture  
**Tags:** `Org-Switching` `Cache-Invalidation` `TanStack-Query`

**Answer:**

When an executive switches between "Company A" and "Company B", naive SPAs retain cached queries in memory. If components render before new queries fetch, users see stale, confidential data from Company A.

```text
User selects "Company B" in Org Switcher
               │
               ▼
1. Update active org state in memory + update local session token
               │
               ▼
2. Cancel all in-flight Axios/Fetch network requests
               │
               ▼
3. queryClient.cancelQueries()   ← Stop pending background fetches
               │
               ▼
4. queryClient.clear()           ← Wipe entire memory cache completely
               │
               ▼
5. Update HTTP Client default header: X-Tenant-Id = 'org_b'
               │
               ▼
6. Navigate router to `/` or new tenant route
               │
               ▼
Fresh mounts fetch only Company B data cleanly
```

**Production Implementation:**

```tsx
// src/features/org-switcher/useOrgSwitch.ts
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthProvider';
import { apiClient } from '../../core/tenant/TenantProvider';

export function useOrgSwitch() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setActiveOrganization } = useAuth();

  const switchOrganization = async (newOrgId: string, newOrgSlug: string) => {
    try {
      // 1. Cancel in-flight queries
      await queryClient.cancelQueries();

      // 2. Clear query cache completely to prevent cross-tenant memory leakage
      queryClient.clear();

      // 3. Inform backend to refresh auth session / issue scoped JWT token
      const res = await apiClient.post('/auth/switch-org', { orgId: newOrgId });
      const { scopedToken } = res.data;

      // 4. Update memory & client headers
      localStorage.setItem('auth_token', scopedToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${scopedToken}`;
      apiClient.defaults.headers.common['X-Tenant-Id'] = newOrgId;

      // 5. Update Auth state in React
      setActiveOrganization(newOrgId);

      // 6. Navigate to tenant home
      navigate(`/org/${newOrgSlug}/dashboard`, { replace: true });
    } catch (error) {
      console.error('Failed to switch organization', error);
      throw error;
    }
  };

  return { switchOrganization };
}
```

---

## 4. Dynamic Theming & White-Labeling

### Q6: Design a runtime White-Label theming engine in React that injects tenant CSS custom properties dynamically with zero bundle overhead and zero FOUC (Flash of Unstyled Content).

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `Theming` `White-Label` `CSS-Variables` `Performance`

**Answer:**

Hardcoding tenant themes into build bundles does not scale when supporting 10,000+ organizations. The modern pattern uses **runtime CSS Variables injection** coupled with automated contrast calculation.

```tsx
// src/core/theme/ThemeProvider.tsx
import React, { useLayoutEffect } from 'react';
import { useTenant } from '../tenant/TenantProvider';

function adjustLuminance(hex: string, lum: number): string {
  // Utility to auto-derive hover and active states (lighten/darken)
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) cleanHex = cleanHex.split('').map(c => c + c).join('');
  
  let rgb = '#';
  for (let i = 0; i < 3; i++) {
    let c = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
    c = Math.round(Math.min(Math.max(0, c + c * lum), 255));
    rgb += ('00' + c.toString(16)).slice(-2);
  }
  return rgb;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenant } = useTenant();

  // useLayoutEffect runs before browser paint, preventing visual color flashes
  useLayoutEffect(() => {
    if (!tenant?.theme) return;

    const root = document.documentElement;
    const { primaryColor, secondaryColor, fontFamily, logoUrl, faviconUrl } = tenant.theme;

    // Apply Dynamic CSS Custom Properties
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-hover', adjustLuminance(primaryColor, -0.15));
    root.style.setProperty('--color-primary-light', adjustLuminance(primaryColor, 0.4));
    root.style.setProperty('--color-secondary', secondaryColor);

    if (fontFamily) {
      root.style.setProperty('--font-family-base', fontFamily);
    }

    // Dynamic Favicon Swap
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }

    // Dynamic Page Title
    if (tenant.name) {
      document.title = `${tenant.name} | Enterprise Portal`;
    }

    return () => {
      // Cleanup CSS custom properties on unmount / tenant switch
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-hover');
      root.style.removeProperty('--color-primary-light');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--font-family-base');
    };
  }, [tenant]);

  return <>{children}</>;
};
```

**Component Consumer via Vanilla CSS:**

```css
/* src/styles/button.css */
.btn-primary {
  background-color: var(--color-primary, #2563eb);
  color: #ffffff;
  font-family: var(--font-family-base, 'Inter', sans-serif);
  border-radius: 6px;
  padding: 8px 16px;
  transition: background-color 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--color-primary-hover, #1d4ed8);
}
```

---

### Q7: How do you dynamically inject tenant-specific custom fonts (e.g., Google Fonts or custom CDN URLs) safely without blocking main thread rendering?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `Fonts` `Web-Performance` `DOM-Injection`

**Answer:**

```tsx
// src/core/theme/useDynamicFont.ts
import { useEffect } from 'react';

export function useDynamicFont(fontName?: string, fontUrl?: string) {
  useEffect(() => {
    if (!fontName || !fontUrl) return;

    const fontId = `tenant-font-${fontName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Prevent duplicate font link tags
    if (document.getElementById(fontId)) return;

    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.media = 'print'; // Non-blocking font load trick
    link.onload = () => {
      link.media = 'all'; // Activate stylesheet once downloaded
    };

    document.head.appendChild(link);

    return () => {
      const existing = document.getElementById(fontId);
      if (existing) existing.remove();
    };
  }, [fontName, fontUrl]);
}
```

---

## 5. Data Scoping & Cache Isolation

### Q8: How must TanStack Query keys be structured in a multi-tenant application to eliminate accidental cache collisions between tenants?

**Difficulty:** 🔴 Senior  
**Type:** 💻 Practical / Coding  
**Tags:** `TanStack-Query` `Query-Keys` `Cache-Isolation`

**Answer:**

If query keys do not explicitly incorporate the `tenantId` (or active `orgId`), queries like `['projects']` or `['users', userId]` will collision-read data belonging to a previous tenant if the user navigates across organization boundaries or retains persistent browser caches.

**Hierarchical Tenant Query Key Factory:**

```typescript
// src/core/query/queryKeys.ts

export const tenantQueryKeys = {
  all: (tenantId: string) => ['tenant', tenantId] as const,
  
  projects: (tenantId: string) => [...tenantQueryKeys.all(tenantId), 'projects'] as const,
  projectDetails: (tenantId: string, projectId: string) => 
    [...tenantQueryKeys.projects(tenantId), 'detail', projectId] as const,
  
  users: (tenantId: string) => [...tenantQueryKeys.all(tenantId), 'users'] as const,
  userList: (tenantId: string, filters: Record<string, any>) => 
    [...tenantQueryKeys.users(tenantId), 'list', filters] as const,
};
```

**Custom Hook Enforcing Scoped Keys:**

```tsx
// src/features/projects/hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query';
import { useTenant, apiClient } from '../../../core/tenant/TenantProvider';
import { tenantQueryKeys } from '../../../core/query/queryKeys';

export function useProjects() {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || 'anonymous';

  return useQuery({
    queryKey: tenantQueryKeys.projects(tenantId),
    queryFn: async () => {
      const { data } = await apiClient.get('/projects');
      return data;
    },
    enabled: Boolean(tenant?.id),
    staleTime: 60 * 1000,
  });
}
```

**Selective Invalidation Benefits:**
When an event happens inside a tenant, you can invalidate only that tenant's records without touching global metadata:
```typescript
// Invalidates only Acme's projects, leaving other tenant caches intact:
queryClient.invalidateQueries({ queryKey: tenantQueryKeys.projects('tenant_acme') });
```

---

### Q9: How do you prevent sensitive cross-tenant data leaks in `localStorage`, `IndexedDB`, and Service Worker caches?

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `Security` `Storage` `IndexedDB` `Service-Worker`

**Answer:**

1. **Storage Key Prefixing:**
   Never store bare keys like `localStorage.setItem('recent_documents', ...)`. Always prefix with tenant ID:
   ```typescript
   export function setTenantStorage(tenantId: string, key: string, value: any): void {
     localStorage.setItem(`tenant:${tenantId}:${key}`, JSON.stringify(value));
   }
   ```
2. **IndexedDB Database Scoping:**
   Do not mix tenant records in the same IndexedDB object store without tenant index partitioning. Better yet, create separate IndexedDB database instances per tenant:
   ```typescript
   const dbName = `OfflineStore_${tenantId}`;
   window.indexedDB.open(dbName, version);
   ```
3. **Cache-Control for Service Workers:**
   Service Workers caching GET requests by URL alone will serve Acme's response to Beta Corp if both use `app.com/api/v1/profile`.
   - **Fix:** Include the `X-Tenant-Id` header in the Cache Storage request hash key, or append tenant slug into request paths (`/api/v1/tenants/:slug/profile`).

---

## 6. Feature Flagging & Plan Entitlements

### Q10: How do you design an entitlement gate component that blocks features based on tenant plan tiers (Free vs Pro vs Enterprise) and triggers upgrade flows?

**Difficulty:** 🟡 Mid  
**Type:** 💻 Practical / Coding  
**Tags:** `Entitlements` `Paywall` `Feature-Flags` `UX`

**Answer:**

```tsx
// src/features/billing/EntitlementGate.tsx
import React from 'react';
import { useTenant } from '../../core/tenant/TenantProvider';

interface EntitlementGateProps {
  featureKey: string;
  minimumTier?: 'free' | 'starter' | 'pro' | 'enterprise';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const TIER_WEIGHTS: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export const EntitlementGate: React.FC<EntitlementGateProps> = ({
  featureKey,
  minimumTier,
  fallback,
  children,
}) => {
  const { tenant } = useTenant();

  if (!tenant) return null;

  // 1. Direct feature flag override from tenant configuration
  const hasFeatureFlag = Boolean(tenant.features[featureKey]);

  // 2. Tier comparison check
  const meetsTier = minimumTier 
    ? TIER_WEIGHTS[tenant.planTier] >= TIER_WEIGHTS[minimumTier]
    : true;

  const isEntitled = hasFeatureFlag && meetsTier;

  if (!isEntitled) {
    if (fallback) return <>{fallback}</>;

    // Default Upgrade CTA Banner
    return (
      <div style={{
        border: '1px dashed #cbd5e1',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Unlock {featureKey.replace(/_/g, ' ')}</h4>
        <p style={{ margin: '0 0 16px 0', color: '#64748b' }}>
          This feature is available on the <strong>{minimumTier || 'Pro'}</strong> plan and above.
        </p>
        <button 
          onClick={() => window.location.href = '/settings/billing'}
          style={{
            backgroundColor: 'var(--color-primary, #2563eb)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Upgrade Subscription
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
```

---

## 7. 🎯 Quick-Fire & Trap Questions

### Q11: "What happens if a user opens two browser tabs with different active organizations in the same browser session?"

**Difficulty:** 🔴 Senior  
**Type:** 🐛 Debug & Bug Hunting  
**Tags:** `Multi-Tab` `Race-Conditions` `LocalStorage` `Session`

**Answer:**
If the active organization state is persisted in a shared medium like `localStorage.setItem('active_org_id', 'org_1')`, Tab 2 switching to `org_2` will overwrite the key. Tab 1 will continue showing UI for `org_1`, but its subsequent API calls will transmit `X-Tenant-Id: org_2`—leading to corrupt mutations and severe security failures.

**Architectural Solutions:**
1. **URL-Driven Tenancy (Best Practice):** Store the tenant identity strictly in the route pathname (`/org/:orgSlug/...`) or subdomain. The URL is strictly isolated to its respective browser tab.
2. **`sessionStorage` Fallback:** If not using the URL, use `sessionStorage`, which is isolated per browser tab.
3. **Cross-Tab Synchronization via `BroadcastChannel`:** Broadcast org switch events so background tabs immediately display a modal: *"Your organization was changed in another tab. Click to reload this workspace."*

---

### Q12: "How do you handle JWT token refresh when a user's role or permissions inside a tenant change in real-time?"

**Difficulty:** 🔴 Senior  
**Type:** 📖 Conceptual  
**Tags:** `JWT` `Auth` `Real-Time` `Security`

**Answer:**
Since JWT tokens are self-contained and immutable until expiration, a revoked permission remains valid on the client until the token expires (typically 15–60 minutes).

**Solutions:**
1. **Short-Lived Access Tokens (5–10 min):** Limit the vulnerability window with automatic silent refresh.
2. **WebSocket / SSE Invalidation Event:** When an administrator revokes a user's permissions, the backend pushes a `{ type: 'SESSION_REVOKED', userId }` message via WebSocket. The client immediately triggers `refreshToken()` or logs the user out.
3. **Backend Middleware Revocation Check:** For mission-critical actions (e.g. wire transfer, user deletion), the backend checks a Redis blacklist of revoked session IDs regardless of JWT expiration.

---

### Q13: "Why should you NEVER rely solely on frontend RBAC for security, and how do you ensure the frontend permission matrix stays synchronized with backend contracts?"

**Difficulty:** 🟡 Mid  
**Type:** 📖 Conceptual  
**Tags:** `RBAC` `Security` `Contract-Testing`

**Answer:**
Frontend code runs entirely in the user's browser, where any user can inspect memory, override JavaScript variables, bypass React condition checks using React DevTools, or execute arbitrary `curl` commands directly against the API. Frontend RBAC exists **purely for User Experience** (hiding disabled buttons, removing dead links), never for data protection.

**Synchronization Strategy:**
1. **Shared Enum / Type Generation:** Use OpenAPI / Swagger / Protobuf schema code generation (`openapi-typescript`) to generate permission string literals directly from backend definitions.
2. **Contract Testing:** Automated CI/CD integration tests verify that for every endpoint returning `403 Forbidden` for a given role, the frontend UI disables or hides the corresponding trigger.
