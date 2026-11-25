import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent, MouseEvent, TouchEvent } from "react";

const LONG_PRESS_DELAY_MS = 400;
const MOVE_CANCEL_THRESHOLD_PX = 10;

interface DragPosition {
  left: number;
  top: number;
  width: number;
}

interface DropPosition {
  columnId: string;
  beforeId: string | null;
}

function getDropPosition(
  column: HTMLElement,
  itemId: string,
  clientY: number,
  columnId: string,
): DropPosition {
  const cards = Array.from(
    column.querySelectorAll<HTMLElement>("[data-management-item]"),
  ).filter((card) => card.dataset.managementItem !== itemId);
  const beforeCard = cards.find((card) => {
    const bounds = card.getBoundingClientRect();
    return clientY < bounds.top + bounds.height / 2;
  });

  return {
    columnId,
    beforeId: beforeCard?.dataset.managementItem ?? null,
  };
}

export function useLongPressDrag(
  enabled: boolean,
  onDrop: (itemId: string, columnId: string, beforeId: string | null) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nativeDraggingId, setNativeDraggingId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const nativePreviewRef = useRef<HTMLElement | null>(null);
  const nativeDraggingIdRef = useRef<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dropPositionRef = useRef<DropPosition | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const grabOffsetRef = useRef<{ x: number; y: number; width: number } | null>(
    null,
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const updateDropPosition = useCallback((position: DropPosition | null) => {
    dropPositionRef.current = position;
    setDropPosition(position);
  }, []);

  const updateTouchDropPosition = useCallback(
    (clientX: number, clientY: number, itemId: string) => {
      const column = document
        .elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>("[data-management-column]");
      const columnId = column?.dataset.managementColumn;
      if (!column || !columnId) {
        updateDropPosition(null);
        return;
      }

      updateDropPosition(
        getDropPosition(column, itemId, clientY, columnId),
      );
    },
    [updateDropPosition],
  );

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>, itemId: string) => {
      if (!enabled || event.touches.length !== 1) return;
      if ((event.target as Element).closest("button, a, input, textarea, select")) {
        return;
      }

      const touch = event.touches[0];
      const bounds = event.currentTarget.getBoundingClientRect();
      const initialPosition = {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
      };
      const sourceColumn = event.currentTarget
        .closest<HTMLElement>("[data-management-column]")
        ?.dataset.managementColumn;
      startPointRef.current = { x: touch.clientX, y: touch.clientY };
      grabOffsetRef.current = {
        x: touch.clientX - bounds.left,
        y: touch.clientY - bounds.top,
        width: bounds.width,
      };
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        draggingIdRef.current = itemId;
        setDraggingId(itemId);
        setDragPosition(initialPosition);
        const column = document
          .elementFromPoint(touch.clientX, touch.clientY)
          ?.closest<HTMLElement>("[data-management-column]");
        if (column && sourceColumn) {
          updateDropPosition(
            getDropPosition(column, itemId, touch.clientY, sourceColumn),
          );
        }
      }, LONG_PRESS_DELAY_MS);
    },
    [clearLongPressTimer, enabled, updateDropPosition],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      const startPoint = startPointRef.current;
      if (!startPoint || draggingIdRef.current || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const distance = Math.hypot(
        touch.clientX - startPoint.x,
        touch.clientY - startPoint.y,
      );
      if (distance > MOVE_CANCEL_THRESHOLD_PX) clearLongPressTimer();
    },
    [clearLongPressTimer],
  );

  const onTouchEnd = useCallback(() => {
    clearLongPressTimer();
    startPointRef.current = null;
  }, [clearLongPressTimer]);

  const onClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
    if (clickResetTimerRef.current) {
      clearTimeout(clickResetTimerRef.current);
      clickResetTimerRef.current = null;
    }
  }, []);

  const onNativeDragStart = useCallback(
    (event: DragEvent<HTMLElement>, itemId: string) => {
      const { currentTarget, dataTransfer } = event;
      const bounds = currentTarget.getBoundingClientRect();
      const preview = currentTarget.cloneNode(true) as HTMLElement;
      const offsetX = event.clientX - bounds.left;
      const offsetY = event.clientY - bounds.top;

      Object.assign(preview.style, {
        position: "fixed",
        left: "-10000px",
        top: "-10000px",
        width: `${bounds.width}px`,
        margin: "0",
        opacity: "0.98",
        transform: "scale(1.04) rotate(-1.5deg)",
        transformOrigin: `${offsetX}px ${offsetY}px`,
        boxShadow: "0 20px 48px rgba(15, 23, 42, 0.3)",
        outline: "1px solid rgba(59, 130, 246, 0.35)",
        pointerEvents: "none",
      });
      preview.setAttribute("aria-hidden", "true");
      document.body.appendChild(preview);
      nativePreviewRef.current = preview;
      nativeDraggingIdRef.current = itemId;

      dataTransfer.effectAllowed = "move";
      dataTransfer.setData("text/plain", itemId);
      dataTransfer.setDragImage(preview, offsetX, offsetY);
      setNativeDraggingId(itemId);
    },
    [],
  );

  const onNativeDragOver = useCallback(
    (event: DragEvent<HTMLElement>, columnId: string) => {
      const itemId = nativeDraggingIdRef.current;
      if (!itemId) return;
      updateDropPosition(
        getDropPosition(event.currentTarget, itemId, event.clientY, columnId),
      );
    },
    [updateDropPosition],
  );

  const onNativeDragEnd = useCallback(() => {
    nativePreviewRef.current?.remove();
    nativePreviewRef.current = null;
    nativeDraggingIdRef.current = null;
    setNativeDraggingId(null);
    updateDropPosition(null);
  }, [updateDropPosition]);

  useEffect(() => {
    if (!draggingId) return;

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) return;
      event.preventDefault();
      const touch = event.touches[0];
      const grabOffset = grabOffsetRef.current;
      if (grabOffset) {
        setDragPosition({
          left: touch.clientX - grabOffset.x,
          top: touch.clientY - grabOffset.y,
          width: grabOffset.width,
        });
      }
      updateTouchDropPosition(
        touch.clientX,
        touch.clientY,
        draggingIdRef.current ?? "",
      );
    };

    const finishDrag = (shouldDrop: boolean) => {
      const itemId = draggingIdRef.current;
      const position = dropPositionRef.current;
      if (shouldDrop && itemId && position) {
        onDropRef.current(itemId, position.columnId, position.beforeId);
        suppressClickRef.current = true;
        clickResetTimerRef.current = setTimeout(() => {
          suppressClickRef.current = false;
          clickResetTimerRef.current = null;
        }, 600);
      }
      draggingIdRef.current = null;
      dropPositionRef.current = null;
      startPointRef.current = null;
      grabOffsetRef.current = null;
      setDraggingId(null);
      setDropPosition(null);
      setDragPosition(null);
    };

    const handleTouchEnd = () => finishDrag(true);
    const handleTouchCancel = () => finishDrag(false);

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchCancel);
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [draggingId, updateTouchDropPosition]);

  useEffect(
    () => () => {
      clearLongPressTimer();
      if (clickResetTimerRef.current) clearTimeout(clickResetTimerRef.current);
      nativePreviewRef.current?.remove();
    },
    [clearLongPressTimer],
  );

  return {
    draggingId,
    nativeDraggingId,
    dropPosition,
    dragPosition,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onClickCapture,
    onNativeDragStart,
    onNativeDragOver,
    onNativeDragEnd,
  };
}
