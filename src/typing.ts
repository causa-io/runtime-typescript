/**
 * A type listing the keys of `T` that are of type `V`.
 */
export type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: any;
};
