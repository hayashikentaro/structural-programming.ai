# Part 2：壊れる理由

---

## Chapter 9：なぜプログラムは壊れるのか

---

これまでに我々は以下を理解した：

> プログラム = 写像の合成

---

この視点に立つと、バグの正体は明確になる：

> バグ = 合成の失敗

---

従来：

- ミス
- 不注意

---

しかし本質は違う。

---

## 本質

プログラムが壊れる原因は3つ：

1. 部分関数
2. 例外
3. 状態

---

共通点：

> 型に現れていない

---

---

## Chapter 10：部分関数

---

### 問題

```ts
const head = (xs: number[]): number => xs[0]
```

---

### 問題点

```ts
head([]) // undefined
```

---

### 型の嘘

```
number[] → number
```

ではなく：

```
number[] → number | undefined
```

---

## 解決：Option

```ts
type Option<T> = T | null

const head = (xs: number[]): Option<number> =>
  xs.length === 0 ? null : xs[0]
```

---

## 本質

> 部分関数を全関数に変換する

---

---

## Chapter 11：例外

---

### 問題

```ts
const parse = (s: string): number => {
  const n = Number(s)
  if (isNaN(n)) throw new Error("invalid")
  return n
}
```

---

### 問題点

* 型に現れない失敗
* 合成できない

---

## 解決：Result

```ts
type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const parse = (s: string): Result<string, number> => {
  const n = Number(s)
  return isNaN(n)
    ? { type: "error", error: "invalid" }
    : { type: "ok", value: n }
}
```

---

## map

```ts
const map = <E, A, B>(
  r: Result<E, A>,
  f: (a: A) => B
): Result<E, B> => {
  if (r.type === "error") return r
  return { type: "ok", value: f(r.value) }
}
```

---

## 本質

> 例外は暗黙の分岐
> Resultは明示的な分岐

---

---

## Chapter 12：状態

---

### 問題

```ts
let count = 0

const increment = () => {
  count++
  return count
}
```

---

### 問題点

* 同じ入力でも結果が変わる
* 外部依存

---

## 数学的に

```
() → number
```

ではなく：

```
state → (state, number)
```

---

## 解決：State

```ts
type State<S, A> = (s: S) => [S, A]

const increment: State<number, number> = (s) => {
  const next = s + 1
  return [next, next]
}
```

---

## 本質

> 状態は隠すな、渡せ

---

---

## Chapter 13：統一的理解

---

| 問題   | 本質    |
| ---- | ----- |
| null | 部分関数  |
| 例外   | 非局所制御 |
| 状態   | 隠れた入力 |

---

## 共通点

> 型に現れていない

---

---

## Chapter 14：Effect

---

### 観察

* Option
* Result
* State

---

すべて：

* map
* flatMap

---

## 定義（直感）

> Effect = 文脈付きの値

---

---

## Chapter 15：まとめ

---

あなたは理解した：

* バグは合成の失敗
* 型で防げる
* 副作用は構造として扱う

---

## 次

> Monad（合成の回復）
