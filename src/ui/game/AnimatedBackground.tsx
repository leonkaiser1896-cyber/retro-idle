export function AnimatedBackground() {
  return (
    <div className="animated-background" aria-hidden="true">
      <span className="bg-grid" />
      <span className="bg-depth-grid" />
      <span className="bg-horizon" />
      <span className="bg-skyline">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="bg-scanline" />
      <span className="bg-beam bg-beam-a" />
      <span className="bg-beam bg-beam-b" />
      <span className="bg-vignette" />
    </div>
  );
}
