import { describe, it, expect } from "vitest"
import { type State, StateMonad } from "../src/state"
import { type Option, OptionMonad, none, some } from "../src/option"
import { ResultMonad, error, ok } from "../src/result"

const id = <A>(value: A): A => value

const noNumber = (): Option<number> => none

const expectStateEqual = <S, A>(left: State<S, A>, right: State<S, A>, states: S[]) => {
  for (const state of states) {
    expect(left(state)).toEqual(right(state))
  }
}

describe("Functor laws", () => {
  it("Option preserves identity", () => {
    expect(OptionMonad.map(some(1), id)).toEqual(some(1))
    expect(OptionMonad.map(none, id)).toEqual(none)
  })

  it("Option preserves composition", () => {
    const f = (n: number) => n + 1
    const g = (n: number) => n.toString()

    expect(OptionMonad.map(OptionMonad.map(some(1), f), g)).toEqual(
      OptionMonad.map(some(1), (value) => g(f(value))),
    )
    expect(OptionMonad.map(OptionMonad.map(noNumber(), f), g)).toEqual(
      OptionMonad.map(noNumber(), (value) => g(f(value))),
    )
  })

  it("Result preserves identity", () => {
    const result = ResultMonad<string>()

    expect(result.map(ok(1), id)).toEqual(ok(1))
    expect(result.map(error("failed"), id)).toEqual(error("failed"))
  })

  it("Result preserves composition", () => {
    const result = ResultMonad<string>()
    const f = (n: number) => n + 1
    const g = (n: number) => n.toString()

    expect(result.map(result.map(ok(1), f), g)).toEqual(
      result.map(ok(1), (value) => g(f(value))),
    )
    expect(result.map(result.map(error("failed"), f), g)).toEqual(
      result.map(error("failed"), (value) => g(f(value))),
    )
  })

  it("State preserves identity", () => {
    const state = StateMonad<number>()
    const computation: State<number, number> = (s) => [s + 1, s * 2]

    expectStateEqual(state.map(computation, id), computation, [0, 1, 2])
  })

  it("State preserves composition", () => {
    const state = StateMonad<number>()
    const computation: State<number, number> = (s) => [s + 1, s * 2]
    const f = (n: number) => n + 1
    const g = (n: number) => n.toString()

    expectStateEqual(
      state.map(state.map(computation, f), g),
      state.map(computation, (value) => g(f(value))),
      [0, 1, 2],
    )
  })
})

describe("Monad laws", () => {
  it("Option satisfies left identity", () => {
    const f = (n: number) => (n > 0 ? some(n + 1) : none)

    expect(OptionMonad.flatMap(OptionMonad.of(1), f)).toEqual(f(1))
  })

  it("Option satisfies right identity", () => {
    expect(OptionMonad.flatMap(some(1), OptionMonad.of)).toEqual(some(1))
    expect(OptionMonad.flatMap(none, OptionMonad.of)).toEqual(none)
  })

  it("Option satisfies associativity", () => {
    const f = (n: number) => (n > 0 ? some(n + 1) : none)
    const g = (n: number) => (n % 2 === 0 ? some(n.toString()) : none)

    expect(OptionMonad.flatMap(OptionMonad.flatMap(some(1), f), g)).toEqual(
      OptionMonad.flatMap(some(1), (value) => OptionMonad.flatMap(f(value), g)),
    )
  })

  it("Result satisfies left identity", () => {
    const result = ResultMonad<string>()
    const f = (n: number) => (n > 0 ? ok(n + 1) : error("negative"))

    expect(result.flatMap(result.of(1), f)).toEqual(f(1))
  })

  it("Result satisfies right identity", () => {
    const result = ResultMonad<string>()

    expect(result.flatMap(ok(1), result.of)).toEqual(ok(1))
    expect(result.flatMap(error("failed"), result.of)).toEqual(error("failed"))
  })

  it("Result satisfies associativity", () => {
    const result = ResultMonad<string>()
    const f = (n: number) => (n > 0 ? ok(n + 1) : error("negative"))
    const g = (n: number) => (n % 2 === 0 ? ok(n.toString()) : error("odd"))

    expect(result.flatMap(result.flatMap(ok(1), f), g)).toEqual(
      result.flatMap(ok(1), (value) => result.flatMap(f(value), g)),
    )
  })

  it("State satisfies left identity", () => {
    const state = StateMonad<number>()
    const f = (n: number): State<number, number> => (s) => [s + n, n * 2]

    expectStateEqual(state.flatMap(state.of(2), f), f(2), [0, 1, 2])
  })

  it("State satisfies right identity", () => {
    const state = StateMonad<number>()
    const computation: State<number, number> = (s) => [s + 1, s * 2]

    expectStateEqual(state.flatMap(computation, state.of), computation, [0, 1, 2])
  })

  it("State satisfies associativity", () => {
    const state = StateMonad<number>()
    const computation: State<number, number> = (s) => [s + 1, s * 2]
    const f = (n: number): State<number, number> => (s) => [s + n, n + 1]
    const g = (n: number): State<number, string> => (s) => [s * 2, n.toString()]

    expectStateEqual(
      state.flatMap(state.flatMap(computation, f), g),
      state.flatMap(computation, (value) => state.flatMap(f(value), g)),
      [0, 1, 2],
    )
  })
})
