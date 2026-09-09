const HYSTERESIS_RATIO = 0.2;

// I wrote this:
// This decides when the top navigation should become the bottom navigation.
// The small buffer stops it flickering when the user scrolls near the boundary.
export default function getHybridNavigationVisibility({
  isVisible,
  scrollY,
  topNavigationBoundary,
  topNavigationHeight,
}) {
  if (!Number.isFinite(scrollY)
    || !Number.isFinite(topNavigationBoundary)
    || !Number.isFinite(topNavigationHeight)
    || topNavigationBoundary < 0
    || topNavigationHeight <= 0) return false;

  if (!isVisible) return scrollY >= topNavigationBoundary;

  const hideBoundary = topNavigationBoundary - (topNavigationHeight * HYSTERESIS_RATIO);
  return scrollY > hideBoundary;
}
