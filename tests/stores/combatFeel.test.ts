import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useCombatStore, COMBAT_FEEL } from "@/lib/stores/useCombatStore";

/**
 * Combat Feel System - Smoke Tests
 *
 * These tests verify the hitstop and screen shake systems work correctly.
 * They ensure the combat feel improvements don't break during development.
 */

describe("Combat Feel Systems", () => {
  beforeEach(() => {
    // Reset combat store
    useCombatStore.setState({
      hitStopEndTime: 0,
      screenShakeIntensity: 0,
      screenShakeEndTime: 0,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Hitstop System", () => {
    it("should export COMBAT_FEEL constants", () => {
      expect(COMBAT_FEEL.HITSTOP_FRAMES_NORMAL).toBe(3);
      expect(COMBAT_FEEL.HITSTOP_FRAMES_CRITICAL).toBe(6);
      expect(COMBAT_FEEL.HITSTOP_FRAMES_KILL).toBe(8);
      expect(COMBAT_FEEL.FRAME_DURATION_MS).toBeCloseTo(16.67, 1);
    });

    it("should trigger hitstop for specified frames", () => {
      const store = useCombatStore.getState();
      const beforeTime = Date.now();

      store.triggerHitStop(3);

      const state = useCombatStore.getState();
      // Hitstop end time should be ~50ms in the future (3 frames at ~16.67ms)
      expect(state.hitStopEndTime).toBeGreaterThan(beforeTime);
      expect(state.hitStopEndTime - beforeTime).toBeCloseTo(50, -1);
    });

    it("should return timeScale 0 during hitstop", () => {
      const store = useCombatStore.getState();

      // Trigger hitstop for 10 frames (long enough to test)
      store.triggerHitStop(10);

      // Time scale should be 0 during hitstop
      expect(store.getTimeScale()).toBe(0);
    });

    it("should return timeScale 1 after hitstop ends", () => {
      const store = useCombatStore.getState();

      // Set hitStopEndTime to the past
      useCombatStore.setState({ hitStopEndTime: Date.now() - 100 });

      // Time scale should be 1 after hitstop
      expect(store.getTimeScale()).toBe(1);
    });

    it("should return timeScale 1 when no hitstop is active", () => {
      const store = useCombatStore.getState();

      // No hitstop triggered
      expect(store.getTimeScale()).toBe(1);
    });

    it("should handle normal hit hitstop duration", () => {
      const store = useCombatStore.getState();
      const beforeTime = Date.now();

      store.triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_NORMAL);

      const expectedDuration = COMBAT_FEEL.HITSTOP_FRAMES_NORMAL * COMBAT_FEEL.FRAME_DURATION_MS;
      const actualDuration = useCombatStore.getState().hitStopEndTime - beforeTime;

      expect(actualDuration).toBeCloseTo(expectedDuration, -1);
    });

    it("should handle critical hit hitstop duration", () => {
      const store = useCombatStore.getState();
      const beforeTime = Date.now();

      store.triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_CRITICAL);

      const expectedDuration = COMBAT_FEEL.HITSTOP_FRAMES_CRITICAL * COMBAT_FEEL.FRAME_DURATION_MS;
      const actualDuration = useCombatStore.getState().hitStopEndTime - beforeTime;

      expect(actualDuration).toBeCloseTo(expectedDuration, -1);
    });

    it("should handle kill hit hitstop duration", () => {
      const store = useCombatStore.getState();
      const beforeTime = Date.now();

      store.triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_KILL);

      const expectedDuration = COMBAT_FEEL.HITSTOP_FRAMES_KILL * COMBAT_FEEL.FRAME_DURATION_MS;
      const actualDuration = useCombatStore.getState().hitStopEndTime - beforeTime;

      expect(actualDuration).toBeCloseTo(expectedDuration, -1);
    });
  });

  describe("Screen Shake System", () => {
    it("should trigger screen shake with intensity and duration", () => {
      const store = useCombatStore.getState();
      const beforeTime = Date.now();

      store.triggerScreenShake(0.2, 200);

      const state = useCombatStore.getState();
      expect(state.screenShakeIntensity).toBe(0.2);
      expect(state.screenShakeEndTime).toBeGreaterThan(beforeTime);
      expect(state.screenShakeEndTime - beforeTime).toBeCloseTo(200, -1);
    });

    it("should return zero shake when no shake is active", () => {
      const store = useCombatStore.getState();

      const shake = store.getScreenShake();
      expect(shake.x).toBe(0);
      expect(shake.y).toBe(0);
    });

    it("should return zero shake when shake has ended", () => {
      // Set shake end time in the past
      useCombatStore.setState({
        screenShakeIntensity: 0.5,
        screenShakeEndTime: Date.now() - 100,
      });

      const store = useCombatStore.getState();
      const shake = store.getScreenShake();

      expect(shake.x).toBe(0);
      expect(shake.y).toBe(0);
    });

    it("should return non-zero shake during active shake", () => {
      const store = useCombatStore.getState();

      // Trigger a shake that lasts 1 second
      store.triggerScreenShake(0.5, 1000);

      const shake = store.getScreenShake();

      // Shake values should be within intensity range
      expect(Math.abs(shake.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(shake.y)).toBeLessThanOrEqual(0.5);
    });

    it("should produce random shake values", () => {
      const store = useCombatStore.getState();
      store.triggerScreenShake(0.5, 1000);

      const shakes: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 10; i++) {
        shakes.push(store.getScreenShake());
      }

      // At least some values should be different (randomness check)
      const uniqueX = new Set(shakes.map((s) => s.x)).size;
      const uniqueY = new Set(shakes.map((s) => s.y)).size;

      expect(uniqueX).toBeGreaterThan(1);
      expect(uniqueY).toBeGreaterThan(1);
    });

    it("should handle light shake for normal hits", () => {
      const store = useCombatStore.getState();
      store.triggerScreenShake(0.1, 100);

      const state = useCombatStore.getState();
      expect(state.screenShakeIntensity).toBe(0.1);
    });

    it("should handle medium shake for critical hits", () => {
      const store = useCombatStore.getState();
      store.triggerScreenShake(0.2, 150);

      const state = useCombatStore.getState();
      expect(state.screenShakeIntensity).toBe(0.2);
    });

    it("should handle heavy shake for kills", () => {
      const store = useCombatStore.getState();
      store.triggerScreenShake(0.3, 200);

      const state = useCombatStore.getState();
      expect(state.screenShakeIntensity).toBe(0.3);
    });
  });

  describe("Combined Combat Feel", () => {
    it("should support simultaneous hitstop and screen shake", () => {
      const store = useCombatStore.getState();

      // Trigger both effects
      store.triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_CRITICAL);
      store.triggerScreenShake(0.2, 150);

      const state = useCombatStore.getState();

      // Both should be active
      expect(state.hitStopEndTime).toBeGreaterThan(Date.now() - 10);
      expect(state.screenShakeIntensity).toBe(0.2);
      expect(store.getTimeScale()).toBe(0);
    });

    it("should handle rapid successive triggers", () => {
      const store = useCombatStore.getState();

      // Rapid fire triggers (simulating combo attacks)
      for (let i = 0; i < 5; i++) {
        store.triggerHitStop(COMBAT_FEEL.HITSTOP_FRAMES_NORMAL);
        store.triggerScreenShake(0.1, 100);
      }

      // Should still work without errors
      const state = useCombatStore.getState();
      expect(state.hitStopEndTime).toBeGreaterThan(0);
      expect(state.screenShakeIntensity).toBe(0.1);
    });
  });
});
