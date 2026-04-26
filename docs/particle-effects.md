# Particle Effects - Floating Ashes

This document describes the floating ashes particle effect used in the Ashboard application.

## Overview

The particle system creates realistic floating ash/ember effects that rise from the bottom of the screen, simulating ashes floating up from a fire.

## Location

- **Component**: `components/ui/Section/particle.tsx`
- **Styles**: `components/ui/Section/particle.module.css`

## Technical Implementation

### Particle Properties

| Property | Value | Description |
|----------|-------|-------------|
| Count | 15 particles | Number of ash elements |
| Size | 3-6px | Small, irregular dimensions |
| Shape | Irregular blob | Organic ash-like appearance |
| Colors | Orange to charcoal gradient | Ember color progression |

### Visual Effects

#### Shape
Irregular organic shapes created with asymmetric border-radius:
```css
border-radius: 40% 60% 55% 45% / 50% 40% 60% 50%;
```

#### Color Gradient
Ember-like gradient from hot center to cooled edges:
```css
background: radial-gradient(
  ellipse at 30% 30%,
  #ff6b35 0%,      /* Hot orange core */
  #d63c0a 30%,     /* Burning orange */
  #8b2500 60%,     /* Cooling red */
  #3d1008 100%     /* Charcoal edge */
);
```

#### Glow Effect
Triple-layer box-shadow for realistic ember glow:
```css
box-shadow:
  0 0 4px 1px rgba(255, 107, 53, 0.6),   /* Inner glow */
  0 0 8px 2px rgba(214, 60, 10, 0.3),    /* Outer glow */
  inset 0 0 3px rgba(255, 200, 100, 0.4); /* Hot spot */
```

### Animations

Each particle has multiple combined animations:

#### 1. Rising Motion
- Starts from bottom of screen
- Rises to top over 9-18 seconds
- Includes horizontal drift (sway left/right)
- Shrinks as it rises (cooling effect)

#### 2. Horizontal Sway
- 14 of 15 particles (~93%) have random left-right movement
- Each particle has a **unique sway keyframe** with different:
  - Number of direction changes (2-4 points)
  - Amplitude (25-70px)
  - Timing offsets (asymmetric percentages)
  - Direction bias (some favor left, others right)
- Sway animation runs independently from rise animation
- Creates natural, wind-blown, turbulent air appearance

**Sway Pattern Types:**
- **2-point**: Simple left-right oscillation
- **3-point**: Left-center-right with varying amplitudes
- **4-point**: Complex multi-directional with 4+ direction changes

#### 3. Rotation
- Each ash tumbles as it rises
- Rotation: 180-450 degrees per cycle
- Direction varies per particle

#### 4. Flicker
- Separate brightness/opacity animation
- Cycle: 1.4-2.5 seconds
- Simulates ember glowing/dimming

#### 5. Fade Out
- Opacity decreases as ash rises
- Full fade at top of screen
- Combined with scale reduction

### Animation Timing

| Particle | Rise Duration | Sway Duration | Sway Pattern | Max Amplitude |
|----------|---------------|---------------|--------------|---------------|
| 1 | 12s | 3.0s | 2-point | 25px |
| 2 | 15s | 2.5s | 2-point | 35px |
| 3 | 10s | 4.0s | 3-point | 40px |
| 4 | 18s | 3.5s | 2-point | 50px |
| 5 | 14s | 2.8s | 3-point | 45px |
| 6 | 11s | 3.2s | 3-point | 40px |
| 7 | 16s | 2.2s | 3-point | 55px |
| 8 | 13s | 3.8s | 3-point | 60px |
| 9 | 9s | 2.6s | 3-point | 55px |
| 10 | 17s | 3.4s | 3-point | 50px |
| 11 | 11s | 2.9s | 4-point | 55px |
| 12 | 14s | 3.6s | 3-point | 70px |
| 13 | 12s | 2.4s | 4-point | 60px |
| 14 | 15s | 3.1s | 3-point | 55px |
| 15 | 10s | - | none | 0px |

**Note**: 14 of 15 particles (93%) have random left-right sway movement. Particle 15 rises straight up.

### Performance Optimizations

- `will-change: transform, opacity` for GPU acceleration
- `pointer-events: none` prevents interaction overhead
- Fixed positioning with overflow hidden
- CSS-only animations (no JavaScript)

## Customization

### Adjusting Particle Count
Edit `particle.tsx`:
```tsx
{Array.from({ length: 15 }, (_, i) => (
  <div key={i} className={styles.particle} />
))}
```

### Adjusting Colors
Modify the gradient in `.particle`:
```css
background: radial-gradient(
  ellipse at 30% 30%,
  #your-hot-color 0%,
  #your-mid-color 50%,
  #your-cool-color 100%
);
```

### Adjusting Speed
Modify animation durations in individual particle rules:
```css
.particle:nth-child(1) {
  animation: rise1 12s infinite, sway1 3s ease-in-out infinite, flicker 2s infinite;
}
```

### Adjusting Sway Intensity
Modify translateX values in sway keyframes:
```css
@keyframes sway1 {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); } /* Adjust this value */
}
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

Requires support for:
- CSS Transforms (translate3d, rotate, scale)
- CSS Animations
- CSS Gradients
- Multiple animations on single element

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Basic floating dots |
| 2.0 | Current | Realistic ashes with sway, flicker, glow |
