/** Runs once when the Next.js server starts — before API routes handle traffic. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initNodeDns } = await import('./instrumentation-node');
    await initNodeDns();
  }
}
