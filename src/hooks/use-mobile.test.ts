import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  let matchMediaListeners: Array<() => void>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaListeners = [];
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_: string, cb: () => void) => {
        matchMediaListeners.push(cb);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
  });

  it("should return false when window width is >= 768 (desktop)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true when window width is < 768 (mobile)", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should return a boolean on first render — never undefined", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 500 });
    const { result } = renderHook(() => useIsMobile());
    expect(typeof result.current).toBe("boolean");
    // Must be true immediately, not false then true
    expect(result.current).toBe(true);
  });

  it("should update when window is resized", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, "innerWidth", { writable: true, value: 375 });
    act(() => {
      matchMediaListeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
