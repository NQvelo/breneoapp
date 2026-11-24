import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";

const LONG_PRESS_DELAY_MS = 400;
const MOVE_CANCEL_THRESHOLD_PX = 10;

interface DragPosition {
  left: number;
  top: number;
  width: number;
}

export function useLongPressDrag(
  enabled: boolean,
  onDrop: (itemId: string, columnId: string) => void,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);
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
      dropTargetRef.current = sourceColumn ?? null;
      setDropTarget(sourceColumn ?? null);
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        draggingIdRef.current = itemId;
        setDraggingId(itemId);
        setDragPosition(initialPosition);
      }, LONG_PRESS_DELAY_MS);
    },
    [clearLongPressTimer, enabled],
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
      const column = document
        .elementFromPoint(touch.clientX, touch.clientY)
        ?.closest<HTMLElement>("[data-management-column]")
        ?.dataset.managementColumn;
      dropTargetRef.current = column ?? null;
      setDropTarget(column ?? null);
    };

    const finishDrag = (shouldDrop: boolean) => {
      const itemId = draggingIdRef.current;
      const columnId = dropTargetRef.current;
      if (shouldDrop && itemId && columnId) {
        onDropRef.current(itemId, columnId);
        suppressClickRef.current = true;
        clickResetTimerRef.current = setTimeout(() => {
          suppressClickRef.current = false;
          clickResetTimerRef.current = null;
        }, 600);
      }
      draggingIdRef.current = null;
      dropTargetRef.current = null;
      startPointRef.current = null;
      grabOffsetRef.current = null;
      setDraggingId(null);
      setDropTarget(null);
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
  }, [draggingId]);

  useEffect(
    () => () => {
      clearLongPressTimer();
      if (clickResetTimerRef.current) clearTimeout(clickResetTimerRef.current);
    },
    [clearLongPressTimer],
  );

  return {
    draggingId,
    dropTarget,
    dragPosition,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onClickCapture,
  };
}
