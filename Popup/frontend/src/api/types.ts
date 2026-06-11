export type IceCreamMode = "none" | "included" | "optional";
export type EventStatus = "draft" | "survey" | "published" | "completed" | "cancelled";
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
  description: string | null;
  ice_cream_mode: IceCreamMode;
  price: number;
  ice_cream_addon_price: number | null;
  remaining_quantity: number;
  image_url: string | null;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  max_ice_cream_total: number | null;
  ice_cream_total_remaining: number | null;
  slots: SlotPublic[];
  menu_items: MenuItemPublic[];
}

export interface UpcomingEventResponse {
  event: UpcomingEvent | null;
  survey_event_id: string | null;
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
  default_quantity: number | null;
  default_price: number | null;
  created_at: string;
}

export interface EventOut {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  slot_duration_min: number;
  max_ice_cream_per_slot: number;
  max_ice_cream_total: number | null;
  status: EventStatus;
  survey_ends_at: string | null;
  menu_size: number | null;
  created_at: string;
}

export interface SurveyProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  ice_cream_mode: IceCreamMode;
}

export interface SurveyPublicOut {
  id: string;
  title: string;
  description: string | null;
  date: string;
  survey_ends_at: string;
  menu_size: number;
  products: SurveyProduct[];
}

export interface SurveyResultItem {
  product_id: string;
  product_name: string;
  vote_count: number;
  is_fixed: boolean;
}

export interface SurveyResultsOut {
  results: SurveyResultItem[];
  total_voters: number;
  survey_ends_at: string;
  menu_size: number;
}

export interface SurveyFixedProductOut {
  id: string;
  product_id: string;
  product: SurveyProduct;
}

export interface SurveyStartPayload {
  survey_ends_at: string;
  menu_size: number;
  fixed_product_ids: string[];
}

export interface SurveyVotePayload {
  voter_name: string;
  browser_token: string;
  product_ids: string[];
}


export interface OrderItemSummary {
  product_name: string;
  quantity: number;
  unit_price: number;
  with_ice_cream: boolean | null;
  used_ice_cream: boolean;
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
  sort_order: number;
}

// Cart item used across customer order flow
export interface CartItem {
  menuItem: MenuItemPublic;
  quantityWithIceCream: number;
  quantityWithoutIceCream: number;
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
  description?: string | null;
  date?: string;
  start_time?: string;
  end_time?: string;
  slot_duration_min?: number;
  max_ice_cream_per_slot?: number;
  max_ice_cream_total?: number | null;
}

export interface ProductCreatePayload {
  name: string;
  description?: string;
  ice_cream_mode: IceCreamMode;
  default_quantity?: number | null;
  default_price?: number | null;
}

export interface ProductUpdatePayload {
  name?: string;
  description?: string;
  ice_cream_mode?: IceCreamMode;
  image_url?: string | null;
  default_quantity?: number | null;
  default_price?: number | null;
}

export interface AboutPageOut {
  bio_text: string | null;
  image_url: string | null;
}

export interface AboutPageUpdatePayload {
  bio_text?: string | null;
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
