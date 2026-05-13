import type {
  UpcomingEventResponse, OrderCreatePayload, OrderOut,
  ProductOut, EventOut, SlotAdminOut, EventMenuItemOut,
  EventCreatePayload, EventUpdatePayload,
  ProductCreatePayload, ProductUpdatePayload,
  MenuItemCreatePayload, MenuItemUpdatePayload,
} from "./types";

export const BASE = import.meta.env.VITE_API_URL ?? "";

let adminPassword: string | null = null;
let onUnauthorized: (() => void) | null = null;

function getAdminPassword(): string | null {
  if (adminPassword === null) {
    adminPassword = localStorage.getItem("adminPassword");
  }
  return adminPassword;
}

export type ApiError = Error & {
  status?: number;
  current_booked?: number;
};

export function toApiError(err: unknown): ApiError {
  if (err instanceof Error) return err as ApiError;
  return new Error(String(err)) as ApiError;
}

export function setAdminPasswordTransient(pw: string): void {
  adminPassword = pw;
}

export function setAdminPassword(pw: string): void {
  adminPassword = pw;
  localStorage.setItem("adminPassword", pw);
}

export function clearAdminAuth(): void {
  adminPassword = null;
  localStorage.removeItem("adminPassword");
}

export function hasStoredAdminSession(): boolean {
  return localStorage.getItem("adminPassword") !== null;
}

export function registerUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isAdmin = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, options.headers as Record<string, string> | undefined);

  if (isAdmin) {
    const pw = getAdminPassword();
    if (pw) headers["Authorization"] = `Bearer ${pw}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error("NETWORK_ERROR");
  }

  if (response.status === 401 && isAdmin) {
    clearAdminAuth();
    onUnauthorized?.();
    throw new Error("UNAUTHORIZED");
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    let extra: Record<string, unknown> = {};
    try {
      const body = await response.json();
      if (typeof body.detail === "string") {
        detail = body.detail;
        extra = body;
      } else if (body.detail && typeof body.detail === "object") {
        const d = body.detail as Record<string, unknown>;
        detail = typeof d.message === "string" ? d.message : JSON.stringify(d);
        extra = d;
      }
    } catch {}
    const err = Object.assign(new Error(detail), extra, { status: response.status });
    throw err;
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// Public
export const getUpcomingEvent = (): Promise<UpcomingEventResponse> =>
  request<UpcomingEventResponse>("/events/upcoming");

export const createOrder = (payload: OrderCreatePayload): Promise<OrderOut> =>
  request<OrderOut>("/orders", { method: "POST", body: JSON.stringify(payload) });

// Admin — Events
export const adminListEvents = (): Promise<EventOut[]> =>
  request<EventOut[]>("/admin/events", {}, true);

export const adminCreateEvent = (data: EventCreatePayload): Promise<EventOut> =>
  request<EventOut>("/admin/events", { method: "POST", body: JSON.stringify(data) }, true);

export const adminGetEvent = (id: string): Promise<EventOut> =>
  request<EventOut>(`/admin/events/${id}`, {}, true);

export const adminUpdateEvent = (id: string, data: EventUpdatePayload): Promise<EventOut> =>
  request<EventOut>(`/admin/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }, true);

export const adminDeleteEvent = (id: string): Promise<void> =>
  request<void>(`/admin/events/${id}`, { method: "DELETE" }, true);

export const adminPublishEvent = (id: string): Promise<EventOut> =>
  request<EventOut>(`/admin/events/${id}/publish`, { method: "POST" }, true);

export const adminCompleteEvent = (id: string): Promise<EventOut> =>
  request<EventOut>(`/admin/events/${id}/complete`, { method: "POST" }, true);

export const adminCancelEvent = (id: string): Promise<EventOut> =>
  request<EventOut>(`/admin/events/${id}/cancel`, { method: "POST" }, true);

// Admin — Slots
export const adminListSlots = (eventId: string): Promise<SlotAdminOut[]> =>
  request<SlotAdminOut[]>(`/admin/events/${eventId}/slots`, {}, true);

export const adminUpdateSlot = (slotId: string, data: { max_ice_cream: number }): Promise<SlotAdminOut> =>
  request<SlotAdminOut>(`/admin/slots/${slotId}`, { method: "PATCH", body: JSON.stringify(data) }, true);

// Admin — Products
export const adminListProducts = (): Promise<ProductOut[]> =>
  request<ProductOut[]>("/admin/products", {}, true);

export const adminCreateProduct = (data: ProductCreatePayload): Promise<ProductOut> =>
  request<ProductOut>("/admin/products", { method: "POST", body: JSON.stringify(data) }, true);

export const adminUpdateProduct = (id: string, data: ProductUpdatePayload): Promise<ProductOut> =>
  request<ProductOut>(`/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }, true);

export const adminUploadProductImage = (id: string, file: File): Promise<ProductOut> => {
  const formData = new FormData();
  formData.append("file", file);
  return request<ProductOut>(`/admin/products/${id}/image`, { method: "POST", body: formData }, true);
};

export const adminDeleteProduct = (id: string): Promise<void> =>
  request<void>(`/admin/products/${id}`, { method: "DELETE" }, true);

// Admin — Menu Items
export const adminListMenuItems = (eventId: string): Promise<EventMenuItemOut[]> =>
  request<EventMenuItemOut[]>(`/admin/events/${eventId}/menu`, {}, true);

export const adminAddMenuItem = (eventId: string, data: MenuItemCreatePayload): Promise<EventMenuItemOut> =>
  request<EventMenuItemOut>(`/admin/events/${eventId}/menu`, { method: "POST", body: JSON.stringify(data) }, true);

export const adminUpdateMenuItem = (itemId: string, data: MenuItemUpdatePayload): Promise<EventMenuItemOut> =>
  request<EventMenuItemOut>(`/admin/menu-items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) }, true);

export const adminDeleteMenuItem = (itemId: string): Promise<void> =>
  request<void>(`/admin/menu-items/${itemId}`, { method: "DELETE" }, true);

// Admin — Orders
export const adminListOrders = (eventId: string): Promise<OrderOut[]> =>
  request<OrderOut[]>(`/admin/events/${eventId}/orders`, {}, true);

export const adminPickupOrder = (orderId: string): Promise<OrderOut> =>
  request<OrderOut>(`/admin/orders/${orderId}/pickup`, { method: "POST" }, true);

export const adminCancelOrder = (orderId: string): Promise<OrderOut> =>
  request<OrderOut>(`/admin/orders/${orderId}/cancel`, { method: "POST" }, true);
