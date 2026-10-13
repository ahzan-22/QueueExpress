export type EnvConfig = {
  API_PORT: number;
  API_GLOBAL_PREFIX: string;
  WEB_ORIGIN: string;
  DATABASE_URL: string;
};

/**
 * Validasi environment minimum agar API gagal cepat dengan pesan jelas,
 * bukan dengan error Prisma yang membingungkan di tengah request.
 */
export function validateEnv(raw: Record<string, unknown>): EnvConfig {
  const missing: string[] = [];

  const requiredString = (key: string): string => {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
      missing.push(key);
      return '';
    }
    return value.trim();
  };

  const databaseUrl = requiredString('DATABASE_URL');
  const webOrigin = raw['WEB_ORIGIN'] === undefined ? 'http://localhost:3000' : requiredString('WEB_ORIGIN');

  const portRaw = raw['API_PORT'];
  const port = portRaw === undefined ? 4000 : Number(portRaw);

  if (Number.isNaN(port)) {
    missing.push('API_PORT (harus angka)');
  }

  if (missing.length > 0) {
    throw new Error(
      `Environment variable belum lengkap: ${missing.join(', ')}. ` +
        'Salin .env.example menjadi .env di root monorepo lalu isi nilainya.',
    );
  }

  return {
    API_PORT: port,
    API_GLOBAL_PREFIX: (raw['API_GLOBAL_PREFIX'] as string | undefined)?.trim() || 'api',
    WEB_ORIGIN: webOrigin,
    DATABASE_URL: databaseUrl,
  };
}