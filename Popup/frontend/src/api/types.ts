export type IceCreamMode = "none" | "included" | "optional";
export type EventStatus = "draft" | "published" | "completed" | "cancelled";
export type OrderStatus = "confirmed" | "picked_up" | "cancelled";

export interface SlotPublic {
  id: string;
  slot_start: string;
  slot_end: string;
  max_ice_cream_effective: number;
  booked_portions: number;
  is_full: boolean;
}

export interface MenuItemPublic {
  id: string;
  product_name: string;
  ice_cream_mode: IceCreamMode;
  price: number;
  ice_cream_addon_price: number | null;
  remaining_quantity: number;
  image_url: string | null;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  slots: SlotPublic[];
  menu_items: MenuItemPublic[];
}

export interface UpcomingEventResponse {
  event: UpcomingEvent | null;
}

export interface OrderItemIn {
  event_menu_item_id: string;
  quantity: number;
  with_ice_cream?: boolean | null;
}

export interface OrderCreatePayload {
  event_id: string;
  slot_id: string | null;
  customer_name: string;
  notes: string | null;
  items: OrderItemIn[];
}

export interface OrderItemOut {
  id: string;
  event_menu_item_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  with_ice_cream: boolean | null;
}

export interface OrderOut {
  id: string;
  event_id: string;
  slot_id: string | null;
  customer_name: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  items: OrderItemOut[];
}

// Admin types
export interface ProductOut {
  id: string;
  name: string;
  description: string | null;
  ice_cream_mode: IceCreamMode;
  image_url: string | null;
  created_at: string;
}

export interface EventOut {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
  max_ice_cream_per_slot: number;
  status: EventStatus;
  created_at: string;
}

export interface OrderItemSummary {
  product_name: string;
  quantity: number;
  unit_price: number;
  with_ice_cream: boolean | null;
}

export interface OrderSummary {
  id: string;
  customer_name: string;
  status: OrderStatus;
  notes: string | null;
  items: OrderItemSummary[];
}

export interface SlotAdminOut {
  id: string;
  slot_start: string;
  slot_end: string;
  max_ice_cream: number | null;
  max_ice_cream_effective: number;
  booked_portions: number;
  is_full: boolean;
  orders: OrderSummary[];
}

export interface EventMenuItemOut {
  id: string;
  event_id: string;
  product_id: string;
  product_name: string;
  ice_cream_mode: IceCreamMode;
  quantity_available: number;
  price: number;
  ice_cream_addon_price: number | null;
  is_active: boolean;
}

// Cart item used across customer order flow
export interface CartItem {
  menuItem: MenuItemPublic;
  quantity: number;
  withIceCream: boolean;
}

// Typed payload interfaces for admin write calls
export interface EventCreatePayload {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
  max_ice_cream_per_slot: number;
}

export interface EventUpdatePayload {
  title?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  slot_duration_min?: number;
  max_ice_cream_per_slot?: number;
}

export interface ProductCreatePayload {
  name: string;
  description?: string;
  ice_cream_mode: IceCreamMode;
}

export interface ProductUpdatePayload {
  name?: string;
  description?: string;
  ice_cream_mode?: IceCreamMode;
  image_url?: string | null;
}

export interface MenuItemCreatePayload {
  product_id: string;
  quantity_available: number;
  price: number;
  ice_cream_addon_price: number | null;
}

export interface MenuItemUpdatePayload {
  quantity_available?: number;
  price?: number;
  ice_cream_addon_price?: number | null;
  is_active?: boolean;
}
