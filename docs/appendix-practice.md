# 補論A：実践

抽象を学んだあとに起こりがちな誤解がある。

それは、実務とは抽象を忘れる場面だ、という誤解である。

実際は逆だ。

実務こそ、構造を失うとすぐに壊れる。

API は境界を誤ると永続的に破綻する。
フロントエンドは状態の流し方を誤ると局所修正不能になる。
バックエンドは副作用と依存を隠すと変更コストが爆発する。

この補論では、これまでの議論を「現場でどこに置くか」という問いへ落とし込む。

重要なのは、抽象名を持ち込むことではない。

> 壊れない接続面をどう設計するか

を、実務の言葉で言い直すことである。

ここでは、一つの小さな継続ケースを意識して読むと分かりやすい。

たとえば「ユーザー登録」を考える。

- Part 5 では、未検証の入力と検証済みの値を分ける
- Part 6 では、保存や通知を effect として分離する
- Part 7 では、その境界を API や UI やバックエンドにどう置くかを見る

つまり実務への接続とは、新しい話題へ飛ぶことではない。

これまで分解してきた構造を、現場の接続面へ戻すことである。

---

## Chapter 43：API設計

### 問題提起

多くの API は、動く。

しかし長く使うと壊れる。

その理由は性能でもスケールでもなく、境界の弱さであることが多い。

たとえば次のような API を考える。

```ts
type CreateUserRequest = {
  name?: string
  email?: string
  age?: number
}

type CreateUserResponse = any
```

これは確かに素早く書ける。

だが、この設計は呼び出し側へ曖昧さを輸出している。

- `name` は必須なのか
- `email` は検証済みなのか
- `age` は未成年を許すのか
- 失敗はどう返るのか

つまりこの API は「何でも受けるが、意味は後で考える」という設計になっている。

この章では、継続ケースとして「ユーザー登録」を扱う。

着目したいのは、登録処理そのものより、
どの時点で入力を検証済みの値へ変え、どの時点で失敗を構造化するかである。

### 直感的説明

よい API は、自由度が高い API ではない。

誤用可能性が低い API である。

そのためには、

- 入力を絞る
- 出力を明示する
- 失敗を構造化する
- 状態遷移を隠さない

必要がある。

API は通信仕様ではない。

ドメインの合成条件を外部へ公開する接続面である。

### 抽象の導入

これまでの言葉で言えば、API 設計とは

- どの対象を公開するか
- どの射を許すか
- どの失敗を `Result` として表すか

を決める作業である。

ここで `DTO` とドメイン型を分けることが重要になる。

外部入力は汚れている。

だから受信時点では、まだ検証済みの型にしてはならない。

### TypeScriptコード

```ts
type CreateUserRequestDto = {
  name: string
  email: string
}

type ValidationError = {
  message: string
}

type ValidName = string & { readonly _tag: "ValidName" }
type ValidEmail = string & { readonly _tag: "ValidEmail" }
type UserId = string & { readonly _tag: "UserId" }

type CreateUserCommand = {
  name: ValidName
  email: ValidEmail
}

declare const toCreateUserCommand: (
  dto: CreateUserRequestDto
) => Result<ValidationError, CreateUserCommand>

type CreateUserResult =
  | { type: "ok"; userId: UserId }
  | { type: "error"; error: ValidationError }
```

ここでは成功と失敗が同じレベルで現れている。

また、受信した `DTO` と、検証後にしか作れない `CreateUserCommand` を分けている。

外部入力の `string` と、意味を持つ `ValidEmail` や `UserId` を同一視しないことで、
「まだ汚れている値」と「境界を通過した値」の差がコード上に出る。

これだけでも接続面の強度はかなり変わる。

### 数学的補足

API は外部世界との射である。

そのため内部よりも、境界条件の明示が重要になる。

設計の要点は「内部でうまく処理する」ことより、「不正な射が入れないようにする」ことにある。

### まとめ

API 設計は I/O の整理ではない。

合成可能な境界を、外部に対してどこまで保証するかの設計である。

---

## Chapter 44：フロントエンド

### 問題提起

フロントエンドのコードベースが壊れる典型は、UI が難しいからではない。

状態が雑に混ざるからである。

継続ケースの「ユーザー登録」で言えば、
入力中のフォーム、送信中、入力エラー、登録成功、登録失敗が
一つの画面に同居する。

たとえば次のような値が一つのコンポーネントに同居し始める。

- フォーム入力中の値
- 送信中フラグ
- バリデーションエラー
- 取得済みサーバーデータ
- 一時的な UI 状態

これらを全部 `useState` の断片で持ち始めると、局所的には書けても全体は壊れやすくなる。

### 直感的説明

フロントエンドは見た目の問題ではない。

状態遷移の問題である。

つまり本質は、

- 今どの状態か
- どのイベントで次へ進むか
- どの失敗を UI に表示するか

をきちんと分けることにある。

一番危険なのは、`null` と `boolean` と `string | undefined` でアプリケーション状態を表すことだ。

それでは意味が分散し、画面全体の構造が読めなくなる。

ユーザー登録画面でも、
`isLoading`, `errorMessage`, `createdUserId`, `draftEmail`
のような断片だけで状態を表し始めると、
「今どの段階なのか」が UI から読めなくなる。

