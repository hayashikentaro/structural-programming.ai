# Part 1：写像としてのプログラム

---

## Chapter 9：関数は処理ではない

---

### 問題提起

多くの入門書は、関数を「処理をまとめたもの」として説明する。

```ts
const add1 = (x: number): number => {
  return x + 1
}
```

この説明は間違いではない。

しかし、この理解のままでは設計に届かない。

なぜなら「処理」という言葉は、関数の外側にある構造を隠してしまうからである。

重要なのは、何行で書いたかではない。

どの型からどの型へ写しているかである。

---

### 直感的説明

`add1` は命令列ではなく、対応関係である。

```text
number -> number
```

入力が `number` で、出力も `number` である。

この対応関係を見た瞬間、我々は次のことを知る。

- `string` は受け取らない
- `null` は受け取らない
- 戻り値は `number` である

つまり、型は関数の境界を定めている。

関数を見るとは、実装を見ることではない。

境界を見ることである。

---

### 抽象の導入

本書では、関数を写像として読む。

```text
A -> B
```

これは `A` 型の値を `B` 型の値へ対応づける構造である。

圏論の言葉では、型を対象、関数を射として読む。

この読み方を採用すると、プログラムは「命令の列」ではなく「射の合成」として見える。

コードを書く前に、次の問いが立つ。

```text
この関数は何から何への写像か。
```

これが設計の第一歩である。

---

### TypeScriptコード

```ts
const add1 = (x: number): number =>
  x + 1

const toLabel = (n: number): string =>
  `value = ${n}`

const isLong = (s: string): boolean =>
  s.length > 10
```

これらはすべて、写像として読める。

```text
add1: number -> number
toLabel: number -> string
isLong: string -> boolean
```

実装は違う。

しかし設計上の関心は、まず型の形にある。

---

### 数学的補足

集合と関数の圏として見るなら、`number` や `string` は対象であり、関数は対象間の射である。

```text
number --add1--> number
number --toLabel--> string
string --isLong--> boolean
```

もちろん TypeScript の型は数学的な集合と完全には一致しない。

`any`、`unknown`、`never`、構造的部分型、実行時の `undefined` などがある。

それでも、設計の第一近似として「型を対象、関数を射」と読むことは強力である。

---

### まとめ

関数は処理ではない。

関数は、型から型への写像である。

この見方に変えると、プログラムの中心は構文ではなく構造になる。

AI 時代に人間が見るべきものは、コードの表面ではない。

写像の形である。

---

## Chapter 10：合成

---

### 問題提起

単体の関数だけでは、プログラムにならない。

プログラムは関数をつなぐことで生まれる。

```ts
const add1 = (x: number): number =>
  x + 1

const toLabel = (n: number): string =>
  `value = ${n}`

const result = toLabel(add1(41))
```

このコードは動く。

しかし、なぜ動くのか。

答えは、戻り値の型と次の入力の型が一致しているからである。

```text
number -> number
number -> string
```

真ん中の `number` が接続点になっている。

---

### 直感的説明

合成とは、出力を次の入力へ渡すことである。

```text
A -> B
B -> C
```

この2つがあれば、全体として次の写像が得られる。

```text
A -> C
```

これがプログラムの基本構造である。

関数の中身が何をしているかより前に、そもそも合成できるかが問われる。

合成できない関数は、設計として接続できない。

---

### 抽象の導入

合成を関数として書くと、次のようになる。

```text
compose: (B -> C) -> (A -> B) -> (A -> C)
```

TypeScript では次のように書ける。

```ts
const compose =
  <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C =>
    g(f(a))
```

ここで重要なのは、実装の短さではない。

型が合成の条件を表していることである。

---

### TypeScriptコード

```ts
const compose =
  <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C =>
    g(f(a))

const add1 = (x: number): number =>
  x + 1

const toLabel = (n: number): string =>
  `value = ${n}`

const labelAfterAdd1 =
  compose(toLabel, add1)

const result: string =
  labelAfterAdd1(41)
```

`labelAfterAdd1` は、新しい写像である。

```text
number -> string
```

小さな写像を合成して、大きな写像を作る。

これがプログラムである。

---

### 数学的補足

圏において、射 `f: A -> B` と `g: B -> C` があるとき、合成 `g . f: A -> C` が存在する。

```text
A --f--> B --g--> C
```

合成には結合律がある。

```text
h . (g . f) = (h . g) . f
```

