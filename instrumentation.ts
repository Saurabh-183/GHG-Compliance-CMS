/** Runs once when the Next.js Node server starts — before API routes handle traffic. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const uri = process.env.MONGODB_URI ?? '';
  if (!uri.startsWith('mongodb+srv://')) return;

  try {
    const { setServers } = await import('node:dns');
    // Windows / corporate DNS often returns querySrv ECONNREFUSED for Atlas SRV records.
    setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // Restricted environments may block setServers; connectToDatabase() also sets DNS.
  }
}