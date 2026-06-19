// ==========================================
// FUSO HORÁRIO DA CLÍNICA
// ==========================================
// A clínica opera no fuso de Brasília (UTC-3, sem horário de verão desde 2019).
// Os instantes são armazenados em UTC no banco; estes helpers convertem de/para
// o "relógio de parede" de Brasília de forma independente do fuso do servidor
// (Render roda em UTC), evitando deslocamentos de 3h.

export const TZ_BRASILIA_OFFSET = '-03:00';
const TZ_BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Retorna um Date cujos campos UTC (getUTCHours, getUTCDay, ...) correspondem
 * ao relógio de parede de Brasília. Use sempre os getters UTC sobre o resultado.
 */
export function paraBrasilia(date: Date): Date {
  return new Date(date.getTime() - TZ_BRASILIA_OFFSET_MS);
}

/** Minutos desde a meia-noite no horário de Brasília. */
export function minutosBrasilia(date: Date): number {
  const b = paraBrasilia(date);
  return b.getUTCHours() * 60 + b.getUTCMinutes();
}

/** Dia da semana (0=Dom ... 6=Sáb) no horário de Brasília. */
export function diaSemanaBrasilia(date: Date): number {
  return paraBrasilia(date).getUTCDay();
}

/** Hora formatada "HH:MM" no horário de Brasília. */
export function horaBrasilia(date: Date): string {
  const b = paraBrasilia(date);
  return `${String(b.getUTCHours()).padStart(2, '0')}:${String(b.getUTCMinutes()).padStart(2, '0')}`;
}

/** Data formatada "DD/MM/AAAA" no horário de Brasília. */
export function dataBrasilia(date: Date): string {
  const b = paraBrasilia(date);
  return `${String(b.getUTCDate()).padStart(2, '0')}/${String(b.getUTCMonth() + 1).padStart(2, '0')}/${b.getUTCFullYear()}`;
}

/** Data formatada "DD/MM" no horário de Brasília. */
export function dataCurtaBrasilia(date: Date): string {
  const b = paraBrasilia(date);
  return `${String(b.getUTCDate()).padStart(2, '0')}/${String(b.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Constrói o instante (UTC) correspondente a uma data+hora de parede em Brasília.
 * Ex.: instanteBrasilia('2026-06-19', '16:00') -> 2026-06-19T19:00:00.000Z
 */
export function instanteBrasilia(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${TZ_BRASILIA_OFFSET}`);
}
