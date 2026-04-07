# Part 3：Functor

---

## Chapter 16：map はなぜ現れるのか

---

### 問題提起

Part 2 で我々は、プログラムが壊れる典型的な理由を見た。

```ts
type Option<A> = A | null

const head = (xs: number[]): Option<number> =>
  xs.length === 0 ? null : xs[0]
```

この設計は、部分関数を全関数へ戻した。

しかし次の瞬間、別の問題が現れる。

```ts
const first = head([1, 2, 3])

const doubled =
  first === null
    ? null
    : first * 2
```

値を安全にしたはずなのに、処理のたびに同じ分岐を書くことになる。

```ts
const labeled =
  first === null
    ? null
    : `value = ${first}`
```

ここで起きているのは、単なる冗長さではない。

構造がまだ抽象化されていない。

我々は `number -> string` という写像を書きたいだけなのに、
毎回 `Option` の構造を手で開いている。

---

### 直感的説明

本当に書きたいのは、こうである。

```text
number -> string
```

しかし手元にあるのは、こうである。

```text
Option<number>
```

通常の関数は、裸の値にしか作用しない。

```text
number -> string
```

では、文脈付きの値には作用できない。

```text
Option<number> -> Option<string>
```

この変換を毎回手で書くと、我々は本質ではない仕事をしていることになる。

本質は「値をどう写すか」であって、
「失敗可能性という文脈をどう温存するか」ではない。

文脈の扱いは構造に任せるべきである。

---

### 抽象の導入

ここで必要になる抽象が `map` である。

`map` は、裸の値に対する写像を、文脈付きの値に対する写像へ持ち上げる。

```text
A -> B
```

を

```text
F<A> -> F<B>
```

へ変換する。

ここで `F` は、値を包む文脈である。

`Option` なら「存在しないかもしれない」。

`Result` なら「失敗するかもしれない」。

`Array` なら「複数ある」。

`Promise` なら「まだ到着していない」。

重要なのは、`map` が文脈を消さないことである。

中身の型は変わる。

しかし文脈の形は保存される。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const head = (xs: number[]): Option<number> =>
  xs.length === 0 ? null : xs[0]

const doubled = mapOption(head([1, 2, 3]), n => n * 2)
const labeled = mapOption(head([1, 2, 3]), n => `value = ${n}`)
```

このコードで重要なのは、`mapOption` の中身ではない。

重要なのは、分岐が呼び出し側から消えたことである。

呼び出し側は、もはや `null` を知る必要がない。

`null` は消えたのではない。

構造の責務になった。

---

### 数学的補足

圏論的には、`map` は射の対応である。

```text
f: A -> B
```

があるとき、Functor `F` は次の射を与える。

```text
F(f): F(A) -> F(B)
```

ただし、これは単なる型変換ではない。

`F` は対象 `A` を `F(A)` へ写し、
射 `f` を `F(f)` へ写す。

つまり Functor は「対象と射の両方を写す構造」である。

TypeScript で我々が `map` と呼んでいるものは、
この `F(f)` に対応する操作である。

---

### まとめ

`map` は便利関数ではない。

`map` は、文脈付きの世界で写像を保つための構造である。

AI にコードを書かせる時代には、ここが重要になる。

AI は `if (x === null)` を量産できる。

しかし設計者は、分岐をどこに閉じ込めるべきかを決めなければならない。

`map` はその最初の答えである。

---

## Chapter 17：文脈を壊さずに中身だけを写す

---

### 問題提起

次の `Result` を考える。

```ts
type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const parseNumber = (s: string): Result<string, number> => {
  const n = Number(s)
  return Number.isNaN(n)
    ? { type: "error", error: "not a number" }
    : { type: "ok", value: n }
}
```

ここから `number` を `string` に変換したい。

しかし、失敗は失敗のまま保存したい。

```ts
const parsed = parseNumber("42")

const message =
  parsed.type === "error"
    ? parsed
    : { type: "ok", value: `answer = ${parsed.value}` }
