/**
 * A non-nullable type.
 */
export type NonNull<T> = T extends null ? never : T;

/**
 * A type containing only the keys in `T` that are nullable.
 */
export type NullableKeys<T> = NonNullable<
  {
    [K in keyof T]: T[K] extends NonNull<T[K]> ? never : K;
  }[keyof T]
>;

/**
 * A type where nullable properties of `T` are made optional.
 * Note that this is not applied recursively.
 */
export type NullableAsOptional_<T> = Omit<T, NullableKeys<T>> &
  Partial<Pick<T, NullableKeys<T>>>;

/**
 * A type where nullable properties of `T` (and its children, recursively) are made optional.
 */
export type NullableAsOptional<T> = T extends Array<any>
  ? Array<NullableAsOptional<T[number]>>
  : T extends Date
  ? Date
  : T extends object
  ? NullableAsOptional_<{ [K in keyof T]: NullableAsOptional<T[K]> }>
  : T;

/**
 * A type containing only the keys in `T` that are optional.
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * A type where optional properties of `T` are made nullable but required.
 * Note that this is not applied recursively.
 */
export type OptionalAsNullable_<T> = Omit<T, OptionalKeys<T>> & {
  [K in OptionalKeys<T>]: NonNullable<T[K]> | null;
};

/**
 * A type where optional properties of `T` (and its children, recursively) are made nullable but required.
 */
export type OptionalAsNullable<T> = T extends Array<any>
  ? Array<OptionalAsNullable<T[number]>>
  : T extends Date
  ? Date
  : T extends object
  ? OptionalAsNullable_<{ [K in keyof T]: OptionalAsNullable<T[K]> }>
  : T;
