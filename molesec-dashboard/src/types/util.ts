/** Any function imaginable. */
export type AnyFunction = (...args: any[]) => any;
/** Any imaginable asynchronous function. */
export type AnyAsyncFunction = (...args: any[]) => Promise<any>;
/** Returns the type of the promise result for an asynchronous function */
export type ResolutionOf<F extends AnyAsyncFunction> =
  ReturnType<F> extends PromiseLike<infer R> ? R : never;