```

このコードは動く。

だが設計としては、まだ構造を手で操作している。

もし各所で同じ分岐を書けば、どこかで必ず意味がずれる。

ある場所ではエラーを保存する。

別の場所では勝手に成功へ戻す。

さらに別の場所ではエラー文言を変える。

こうして「同じ構造」が、呼び出し側ごとに別の意味を持ち始める。

---

### 直感的説明

`Result<E, A>` の `map` は、中の成功値だけを写す。

エラーには触れない。

なぜなら `map` の責務は、文脈を変更することではないからである。

```text
Result<E, A>
```

を

```text
Result<E, B>
```

へ変える。

変わるのは `A` から `B` だけである。

`E` は変わらない。

成功か失敗かという構造も変わらない。

この制約こそが設計である。

---

### 抽象の導入

`Result` の `map` は、次のような意味を持つ。

```text
mapResult: Result<E, A> -> (A -> B) -> Result<E, B>
```

ここには明確な非対称性がある。

`A` は変換してよい。

`E` は変換しない。

成功値は写像の対象である。

エラーは文脈である。

この区別を曖昧にすると、`map` は壊れる。

---

### TypeScriptコード

```ts
type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const ok = <A>(value: A): Result<never, A> =>
  ({ type: "ok", value })

const error = <E>(error: E): Result<E, never> =>
  ({ type: "error", error })

const mapResult = <E, A, B>(
  fa: Result<E, A>,
  f: (a: A) => B
): Result<E, B> =>
  fa.type === "error"
    ? fa
    : { type: "ok", value: f(fa.value) }

const parsed: Result<string, number> = ok(42)

const message: Result<string, string> =
  mapResult(parsed, n => `answer = ${n}`)
```

この例で `mapResult` はエラーを解釈しない。

エラーを翻訳しない。

エラーを握りつぶさない。

それは別の操作の責務である。

`map` は中身を写す。

それ以上をしない。

---

### 数学的補足

`Result<E, A>` は、`E` を固定したときに `A` について Functor になる。

つまり次のように見る。

```text
F(A) = Result<E, A>
```

このとき `E` は Functor が動かす対象ではない。

`E` は固定された文脈の一部である。

TypeScript では型引数が複数あるため、どの型引数について Functor として見るかを設計者が決める必要がある。

これは実装上の都合ではなく、意味論上の選択である。

---

### まとめ

`map` は「変換してよい場所」と「保存すべき場所」を分ける。

この境界がないコードは、AI によって簡単に増殖する。

だが増殖したコードは、構造を共有しない。

Functor を導入するとは、変換の自由と保存の制約を同時に設計することである。

---

## Chapter 18：Functor 法則

---

### 問題提起

`map` という名前の関数を作るだけなら簡単である。

しかし、次のような関数も型だけ見れば `map` に見える。

```ts
type Option<A> = A | null

const badMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  null
```

型は合っている。

しかしこれは明らかに `map` ではない。

値を常に捨てているからである。

別の例もある。

```ts
const noisyMapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> => {
  console.log("mapped")
  return fa === null ? null : f(fa)
}
```

これも型だけ見れば `map` である。

しかし余計な効果を持ち込んでいる。

型だけでは、構造の正しさは十分に語れない。

---

### 直感的説明

`map` が本当に構造を保存しているなら、
少なくとも次の2つは成り立つべきである。

何もしない関数を写しても、何も変わらない。

先に関数を合成してから写しても、
写してから次を写しても、結果は同じである。

これらは気分の問題ではない。

「文脈を壊していない」ことの最低条件である。

---

### 抽象の導入

Functor には2つの法則がある。

1つ目は恒等則である。

```text
map(fa, id) = fa
```

2つ目は合成則である。

```text
map(map(fa, f), g) = map(fa, a => g(f(a)))
```

この2つがあるから、我々は安心して `map` を設計単位として使える。

法則のない抽象は、名前だけの約束である。

法則のある抽象は、合成可能な契約である。

---

### TypeScriptコード

```ts
type Option<A> = A | null

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const id = <A>(a: A): A => a

const compose =
  <A, B, C>(g: (b: B) => C, f: (a: A) => B) =>
  (a: A): C =>
    g(f(a))

const fa: Option<number> = 10

const leftIdentity = mapOption(fa, id)
const rightIdentity = fa

const f = (n: number): string => `${n}`
const g = (s: string): number => s.length

