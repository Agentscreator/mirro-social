# Apple Watch Development Guide

This guide covers how to develop and test the Mirro Social app for Apple Watch.

## Overview

The app has been optimized for Apple Watch with:
- Custom CSS breakpoints for watch screen sizes
- Watch-specific UI components
- Optimized navigation for small screens
- Touch-friendly interface elements
- Efficient data display

## Screen Sizes Supported

- **Apple Watch 41mm**: 242px × 294px
- **Apple Watch 45mm**: 272px × 340px  
- **Apple Watch Ultra 49mm**: 312px × 390px

## Development Setup

### 1. Check Apple Watch Support
```bash
npm run watch:check
```

### 2. Test Watch Layout
```bash
npm run watch:test
```
This creates a `watch-test.html` file that simulates different Apple Watch screen sizes.

### 3. Development Server
```bash
npm run watch:dev
```
Starts the development server with Apple Watch optimization info.

### 4. Build for Watch
```bash
npm run watch:build
```

### 5. Sync to iOS with watchOS
```bash
npm run watch:sync
```

## CSS Classes for Apple Watch

### Responsive Classes
- `watch:block` - Show only on Apple Watch
- `watch:hidden` - Hide only on Apple Watch
- `watch:flex` - Flex display on Apple Watch

### Watch-Optimized Components
- `watch-nav` - Bottom navigation bar
- `watch-card` - Content cards
- `watch-btn` - Buttons optimized for touch
- `watch-input` - Form inputs
- `watch-avatar` - User avatars
- `watch-badge` - Notification badges

### Typography
- `watch-text-xs` - 10px font size
- `watch-text-sm` - 12px font size  
- `watch-text-base` - 14px font size
- `watch-text-lg` - 16px font size
- `watch-title` - Page titles
- `watch-subtitle` - Secondary text

### Layout
- `watch-container` - Main container
- `watch-full-height` - Full height minus navigation
- `watch-scroll` - Scrollable content
- `watch-flex-col` - Vertical flex layout
- `watch-flex-row` - Horizontal flex layout
- `watch-grid-2` - 2-column grid
- `watch-grid-3` - 3-column grid

### Spacing
- `watch-p-1` - 4px padding
- `watch-p-2` - 8px padding
- `watch-p-3` - 12px padding
- `watch-m-1` - 4px margin
- `watch-m-2` - 8px margin

## React Components

### WatchLayout
Main layout component for Apple Watch screens:
```tsx
import { WatchLayout } from '@/components/watch-layout'

<WatchLayout showNavigation={true}>
  <YourContent />
</WatchLayout>
```

### WatchNavigation
Bottom navigation optimized for Apple Watch:
```tsx
import { WatchNavigation } from '@/components/watch-navigation'

<WatchNavigation />
```

### Watch UI Components
```tsx
import { 
  WatchCard,
  WatchButton,
  WatchInput,
  WatchTitle,
  WatchAvatar,
  WatchStatusDot,
  WatchModal
} from '@/components/watch-layout'

<WatchCard>
  <WatchTitle>Hello Watch</WatchTitle>
  <WatchButton variant="primary">Tap Me</WatchButton>
</WatchCard>
```

### Responsive Components
```tsx
import { WatchOnly, NonWatchOnly } from '@/components/responsive-layout'

<WatchOnly>
  <WatchOptimizedComponent />
</WatchOnly>

<NonWatchOnly>
  <RegularComponent />
</NonWatchOnly>
```

## Design Guidelines

### Touch Targets
- Minimum 32px × 32px for touch targets
- 44px × 44px recommended for primary actions
- Adequate spacing between interactive elements

### Typography
- Use system fonts for best performance
- Keep text concise and scannable
- Use appropriate contrast ratios

### Navigation
- Bottom navigation bar for main actions
- Swipe gestures for secondary navigation
- Clear visual hierarchy

### Content
- Prioritize essential information
- Use progressive disclosure
- Minimize scrolling when possible

### Performance
- Optimize images for small screens
- Use efficient animations
- Minimize network requests

## Testing

### Browser Testing
1. Run `npm run watch:test`
2. Open the generated `watch-test.html` file
3. Test different watch sizes using the dropdown
4. Verify touch interactions work properly

### Device Testing
1. Build the app: `npm run watch:build`
2. Sync to iOS: `npm run watch:sync`
3. Open in Xcode
4. Test on Apple Watch Simulator
5. Test on physical Apple Watch device

### Responsive Testing
Use browser developer tools:
1. Open DevTools
2. Toggle device toolbar
3. Set custom dimensions:
   - 242px × 294px (41mm)
   - 272px × 340px (45mm)
   - 312px × 390px (49mm)

## Troubleshooting

### Common Issues

**Styles not applying on watch:**
- Ensure `styles/watch.css` is imported in `app/layout.tsx`
- Check that media queries are correctly formatted
- Verify Tailwind config includes watch breakpoints

**Components not showing:**
- Check `watch:block` and `watch:hidden` classes
- Verify component is wrapped in `WatchLayout`
- Ensure proper responsive component usage

**Touch targets too small:**
- Use `watch-btn` class for buttons
- Ensure minimum 32px touch targets
- Add adequate spacing between elements

**Performance issues:**
- Optimize images for watch screen sizes
- Minimize DOM complexity
- Use efficient CSS animations

### Debug Mode
Add this to your component for debugging:
```tsx
const isWatch = typeof window !== 'undefined' && window.innerWidth <= 272

console.log('Is Apple Watch:', isWatch)
console.log('Screen size:', window.innerWidth, 'x', window.innerHeight)
```

## Best Practices

1. **Mobile-First Design**: Start with watch constraints, then scale up
2. **Progressive Enhancement**: Ensure core functionality works on watch
3. **Performance**: Optimize for limited processing power
4. **Battery Life**: Minimize background processes and animations
5. **Accessibility**: Ensure proper contrast and touch targets
6. **Testing**: Test on actual devices when possible

## Resources

- [Apple Watch Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/watchos)
- [WatchKit Documentation](https://developer.apple.com/documentation/watchkit)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)

## Support

For Apple Watch specific issues:
1. Check this guide first
2. Run `npm run watch:check` to verify setup
3. Test with `npm run watch:test`
4. Check browser console for errors
5. Verify CSS media queries are working