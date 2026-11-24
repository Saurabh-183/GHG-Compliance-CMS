/**
 * Node.js-only initialization.
 * Kept in a separate file so Next.js Edge compiler does not evaluate Node.js built-ins.
 */
export async function initNodeDns(): Promise<void> {
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