const leftComposition = mapOption(mapOption(fa, f), g)
const rightComposition = mapOption(fa, compose(g, f))
```

このコードはテストそのものではない。

しかし、何を検証すべきかを示している。

我々が確認したいのは「ある入力で偶然期待値になるか」ではない。

確認したいのは、構造が法則を満たすかである。

---

### 数学的補足

圏 `C` から圏 `D` への Functor `F` は、対象と射を写す。

対象については次の対応を持つ。

```text
A |-> F(A)
```

射については次の対応を持つ。

```text
f: A -> B
F(f): F(A) -> F(B)
```

そして次を満たす。

```text
F(id_A) = id_F(A)
```

```text
F(g . f) = F(g) . F(f)
```

TypeScript の `map` は、この射の対応を値レベルで表現している。

恒等則は、何もしない関数を文脈内へ持ち上げても何もしないことを意味する。

合成則は、関数合成の順序構造が文脈内でも保たれることを意味する。

---

### まとめ

Functor は `map` を持つ型ではない。

Functor は、`map` が法則を満たす構造である。

これは AI 協働開発で特に重要である。

AI はシグネチャに合う関数を生成できる。

しかしシグネチャに合うことと、法則に合うことは違う。

設計者は、型だけでなく法則を要求しなければならない。

---

## Chapter 19：Array と Promise を Functor として読む

---

### 問題提起

JavaScript / TypeScript の開発者は、すでに `map` を使っている。

```ts
const names = ["Ada", "Edsger", "Barbara"]
const lengths = names.map(name => name.length)
```

しかし多くの場合、これは配列操作として理解される。

「ループの短い書き方」。

「各要素に関数を適用する便利メソッド」。

この理解は間違いではない。

だが浅い。

`Array#map` は、複数性という文脈を保存している。

---

### 直感的説明

`Array<A>` は、単なる `A` ではない。

それは「0個以上の `A`」である。

```text
A
```

ではなく、

```text
Array<A>
```

である。

`map` は各要素を変換するが、配列であることは保存する。

0個なら0個のまま。

3個なら3個のまま。

順序も保存する。

`Promise` も同じように読める。

```ts
const userId: Promise<number> = Promise.resolve(1)

const label: Promise<string> =
  userId.then(id => `user:${id}`)
```

ここで `then` は広い意味では `map` より強い操作だが、
関数が裸の値を返す場合には、非同期という文脈の中で値を写している。

---

### 抽象の導入

Functor として読むとは、データ構造を「入れ物」として見ることではない。

文脈として見ることである。

`Array` の文脈は複数性である。

`Promise` の文脈は時間差である。

`Option` の文脈は欠落可能性である。

`Result` の文脈は失敗可能性である。

同じ `map` でも、保存している文脈は違う。

だから重要なのは「どうループするか」ではない。

「何を保存しているか」である。

---

### TypeScriptコード

```ts
const names: Array<string> = ["Ada", "Edsger", "Barbara"]

const lengths: Array<number> =
  names.map(name => name.length)

const empty: Array<string> = []

const stillEmpty: Array<number> =
  empty.map(name => name.length)

const delayedNumber: Promise<number> =
  Promise.resolve(42)

const delayedMessage: Promise<string> =
  delayedNumber.then(n => `answer = ${n}`)
```

このコードから読み取るべきことは、`map` や `then` の使い方ではない。

`Array` は要素の変換後も `Array` のままである。

`Promise` は値の変換後も `Promise` のままである。

文脈は保存される。

---

### 数学的補足

`Array` は、集合と関数の圏において Functor として振る舞う。

関数 `f: A -> B` に対して、
`Array` は次の関数を作る。

```text
Array<A> -> Array<B>
```

これは各要素に `f` を適用する写像である。

`Promise` については、JavaScript の実行モデル、例外、キャンセル不能性、thenable の同化などが絡むため、数学的に純粋な Functor として扱うには注意が必要である。

ただし設計の直感としては、「未来に得られる値に対して関数を持ち上げる」構造として読むことができる。

ここでは厳密な圏論モデルではなく、プログラム設計上の文脈保存として扱う。

---

### まとめ

Functor は特別な関数型プログラミング用語ではない。

日常的な `Array#map` の中にも現れている。

ただし、構造として読むか、便利メソッドとして読むかで設計力は変わる。

AI に「配列を map して」と頼むことはできる。

しかし人間は、「この map は何の文脈を保存しているのか」を問う必要がある。

---

## Chapter 20：TypeScript における限界と設計

---

### 問題提起

Functor の一般形は、概念的には次のように書きたい。

```text
map: F<A> -> (A -> B) -> F<B>
```

しかし TypeScript では、`F` そのものを型引数として自然に受け取れない。

次のような型を書きたくなるが、これはそのままでは表現できない。

```ts
type Functor<F> = {
  map: <A, B>(fa: F<A>, f: (a: A) => B) => F<B>
}
```

`F<A>` と書くには、`F` が型コンストラクタでなければならない。

しかし TypeScript の型引数 `F` は、そのままでは型コンストラクタとして適用できない。

ここに高階型、Higher-Kinded Types の問題がある。

