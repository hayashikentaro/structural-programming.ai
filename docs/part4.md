# Part 4：Monad

---

## Chapter 27：なぜMonadが必要か

---

### 問題提起

Functor は、通常の写像を文脈付きの世界へ持ち上げた。

```text
A -> B
```

を

```text
F<A> -> F<B>
```

へ変換する。

しかし、実際のプログラムで現れる関数は、いつも `A -> B` とは限らない。

たとえば、文字列を数値へ変換する処理を考える。

```ts
type Option<A> = A | null

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}
```

この関数の型は次である。

```text
string -> Option<number>
```

つまり、戻り値がすでに文脈を持っている。

ここで手元にある値も `Option<string>` だったらどうなるか。

```ts
const input: Option<string> = "42"
```

Functor の `map` を使うと、型はこうなる。

```ts
const nested: Option<Option<number>> =
  mapOption(input, parseNumber)
```

文脈が二重になる。

```text
Option<Option<number>>
```

これは型として間違いではない。

しかし、計算の合成としては扱いにくい。

---

### 直感的説明

Functor が扱えるのは、裸の値を返す関数である。

```text
A -> B
```

しかし、失敗するかもしれない計算はこうなる。

```text
A -> Option<B>
```

例外を型に出した計算はこうなる。

```text
A -> Result<E, B>
```

非同期計算はこうなる。

```text
A -> Promise<B>
```

実務で合成したいのは、むしろこちらである。

文脈を持つ値に、文脈を返す関数をつなげたい。

```text
F<A> -> (A -> F<B>) -> F<B>
```

Functor の `map` だけでは、ここまで届かない。

`map` は文脈を保存する。

しかし、文脈を返す計算を接続するわけではない。

---

### 抽象の導入

Monad が必要になる理由は、ネスト問題である。

```text
F<F<A>>
```

文脈の中に文脈が入る。

このネストは、プログラムにおいて頻繁に現れる。

失敗可能な値に、失敗可能な関数を適用する。

非同期の値に、非同期の関数を適用する。

状態を持つ計算に、次の状態を持つ計算を接続する。

このとき必要なのは、単なる変換ではない。

文脈を持つ計算同士の合成である。

Monad は、この合成の規則を与える。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

const input: Option<string> = "42"

const nested: Option<Option<number>> =
  mapOption(input, parseNumber)
```

この `nested` は、設計上の違和感を示している。

型は正しい。

しかし、次の処理へ自然に渡せない。

我々が欲しいのは、次の型である。

```text
Option<number>
```

つまり、二重化した文脈を、文脈の規則に従って接続したい。

---

### 数学的補足

Functor は射 `A -> B` を `F<A> -> F<B>` へ写す。

しかし `A -> F<B>` は、すでに文脈を返す射である。

これを `map` すると、次の形になる。

```text
F<A> -> F<F<B>>
```

Monad は、この形を扱う。

より正確には、次の操作を持つ構造として捉えられる。

```text
flatMap: F<A> -> (A -> F<B>) -> F<B>
```

または、文脈のネストを潰す操作として捉えるなら、

```text
join: F<F<A>> -> F<A>
```

である。

`flatMap` と `join` は深く関係している。

ただし本書では、プログラム設計に直接現れる `flatMap` から理解する。

---

### まとめ

Monad は、難解な呪文ではない。

Functor だけでは合成できない計算が現れたときに必要になる構造である。

問題は、文脈のネストである。

```text
F<F<A>>
```

解きたいことは、文脈を壊さずに計算を接続することである。

ここから `flatMap` が現れる。

---

## Chapter 28：flatMap

---

### 問題提起

もう一度、`Option` の例を見る。

```ts
type Option<A> = A | null

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

const inverse = (n: number): Option<number> =>
  n === 0 ? null : 1 / n