これは、どの順序で括弧を付けても全体の意味が変わらないことを示す。

プログラムを小さな部品へ分解できるのは、この性質があるからである。

---

### まとめ

プログラムは関数の集まりではない。

関数の合成である。

型は、合成可能性の境界を示す。

よい設計とは、合成できる写像を作ることである。

---

## Chapter 11：合成が壊れる瞬間

---

### 問題提起

合成は、型がつながるときに成立する。

では、次のコードはどうか。

```ts
type User = {
  name: string
}

const getUser = (id: number): User =>
  id === 0 ? undefined as never : { name: "Ada" }

const getName = (user: User): string =>
  user.name

const name = getName(getUser(0))
```

型だけを見ると、合成できるように見える。

```text
number -> User
User -> string
```

しかし実行時には壊れる。

`getUser(0)` が実際には `User` を返していないからである。

---

### 直感的説明

合成が壊れるとき、そこにはたいてい「型に現れていないもの」がある。

この例では、`getUser` は本当は次の写像である。

```text
number -> User | undefined
```

しかし型はこう言っている。

```text
number -> User
```

型が嘘をついている。

そして型が嘘をつくと、合成は壊れる。

---

### 抽象の導入

合成できるかどうかは、実装者の注意力で決めるべきではない。

型で表すべきである。

失敗する可能性があるなら、それは戻り値の型に現れるべきである。

```text
A -> B
```

ではなく、

```text
A -> B | undefined
```

あるいは、より構造化して、

```text
A -> Option<B>
```

と表す。

ここから、欠落可能性を構造として扱う必要が出てくる。

---

### TypeScriptコード

```ts
type User = {
  name: string
}

type Option<A> = A | null

const getUser = (id: number): Option<User> =>
  id === 0 ? null : { name: "Ada" }

const getName = (user: User): string =>
  user.name

const user = getUser(0)

const name: Option<string> =
  user === null ? null : getName(user)
```

このコードでは、失敗可能性が型に現れている。

合成はまだ少し不便である。

しかし、嘘は減った。

設計はここから始まる。

---

### 数学的補足

`A -> B` と書くなら、それは全ての `A` に対して `B` を返す写像でなければならない。

一部の入力で値を返せないなら、それは部分関数である。

プログラムにおける `undefined` や例外は、部分関数を全関数のように見せる典型である。

型がそれを隠すと、合成の前提が崩れる。

---

### まとめ

バグは突然現れない。

合成できないものを、合成できるように見せたときに現れる。

型の嘘は、構造の破綻である。

---

## Chapter 12：Optionによる回復

---

### 問題提起

前章では、失敗可能性を型に出した。

```ts
type Option<A> = A | null
```

しかし、そのままでは呼び出し側に分岐が漏れる。

```ts
const name =
  user === null ? null : getName(user)
```

この分岐がコードベース全体に散らばると、構造は再び壊れる。

必要なのは、欠落可能性を保存したまま中身だけを変換する操作である。

---

### 直感的説明

`Option<A>` は「存在しないかもしれない `A`」である。

この中身に `A -> B` を適用したい。

ただし、`null` は `null` のまま保存したい。

つまり欲しいのは、次の変換である。

```text
Option<A> -> (A -> B) -> Option<B>
```

この操作があれば、欠落可能性を呼び出し側で毎回分岐しなくてよい。

---

### 抽象の導入

`Option` に対する `map` を導入する。

```text
mapOption: Option<A> -> (A -> B) -> Option<B>
```

ここで重要なのは、`mapOption` が `null` を消さないことだ。

失敗を成功に変えない。

成功値だけを変換する。

文脈を保存する。

---

### TypeScriptコード

```ts
type Option<A> = A | null

type User = {
  name: string
}

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const getUser = (id: number): Option<User> =>
  id === 0 ? null : { name: "Ada" }

const getName = (user: User): string =>
  user.name

const name: Option<string> =
  mapOption(getUser(1), getName)
```

呼び出し側から分岐が消えた。

しかし欠落可能性は消えていない。

`Option` の文脈として保存されている。

---

### 数学的補足

`Option` は、部分関数を全関数として扱うための文脈である。

`A -> B` を `Option<A> -> Option<B>` に持ち上げる操作が `mapOption` である。

この時点で、Functor の直感が現れている。

ただしここではまだ名前を覚える必要はない。

重要なのは、文脈を保存しながら写像するという構造である。

