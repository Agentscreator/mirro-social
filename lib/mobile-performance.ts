// Mobile Performance Optimization Utils
export class MobilePerformanceOptimizer {
  private static instance: MobilePerformanceOptimizer;
  private intersectionObserver?: IntersectionObserver;
  private animationFrameId?: number;
  private isLowPowerMode = false;

  static getInstance(): MobilePerformanceOptimizer {
    if (!MobilePerformanceOptimizer.instance) {
      MobilePerformanceOptimizer.instance = new MobilePerformanceOptimizer();
    }
    return MobilePerformanceOptimizer.instance;
  }

  init() {
    this.detectLowPowerMode();
    this.setupIntersectionObserver();
    this.optimizeScrolling();
    this.setupHardwareAcceleration();
    this.preloadCriticalResources();
  }

  private detectLowPowerMode() {
    // Detect low power mode by checking battery API or performance hints
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.isLowPowerMode = battery.level < 0.2 || battery.charging === false;
        if (this.isLowPowerMode) {
          this.enableLowPowerOptimizations();
        }
      });
    }

    // Check connection quality
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        this.isLowPowerMode = true;
        this.enableLowPowerOptimizations();
      }
    }
  }

  private enableLowPowerOptimizations() {
    // Reduce animation frequency
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    
    // Disable expensive animations
    const expensiveAnimations = document.querySelectorAll('.envelope-float, .envelope-glow, .sparkle-rotate');
    expensiveAnimations.forEach(el => {
      (el as HTMLElement).style.animation = 'none';
    });

    // Reduce image quality
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.includes('?q=')) {
        img.src += img.src.includes('?') ? '&q=30' : '?q=30';
      }
    });
  }

  private setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          
          if (entry.isIntersecting) {
            // Element is visible - enable animations
            element.classList.remove('paused-animations');
          } else {
            // Element is not visible - pause animations to save battery
            element.classList.add('paused-animations');
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1 
      }
    );

    // Observe animated elements
    const animatedElements = document.querySelectorAll('[class*="animate-"], [class*="transition-"]');
    animatedElements.forEach(el => this.intersectionObserver?.observe(el));
  }

  private optimizeScrolling() {
    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const optimizeForScrolling = () => {
      if (!isScrolling) {
        isScrolling = true;
        document.body.classList.add('is-scrolling');
        
        // Disable heavy animations during scroll
        const heavyAnimations = document.querySelectorAll('.envelope-float, .sparkle-rotate');
        heavyAnimations.forEach(el => {
          (el as HTMLElement).style.animationPlayState = 'paused';
        });
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        document.body.classList.remove('is-scrolling');
        
        // Re-enable animations after scroll
        const heavyAnimations = document.querySelectorAll('.envelope-float, .sparkle-rotate');
        heavyAnimations.forEach(el => {
          (el as HTMLElement).style.animationPlayState = 'running';
        });
      }, 150);
    };

    window.addEventListener('scroll', optimizeForScrolling, { passive: true });
    window.addEventListener('touchmove', optimizeForScrolling, { passive: true });
  }

  private setupHardwareAcceleration() {
    // Apply hardware acceleration to navigation elements
    const navigationElements = document.querySelectorAll('.navigation-item, [class*="nav-"], .mobile-nav');
    navigationElements.forEach(el => {
      (el as HTMLElement).style.transform = 'translateZ(0)';
      (el as HTMLElement).style.willChange = 'transform';
    });

    // Optimize touch interactions
    const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
    interactiveElements.forEach(el => {
      (el as HTMLElement).style.touchAction = 'manipulation';
      (el as HTMLElement).style.webkitTapHighlightColor = 'transparent';
    });
  }

  private preloadCriticalResources() {
    // Preload critical navigation icons
    const criticalIcons = [
      '/icons/home.svg',
      '/icons/search.svg',
      '/icons/messages.svg',
      '/icons/profile.svg'
    ];

    criticalIcons.forEach(iconPath => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = iconPath;
      document.head.appendChild(link);
    });
  }

  optimizeNavigation() {
    // Debounce navigation changes to prevent excessive re-renders
    let navigationTimeout: NodeJS.Timeout;
    
    return (callback: () => void) => {
      clearTimeout(navigationTimeout);
      navigationTimeout = setTimeout(callback, 16); // ~60fps
    };
  }

  enableTurboMode() {
    // Ultra-aggressive optimizations for very slow devices
    if (this.isLowPowerMode) {
      // Remove all animations
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
        .paused-animations * {
          animation-play-state: paused !important;
        }
      `;
      document.head.appendChild(style);

      // Reduce image quality globally
      const style2 = document.createElement('style');
      style2.textContent = `
        img {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `;
      document.head.appendChild(style2);
    }
  }

  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

// Auto-initialize on mobile devices
if (typeof window !== 'undefined') {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;

  if (isMobile) {
    document.addEventListener('DOMContentLoaded', () => {
      const optimizer = MobilePerformanceOptimizer.getInstance();
      optimizer.init();
      
      // Enable turbo mode on very slow connections
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType === 'slow-2g' || connection.downlink < 0.5) {
          optimizer.enableTurboMode();
        }
      }
    });
  }
}

export default MobilePerformanceOptimizer;