// store.jsx — App state, initial data, conflict detection
const { createContext, useContext, useReducer, useMemo } = React;

const TODAY_STR = '2026-05-13';

function offset(n) {
  const d = new Date(TODAY_STR);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Initial Data ─────────────────────────────────────────────────────────────

const INIT_PROJECTS = [
  {
    id: 'p1',
    name: 'Payment Platform',
    description: 'Core payment & transaction infrastructure',
    createdAt: '2026-03-01',
    environments: [
      { id: 'e-prod', name: 'production', color: '#e11d48', order: 0 },
      { id: 'e-stag', name: 'staging', color: '#d97706', order: 1 },
      { id: 'e-dev',  name: 'development', color: '#16a34a', order: 2 },
    ],
    modules: [
      { id: 'm-pg',    name: 'Payment Gateway', category: 'Core' },
      { id: 'm-tl',    name: 'Transaction Log', category: 'Core' },
      { id: 'm-auth',  name: 'Auth Service',    category: 'Auth' },
      { id: 'm-up',    name: 'User Profile',    category: 'Auth' },
      { id: 'm-notif', name: 'Notification',    category: 'Infra' },
      { id: 'm-qw',    name: 'Queue Worker',    category: 'Infra' },
      { id: 'm-cache', name: 'Cache Layer',     category: 'Infra' },
    ],
  },
  {
    id: 'p2',
    name: 'Seller Dashboard',
    description: 'Merchant analytics & inventory management',
    createdAt: '2026-02-15',
    environments: [
      { id: 'e2-prod', name: 'production',  color: '#e11d48', order: 0 },
      { id: 'e2-stag', name: 'staging',     color: '#d97706', order: 1 },
      { id: 'e2-dev',  name: 'development', color: '#16a34a', order: 2 },
    ],
    modules: [
      { id: 'm-an',    name: 'Analytics Engine',   category: 'Core' },
      { id: 'm-inv',   name: 'Inventory Service',  category: 'Core' },
      { id: 'm-ord',   name: 'Order Management',   category: 'Operations' },
      { id: 'm-rev',   name: 'Review System',      category: 'Operations' },
      { id: 'm-sauth', name: 'Seller Auth',        category: 'Auth' },
    ],
  },
];

const INIT_TICKETS = [
  // ── Payment Platform ──────────────────────────────────────────────────────
  {
    id: 't1', projectId: 'p1',
    title: 'Payment Gateway v2 Migration',
    description: 'Migrate from legacy gateway to v2 API. Zero-downtime deployment with feature flags.',
    startDate: offset(-2), endDate: offset(3),
    environmentId: 'e-prod', status: 'in-progress',
    assignee: 'Budi Santoso', modules: ['m-pg', 'm-qw'], priority: 'high',
  },
  {
    id: 't2', projectId: 'p1',
    title: 'Gateway Rollback Procedure Test',
    description: 'Validate rollback procedure before v2 goes fully live. Touches same production modules.',
    startDate: offset(1), endDate: offset(4),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Dewi Rahayu', modules: ['m-pg', 'm-tl'], priority: 'high',
  },
  {
    id: 't3', projectId: 'p1',
    title: 'Checkout Performance Optimization',
    description: 'Optimize checkout flow response times. P99 target <200ms.',
    startDate: offset(-1), endDate: offset(5),
    environmentId: 'e-stag', status: 'in-progress',
    assignee: 'Ahmad Fauzi', modules: ['m-pg', 'm-tl'], priority: 'medium',
  },
  {
    id: 't4', projectId: 'p1',
    title: 'Auth Service Refactor',
    description: 'Refactor to new token schema. Breaking change — requires coordination across services.',
    startDate: offset(6), endDate: offset(11),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Sari Wijaya', modules: ['m-auth', 'm-up'], priority: 'high',
  },
  {
    id: 't5', projectId: 'p1',
    title: 'Security Patch CVE-2026-0921',
    description: 'Critical auth module security patch. Must ship by EOD May 22.',
    startDate: offset(7), endDate: offset(9),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Reza Pratama', modules: ['m-auth', 'm-cache'], priority: 'critical',
  },
  {
    id: 't6', projectId: 'p1',
    title: 'Notification Service v2',
    description: 'Push notifications and email templates upgrade.',
    startDate: offset(3), endDate: offset(7),
    environmentId: 'e-stag', status: 'planned',
    assignee: 'Indah Permata', modules: ['m-notif', 'm-qw'], priority: 'medium',
  },
  {
    id: 't7', projectId: 'p1',
    title: 'Transaction Audit Log v2',
    description: 'Enhanced audit logging for compliance requirements. Non-breaking.',
    startDate: offset(2), endDate: offset(8),
    environmentId: 'e-dev', status: 'in-progress',
    assignee: 'Ahmad Fauzi', modules: ['m-tl'], priority: 'low',
  },
  {
    id: 't8', projectId: 'p1',
    title: 'Queue Worker Scale-up',
    description: 'Scale to handle 10× throughput ahead of campaign season.',
    startDate: offset(12), endDate: offset(16),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Budi Santoso', modules: ['m-qw'], priority: 'medium',
  },
  // ── Seller Dashboard ──────────────────────────────────────────────────────
  {
    id: 't9', projectId: 'p2',
    title: 'Analytics Engine 3.0',
    description: 'Major rewrite of analytics engine with real-time processing capabilities.',
    startDate: offset(-3), endDate: offset(5),
    environmentId: 'e2-stag', status: 'in-progress',
    assignee: 'Nurul Hidayah', modules: ['m-an'], priority: 'high',
  },
  {
    id: 't10', projectId: 'p2',
    title: 'Inventory Sync Refactor',
    description: 'Fix race conditions in inventory sync. Affects order management.',
    startDate: offset(0), endDate: offset(6),
    environmentId: 'e2-prod', status: 'in-progress',
    assignee: 'Hendra Kurniawan', modules: ['m-inv', 'm-ord'], priority: 'high',
  },
  {
    id: 't11', projectId: 'p2',
    title: 'Order Management API v2',
    description: 'New REST API with webhook support. Deprecates v1 endpoints.',
    startDate: offset(2), endDate: offset(7),
    environmentId: 'e2-prod', status: 'planned',
    assignee: 'Fitri Handayani', modules: ['m-ord', 'm-rev'], priority: 'medium',
  },
  {
    id: 't12', projectId: 'p2',
    title: 'Seller Auth SSO Integration',
    description: 'Integrate Google SSO for seller authentication.',
    startDate: offset(8), endDate: offset(13),
    environmentId: 'e2-stag', status: 'planned',
    assignee: 'Nurul Hidayah', modules: ['m-sauth'], priority: 'medium',
  },
];

// ── Conflict Detection ────────────────────────────────────────────────────────

function detectConflicts(tickets) {
  const result = [];
  const active = tickets.filter(t => t.status !== 'done' && t.status !== 'cancelled');

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.projectId !== b.projectId) continue;
      if (!(a.startDate <= b.endDate && a.endDate >= b.startDate)) continue;

      const shared = a.modules.filter(m => b.modules.includes(m));
      if (!shared.length) continue;

      const overlapStart = a.startDate > b.startDate ? a.startDate : b.startDate;
      const overlapEnd   = a.endDate   < b.endDate   ? a.endDate   : b.endDate;

      result.push({
        id: `c-${a.id}-${b.id}`,
        ticket1Id: a.id,
        ticket2Id: b.id,
        modules: shared,
        type: a.environmentId === b.environmentId ? 'hard' : 'soft',
        projectId: a.projectId,
        overlapStart,
        overlapEnd,
      });
    }
  }
  return result;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