```

`parseNumber` も `inverse` も失敗する可能性を持つ。

型で書けば、こうである。

```text
string -> Option<number>
number -> Option<number>
```

この2つを合成したい。

通常の関数合成なら、次のように考える。

```text
string -> number -> number
```

しかし実際には、途中に `Option` がある。

```text
string -> Option<number>
number -> Option<number>
```

ここで必要なのは、失敗可能性を理解した合成である。

---

### 直感的説明

`flatMap` は、次の2つを同時に行う。

`F<A>` の中に値があるなら、その値を次の計算に渡す。

次の計算が返す `F<B>` を、そのまま結果にする。

`Option` なら、意味はこうである。

値が `null` なら、そこで止まる。

値があるなら、次の関数へ渡す。

次の関数も `null` を返すかもしれない。

それはそのまま `null` として扱う。

つまり `flatMap` は、文脈を壊さずに計算を直列につなぐ。

---

### 抽象の導入

`flatMap` の一般形は次である。

```text
flatMap: F<A> -> (A -> F<B>) -> F<B>
```

`map` と比較すると違いが見える。

```text
map:     F<A> -> (A -> B)   -> F<B>
flatMap: F<A> -> (A -> F<B>) -> F<B>
```

`map` は、裸の値を返す関数を扱う。

`flatMap` は、文脈を返す関数を扱う。

Monad の中心は、この `flatMap` である。

ただし `flatMap` だけではなく、通常の値を文脈へ入れる操作も必要になる。

それが `of` である。

```text
of: A -> F<A>
```

`of` は、最小の文脈を与える。

`Option` なら、値を成功値として包む。

`Result` なら、値を `ok` として包む。

`Promise` なら、値を解決済み Promise として包む。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const ofOption = <A>(value: A): Option<A> =>
  value

const flatMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => Option<B>
): Option<B> =>
  fa === null ? null : f(fa)

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

const inverse = (n: number): Option<number> =>
  n === 0 ? null : 1 / n

const input: Option<string> =
  ofOption("2")

const result: Option<number> =
  flatMapOption(
    flatMapOption(input, parseNumber),
    inverse
  )
```

このコードで起きていることは、分岐の削除ではない。

分岐の構造化である。

`null` の扱いは消えていない。

`flatMapOption` の規則として閉じ込められている。

---

### 数学的補足

`flatMap` は、Kleisli 合成の実用的な形として読める。

通常の関数合成は、次のような射を合成する。

```text
A -> B
B -> C
```

Monad の世界で合成したいのは、次のような射である。

```text
A -> F<B>
B -> F<C>
```

これらは通常の関数合成では直接つながらない。

しかし Monad があれば、文脈 `F` を保ったまま合成できる。

この合成が、プログラムにおける「失敗可能な計算の連鎖」「非同期計算の連鎖」「状態付き計算の連鎖」を支える。

---

### まとめ

`flatMap` は、文脈を返す関数を合成するための操作である。

`map` が値の変換を扱うなら、`flatMap` は計算の接続を扱う。

Functor は写像を持ち上げる。

Monad は合成を回復する。

---

## Chapter 29：Monad則

---

### 問題提起

`flatMap` という名前の関数を作るだけなら簡単である。

しかし、それだけでは Monad とは言えない。

Functor が `map` の法則を必要としたように、Monad も法則を必要とする。

法則がなければ、合成は安定しない。

AI が生成したコードが型に合っていても、合成の意味が壊れているなら、それは構造として誤っている。

---

### 直感的説明

Monad の法則は、`of` と `flatMap` が「自然な合成」として振る舞うことを要求する。

値を `of` で文脈に入れてから関数へ渡すことは、最初からその関数を呼ぶことと同じでなければならない。

文脈付きの値に `of` をつなげても、余計なことは起きてはならない。

計算を3つつなげるとき、どこに括弧を置いても最終的な意味は同じでなければならない。

この3つが、Monad の安定性を支える。

---

### 抽象の導入

Monad には3つの法則がある。

左単位元。

```text
flatMap(of(a), f) = f(a)
```

右単位元。

```text
flatMap(ma, of) = ma
```

結合律。

```text
flatMap(flatMap(ma, f), g)
=
flatMap(ma, a => flatMap(f(a), g))
```

左単位元は、`of` が余計な文脈を足さないことを表す。

右単位元は、`of` が計算合成における単位元として働くことを表す。

結合律は、計算のつなぎ方が括弧の位置に依存しないことを表す。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const ofOption = <A>(value: A): Option<A> =>
  value

const flatMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => Option<B>
): Option<B> =>
  fa === null ? null : f(fa)

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

const inverse = (n: number): Option<number> =>
  n === 0 ? null : 1 / n

const label = (n: number): Option<string> =>
  `value = ${n}`

const a = "2"

const leftIdentityLeft =
  flatMapOption(ofOption(a), parseNumber)

const leftIdentityRight =
  parseNumber(a)

const ma: Option<number> =
  10

