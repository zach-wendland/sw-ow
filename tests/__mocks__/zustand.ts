import { act } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import type * as ZustandExportedTypes from 'zustand';

const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandExportedTypes>('zustand');

// Track all store reset functions
export const storeResetFns = new Set<() => void>();

// Create a store that tracks its initial state for reset
const createUncurried = <T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// Export create function that wraps the actual create
export const create = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  return typeof stateCreator === 'function'
    ? createUncurried(stateCreator)
    : createUncurried;
}) as typeof ZustandExportedTypes.create;

// Export createStore for vanilla stores
export const createStore = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
}) as typeof ZustandExportedTypes.createStore;

// Reset all stores after each test
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => resetFn());
  });
});

// Re-export everything else from zustand
export * from 'zustand';
