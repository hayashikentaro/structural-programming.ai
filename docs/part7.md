# Part 7：Effectを現場へ置く

この Part は、[Chapter 39：effect-tsとの接続](part6.md#chapter-39effect-tsとの接続) をさらに実務寄りに掘り下げるための実践編である。

本編では、`effect-ts` を

> 副作用を値として持ち、合成してから実行する

ための接続点として紹介した。

ここではその先へ進む。

問いは次のようになる。

- 実務では `Effect` をどこから導入するのか
- `Promise` とどう役割を分けるのか
- 依存注入は `Layer` でどう読むのか
- エラーは例外ではなく、どう接続面へ出すのか
- Web アプリや API サーバーでは、どこで実行すればよいのか

重要なのは、`effect-ts` を「高機能な非同期ライブラリ」として覚えることではない。

むしろ、

> 失敗・依存・実行境界を、コード上の構造として固定するための装置

として読むことである。

---

## 1. 何が嬉しいのか

`Promise` ベースのアプリケーションが壊れやすいのは、非同期だからではない。

壊れやすいのは、次のものが関数の外に漏れやすいからだ。

- どこで失敗するのか
- 何に依存しているのか
- リトライしてよいのか
- ログやトレースをどこで入れるのか
- リソースをいつ閉じるのか

たとえば次の関数は、すぐに書ける。

```ts
const registerUser = async (input: {
  name: string
  email: string
}) => {
  const saved = await db.insertUser(input)
  await mailer.sendWelcome(input.email)
  return saved.id
}
```

しかしこの形では、少なくとも次が隠れている。

- `db` と `mailer` に依存している
- DB 障害とメール障害が区別されない
- 途中失敗時の振る舞いが型に出ない
- テスト時の差し替え境界がコードから読みにくい

`effect-ts` を導入する意味は、これらを一気に「見える形」に戻すことにある。

---

## 2. 最小の読み方

まずは、`Effect` を次のように読む。

```text
Effect<成功, 失敗, 依存>
```

たとえば

```ts
Effect.Effect<User, UserNotFound, UserRepository>
```

は、

- 成功すると `User`
- 失敗すると `UserNotFound`
- 実行には `UserRepository` が必要

という意味になる。

これだけで、`Promise<User>` より読めることがかなり増える。

特に実務で重要なのは、成功値 `User` よりも、

- 何が要るか
- 何が壊れるか

が同時に型へ乗ることだ。

---

## 3. どこから導入するか

全面導入を最初に目指すと、たいてい失敗する。

実務では、次の順で入れるとよい。

1. I/O の濃いユースケースから始める
2. 例外を `Effect.fail` / `Effect.tryPromise` へ押し戻す
3. 依存を引数の束ではなく service として切り出す
4. 実行境界を HTTP handler や CLI entrypoint に限定する

逆に、最初から全関数を `Effect` にする必要はない。

純粋関数はそのままでよい。

```ts
type ValidationError = {
  message: string
}

type ValidEmail = string & { readonly _tag: "ValidEmail" }

const validateEmail = (
  input: string
): Effect.Effect<ValidEmail, ValidationError> =>
  input.includes("@")
    ? Effect.succeed(input as ValidEmail)
    : Effect.fail({ message: "invalid email" })
```

ここで大事なのは、「何でも `Effect` で包む」ことではない。

失敗や依存や実行時条件を、曖昧なままにしないことである。

---

## 4. 依存注入を Layer として読む

オブジェクト指向の DI では、依存注入はしばしば

- コンストラクタ引数
- DI コンテナ
- mock 差し替え

として理解される。

`effect-ts` では、それを

> 計算が必要とする環境を、型で表したまま後から供給する

と読める。

これが `Layer` の直感である。

```ts
import { Context, Effect, Layer } from "effect"

type User = {
  id: string
  name: string
  email: string
}

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (
      id: string
    ) => Effect.Effect<User, UserNotFound>
    readonly save: (
      user: User
    ) => Effect.Effect<{ userId: string }, SaveUserError>
  }
>() {}

type UserNotFound = {
  type: "UserNotFound"
}

type SaveUserError = {
  type: "SaveUserError"
  message: string
}

const inMemoryUserRepository = Layer.succeed(UserRepository, {
  findById: (id) =>
    Effect.fail({ type: "UserNotFound" } as const),
  save: (user) =>
    Effect.succeed({ userId: user.id }),
})
```

ここで `Layer` は「DI の設定ファイル」ではない。

依存の供給そのものを、合成可能な値として扱う仕組みである。

この見方に立つと、

- 本番実装
- テスト実装
- ローカル開発用実装

を、同じ接続面の上で差し替えられる。

---

## 5. Repository は interface ではなく effectful な接続面

実務では repository や gateway を定義することが多い。

ここで重要なのは、「戻り値だけ async にする」ことではない。

失敗も接続面に出すべきである。

```ts
type DuplicateEmail = {
  type: "DuplicateEmail"
}

type DatabaseUnavailable = {
  type: "DatabaseUnavailable"
}

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly insert: (
      user: ValidUser
    ) => Effect.Effect<
      { userId: string },
      DuplicateEmail | DatabaseUnavailable
    >
  }
>() {}
```

この形の強さは、`insert` がただの「保存メソッド」ではなく、

- 何を受け取るか
- 何に成功するか
- どう壊れるか

まで含んだ接続面として読めることにある。

本書の言葉でいえば、

> 射そのものに、壊れ方を埋め戻している

ということだ。

---

## 6. ユースケースを組む

ここでユーザー登録を effect で組んでみる。

```ts
import { Context, Effect } from "effect"

type RegistrationInput = {
  name: string
  email: string
}

type ValidationError = {
  type: "ValidationError"
  message: string
}

type DuplicateEmail = {
  type: "DuplicateEmail"
}

type DatabaseUnavailable = {
  type: "DatabaseUnavailable"
}

type NotificationError = {
  type: "NotificationError"
}

type ValidUser = {
  name: string
  email: ValidEmail
}

type ValidEmail = string & { readonly _tag: "ValidEmail" }

class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly insert: (
      user: ValidUser
    ) => Effect.Effect<
      { userId: string },
      DuplicateEmail | DatabaseUnavailable
    >
  }
>() {}

class Mailer extends Context.Tag("Mailer")<
  Mailer,
  {
    readonly sendWelcome: (
      email: ValidEmail
    ) => Effect.Effect<void, NotificationError>
  }
>() {}

const validate = (
  input: RegistrationInput
): Effect.Effect<ValidUser, ValidationError> =>
  input.email.includes("@")
    ? Effect.succeed({
        name: input.name,
        email: input.email as ValidEmail,
      })
    : Effect.fail({
        type: "ValidationError",
        message: "invalid email",
      })

const registerUser = (
  input: RegistrationInput
): Effect.Effect<
  { userId: string },
  ValidationError | DuplicateEmail | DatabaseUnavailable | NotificationError,
  UserRepository | Mailer
> =>
  Effect.gen(function* () {
    const validUser = yield* validate(input)
    const userRepository = yield* UserRepository
    const mailer = yield* Mailer

    const saved = yield* userRepository.insert(validUser)
    yield* mailer.sendWelcome(validUser.email)

    return { userId: saved.userId }
  })
```

ここで起きていることは、見た目より単純である。

1. 純粋に近い検証を行う
2. repository へ保存する
3. mailer で通知する
4. 最後に成功値を返す

違うのは、その全体が

- 何に依存し
- どう失敗し
- 何に成功するか

を失わずに一つの計算として保持されていることだ。

これが `async/await` との決定的な差になる。

---

## 7. HTTP 境界でどう使うか

多くの開発者が最初につまずくのは、

> では結局、どこで `runPromise` するのか

という点である。

答えは単純で、実行は境界で一度だけ行う。

たとえば HTTP handler なら、そこで初めて effect を実行する。

```ts
import { Effect, Layer } from "effect"

const appLayer = Layer.mergeAll(
  liveUserRepositoryLayer,
  liveMailerLayer
)

export const postRegisterUser = async (req: {
  body: RegistrationInput
}) => {
  const program = registerUser(req.body).pipe(
    Effect.provide(appLayer),
    Effect.match({
      onFailure: (error) => {
        switch (error.type) {
          case "ValidationError":
            return { status: 400, body: error }
          case "DuplicateEmail":
            return { status: 409, body: error }
          case "DatabaseUnavailable":
          case "NotificationError":
            return { status: 503, body: error }
        }
      },
      onSuccess: (result) => ({
        status: 201,
        body: result,
      }),
    })
  )

  return Effect.runPromise(program)
}
```

この形の利点は、ドメインロジックの中に

- HTTP ステータス
- JSON 変換
- リクエストオブジェクト

が漏れ込まないことだ。

ドメインは effect を返す。
HTTP 層はその effect を実行して、外部世界の形式へ変換する。

境界がかなり明確になる。

---

## 8. tryPromise をどう使うか

既存コードに入れるときは、`Promise` API をいきなり消せないことが多い。

その場合は `Effect.tryPromise` が橋になる。

```ts
type FetchUserError =
  | { type: "NetworkError"; message: string }
  | { type: "DecodeError"; message: string }

const loadUser = (
  id: string
): Effect.Effect<User, FetchUserError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`/api/users/${id}`)
      const json = await response.json()
      return decodeUser(json)
    },
    catch: (error) => ({
      type: "NetworkError",
      message: String(error),
    }),
  })
```

ただし、ここで止まってはいけない。

`tryPromise` は導入口としては有効だが、
何でも例外から回収するだけだと、失敗の粒度が粗いまま残る。

実務では次の順で整えるとよい。

1. まず例外を型付きエラーへ回収する
2. 次に `Schema` や decoder で入力検証を分ける
3. 最後に repository / service 境界ごとに失敗を分解する

---

## 9. Schema と組み合わせる

effect の強みは、I/O と検証を一つの世界観で接続しやすい点にもある。

外部入力は汚れている。

したがって、HTTP で受けた JSON をそのままドメインへ流してはならない。

```ts
import { Effect, Schema } from "effect"

const RegistrationInputSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
})

type RegistrationInput = Schema.Schema.Type<typeof RegistrationInputSchema>

type RequestDecodeError = {
  type: "RequestDecodeError"
  message: string
}

const decodeRegistrationInput = (
  raw: unknown
): Effect.Effect<RegistrationInput, RequestDecodeError> =>
  Schema.decodeUnknown(RegistrationInputSchema)(raw).pipe(
    Effect.mapError((error) => ({
      type: "RequestDecodeError",
      message: String(error),
    }))
  )
```

この段階で、

- JSON として正しいか
- ドメインとして妥当か

を分けられる。

これは Part 5 の

- 未検証入力
- 検証済み値

の分離を、そのまま実務へ接続した形である。

---

## 10. ログと観測を後から差し込める

effect を導入する利点は、処理の前後に観測を挿しやすいことにもある。

```ts
const program = registerUser(input).pipe(
  Effect.tap(() => Effect.log("registerUser started")),
  Effect.tapBoth({
    onFailure: (error) => Effect.logError(error),
    onSuccess: (result) => Effect.log(`created: ${result.userId}`),
  })
)
```

ここで重要なのは、ログが業務ロジック本体に溶けていないことだ。

「何をするか」と「どう観測するか」を分けたまま接続できる。

これは、計算を値として持っていることの直接の利益である。

---

## 11. よくある失敗

`effect-ts` 導入時には、いくつか典型的な失敗がある。

### 11-1. 全部を effect にする

純粋関数まで無差別に `Effect` 化すると、かえって構造が見えなくなる。

純粋に書ける部分は、普通の関数でよい。

effect にすべきなのは、

- 失敗を明示したい箇所
- 依存を外出ししたい箇所
- 実行を遅らせたい箇所

である。

### 11-2. エラー型を `unknown` のままにする

`Effect<_, unknown, _>` は、例外より少しましなだけで、設計としてはまだ弱い。

利用者が判断できる単位へ分解した方がよい。

### 11-3. `Layer` を巨大化させる

`Layer` は便利だが、全依存を一つの巨大 layer に押し込むと、結局構造を失う。

小さな service と小さな layer を、必要なところで合成した方が保守しやすい。

### 11-4. 実行境界を守らない

途中の service 層で `Effect.runPromise` し始めると、設計はすぐに壊れる。

一度 effect を作ったら、実行はできるだけ外側まで遅らせた方がよい。

---

## 12. 実務導入の最短ルート

もし既存の Node.js / TypeScript プロジェクトへ導入するなら、現実的な順序は次になる。

1. まず外部 API 呼び出しを `Effect.tryPromise` で包む
2. エラーを `Error` 一発ではなく ADT に分ける
3. repository / mailer / queue を service として切り出す
4. HTTP handler だけで `runPromise` する
5. 入力デコードに `Schema` を使う
6. 最後に `Layer` で本番実装とテスト実装を差し替える

この順番なら、既存アプリケーションを全部書き換えなくても、
構造の強いところから少しずつ広げられる。

---

## 13. まとめ

`effect-ts` の価値は、便利メソッドの多さではない。

本質は、

- 依存を型へ戻す
- 失敗を型へ戻す
- 実行を境界へ押し戻す
- 合成してから観測・実行する

という構造を、TypeScript の実務で保てることにある。

Part 6 の文脈で言い直せば、

> 副作用をなくすのではなく、副作用がどの条件で成立し、どこで実行されるかを設計可能にする

ということである。

その意味で `effect-ts` は、抽象理論の応用例ではない。

構造を失わずに現場へ降りるための、かなり実践的な橋である。
