import type { Monad, URItoKind } from "./functor"

export type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

declare module "./functor" {
  interface URItoKind<R, A> {
    Result: Result<R, A>
  }
}

export const ok = <A>(value: A): Result<never, A> => ({ type: "ok", value })

export const error = <E>(error: E): Result<E, never> => ({ type: "error", error })

export const map = <E, A, B>(result: Result<E, A>, f: (a: A) => B): Result<E, B> => {
  if (result.type === "error") return result
  return ok(f(result.value))
}

export const flatMap = <E, A, B>(
  result: Result<E, A>,
  f: (a: A) => Result<E, B>,
): Result<E, B> => {
  if (result.type === "error") return result
  return f(result.value)
}

export const ResultMonad = <E>(): Monad<"Result", E> => ({
  URI: "Result",
  of: ok,
  map,
  flatMap,
})