const rightIdentityLeft =
  flatMapOption(ma, ofOption)

const rightIdentityRight =
  ma

const associativityLeft =
  flatMapOption(
    flatMapOption(ofOption("2"), parseNumber),
    inverse
  )

const associativityRight =
  flatMapOption(
    ofOption("2"),
    s => flatMapOption(parseNumber(s), inverse)
  )

const associativityWithLabelLeft =
  flatMapOption(
    flatMapOption(
      flatMapOption(ofOption("2"), parseNumber),
      inverse
    ),
    label
  )

const associativityWithLabelRight =
  flatMapOption(
    ofOption("2"),
    s =>
      flatMapOption(
        parseNumber(s),
        n => flatMapOption(inverse(n), label)
      )
  )
```

このコードが示しているのは、具体的な値の一致だけではない。

計算の組み立て方を変えても、意味が変わらないということである。

これはリファクタリング可能性そのものである。

---

### 数学的補足

Monad は、単に `flatMap` を持つ構造ではない。

`of` と `flatMap` が、単位元と結合律を満たす構造である。

結合律は特に重要である。

```text
(ma >>= f) >>= g
=
ma >>= (a => f(a) >>= g)
```

これは、計算列をどこで分割しても同じ意味になることを保証する。

この保証があるから、プログラムを小さな関数へ分けられる。

この保証があるから、AI が生成した小さな部品を人間が安全に合成できる。

---

### まとめ

Monad則は、抽象を実用に耐えるものにする。

左単位元は、文脈への持ち上げが余計なことをしないことを保証する。

右単位元は、持ち上げが合成の単位元であることを保証する。

結合律は、計算の組み立て方を変えても意味が変わらないことを保証する。

型が通ることは出発点にすぎない。

法則が成り立って初めて、合成可能な設計になる。

---

## Chapter 30：具体例

---

### 問題提起

Monad は抽象である。

しかし抽象は、具体例の中で理解されなければならない。

ここでは `Option`、`Result`、`Promise` を見る。

これらは同じ Monad という言葉で語れる。

しかし、保存している文脈は違う。

同じ形を持つが、同じ意味ではない。

この区別が重要である。

---

### 直感的説明

`Option` は欠落可能性を表す。

`flatMap` は、値がなければそこで止める。

`Result` は失敗可能性を表す。

`flatMap` は、エラーならそこで止め、成功なら次へ進む。

`Promise` は非同期性を表す。

`then` は、未来に得られる値を次の非同期計算へ接続する。

それぞれの文脈は違う。

しかし、構造は似ている。

```text
F<A> -> (A -> F<B>) -> F<B>
```

---

### 抽象の導入

Monad を実務で使う時、重要なのは名前ではない。

次の問いである。

```text
この計算は、文脈を返すか。
その文脈を保存したまま、次の計算へ接続したいか。
```

答えが yes なら、そこには Monad 的な構造がある。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const flatMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => Option<B>
): Option<B> =>
  fa === null ? null : f(fa)

type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const flatMapResult = <E, A, B>(
  fa: Result<E, A>,
  f: (a: A) => Result<E, B>
): Result<E, B> =>
  fa.type === "error" ? fa : f(fa.value)

const parseNumber = (s: string): Result<string, number> => {
  const n = Number(s)
  return Number.isNaN(n)
    ? { type: "error", error: "not a number" }
    : { type: "ok", value: n }
}

const inverse = (n: number): Result<string, number> =>
  n === 0
    ? { type: "error", error: "division by zero" }
    : { type: "ok", value: 1 / n }

const result: Result<string, number> =
  flatMapResult(parseNumber("2"), inverse)

const fetchUser = (id: string): Promise<{ id: string; name: string }> =>
  Promise.resolve({ id, name: "Ada" })

const fetchProfile = (
  user: { id: string; name: string }
): Promise<{ displayName: string }> =>
  Promise.resolve({ displayName: user.name.toUpperCase() })

const profile: Promise<{ displayName: string }> =
  fetchUser("1").then(fetchProfile)
```

`Option` と `Result` では、自分で `flatMap` の形を書いた。

`Promise` では、JavaScript の `then` が近い役割を果たす。

ただし `Promise` は JavaScript の実行モデル、例外、thenable の同化などを含むため、数学的に純粋な Monad として扱うには注意が必要である。

実務上は、非同期計算の合成構造として理解するのがよい。

---

