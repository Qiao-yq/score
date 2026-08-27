/** CRT 扫描线 + 暗角 + 轻微闪烁（覆盖层，不拦截指针事件）。 */
export function CRTOverlay() {
  return <div aria-hidden className="crt-overlay pointer-events-none fixed inset-0 z-40" />;
}
