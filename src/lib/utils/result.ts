/**
 * A monadic Result type for strict error handling.
 * Inspired by Rust's Result<T, E>.
 */
export type Result<T, E = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

/**
 * Utility to create a successful Result.
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Utility to create a failed Result.
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Executes a function and wraps it in a Result.
 */
export async function wrap<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
        const data = await promise;
        return ok(data);
    } catch (e) {
        return err(e instanceof Error ? e : new Error(String(e)));
    }
}
