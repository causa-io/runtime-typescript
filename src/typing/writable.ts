/**
 * A type where all properties of `T` are made writable (not `readonly`).
 */
export type Writable<T> = { -readonly [K in keyof T]: T[K] };
