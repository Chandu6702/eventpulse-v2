import { api } from './client';
import type {
  AuthResponse,
  CheckInResult,
  EventCategory,
  EventDetail,
  EventSummary,
  Insight,
  Order,
  OrganizerAnalytics,
  Page,
  PersonalAnalytics,
  Ticket,
  User,
  WaitlistEntry,
} from './types';

// ---- Auth ----

export const authApi = {
  register: (body: { name: string; email: string; password: string; role?: string }) =>
    api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  refresh: () => api.post<AuthResponse>('/auth/refresh').then((r) => r.data),
  logout: () => api.post('/auth/logout').then(() => undefined),
  me: () => api.get<User>('/users/me').then((r) => r.data),
};

// ---- Profile ----

export const usersApi = {
  updateProfile: (body: { name: string }) =>
    api.patch<User>('/users/me', body).then((r) => r.data),
  becomeOrganizer: () => api.post<User>('/users/me/organizer').then((r) => r.data),
};

// ---- Analytics ----

export const analyticsApi = {
  personal: () => api.get<PersonalAnalytics>('/analytics/me').then((r) => r.data),
  organizer: () => api.get<OrganizerAnalytics>('/analytics/organizer').then((r) => r.data),
  // 204 = AI insights not configured on the server; callers hide the card.
  personalInsight: () =>
    api.get<Insight>('/analytics/me/insight').then((r) => (r.status === 204 ? null : r.data)),
  organizerInsight: () =>
    api
      .get<Insight>('/analytics/organizer/insight')
      .then((r) => (r.status === 204 ? null : r.data)),
};

// ---- Events ----

export interface EventFilters {
  q?: string;
  city?: string;
  category?: EventCategory | '';
  sort?: string;
  page?: number;
}

export const eventsApi = {
  browse: (filters: EventFilters) =>
    api
      .get<Page<EventSummary>>('/events', {
        params: {
          q: filters.q || undefined,
          city: filters.city || undefined,
          category: filters.category || undefined,
          sort: filters.sort || undefined,
          page: filters.page ?? 0,
        },
      })
      .then((r) => r.data),
  detail: (eventId: string) => api.get<EventDetail>(`/events/${eventId}`).then((r) => r.data),
  mine: (page = 0) =>
    api.get<Page<EventSummary>>('/events/mine', { params: { page } }).then((r) => r.data),
  create: (body: object) => api.post<EventDetail>('/events', body).then((r) => r.data),
  update: (eventId: string, body: object) =>
    api.patch<EventDetail>(`/events/${eventId}`, body).then((r) => r.data),
  publish: (eventId: string) =>
    api.post<EventDetail>(`/events/${eventId}/publish`).then((r) => r.data),
  cancel: (eventId: string) =>
    api.post<EventDetail>(`/events/${eventId}/cancel`).then((r) => r.data),
  addTicketType: (eventId: string, body: object) =>
    api.post(`/events/${eventId}/ticket-types`, body).then((r) => r.data),
  removeTicketType: (eventId: string, ticketTypeId: string) =>
    api.delete(`/events/${eventId}/ticket-types/${ticketTypeId}`).then(() => undefined),
};

// ---- Orders ----

export const ordersApi = {
  create: (body: { eventId: string; items: { ticketTypeId: string; quantity: number }[] }) =>
    api
      .post<Order>('/orders', body, {
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      })
      .then((r) => r.data),
  mine: (page = 0) => api.get<Page<Order>>('/orders', { params: { page } }).then((r) => r.data),
  get: (orderId: string) => api.get<Order>(`/orders/${orderId}`).then((r) => r.data),
  confirm: (orderId: string) =>
    api
      .post<Order>(`/orders/${orderId}/confirm`, { paymentReference: `pay_mock_${Date.now()}` })
      .then((r) => r.data),
  cancel: (orderId: string) => api.post<Order>(`/orders/${orderId}/cancel`).then((r) => r.data),
};

// ---- Tickets / waitlist / check-in ----

export const ticketsApi = {
  mine: () => api.get<Ticket[]>('/tickets').then((r) => r.data),
};

export const waitlistApi = {
  join: (ticketTypeId: string) =>
    api.post<WaitlistEntry>(`/ticket-types/${ticketTypeId}/waitlist`).then((r) => r.data),
  mine: () => api.get<WaitlistEntry[]>('/waitlist/mine').then((r) => r.data),
};

export const checkInApi = {
  scan: (code: string, eventId: string) =>
    api.post<CheckInResult>('/check-in', { code, eventId }).then((r) => r.data),
};