function appReducer(state, action) {
  switch (action.type) {

    case 'SET_PROJECT':
      return { ...state, selectedProjectId: action.id, view: 'timeline' };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'OPEN_TICKET':
      return { ...state, activeTicketId: action.id, ticketMode: action.mode || 'view', newTicketDefaults: {} };

    case 'CLOSE_TICKET':
      return { ...state, activeTicketId: null, ticketMode: null };

    case 'NEW_TICKET':
      return { ...state, activeTicketId: null, ticketMode: 'create', newTicketDefaults: action.defaults || {} };

    case 'SAVE_TICKET': {
      const t = action.ticket;
      const exists = state.tickets.some(x => x.id === t.id);
      return {
        ...state,
        tickets: exists
          ? state.tickets.map(x => (x.id === t.id ? t : x))
          : [...state.tickets, t],
        activeTicketId: null,
        ticketMode: null,
      };
    }

    case 'DELETE_TICKET':
      return { ...state, tickets: state.tickets.filter(t => t.id !== action.id), activeTicketId: null, ticketMode: null };

    case 'MOVE_TICKET': {
      const { id, startDate, endDate } = action;
      return { ...state, tickets: state.tickets.map(t => t.id === id ? { ...t, startDate, endDate } : t) };
    }

    case 'TOGGLE_CONFLICTS':
      return { ...state, conflictPanelOpen: !state.conflictPanelOpen };

    case 'OPEN_REGISTRY':
      return { ...state, registryOpen: true };

    case 'CLOSE_REGISTRY':
      return { ...state, registryOpen: false };

    case 'OPEN_ENV_MANAGER':
      return { ...state, envManagerOpen: true };

    case 'CLOSE_ENV_MANAGER':
      return { ...state, envManagerOpen: false };

    case 'SAVE_PROJECT': {
      const p = action.project;
      const exists = state.projects.some(x => x.id === p.id);
      return {
        ...state,
        projects: exists
          ? state.projects.map(x => (x.id === p.id ? p : x))
          : [...state.projects, p],
        selectedProjectId: p.id,
      };
    }

    default:
      return state;
  }
}

const AppCtx = createContext(null);

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, {
    projects: INIT_PROJECTS,
    tickets: INIT_TICKETS,
    selectedProjectId: 'p1',
    view: 'timeline',
    activeTicketId: null,
    ticketMode: null,
    newTicketDefaults: {},
    conflictPanelOpen: true,
    registryOpen: false,
    envManagerOpen: false,
  });

  const conflicts = useMemo(() => detectConflicts(state.tickets), [state.tickets]);

  return (
    <AppCtx.Provider value={{ state, dispatch, conflicts }}>
      {children}
    </AppCtx.Provider>
  );
}

function useApp() { return useContext(AppCtx); }

Object.assign(window, {
  AppCtx, AppProvider, useApp,
  detectConflicts, daysBetween, addDays, offset,
  formatDate, formatDateFull, generateId, TODAY_STR,
});
