const HYSTERESIS_RATIO = 0.2;

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
