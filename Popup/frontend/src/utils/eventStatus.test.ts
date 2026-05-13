import { describe, it, expect } from "vitest";
import {
  STATUS_LABELS, STATUS_COLORS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  ICE_CREAM_MODES, ICE_CREAM_MODE_LABELS,
} from "./eventStatus";

const EVENT_STATUSES = ["draft", "published", "completed", "cancelled"] as const;
const ORDER_STATUSES = ["confirmed", "picked_up", "cancelled"] as const;

describe("STATUS_LABELS", () => {
  it("has a label for every event status", () => {
    EVENT_STATUSES.forEach((s) => expect(STATUS_LABELS[s]).toBeTruthy());
  });
});

describe("STATUS_COLORS", () => {
  it("has a colour for every event status", () => {
    EVENT_STATUSES.forEach((s) => expect(STATUS_COLORS[s]).toBeTruthy());
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("has a label for every order status", () => {
    ORDER_STATUSES.forEach((s) => expect(ORDER_STATUS_LABELS[s]).toBeTruthy());
  });
});

describe("ORDER_STATUS_COLORS", () => {
  it("has a colour for every order status", () => {
    ORDER_STATUSES.forEach((s) => expect(ORDER_STATUS_COLORS[s]).toBeTruthy());
  });
});

describe("ICE_CREAM_MODES", () => {
  it("contains all three modes", () => {
    expect(ICE_CREAM_MODES).toEqual(expect.arrayContaining(["none", "included", "optional"]));
    expect(ICE_CREAM_MODES).toHaveLength(3);
  });
});

describe("ICE_CREAM_MODE_LABELS", () => {
  it("has a Hebrew label for every mode", () => {
    ICE_CREAM_MODES.forEach((m) => expect(ICE_CREAM_MODE_LABELS[m]).toBeTruthy());
  });
});
