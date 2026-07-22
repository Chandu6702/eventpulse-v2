export type Role = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: User;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type EventCategory =
  | 'CONFERENCE'
  | 'MEETUP'
  | 'WORKSHOP'
  | 'WEBINAR'
  | 'CONCERT'
  | 'OTHER';

export interface EventSummary {
  id: string;
  title: string;
  category: EventCategory;
  venue: string;
  city: string | null;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
}

export interface TicketType {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  capacity: number;
  available: number;
  perOrderLimit: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  onSale: boolean;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  organizerName: string;
  ticketTypes: TicketType[];
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface OrderItem {
  ticketTypeId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  eventId: string;
  eventTitle: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  expiresAt: string;
  confirmedAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export type TicketStatus = 'VALID' | 'CHECKED_IN' | 'VOID';

export interface Ticket {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  startsAt: string;
  ticketTypeName: string;
  status: TicketStatus;
  checkedInAt: string | null;
}

export interface WaitlistEntry {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  eventTitle: string;
  status: 'WAITING' | 'NOTIFIED' | 'CONVERTED';
  peopleAhead: number;
  createdAt: string;
  notifiedAt: string | null;
}

export interface CheckInResult {
  ticketId: string;
  attendeeName: string;
  ticketTypeName: string;
  eventTitle: string;
  checkedInAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiProblem {
  status: number;
  detail: string;
  errors?: Record<string, string>;
}
