import type { Monad, URItoKind } from "./functor"

export type Option<T> = T | null

declare module "./functor" {
  interface URItoKind<R, A> {
    Option: Option<A>
  }
}

export const some = <A>(value: A): Option<A> => value

export const none: Option<never> = null

export const map = <A, B>(opt: Option<A>, f: (a: A) => B): Option<B> => {
  if (opt === null) return null
  return f(opt)
}

export const flatMap = <A, B>(opt: Option<A>, f: (a: A) => Option<B>): Option<B> => {
  if (opt === null) return null
  return f(opt)
}

export const OptionMonad: Monad<"Option", never> = {
  URI: "Option",
  of: some,
  map,
  flatMap,
}
