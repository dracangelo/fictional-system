import { useRef, useCallback } from 'react';

interface SwipeGestureConfig {
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
  trackMouse?: boolean;
}

interface SwipeGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (e: TouchEvent | MouseEvent) => void;
  onSwipeMove?: (e: TouchEvent | MouseEvent) => void;
  onSwipeEnd?: (e: TouchEvent | MouseEvent) => void;
}

export const useSwipeGestures = (
  handlers: SwipeGestureHandlers,
  config: SwipeGestureConfig = {}
) => {
  const {
    threshold = 50,
    preventDefaultTouchmoveEvent = false,
    trackMouse = false
  } = config;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const getTouchEventData = (e: TouchEvent | MouseEvent) => {
    if ('touches' in e) {
      return {
        x: e.touches[0]?.clientX || 0,
        y: e.touches[0]?.clientY || 0
      };
    }
    return {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleStart = useCallback((e: TouchEvent | MouseEvent) => {
    const { x, y } = getTouchEventData(e);
    touchStartRef.current = { x, y, time: Date.now() };
    handlers.onSwipeStart?.(e);
  }, [handlers]);

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (preventDefaultTouchmoveEvent && 'touches' in e) {
      e.preventDefault();
    }
    handlers.onSwipeMove?.(e);
  }, [handlers, preventDefaultTouchmoveEvent]);

  const handleEnd = useCallback((e: TouchEvent | MouseEvent) => {
    if (!touchStartRef.current) return;

    const { x, y } = getTouchEventData(e);
    touchEndRef.current = { x, y, time: Date.now() };

    const deltaX = touchEndRef.current.x - touchStartRef.current.x;
    const deltaY = touchEndRef.current.y - touchStartRef.current.y;
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time;

    // Calculate swipe distance and velocity
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Only trigger swipe if it meets threshold and has reasonable velocity
    if (distance > threshold && velocity > 0.1) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine swipe direction
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    handlers.onSwipeEnd?.(e);
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [handlers, threshold]);

  const swipeHandlers = {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    ...(trackMouse && {
      onMouseDown: handleStart,
      onMouseMove: handleMove,
      onMouseUp: handleEnd
    })
  };

  return swipeHandlers;
};

// Hook for detecting pinch gestures (zoom)
export const usePinchGesture = (
  onPinch: (scale: number, center: { x: number; y: number }) => void,
  config: { threshold?: number } = {}
) => {
  const { threshold = 0.1 } = config;
  const initialDistanceRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touch1: Touch, touch2: Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getCenter = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      initialScaleRef.current = 1;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistanceRef.current > 0) {
      e.preventDefault();
      
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      const center = getCenter(e.touches[0], e.touches[1]);

      if (Math.abs(scale - initialScaleRef.current) > threshold) {
        onPinch(scale, center);
        initialScaleRef.current = scale;
      }
    }
  }, [onPinch, threshold]);

  const handleTouchEnd = useCallback(() => {
    initialDistanceRef.current = 0;
    initialScaleRef.current = 1;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};