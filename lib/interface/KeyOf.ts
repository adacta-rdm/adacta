/**
 * String-only keys of type T, without symbol and number.
 */
export type KeyOf<T> = Extract<keyof T, string>;