---

### 直感的説明

我々が抽象化したいのは、値の型ではない。

型を作るものを抽象化したい。

```text
Option<_>
Result<E, _>
Array<_>
```

これらは、型を受け取って型を返す。

```text
A |-> Option<A>
```

しかし TypeScript は、この「型から型への関数」を第一級には扱えない。

だから設計者は、抽象を諦めるのではなく、表現方法を選ぶ必要がある。

---

### 抽象の導入

現実的な選択肢は複数ある。

1つは、各データ型ごとに具体的な `map` を定義する方法である。

```text
mapOption
mapResult
mapArray
```

これは単純で読みやすい。

しかし抽象の共有は弱い。

もう1つは、URI ベースのエンコーディングで型コンストラクタを近似する方法である。

```text
"Option" + A -> Option<A>
"Result" + E + A -> Result<E, A>
```

この方法は複雑になるが、抽象を型レベルで扱いやすくなる。

重要なのは、どちらが常に正しいかではない。

目的に対して、どの程度の抽象が必要かを選ぶことである。

---

### TypeScriptコード

```ts
type Option<A> = A | null

type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const mapResult = <E, A, B>(
  fa: Result<E, A>,
  f: (a: A) => B
): Result<E, B> =>
  fa.type === "error"
    ? fa
    : { type: "ok", value: f(fa.value) }
```

この段階では、無理に汎用 `Functor<F>` を作らない。

なぜなら、読者に教えたいのは TypeScript 型体操ではないからである。

教えたいのは、構造を保存する設計である。

より抽象的なエンコーディングは、必要になった時に導入すればよい。

---

### 数学的補足

圏論の Functor は、型システム上の `interface` ではない。

対象と射の対応であり、恒等射と合成を保存する写像である。

TypeScript の `interface` で Functor を表現しても、
法則そのものは型検査されない。

したがって TypeScript では、次の3層を分けて考える必要がある。

1. 概念としての Functor
2. API としての `map`
3. 法則としての恒等則・合成則

この3つを混同すると、`map` という名前の関数があるだけで Functor を実装した気になってしまう。

それは危険である。

---

### まとめ

TypeScript は Functor を学ぶのに十分な言語である。

しかし Functor を完全に型で表すには制限がある。

この制限は欠陥ではなく、設計判断を促す境界である。

抽象は深ければよいわけではない。

合成可能性を必要なだけ表現できることが重要である。

---

## Chapter 21：Functor と AI 協働開発

---

### 問題提起

AI に次のように依頼したとする。

```text
ユーザーIDを受け取り、ユーザー名を取得して、大文字に変換してください。
失敗時は null を返してください。
```

AI はすぐにコードを書く。

```ts
const getUpperName = async (id: string): Promise<string | null> => {
  const user = await fetchUser(id)
  if (user === null) return null
  return user.name.toUpperCase()
}
```

このコードは妥当に見える。

しかし設計上の問いが抜けている。

失敗可能性はどこで表現されるのか。

非同期性はどこで表現されるのか。

`null` はどの層で許されるのか。

値の変換と文脈の処理は分離されているのか。

---

### 直感的説明

AI 協働開発では、コード生成の速度が問題ではない。

むしろ速すぎることが問題になる。

構造化されていない分岐、例外、`null`、非同期処理が一瞬で増える。

人間が設計すべきなのは、次の問いである。

```text
この変換は、文脈の内側だけを変えるのか。
それとも文脈そのものを変えるのか。
```

内側だけを変えるなら、それは Functor の問題である。

文脈そのものを変えるなら、別の抽象が必要になる。

---

### 抽象の導入

Functor を使うと、AI への指示も変わる。

悪い指示はこうである。

```text
null の場合を考慮して変換してください。
```

これは実装の分岐を要求している。

構造を要求していない。

良い指示はこうである。

```text
Option の文脈を保存したまま、成功値の user.name だけを uppercase へ写してください。
失敗可能性の意味は変更しないでください。
```

これは構造を要求している。

AI に任せるべきはコード生成である。

人間が守るべきは、文脈の境界である。

---

### TypeScriptコード

```ts
type Option<A> = A | null

type User = {
  id: string
  name: string
}

const mapOption = <A, B>(
  fa: Option<A>,
  f: (a: A) => B
): Option<B> =>
  fa === null ? null : f(fa)

const getName = (user: User): string =>
  user.name

const uppercase = (s: string): string =>
  s.toUpperCase()

const toUpperName = (user: User): string =>
  uppercase(getName(user))

const user: Option<User> = { id: "1", name: "ada" }

const upperName: Option<string> =
  mapOption(user, toUpperName)
```