### 数学的補足

`Option` の文脈は、値が存在しない可能性である。

`Result<E, A>` は、`E` を固定したときに `A` について Monad として読める。

```text
F(A) = Result<E, A>
```

`Promise` は、値が未来に到着するという文脈を持つ。

同じ Monad 的な型を持っていても、文脈の意味は異なる。

したがって、Monad を使うとは、抽象名を当てはめることではない。

文脈ごとの合成規則を設計することである。

---

### まとめ

`Option`、`Result`、`Promise` は、異なる文脈を持つ。

しかし、文脈付き計算を次の計算へ接続するという形を共有している。

```text
F<A> -> (A -> F<B>) -> F<B>
```

この形を見抜くことが、Monad を設計として使う第一歩である。

---

## Chapter 31：Functorとの関係

---

### 問題提起

Functor と Monad は、別々の抽象として学ばれることが多い。

その結果、Monad は突然現れる難解な概念に見える。

しかし、本書の流れではそうではない。

Functor は、通常の写像を文脈付きの世界へ持ち上げた。

Monad は、文脈を返す計算を文脈付きの世界で合成する。

つまり Monad は、Functor の代替ではない。

Functor の上に、より強い合成規則を加えた構造である。

---

### 直感的説明

`map` が扱う関数は、次である。

```text
A -> B
```

`flatMap` が扱う関数は、次である。

```text
A -> F<B>
```

この違いだけを見ると小さく見える。

しかし設計上は決定的である。

`map` は値の変換である。

`flatMap` は計算の接続である。

値を変えるだけなら Functor。

次の計算が文脈を持つなら Monad。

この判断ができれば、抽象を過剰にも不足にも使わずに済む。

---

### 抽象の導入

Monad があれば、`map` は導ける。

```text
map(fa, f) = flatMap(fa, a => of(f(a)))
```

これは重要である。

Monad は Functor より強い構造である。

`of` で値を文脈に入れ、`flatMap` で接続すれば、通常の `map` と同じことができる。

ただし、実務では `map` と `flatMap` を区別して使うべきである。

なぜなら、それぞれが表す設計意図が違うからである。

`map` は「中身だけを変える」。

`flatMap` は「次の文脈付き計算へ接続する」。

この意図の違いは、コードレビューでも AI への指示でも重要になる。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const ofOption = <A>(value: A): Option<A> =>
  value

const flatMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => Option<B>
): Option<B> =>
  fa === null ? null : f(fa)

const mapOptionFromFlatMap = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  flatMapOption(fa, a => ofOption(f(a)))

const value: Option<number> =
  21

const doubled: Option<number> =
  mapOptionFromFlatMap(value, n => n * 2)
```

`mapOptionFromFlatMap` は、Monad から Functor 的な操作を導いている。

しかし、だからといって常に `flatMap` だけを使えばよいわけではない。

関数が `A -> B` なら `map`。

関数が `A -> F<B>` なら `flatMap`。

この区別を残すことが、構造の可読性を保つ。

---

### 数学的補足

Monad は Functor の構造を含む。

圏論的には、Monad は自己関手 `T` と、自然変換 `eta` と `mu` を持つ構造として定義される。

```text
eta: Id -> T
mu: T . T -> T
```

プログラムの言葉に寄せれば、`eta` は `of` に対応し、`mu` はネストした文脈を潰す `join` に対応する。

```text
of: A -> F<A>
join: F<F<A>> -> F<A>
```

`flatMap` は、`map` と `join` から次のように読める。

```text
flatMap(fa, f) = join(map(fa, f))
```

これは、Functor と Monad の関係をよく表している。

まず `map` によって `A -> F<B>` を文脈内へ持ち上げる。

その結果 `F<F<B>>` が生まれる。

それを `join` で `F<B>` へ潰す。

Monad は、Functor が作るネストを合成として回復する。

---

### まとめ

Functor は、通常の写像を文脈付きの世界へ持ち上げる。

```text
A -> B
```

Monad は、文脈を返す計算を合成する。

```text
A -> F<B>
```

この違いを理解すれば、Monad は急に現れた難解な概念ではなくなる。

Functor の限界から自然に要求される、合成の構造である。

AI 時代において、コードは容易に生成できる。

しかし、文脈をどう保存し、どこで接続し、どの法則を要求するかは、人間が設計しなければならない。

Monad は、その設計責任を明確にするための言葉である。
