import type { Monad, URItoKind } from "./functor"

export type State<S, A> = (s: S) => [S, A]

declare module "./functor" {
  interface URItoKind<R, A> {
    State: State<R, A>
  }
}

export const of = <S, A>(value: A): State<S, A> => (state) => [state, value]

export const map = <S, A, B>(state: State<S, A>, f: (a: A) => B): State<S, B> => {
  return (initial) => {
    const [next, value] = state(initial)
    return [next, f(value)]
  }
}

export const flatMap = <S, A, B>(
  state: State<S, A>,
  f: (a: A) => State<S, B>,
): State<S, B> => {
  return (initial) => {
    const [next, value] = state(initial)
    return f(value)(next)
  }
}

export const StateMonad = <S>(): Monad<"State", S> => ({
  URI: "State",
  of,
  map,
  flatMap,
})
