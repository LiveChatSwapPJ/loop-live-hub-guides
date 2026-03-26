# loop-live-hub-guides

LoopLive の**ユーザー向け操作手順**を Git で管理し、**GitHub Pages** などで公開するためのリポジトリです。

---

## このリポジトリの目的

- **単一の正（ソース・オブ・トゥルース）**: 操作手順の本文は [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) に集約する。
- **派生物**: 画像付き HTML サイト、PDF、スライドなどは、この Markdown と `assets/guides/` の画像から生成・更新する。
- **実装との突合**: 手順表の「画面」列には React コンポーネント名（例: `PortalPage`）が含まれる。公開サイトでは [ユーザー向け資料での表記](#ユーザー向け資料での表記) に従い置き換える。

---

## 手順書を作成するまでの流れ（全体）

次の順で進めると、**本文 → スクショ → サイト → レビュー**まで一貫する。

| 順番 | 作業 | 参照 |
|:---:|:---|:---|
| 1 | [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) が最新か確認・修正する | 本文・[手順書の書き方ルール](#手順書の書き方ルール本文を編集する人向け) |
| 2 | ローカルで **スタブ API** と **フロント** を起動し、手順どおり画面を開いてキャプチャする | [ローカルで画面キャプチャを撮る](#ローカルで画面キャプチャを撮る) |
| 3 | PNG を `assets/guides/` に保存し、[画像の命名規則](#画像アセットスクショの命名と配置)に合わせる | — |
| 4 | 静的サイトを生成する（手作業・ジェネレータ・AI） | [AI エージェントへの指示（コピペ用）](#ai-エージェントへの指示コピペ用) |
| 5 | 生成物を [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) と突合レビューし、相違があれば **静的サイト側を修正**する（本文が正） | [静的サイトと本文の突合レビュー](#静的サイトと本文の突合レビュー) |
| 6 | `gh-pages` や GitHub Actions で **GitHub Pages** に載せる | [GitHub Pages で公開する](#github-pages-で公開する) |

### 静的サイトと本文の突合レビュー

正は常に [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) である。生成した HTML 等は、デプロイ前に次を確認し、**齟齬はサイトのソースを直す**（本文にない内容を足したり、本文と矛盾する表現を残したりしない）。

- **章立て**: 手順書1〜4（および §1 固定情報）が欠けていないか、見出しの対応が崩れていないか。
- **手順表**: 各ステップの **No・操作・結果確認** が本文の表と一致するか。抜け・順序違い・文言の勝手な変更がないか。
- **画面名**: ユーザー向け表示に置き換えた場合、[ユーザー向け資料での表記](#ユーザー向け資料での表記) と [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) §1-1 / §1-2 と矛盾していないか。
- **入力制約・状態表示・エラーメッセージ・注意事項**: 本文に列挙されたものが、サイト側で欠落・改変されていないか。
- **画像**: `assets/guides/` の参照パスと、該当ステップの対応が正しいか。

レビューで本文側の誤りに気づいた場合は、**先に [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) を直し**、そのあとサイト生成物またはテンプレートを再同期する。

---

## ローカルで画面キャプチャを撮る

本番 AWS バックエンドに繋がなくても UI を動かしてスクショできるよう、**固定 JSON のスタブ API**（`loop-live-hub-backend-stub`）を立て、`loop-live-hub-front` の API 向き先をそれに向ける。

詳細は次の README を正とする（ここでは手順書作業に必要な最小限だけ記載する）。

- スタブ: `loop-live-documents/3_Stub/loop-live-hub-backend-stub/README.md`
- フロント: `loop-live-hub-front/README.md`

### 前提

- **Node.js**: スタブは **18 以上**、フロント README では **v14 以上推奨**（実際は 18 付近に揃えると安全）。
- リポジトリの配置例（いずれも同じワークスペース直下）:  
  `loop-live-hub-front` と `loop-live-documents` が並ぶ想定。フロント README にあるとおり、スタブへの相対パスは例として  
  `../loop-live-documents/3_Stub/loop-live-hub-backend-stub` となる。

### 1. スタブバックエンドを起動する

```bash
cd loop-live-documents/3_Stub/loop-live-hub-backend-stub
npm install
npm start
```

- 既定 URL: **`http://localhost:4010`**
- API ベース: `http://localhost:4010/api`
- ヘルスチェック: `http://localhost:4010/health`
- ポート変更: 環境変数 `PORT`（例: `PORT=4011`）。フロントの `.env.local` の URL も合わせる。
- 任意: `STUB_GET_DELAY_MS`（GET のみ応答前待ち・ローディング UI 確認用）、`TRUST_PROXY` などはスタブ README の表を参照。

### 2. フロントエンドをスタブに向けて起動する

1. `loop-live-hub-front` で依存関係を入れる: `npm install`
2. **`loop-live-hub-front/.env.local`** に、バックエンドのベース URL を次のように設定する（スタブの `PORT` と一致させる）。

   ```env
   REACT_APP_BACKEND_API_BASE_URL=http://localhost:4010/api
   ```

3. フロントを起動する。

   ```bash
   cd loop-live-hub-front
   npm start
   ```

4. ブラウザで通常 **`http://localhost:3000`** を開く。

**重要**: `.env.local` を変えたあとは、Create React App の仕様上、**`npm start`（開発サーバー）を再起動**する。

### 3. キャプチャ時の注意

- 撮りたい画面の **URL・権限** は [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) の手順と、`loop-live-hub-front/documents/画面一覧.md` に合わせる。
- 認証まわり（ログイン・サインアップ）は本番 Cognito の設定に依存する。スタブは API の見た目・一覧データの確認向きなので、**ログインが必要な画面**は開発用アカウントやモックの手順を別途確認する（フロントの `README.md`・`GEMINI.md` 等）。
- フィクスチャの内容を変えたい場合は、スタブの `server.js` 内 `fixtures` を編集する（スタブ README 参照）。

---

## 画像アセット（スクショ）の命名と配置

- **配置場所**: 本リポジトリの `assets/guides/`（例: `assets/guides/guide2-05-server-ready.png`）。
- **ファイル名の形式**: `guide{手順書番号}-{ステップ番号2桁}-{英語スラッグ}.png`
  - 手順書番号: [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) の「手順書1」〜「手順書4」→ `1`〜`4`。
  - ステップ番号: 各手順表の `No` を2桁で（例: `01`, `09`, `15`）。
  - スラッグ: 内容が分かる短い英単語（例: `agree-terms`, `open-streaming`）。
- **例**: 手順書2・No.5 → `guide2-05-server-ready.png`
- 本文にコメントで紐付けてもよい: `<!-- 画像: assets/guides/guide2-05-server-ready.png -->`

手順の追加・削除でステップ番号がずれた場合は、画像ファイル名を振り直すか欠番を許容するかをチームで決める。

---

## GitHub Pages で公開する

- **料金**: 公開リポジトリであれば、GitHub Pages の利用に追加料金は基本的にかからない（利用規約・各プランの制限に従う）。
- **手順の例**: 静的ファイルを `gh-pages` ブランチに載せる、または GitHub Actions でビルドした `dist` / `docs` を **Settings → Pages** で公開する。
- **URL**: `https://<org-or-user>.github.io/<repo>/` 形式。サブパス配布の場合は生成物の `base` や `homepage` をリポジトリ名に合わせる。

採用するジェネレータ（VitePress / Docusaurus 等）が決まったら、ビルドコマンドとデプロイワークフローをこの README に追記するとよい。

---

## ユーザー向け資料での表記

エンドユーザー向けのページ・キャプションでは次を守る。

- **出さない**: `PortalPage` などの内部コンポーネント名、ロールコード（`GENERAL` など）。
- **使う**: [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) の **§1-1** の「ユーザー向け表示名」、**§1-2** の「画面上の権限の呼び方」。

手順表の「画面」列は実装突合用に内部名が含まれるため、サイト生成時に上記へ置き換える。

---

## 運用・更新の原則

- UI や文言が変わったら、**まず [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md)** を更新し、続けて **該当スクショ**を差し替える。派生物はビルドまたは再エクスポートで追従させる。
- 変更内容は **差分で明示**すると、表・画像・公開サイトの一括修正がしやすい（例: ボタンラベル `加工開始` → `開始`）。

---

## 手順書の書き方ルール（本文を編集する人向け）

[`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) を追記・修正するときのルール。

- 1ステップ1操作で書く。
- 各ステップに「画面」「操作」「結果確認（画面に何が出たら OK か）」を書く。
- エラー時は「表示メッセージ」「次に何をする（再操作）」だけを書く。
- UI 文言はアプリの表記と一致させる。

---

## AI エージェントへの指示（コピペ用）

操作手順サイトを AI に任せるときは、**ワークスペースに本リポジトリと `loop-live-hub-front` が開かれた状態**で、次をコピーして指示に使う。

### プロンプト例

```text
@workspace
次のファイルを正として、ユーザー向けの操作手順サイト（静的 HTML または採用フレームワーク）を生成・更新してください。

- 必読: loop-live-hub-guides/LoopLiveの操作手順.md（全文）
- 画像: loop-live-hub-guides/assets/guides/ 内の guide{1-4}-{NN}-*.png（存在するもののみ参照）
- 公開想定: GitHub Pages（サブパス配布に対応する base の設定）

要件:
1. §1「固定情報」は用語集・ナビに利用。§2〜§5 を「手順書1」〜「手順書4」の章に分割する。
2. 各手順は表「No | 画面 | 操作 | 結果確認」を、番号付きステップまたは表として表示する。
3. 公開テキストでは内部コンポーネント名（PortalPage 等）とロールコードを使わず、LoopLiveの操作手順.md §1-1 / §1-2 のユーザー向け表示名に置き換える。
4. 画像ファイルが存在するステップには img で表示する。本文に <!-- 画像: ... --> があれば従う。
5. スマホでも読めるレスポンシブ。見出し階層と余白を明確に。
6. 本文にない仕様の追加や推測による説明はしない。

生成後、loop-live-hub-guides/README.md の「静的サイトと本文の突合レビュー」に従い、LoopLiveの操作手順.md と差分がないか人間または自己レビューし、相違があれば静的サイト側を修正してください。

完了後、ビルド方法と GitHub Pages への載せ方を README に追記できる形で要約してください。
```

### 出力に求める内容（チェックリスト）

1. **情報設計**: §1 は用語集・サイドバー。§2〜§5 は手順書1〜4の章。
2. **表の扱い**: `No | 画面 | 操作 | 結果確認` を UI に落とし込む。
3. **ユーザー向け文言**: [ユーザー向け資料での表記](#ユーザー向け資料での表記) 準拠。
4. **画像**: `guide{n}-{nn}-*.png` を参照。コメント指示があれば優先。
5. **レスポンシブ**: 狭い幅で表が読めること。
6. **スタイル**: 読みやすいモダンなトーン。色は LoopLive Web に寄せてよい。
7. **GitHub Pages**: 相対パスで動く出力（`base` をリポジトリ名に合わせる等）。

### やらないこと

- [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) にない仕様の追加、推測による画面説明。
- 内部用語・ロールコードをユーザー向け見出しのまま残すこと。

---

## 実装参照（手順書の突合・修正時）

手順が実装とずれたときの確認先として、主に次を参照する。

**フロントエンド**

- `loop-live-hub-front/src/App.js`
- `loop-live-hub-front/src/components/PortalPage.js`
- `loop-live-hub-front/src/components/InstanceDashboard.js`
- `loop-live-hub-front/src/components/InstanceCard.js`
- `loop-live-hub-front/src/components/StreamingPage.js`
- `loop-live-hub-front/src/components/PhotoFaceSwapPage.js`
- `loop-live-hub-front/src/components/UserManagementPage.js`
- `loop-live-hub-front/src/components/UsageBillingPage.js`
- `loop-live-hub-front/src/components/ServerMasterPage.js`
- `loop-live-hub-front/src/components/shared/ObsController.js`
- `loop-live-hub-front/src/components/shared/TermsAgreementDialog.js`
- `loop-live-hub-front/src/components/shared/ConfirmationDialog.js`
- `loop-live-hub-front/src/components/shared/ImageUploader.js`
- `loop-live-hub-front/src/api/apiClient.js`

**バックエンド（API ルーター・代表 API）**

- `loop-live-hub-backend/src/main/java/.../router/ApiRouter.java`
- `loop-live-hub-backend/src/main/java/.../api/CreateUserApi.java`
- `loop-live-hub-backend/src/main/java/.../api/UpdateUserApi.java`
- `loop-live-hub-backend/src/main/java/.../api/DeleteUserApi.java`
- `loop-live-hub-backend/src/main/java/.../api/CreateManagedServerApi.java`
- `loop-live-hub-backend/src/main/java/.../api/UpdateManagedServerApi.java`
- `loop-live-hub-backend/src/main/java/.../api/ListManagedServersApi.java`
- `loop-live-hub-backend/src/main/java/.../api/CreateSwapUploadPresignedUrlApi.java`
- `loop-live-hub-backend/src/main/java/.../api/CreateSwapRequestApi.java`
- `loop-live-hub-backend/src/main/java/.../api/GetUsageHistoryApi.java`

※上記はワークスペース内の別リポジトリを指す。クローン先のルートからの相対パスで解決する。

---

## 付記: スライド・PDF への展開

「スライド作成 AI」や PDF にも、入力の正は [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) とする。章立ては手順書1〜4に対応させる。

---

## 参考資料（手順書作成時）

手順の補足・実装照合に使う。いずれもワークスペース（リポジトリ群のルート）からの相対パス。

**全体**

- `loop-live-documents/2_仕様書/AWSアーキ図.md`

**WEBアプリ**

- `loop-live-hub-front/documents/画面一覧.md`
- `loop-live-hub-backend/README.md`
- `loop-live-documents/2_仕様書/テーブル定義書.md`

**リアルタイム顔交換サーバー**

- `Swap-LiveChat-Camera/documents/アプリケーション全体設計.md`

**写真でフェイススワップ機能**

- `loop-live-hub-swapper/README.md`

**ローカル UI・スタブ（画面キャプチャ用）**

- `loop-live-documents/3_Stub/loop-live-hub-backend-stub/README.md`（スタブ API）
- `loop-live-hub-front/README.md`（フロント起動・`.env.local`）

---

## リポジトリ構成（目安）

| パス | 役割 |
|:---|:---|
| `LoopLiveの操作手順.md` | 操作手順の**本文**（固定情報・手順表・エラー文言）。 |
| `assets/guides/` | 手順用スクリーンショット。 |
| `README.md` | 本ファイル（作成手順・AI 指示・公開方針）。 |