---

### まとめ

`Option` は、欠落可能性を型に出す。

`mapOption` は、その文脈を保存したまま中身だけを写す。

合成が壊れた場所に、構造を導入する。

それが Option による回復である。

---

## Chapter 13：Functorの導入

---

### 問題提起

`Option` だけを見ていると、`mapOption` は特殊な便利関数に見える。

しかし同じ形は、他の文脈にも現れる。

```ts
type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }
```

`Result<E, A>` でも、成功値だけを変換したい場面がある。

```text
Result<E, A> -> (A -> B) -> Result<E, B>
```

ここにも同じ構造がある。

---

### 直感的説明

`Option` は欠落可能性を保存する。

`Result` は失敗可能性を保存する。

`Array` は複数性を保存する。

どれも、中身の値だけを写し、文脈を保存する。

この共通構造を Functor と呼ぶ。

---

### 抽象の導入

Functor の形は次である。

```text
F<A> -> (A -> B) -> F<B>
```

ここで `F` は文脈である。

`Option` なら欠落可能性。

`Result` なら失敗可能性。

重要なのは、`F` が変わらないことである。

変換されるのは `A` から `B`。

保存されるのは文脈 `F`。

---

### TypeScriptコード

```ts
type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const mapResult = <E, A, B>(
  fa: Result<E, A>,
  f: (a: A) => B
): Result<E, B> =>
  fa.type === "error"
    ? fa
    : { type: "ok", value: f(fa.value) }

const parsed: Result<string, number> =
  { type: "ok", value: 42 }

const message: Result<string, string> =
  mapResult(parsed, n => `value = ${n}`)
```

`mapResult` はエラーを変換しない。

成功値だけを変換する。

これが構造保存である。

---

### 数学的補足

Functor は、射 `A -> B` を `F<A> -> F<B>` へ写す構造である。

```text
f: A -> B
F(f): F<A> -> F<B>
```

このとき、恒等射と合成が保存される必要がある。

```text
map(fa, id) = fa
```

```text
map(map(fa, f), g) = map(fa, a => g(f(a)))
```

これを Functor 則と呼ぶ。

詳しくは Part 3 で扱う。

---

### まとめ

Functor は、文脈を保存したまま中身を写す構造である。

`Option` の `map` は、その最初の例である。

Part 1 では名前よりも、構造が自然に現れることを重視する。

---

## Chapter 14：まとめ

---

### 問題提起

ここまでで、プログラムの見方は変わった。

関数は処理ではない。

関数は写像である。

プログラムは関数の羅列ではない。

写像の合成である。

---

### 直感的説明

合成がうまくいくとき、プログラムは自然につながる。

合成が壊れるとき、そこには型に現れていないものがある。

`undefined`、`null`、例外、状態。

これらは後の Part でさらに詳しく扱う。

Part 1 で重要なのは、壊れ方を「ミス」として見ないことである。

壊れ方を「構造の問題」として見ることである。

---

### 抽象の導入

本 Part の核心は次である。

```text
プログラム = 写像の合成
```

そして、合成が壊れるなら、構造を変える必要がある。

`Option` は、欠落可能性を型に出す。

`mapOption` は、欠落可能性を保存したまま写像する。

ここに Functor の萌芽がある。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const compose =
  <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C =>
    g(f(a))

const add1 = (n: number): number =>
  n + 1

const toLabel = (n: number): string =>
  `value = ${n}`

const label =
  compose(toLabel, add1)

const value: Option<number> =
  41

const result: Option<string> =
  mapOption(value, label)
```

この短いコードには、Part 1 の主題がすべて含まれている。

写像。

合成。

文脈。

構造保存。

---

### 数学的補足

圏論の言葉を使えば、型を対象、関数を射として見たとき、プログラムは射の合成である。

ただし、現実の TypeScript には部分関数、例外、`null`、`undefined` が入り込む。

したがって、数学的な構造をそのまま信じるのではなく、型に何が現れているかを常に確認する必要がある。

型に現れていないものは、合成を壊す。

---

### まとめ

Part 1 で得た視点は次である。

- 関数は写像である
- プログラムは合成である
- 合成は型によって接続される
- 型が嘘をつくと合成は壊れる
- `Option` は欠落可能性を構造として扱う
- `map` は文脈を保存して中身を写す

次の Part では、プログラムが壊れる理由をより体系的に扱う。
