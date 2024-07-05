export type ArrayElementType<T> = T extends ArrayLike<infer U> ? U : T;
