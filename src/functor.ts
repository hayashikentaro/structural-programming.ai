export interface URItoKind<R, A> {}

export type URIS = keyof URItoKind<unknown, unknown>

export type Kind<URI extends URIS, R, A> = URItoKind<R, A>[URI]

export interface Functor<F extends URIS, R> {
  readonly URI: F
  map: <A, B>(fa: Kind<F, R, A>, f: (a: A) => B) => Kind<F, R, B>
}

export interface Monad<M extends URIS, R> extends Functor<M, R> {
  of: <A>(a: A) => Kind<M, R, A>
  flatMap: <A, B>(ma: Kind<M, R, A>, f: (a: A) => Kind<M, R, B>) => Kind<M, R, B>
}
