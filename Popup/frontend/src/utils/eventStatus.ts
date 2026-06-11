import type { EventStatus, IceCreamMode, OrderStatus } from "../api/types";

export const ICE_CREAM_MODES: IceCreamMode[] = ["none", "included", "optional"];

export const ICE_CREAM_MODE_LABELS: Record<IceCreamMode, string> = {
  none: "ללא גלידה",
  included: "כולל גלידה",
  optional: "גלידה אופציונלית",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: "טיוטה",
  survey: "סקר פעיל",
  published: "פעיל",
  completed: "הסתיים",
  cancelled: "בוטל",
};

export const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  survey: "bg-purple-100 text-purple-700",
  published: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-600",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "מאושר",
  picked_up: "נאסף",
  cancelled: "בוטל",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  confirmed: "bg-green-100 text-green-700",
  picked_up: "bg-blue-100 text-blue-700",
  cancelled: "bg-gray-100 text-gray-500",
};
