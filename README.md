# structural-programming.ai

> プログラミングとはコードを書くことではない
> 構造を合成することである

---

## 概要

**structural-programming.ai** は、
プログラミングを「構文」ではなく「構造」として学ぶための教材・コードベースです。

AI時代において、コード生成はコモディティ化しています。
人間に残された価値は以下です：

* 合成可能な設計
* 正しい抽象
* 数学的に破綻しない構造

---

## コア原則

### 1. プログラム = 写像

プログラムは処理ではない。

A → B

という対応関係である。

---

### 2. 合成こそが本質

合成できないコードは設計として壊れている。

---

### 3. バグ = 合成の失敗

バグの原因は以下に集約される：

* null / undefined → 部分関数
* 例外 → 非局所的制御
* 状態 → 隠れた入力

---

### 4. 型 = 制約（あるいは証明）

型は単なる注釈ではない。

* 何が可能か
* 何が不可能か

を定義する。

---

## このリポジトリの目的

従来の学習：

* 文法
* フレームワーク
* 実装

---

本プロジェクト：

* 構造
* 合成
* 抽象

---

## 構成

```id="2oz6kp"
docs/      理論（テキスト）
src/       最小実装（Option / Result / State）
tests/     法則の検証
examples/  使用例
```

---

## Laws as Tests（重要）

本プロジェクトでは、数学的法則をテストとして扱う。

例：

* Functorの恒等則
* Functorの合成則
* Monad則（予定）

---

これらが成立しない場合：

👉 その抽象は誤りである

---

これは「挙動のテスト」ではない。

👉 **構造の検証である**

---

## セットアップ

```bash id="0qb56p"
npm install
npm run build
npm run test
```

---

## 対象読者

* AIを使って開発するエンジニア
* 関数型プログラミングに興味がある人
* 数学的思考が得意な人
* 「設計」を理解したい人

---

## なぜ重要か

AIはコードを書く。

しかしAIは：

* 構造を設計しない
* 合成性を保証しない
* 抽象の正しさを証明しない

---

👉 それは人間の仕事である

---

## ロードマップ

* [ ] Functor（厳密版）
* [ ] Monad（合成の回復）
* [ ] Effect system
* [ ] Free構造（DSL）
* [ ] 実務設計への適用

---

## English Summary

This project teaches programming as **structure**, not syntax.

* Program = morphism
* Bugs = failure of composition
* Types = constraints

Focus: composability, correctness, abstraction.

---

## License

MIT