### 抽象の導入

フロントエンドこそ ADT が効く。

ロード中、成功、失敗、未入力、送信中。

こうした状態は union として表した方が強い。

ユーザー登録の継続ケースで言えば、
「入力中の状態」と「送信済みで結果待ちの状態」と
「登録成功後の状態」は、別の型として分かれている方がよい。

なぜなら UI は、状態の関数として描画されるべきだからだ。

```text
State -> View
```

この視点に立つと、UI は副作用の塊ではなく、状態からビューへの写像になる。

### TypeScriptコード

```ts
type RegistrationForm = {
  name: string
  email: string
}

type RegistrationScreenState =
  | { type: "editing"; form: RegistrationForm }
  | { type: "submitting"; form: RegistrationForm }
  | { type: "validationError"; form: RegistrationForm; message: string }
  | { type: "registered"; userId: string }
  | { type: "serverError"; message: string }

const renderTitle = (state: RegistrationScreenState): string => {
  switch (state.type) {
    case "editing":
      return "create user"
    case "submitting":
      return "creating..."
    case "validationError":
      return "fix input"
    case "registered":
      return `created: ${state.userId}`
    case "serverError":
      return "try again"
  }
}
```

これは小さな例だが、「ユーザー登録画面が取りうる形」を UI の手前で閉じている。

そのぶん描画は単純になる。

### 数学的補足

状態空間が明示されると、イベント処理は状態遷移系として読める。

ここで大切なのは、イベントハンドラの数ではなく、許される遷移の集合である。

### まとめ

フロントエンドの設計は、コンポーネント分割より先に状態分割で決まる。

UI を状態の写像として読めるようにすることが、壊れにくさの出発点である。

---

## Chapter 45：バックエンド

### 問題提起

バックエンドでは、関数はしばしば最初から副作用を背負っている。

- DB に読む
- 外部 API を叩く
- キューへ積む
- ログを書く

ユーザー登録なら、典型的には
「入力を検証する」「ユーザーを保存する」「歓迎メールを送る」が並ぶ。

そのため実装を先に書くと、すぐに「読んで、判定して、保存して、通知して」が一つの関数へ溶ける。

これが最も危険な形である。

なぜなら、

- ドメイン判断
- 副作用
- 依存関係
- エラー処理

が分離されず、レビュー不能になるからだ。

### 直感的説明

バックエンドで守るべき原則は単純である。

判断と実行を分ける。

たとえばユーザー登録なら、
「この入力は登録可能か」は純粋なドメイン判断でありうる。

一方で「DB に保存する」「メールを送る」は Effect である。

この二つを最初から混ぜると、業務ルールの変更もインフラ変更も同時に波及する。

### 抽象の導入

バックエンドでは、関数の層を分けるとよい。

- 純粋なドメイン関数
- Effect を返すアプリケーション関数
- 実際に実行するインフラ層

この分離により、合成規則がはっきりする。

ドメイン関数は `A -> B`。

ユースケースは `A -> Effect<R, E, B>`。

実行は境界で一度だけ行う。

### TypeScriptコード

```ts
type CreateUserInput = {
  name: string
  email: string
}

type ValidUser = {
  name: string
  email: string
}

type ValidationError = {
  message: string
}

type Result<E, A> =
  | { type: "ok"; value: A }
  | { type: "error"; error: E }

type InfraError =
  | { type: "database"; message: string }
  | { type: "notification"; message: string }

const validateUser = (
  input: CreateUserInput
): Result<ValidationError, ValidUser> =>
  input.email.includes("@")
    ? {
        type: "ok",
        value: { name: input.name, email: input.email },
      }
    : {
        type: "error",
        error: { message: "invalid email" },
      }

type AsyncResult<E, A> = Promise<Result<E, A>>

type SaveUser = (user: ValidUser) => AsyncResult<InfraError, { userId: string }>
type SendWelcomeMail = (user: ValidUser) => AsyncResult<InfraError, void>

const registerUser = async (
  input: CreateUserInput,
  saveUser: SaveUser,
  sendWelcomeMail: SendWelcomeMail
): AsyncResult<ValidationError | InfraError, { userId: string }> => {
  const validated = validateUser(input)

  if (validated.type === "error") {
    return validated
  }

  const saved = await saveUser(validated.value)
  if (saved.type === "error") {
    return saved
  }

  const notified = await sendWelcomeMail(validated.value)
  if (notified.type === "error") {
    return notified
  }

  return { type: "ok", value: { userId: saved.value.userId } }
}
```

ここでは「登録可能かを判断すること」と
「保存・通知を実行すること」を分けている。

この分離があるだけで、設計はかなり読みやすくなる。

重要なのは、バリデーション失敗を
「たまたま別の形の値が返る場合」として扱うことではない。

I/O の失敗も含めて、成功と失敗を判別可能な構造として接続面に露出させることで、
後続の合成規則を明確にすることである。

### 数学的補足

バックエンドの設計を圏論の言葉で言い直す必要はない。

だが、射の合成という視点は非常に有効である。

純粋な判断を先に閉じ、その後ろに Effectful な射を接続することで、責務境界が明確になる。

### まとめ

バックエンドで重要なのは、フレームワークの作法より、判断と実行の分離である。

その分離がなければ、コードは動いても構造は育たない。
