import type { Project, Ticket } from '../types'
import { offset } from './utils'

export const INIT_PROJECTS: Project[] = [
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
      { id: 'm-an',    name: 'Analytics Engine',  category: 'Core' },
      { id: 'm-inv',   name: 'Inventory Service', category: 'Core' },
      { id: 'm-ord',   name: 'Order Management',  category: 'Operations' },
      { id: 'm-rev',   name: 'Review System',     category: 'Operations' },
      { id: 'm-sauth', name: 'Seller Auth',        category: 'Auth' },
    ],
  },
]

export const INIT_TICKETS: Ticket[] = [
  {
    id: 't1', projectId: 'p1',
    title: 'Payment Gateway v2 Migration',
    description: 'Migrate from legacy gateway to v2 API. Zero-downtime deployment with feature flags.',
    startDate: offset(-8), endDate: null,
    environmentId: 'e-prod', status: 'in-progress',
    assignee: 'Budi Santoso', modules: ['m-pg', 'm-qw'], priority: 'high',
    deployments: [
      { id: 'd1-dev',  environmentId: 'e-dev',  date: offset(-8) },
      { id: 'd1-stag', environmentId: 'e-stag', date: offset(-4) },
      { id: 'd1-prod', environmentId: 'e-prod', date: offset(-2) },
    ],
  },
  {
    id: 't2', projectId: 'p1',
    title: 'Gateway Rollback Procedure Test',
    description: 'Validate rollback procedure before v2 goes fully live. Touches same production modules.',
    startDate: offset(-3), endDate: null,
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Dewi Rahayu', modules: ['m-pg', 'm-tl'], priority: 'high',
    deployments: [
      { id: 'd2-dev',  environmentId: 'e-dev',  date: offset(-3) },
      { id: 'd2-stag', environmentId: 'e-stag', date: offset(0) },
    ],
  },
  {
    id: 't3', projectId: 'p1',
    title: 'Checkout Performance Optimization',
    description: 'Optimize checkout flow response times. P99 target <200ms.',
    startDate: offset(-5), endDate: null,
    environmentId: 'e-stag', status: 'in-progress',
    assignee: 'Ahmad Fauzi', modules: ['m-pg', 'm-tl'], priority: 'medium',
    deployments: [
      { id: 'd3-dev',  environmentId: 'e-dev',  date: offset(-5) },
      { id: 'd3-stag', environmentId: 'e-stag', date: offset(-1) },
    ],
  },
  {
    id: 't4', projectId: 'p1',
    title: 'Auth Service Refactor',
    description: 'Refactor to new token schema. Breaking change — requires coordination across services.',
    startDate: offset(6), endDate: offset(11),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Sari Wijaya', modules: ['m-auth', 'm-up'], priority: 'high',
    deployments: [
      { id: 'd4-dev', environmentId: 'e-dev', date: offset(2) },
    ],
  },
  {
    id: 't5', projectId: 'p1',
    title: 'Security Patch CVE-2026-0921',
    description: 'Critical auth module security patch. Must ship by EOD May 22.',
    startDate: offset(7), endDate: offset(9),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Reza Pratama', modules: ['m-auth', 'm-cache'], priority: 'critical',
    deployments: [],
  },
  {
    id: 't6', projectId: 'p1',
    title: 'Notification Service v2',
    description: 'Push notifications and email templates upgrade.',
    startDate: offset(3), endDate: offset(7),
    environmentId: 'e-stag', status: 'planned',
    assignee: 'Indah Permata', modules: ['m-notif', 'm-qw'], priority: 'medium',
    deployments: [
      { id: 'd6-dev', environmentId: 'e-dev', date: offset(1) },
    ],
  },
  {
    id: 't7', projectId: 'p1',
    title: 'Transaction Audit Log v2',
    description: 'Enhanced audit logging for compliance requirements. Non-breaking.',
    startDate: offset(2), endDate: offset(8),
    environmentId: 'e-dev', status: 'in-progress',
    assignee: 'Ahmad Fauzi', modules: ['m-tl'], priority: 'low',
    deployments: [
      { id: 'd7-dev', environmentId: 'e-dev', date: offset(2) },
    ],
  },
  {
    id: 't8', projectId: 'p1',
    title: 'Queue Worker Scale-up',
    description: 'Scale to handle 10× throughput ahead of campaign season.',
    startDate: offset(12), endDate: offset(16),
    environmentId: 'e-prod', status: 'planned',
    assignee: 'Budi Santoso', modules: ['m-qw'], priority: 'medium',
    deployments: [],
  },
  {
    id: 't9', projectId: 'p2',
    title: 'Analytics Engine 3.0',
    description: 'Major rewrite of analytics engine with real-time processing capabilities.',
    startDate: offset(-7), endDate: null,
    environmentId: 'e2-stag', status: 'in-progress',
    assignee: 'Nurul Hidayah', modules: ['m-an'], priority: 'high',
    deployments: [
      { id: 'd9-dev',  environmentId: 'e2-dev',  date: offset(-7) },
      { id: 'd9-stag', environmentId: 'e2-stag', date: offset(-3) },
    ],
  },
  {
    id: 't10', projectId: 'p2',
    title: 'Inventory Sync Refactor',
    description: 'Fix race conditions in inventory sync. Affects order management.',
    startDate: offset(-5), endDate: null,
    environmentId: 'e2-prod', status: 'in-progress',
    assignee: 'Hendra Kurniawan', modules: ['m-inv', 'm-ord'], priority: 'high',
    deployments: [
      { id: 'd10-dev',  environmentId: 'e2-dev',  date: offset(-5) },
      { id: 'd10-stag', environmentId: 'e2-stag', date: offset(-2) },
      { id: 'd10-prod', environmentId: 'e2-prod', date: offset(0) },
    ],
  },
  {
    id: 't11', projectId: 'p2',
    title: 'Order Management API v2',
    description: 'New REST API with webhook support. Deprecates v1 endpoints.',
    startDate: offset(2), endDate: offset(7),
    environmentId: 'e2-prod', status: 'planned',
    assignee: 'Fitri Handayani', modules: ['m-ord', 'm-rev'], priority: 'medium',
    deployments: [
      { id: 'd11-dev', environmentId: 'e2-dev', date: offset(0) },
    ],
  },
  {
    id: 't12', projectId: 'p2',
    title: 'Seller Auth SSO Integration',
    description: 'Integrate Google SSO for seller authentication.',
    startDate: offset(8), endDate: offset(13),
    environmentId: 'e2-stag', status: 'planned',
    assignee: 'Nurul Hidayah', modules: ['m-sauth'], priority: 'medium',
    deployments: [],
  },
]