この例では、`toUpperName` は文脈を知らない。

`mapOption` は業務知識を知らない。

この分離が重要である。

AI に `toUpperName` を書かせることは容易である。

しかし `Option` の文脈をどこで保存するかは、設計者が決める。

---

### 数学的補足

Functor は構造保存写像である。

この言い方は抽象的だが、AI 協働開発では非常に実践的である。

構造保存とは、プロンプトに含めるべき設計制約である。

```text
成功値だけを変換する。
失敗の意味は変えない。
非同期性を同期処理に潰さない。
配列の順序や個数を変えない。
```

これらはすべて、Functor 的な制約として読める。

---

### まとめ

AI 時代のプログラミング教育では、構文よりも構造を教える必要がある。

Functor はその最初の大きな抽象である。

なぜなら Functor は、値の変換と文脈の保存を分離するからである。

この分離がないまま AI と協働すると、コードは速く増える。

しかし設計は速く壊れる。

---

## Chapter 22：Functor の限界

---

### 問題提起

`map` は強力である。

しかし万能ではない。

次の関数を考える。

```ts
type Option<A> = A | null

const parseNumber = (s: string): Option<number> => {
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}
```

そして手元に `Option<string>` がある。

```ts
const input: Option<string> = "42"
```

これを `map` するとどうなるか。

```ts
const parsed = mapOption(input, parseNumber)
```

概念的には、結果はこうなる。

```text
Option<Option<number>>
```

文脈が二重になる。

---

### 直感的説明

Functor が扱えるのは、裸の値を返す関数である。

```text
A -> B
```

しかし実際のプログラムでは、文脈を返す関数が多い。

```text
A -> Option<B>
A -> Result<E, B>
A -> Promise<B>
```

このような関数を `map` で持ち上げると、文脈の中に文脈が入る。

```text
F<A> -> F<F<B>>
```

これは Functor が壊れているのではない。

Functor の責務を超えているのである。

---

### 抽象の導入

Functor は、文脈を保存しながら中身を写す。

しかし、文脈を返す計算同士を接続する抽象ではない。

必要になるのは、次の形である。

```text
F<A> -> (A -> F<B>) -> F<B>
```

これは次の Part で扱う Monad の領域である。

ここで大切なのは、Functor の限界を欠点として見ないことである。

よい抽象は、できることだけでなく、できないことも明確にする。

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

この `nested` は間違いではない。

型は正しい。

しかし、次の計算へ合成したい場合には扱いづらい。

その扱いづらさは、次の抽象が必要であることを知らせている。

---

### 数学的補足

Functor は射 `A -> B` を `F<A> -> F<B>` へ写す。

しかし `A -> F<B>` は、すでに文脈を返す射である。

これを通常の `map` で扱うと、

```text
F<A> -> F<F<B>>
```

になる。

この二重の文脈を自然に潰して合成する構造が Monad である。

つまり Monad は Functor の代替ではない。

Functor の上に、計算の接続規則を追加した構造である。

---

### まとめ

Functor は、値の変換と文脈の保存を分離する。

しかし、文脈を返す計算の連鎖までは扱わない。

この境界を理解することが重要である。

抽象は増やせばよいのではない。

必要になった地点で、必要な強さの抽象を導入する。

次に必要になるのは、合成を回復する構造である。

それが Monad である。

---

## Part 3 まとめ

Functor は、通常の写像を文脈付きの世界へ持ち上げる構造である。

```text
A -> B
```

を

```text
F<A> -> F<B>
```

へ変換する。

このとき、変わるのは中身の型である。

保存されるのは文脈である。

`Option` は欠落可能性を保存する。

`Result` は失敗可能性を保存する。

`Array` は複数性を保存する。

`Promise` は時間差という文脈を保存するものとして読める。

Functor は `map` を持つだけではない。

恒等則と合成則を満たす。

```text
map(fa, id) = fa
```

```text
map(map(fa, f), g) = map(fa, a => g(f(a)))
```

この法則があるから、`map` は単なる便利関数ではなく、設計上の契約になる。

AI 時代において、人間が守るべきものはこの契約である。

コードは生成できる。

しかし構造は設計しなければならない。

Functor は、構造としてのプログラミングにおける最初の本格的な抽象である。

次の Part では、Functor では扱えない問題に進む。

文脈を返す計算を、どう合成するか。

その問いが Monad を要求する。
