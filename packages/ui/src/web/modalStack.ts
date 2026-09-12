"use client";

import { useEffect, useRef } from "react";

export interface ModalStackEntry {
  id: string;
  dismiss: () => void;
  isBlocked?: boolean;
}

const modalStack: ModalStackEntry[] = [];
let listenerAttached = false;

function handleGlobalKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (modalStack.length === 0) return;

  const top = modalStack[modalStack.length - 1];
  if (top.isBlocked) return;

  // Intercept and dismiss ONLY the topmost modal in strict LIFO order
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  top.dismiss();
}

function ensureListener() {
  if (typeof window === "undefined" || listenerAttached) return;
  window.addEventListener("keydown", handleGlobalKeyDown, true);
  listenerAttached = true;
}

export function pushModal(entry: ModalStackEntry): void {
  const index = modalStack.findIndex((m) => m.id === entry.id);
  if (index !== -1) {
    modalStack.splice(index, 1);
  }
  modalStack.push(entry);
  ensureListener();
}

export function popModal(id: string): void {
  const index = modalStack.findIndex((m) => m.id === id);
  if (index !== -1) {
    modalStack.splice(index, 1);
  }
}

export function isTopModal(id: string): boolean {
  if (modalStack.length === 0) return false;
  return modalStack[modalStack.length - 1].id === id;
}

export interface UseModalDismissOptions {
  id: string;
  isOpen: boolean;
  onDismiss: () => void;
  isBlocked?: boolean;
}

/**
 * Universal hook to register any modal, drawer, or dialog with the global LIFO stack.
 * Ensures hitting Escape closes only the topmost modal, never parent modals simultaneously.
 */
export function useModalDismiss({ id, isOpen, onDismiss, isBlocked = false }: UseModalDismissOptions): void {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!isOpen) {
      popModal(id);
      return;
    }

    pushModal({
      id,
      dismiss: () => dismissRef.current(),
      isBlocked,
    });

    return () => {
      popModal(id);
    };
  }, [id, isOpen, isBlocked]);
}
