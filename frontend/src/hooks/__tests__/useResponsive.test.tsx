import { renderHook, act } from '@testing-library/react';
import { useResponsive, useTouchDevice, useViewportHeight, useOrientation } from '../useResponsive';

// Mock window properties
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('useResponsive', () => {
  beforeEach(() => {
    // Reset to default desktop size
    mockWindowSize(1024, 768);
  });

  it('returns correct screen size for desktop', () => {
    mockWindowSize(1024, 768);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.screenSize).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('returns correct screen size for mobile', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.screenSize).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('returns correct screen size for tablet', () => {
    mockWindowSize(768, 1024);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.screenSize).toBe('tablet');
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns correct screen size for wide screen', () => {
    mockWindowSize(1440, 900);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.screenSize).toBe('wide');
    expect(result.current.isWide).toBe(true);
    expect(result.current.isDesktop).toBe(true);
  });

  it('updates screen size on window resize', () => {
    mockWindowSize(1024, 768);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.screenSize).toBe('desktop');
    
    act(() => {
      mockWindowSize(375, 667);
      window.dispatchEvent(new Event('resize'));
    });
    
    expect(result.current.screenSize).toBe('mobile');
  });

  it('returns correct window size', () => {
    mockWindowSize(1024, 768);
    const { result } = renderHook(() => useResponsive());
    
    expect(result.current.windowSize).toEqual({
      width: 1024,
      height: 768
    });
  });

  it('accepts custom breakpoints', () => {
    const customBreakpoints = {
      mobile: 480,
      tablet: 800,
      desktop: 1200,
      wide: 1600
    };
    
    mockWindowSize(600, 800);
    const { result } = renderHook(() => useResponsive(customBreakpoints));
    
    expect(result.current.screenSize).toBe('mobile');
    expect(result.current.breakpoints).toEqual(customBreakpoints);
  });

  it('handles partial custom breakpoints', () => {
    const partialBreakpoints = {
      mobile: 480
    };
    
    const { result } = renderHook(() => useResponsive(partialBreakpoints));
    
    expect(result.current.breakpoints.mobile).toBe(480);
    expect(result.current.breakpoints.tablet).toBe(768); // default value
  });
});

describe('useTouchDevice', () => {
  it('detects touch device correctly', () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: null,
    });
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current).toBe(true);
  });

  it('detects non-touch device correctly', () => {
    // Remove touch support
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    });
    
    const { result } = renderHook(() => useTouchDevice());
    
    expect(result.current).toBe(false);
  });
});

describe('useViewportHeight', () => {
  it('returns current viewport height', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useViewportHeight());
    
    expect(result.current).toBe(667);
  });

  it('updates viewport height on resize', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useViewportHeight());
    
    expect(result.current).toBe(667);
    
    act(() => {
      mockWindowSize(375, 600);
      window.dispatchEvent(new Event('resize'));
    });
    
    expect(result.current).toBe(600);
  });

  it('updates viewport height on orientation change', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useViewportHeight());
    
    expect(result.current).toBe(667);
    
    act(() => {
      mockWindowSize(667, 375);
      window.dispatchEvent(new Event('orientationchange'));
    });
    
    expect(result.current).toBe(375);
  });

  it('sets CSS custom property for viewport height', () => {
    mockWindowSize(375, 667);
    renderHook(() => useViewportHeight());
    
    const vh = window.innerHeight * 0.01;
    expect(document.documentElement.style.getPropertyValue('--vh')).toBe(`${vh}px`);
  });
});

describe('useOrientation', () => {
  it('detects portrait orientation', () => {
    mockWindowSize(375, 667); // height > width
    const { result } = renderHook(() => useOrientation());
    
    expect(result.current).toBe('portrait');
  });

  it('detects landscape orientation', () => {
    mockWindowSize(667, 375); // width > height
    const { result } = renderHook(() => useOrientation());
    
    expect(result.current).toBe('landscape');
  });

  it('updates orientation on resize', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useOrientation());
    
    expect(result.current).toBe('portrait');
    
    act(() => {
      mockWindowSize(667, 375);
      window.dispatchEvent(new Event('resize'));
    });
    
    expect(result.current).toBe('landscape');
  });

  it('updates orientation on orientation change event', () => {
    mockWindowSize(375, 667);
    const { result } = renderHook(() => useOrientation());
    
    expect(result.current).toBe('portrait');
    
    act(() => {
      mockWindowSize(667, 375);
      window.dispatchEvent(new Event('orientationchange'));
    });
    
    expect(result.current).toBe('landscape');
  });
});