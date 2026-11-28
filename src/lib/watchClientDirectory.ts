export function watchClientDirectory(load: () => Promise<void>): () => void {
  let running = false;

  async function refresh() {
    if (running || document.visibilityState === 'hidden') return;
    running = true;
    try {
      await load();
    } finally {
      running = false;
    }
  }

  void refresh();
  const timer = window.setInterval(refresh, 15_000);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  };
}
