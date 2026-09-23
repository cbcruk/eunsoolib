/**
 * Optional neverthrow adapter.
 *
 * This is a *separate* entry point (`fetch-error-code/neverthrow`). The core
 * package never imports neverthrow, so it stays a zero-runtime-dependency
 * library; only consumers who reach for this module pull neverthrow in. It is
 * declared as an optional peer dependency for exactly that reason.
 */
import { ok, err, type Result } from 'neverthrow'
import type { FetchOutcome, FetchFailure } from './outcome'

export type { FetchFailure }

/**
 * Fold a {@link FetchOutcome} into a neverthrow `Result`. Both `failed` and
 * `indeterminate` collapse into `Err` — the caller pattern-matches on the
 * failure's `kind` when it needs the distinction.
 */
export const toResult = <T>(o: FetchOutcome<T>): Result<T, FetchFailure> =>
  o.kind === 'ok' ? ok(o.value) : err(o)
