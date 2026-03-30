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
| 2 | ローカルで **スタブ API** と **フロント** を起動し、手順どおり画面を開いてキャプチャする（**手動**または **[AI 自律](#ai-によるサーバー起動と画面キャプチャ自律作業)**） | [ローカルで画面キャプチャを撮る](#ローカルで画面キャプチャを撮る) |
| 3 | PNG を **`docs/assets/guides/`** に保存する（ファイル名は [`docs/index.html`](./docs/index.html) の `assets/guides/*.png` と一致。手動または AI） | [画像アセット](#画像アセットスクショの命名と配置) |
| 4 | 静的サイトを生成・更新する（手作業・ジェネレータ・AI） | [AI エージェントへの指示（コピペ用）](#ai-エージェントへの指示コピペ用) |
| 5 | 生成物を [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) と突合レビューし、相違があれば **静的サイト側を修正**する（本文が正） | [静的サイトと本文の突合レビュー](#静的サイトと本文の突合レビュー) |
| 6 | `gh-pages` や GitHub Actions で **GitHub Pages** に載せる | [GitHub Pages で公開する](#github-pages-で公開する) |

※ 手順 2〜3 を **AI に一括依頼**する場合は、[AI によるサーバー起動と画面キャプチャ（自律作業）](#ai-によるサーバー起動と画面キャプチャ自律作業) のプロンプトを使う。

### 静的サイトと本文の突合レビュー

正は常に [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) である。生成した HTML 等は、デプロイ前に次を確認し、**齟齬はサイトのソースを直す**（本文にない内容を足したり、本文と矛盾する表現を残したりしない）。

- **章立て**: 手順書1〜4（および §1 固定情報）が欠けていないか、見出しの対応が崩れていないか。
- **手順表**: 各ステップの **No・操作・結果確認** が本文の表と一致するか。抜け・順序違い・文言の勝手な変更がないか。
- **画面名**: ユーザー向け表示に置き換えた場合、[ユーザー向け資料での表記](#ユーザー向け資料での表記) と [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) §1-1 / §1-2 と矛盾していないか。
- **入力制約・状態表示・エラーメッセージ・注意事項**: 本文に列挙されたものが、サイト側で欠落・改変されていないか。
- **画像**: [`docs/index.html`](./docs/index.html) の `docs/assets/guides/` 参照と、該当ステップの対応が正しいか。

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
- リアルタイム加工で **サーバー状態に依存する画面**（例: 「起動する」ボタン、準備完了）は、スタブの **`POST /api/stub/capture/instance-status`** で `STOPPED` / `LIVE_AVAILABLE` などへ切り替え可能です（再起動不要・詳細はスタブ README）。`loop-live-hub-guides/scripts/capture-screens.mjs` も撮影の途中でこの API を呼び出します。スタブのポートを変えた場合は `CAPTURE_STUB_URL`（キャプチャ実行時のみ）を合わせてください。

---

## AI によるサーバー起動と画面キャプチャ（自律作業）

人間がブラウザを操作しなくても、**AI エージェントがターミナルでサーバーを起動し、ヘッドレスブラウザ等でスクリーンショットを取得**できるようにするための指示です。Cursor 等で **ワークスペースに `loop-live-hub-guides` / `loop-live-hub-front` / `loop-live-documents` が揃った状態**で実行する。

### AI に任せること・任せないこと

**任せる（自律でよい）**

- `loop-live-hub-backend-stub` の `npm install` と **`npm start`（バックグラウンド）**
- `loop-live-hub-front` の `npm install` と **`npm start`（バックグラウンド）**
- スタブ向けの **`REACT_APP_BACKEND_API_BASE_URL=http://localhost:4010/api` の設定**（下記の条件付き）
- `http://localhost:3000` が応答するまでの **待機**
- [`docs/index.html`](./docs/index.html) に列挙された **`assets/guides/*.png` ファイル名**への保存（**パスは `loop-live-hub-guides/docs/assets/guides/`**）
- **Playwright**（`npx playwright screenshot` や短いスクリプト）、**Puppeteer**、**Chromium CLI** などによる PNG 出力
- **`loop-live-hub-guides/.env`** から `LOOP_LIVE_HUB_USER_ID` / `LOOP_LIVE_HUB_PASSWORD` を読み、**Amplify のサインイン画面に入力してログイン**する（ファイルは [`.gitignore`](./.gitignore) のため **コミットしない**）

**任せない（禁止・要人間）**

- **資格情報をチャットに書かせる、または README に平文で追記すること**
- **`loop-live-hub-guides/.env` を `git add` / コミットすること**
- **`.env.local` に Cognito の秘密や本番 URL を新規で書き込んでコミットすること**（スタブ用の API ベース URL 1 行のみの追記は、**既存ファイルが無い、または当該キーが無い場合に限り**可。既存値は上書きしない）
- **ログイン後しか開けない画面を、認証なしで「撮れた」と偽ること**（`.env` が無い・ログインに失敗する場合は **スキップ**し、一覧で理由を記録する）

### 技術的な注意（AI がハマりやすい点）

- **長時間プロセス**（`npm start`）は **バックグラウンド**で起動し、別コマンドでヘルスチェックする（例: `curl http://localhost:4010/health`、PowerShell の `Invoke-WebRequest http://localhost:3000`）。
- **Windows** ではパス・引用符に注意する（[`README` のスタブ・フロント手順](#ローカルで画面キャプチャを撮る)を優先）。
- **Cognito ログインが必要な画面**（ポータル以降など）は、`loop-live-hub-guides/.env` の資格情報と Playwright 等で **自動ログインを試みる**。失敗時はスキップして報告する。
- 保存先は **GitHub Pages 用の `docs/assets/guides/`**（[`docs/index.html`](./docs/index.html) の `src` と一致）。リポジトリルートの `assets/guides/` にも同じ名前でコピーする運用は任意。

### コピペ用プロンプト（サーバー起動〜キャプチャ）

```text
@workspace
あなたはターミナル操作とファイル書き込みができるエージェントとして、次を自律実行してください。

【目的】
loop-live-hub-guides/docs/index.html に記載の assets/guides/*.png と同名の PNG を、loop-live-hub-guides/docs/assets/guides/ に生成する。
そのために loop-live-hub-backend-stub と loop-live-hub-front をローカルで起動し、ヘッドレスブラウザ（Playwright 等）でスクリーンショットを保存する。

【リポジトリパス（ワークスペースルート基準）】
- スタブ: loop-live-documents/3_Stub/loop-live-hub-backend-stub
- フロント: loop-live-hub-front
- 手順書サイト: loop-live-hub-guides（保存先: loop-live-hub-guides/docs/assets/guides/）
- Cognito 用（撮影のみ・Git に含めない）: loop-live-hub-guides/.env（LOOP_LIVE_HUB_USER_ID / LOOP_LIVE_HUB_PASSWORD。雛形は .env.sample）

【手順】
1. スタブで npm install のあと npm start をバックグラウンド起動。http://localhost:4010/health が通るまで待つ。
2. loop-live-hub-front/.env.local を開き、REACT_APP_BACKEND_API_BASE_URL が未設定なら http://localhost:4010/api を設定する。既存の値がある場合は変更しない。秘密情報を追加しない。このファイルを git add しない。
3. フロントで npm install のあと npm start をバックグラウンド起動。http://localhost:3000 が応答するまで待つ。
4. loop-live-hub-guides/.env が存在する場合、LOOP_LIVE_HUB_USER_ID / LOOP_LIVE_HUB_PASSWORD を読み取り、ブラウザ自動操作で Amplify のサインインを完了してから各画面へ遷移する。存在しない場合はログイン必須のキャプチャをスキップし、報告で明記する。
5. loop-live-hub-guides/docs/index.html から src="assets/guides/....png" を正規表現等で列挙し、必要なファイル名リストを作る。
6. 各 PNG について、対応する画面 URL を画面一覧・手順に照らして開き、viewport 幅 1280 前後でフルページまたは主要領域のスクリーンショットを保存する。ファイル名は index.html と完全一致。
7. ログインや遷移で開けない画面は撮影をスキップし、ループ終了後に理由付きで箇条書きにする。
8. 作業後、起動した開発サーバーを停止してよい（プロセス終了）。

【禁止】
ユーザーにパスワードをチャットで貼らせる、README に資格情報を書く、loop-live-hub-guides/.env を git にコミットする、手順にない画面を捏造する。

【完了報告】
保存した PNG の一覧、スキップしたファイル一覧、使用したコマンドの要約を書く。
```

### サイト生成プロンプトとの併用

- **先に**上記でキャプチャを揃え、その後 [AI エージェントへの指示（コピペ用）](#ai-エージェントへの指示コピペ用) で `docs/index.html` と本文の突合を行う、という順が安全です。
- 逆に、**HTML に無いファイル名で PNG だけ生成しない**（[`docs/index.html`](./docs/index.html) を正とする）。

---

## 画像アセット（スクショ）の命名と配置

- **配置場所（GitHub Pages 用の正）**: **`docs/assets/guides/`**（[`docs/user.html`](./docs/user.html) / [`docs/admin.html`](./docs/admin.html) の `src="assets/guides/..."` と一致させる）。リポジトリルートの `assets/guides/` に同じファイル名を置く運用は任意。
- **スマホ用**: 同じファイル名を **`docs/assets/guides/mobile/`** に置く（`capture-screens.mjs` の `CAPTURE_MOBILE=1` でも同じベース名で出力）。`guide2-*` はユーザー向け手順でモバイル非表示のため、PC と同じパスを参照する運用でもよい。
- **配置場所（ルート）**: `assets/guides/`（例: `assets/guides/guide2-05-server-ready.png`）。
- **ファイル名の形式**: `guide{手順書番号}-{ステップ番号2桁}-{英語スラッグ}.png`
  - 手順書番号: [`LoopLiveの操作手順.md`](./LoopLiveの操作手順.md) の「手順書1」〜「手順書4」→ `1`〜`4`。
  - ステップ番号: 各手順表の **手順 No** を2桁で（例: `01`, `10`, `18`）。**手順書2（リアルタイム加工）**では `guide2-10`〜`guide2-18` が OBS〜停止までの No と対応する（手順9は画像なしのため `guide2-09` は使わない）。
  - スラッグ: 内容が分かる短い英単語（例: `agree-terms`, `obs-ws-password`）。
- **例**: 手順書2・No.5 → `guide2-05-server-ready.png`、No.12 → `guide2-12-obs-add-media-source.png`
- 本文にコメントで紐付けてもよい: `<!-- 画像: assets/guides/guide2-05-server-ready.png -->`

手順の追加・削除でステップ番号がずれた場合は、画像ファイル名を振り直すか欠番を許容するかをチームで決める。

---

## 画面キャプチャとログイン情報（よくある質問）

- **README・チャット・コミットにログイン ID／パスワードを書かないでください。** 手元の撮影用として、**Cognito ログイン用のユーザー ID とパスワードは `loop-live-hub-guides/.env` にのみ記載**します（**`.gitignore` で Git に含めない**）。初回は [`.env.sample`](./.env.sample) をコピーして `.env` を作成し、`LOOP_LIVE_HUB_USER_ID` / `LOOP_LIVE_HUB_PASSWORD` を埋めます。
- **ポータル以降の画面**（配信・ユーザー管理・利用料金など）は、通常 **Cognito でサインイン済み**である必要があります。手動撮影では上記 `.env` のアカウント、またはチームの検証用アカウントでログインして撮影します。
- **`loop-live-hub-backend-stub` は API のスタブ**であり、**ログイン画面（Amplify Authenticator）を自動で通すものではありません**。スタブ＋フロントだけでは、画面によっては本番／検証の認証設定に依存します。
- **公開用手順書のスクショ**では、メールアドレス・氏名・請求金額・インスタンス ID など、**個人情報や機密になりうる表示はマスク**してください（塗りつぶし・ダミー値）。
- **規定のファイル名**は `docs/user.html` / `docs/admin.html` / `docs/index.html` から参照される `assets/guides/guide*.png` と一致させます。PNG を `docs/assets/guides/` に置けば、サイト上に表示されます（未配置時は「画像未配置」と表示）。既存 PNG を旧名から振り直す場合は [`scripts/rename-guide-assets.mjs`](./scripts/rename-guide-assets.mjs) を実行できます。
- **AI に撮影まで任せる**場合は [AI によるサーバー起動と画面キャプチャ（自律作業）](#ai-によるサーバー起動と画面キャプチャ自律作業) を使う。AI は **`loop-live-hub-guides/.env`** から資格情報を読み取りログインできる（ファイルはコミットしない）。

---

## GitHub Pages で公開する

- **料金**: 公開リポジトリであれば、GitHub Pages の利用に追加料金は基本的にかからない（利用規約・各プランの制限に従う）。
- **本リポジトリの静的サイト**: [`docs/index.html`](./docs/index.html) をエントリとする手順書サイトを置いている。**Settings → Pages** で **Deploy from a branch** を選び、**Branch: `main` / Folder: `/docs`** を指定すると、`https://<user-or-org>.github.io/loop-live-hub-guides/` で公開できる（リポジトリ名が `loop-live-hub-guides` の場合）。
- **`docs/.nojekyll`**: Jekyll を無効にし、静的 HTML をそのまま配信する。
- **画像**: GitHub Pages は **`docs/` 配下のみ**がサイトルートになる。スクリーンショットを表示する場合は **`docs/assets/guides/`** に PNG を置く（リポジトリルートの `assets/guides/` と同じファイル名でコピーして同期するとよい）。
- その他の手順例: `gh-pages` ブランチへのデプロイ、GitHub Actions で `dist` を載せる、など。

採用するジェネレータ（VitePress / Docusaurus 等）に切り替える場合は、ビルド出力先を `docs/` または Actions のアーティファクトに合わせて更新する。

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

操作手順サイトを AI に任せるときは、**ワークスペースに本リポジトリと `loop-live-hub-front`（およびスタブ用の `loop-live-documents`）が開かれた状態**で、次をコピーして指示に使う。

**推奨順**: 画面キャプチャが未整備なら、先に [AI によるサーバー起動と画面キャプチャ（自律作業）](#ai-によるサーバー起動と画面キャプチャ自律作業) のプロンプトで **`docs/assets/guides/*.png` を生成**してから、下記で `docs/index.html` と本文を突合する。

### プロンプト例（静的サイトの生成・更新）

```text
@workspace
次のファイルを正として、ユーザー向けの操作手順サイト（loop-live-hub-guides/docs/index.html を主対象）を生成・更新してください。

- 必読: loop-live-hub-guides/LoopLiveの操作手順.md（全文）
- 画像: loop-live-hub-guides/docs/assets/guides/ 内の guide{1-4}-{NN}-*.png（存在するもののみ表示。index.html の src と一致）
- 公開想定: GitHub Pages（/docs をルート。相対パスで動くこと）

要件:
1. §1「固定情報」は用語集・ナビに利用。§2〜§5 を「手順書1」〜「手順書4」の章に分割する。
2. 各手順は表「No | 画面 | 操作 | 結果確認」を、番号付きステップまたは表として表示する。
3. 公開テキストでは内部コンポーネント名（PortalPage 等）とロールコードを使わず、LoopLiveの操作手順.md §1-1 / §1-2 のユーザー向け表示名に置き換える。
4. 画像ファイルが存在するステップには img で表示する。index.html に既に figure がある場合はパスと alt を維持する。
5. スマホでも読めるレスポンシブ。見出し階層と余白を明確に。
6. 本文にない仕様の追加や推測による説明はしない。

生成後、loop-live-hub-guides/README.md の「静的サイトと本文の突合レビュー」に従い、LoopLiveの操作手順.md と差分がないかレビューし、相違があれば静的サイト側を修正してください。

完了後、変更点と GitHub Pages の確認手順を要約してください。
```

### 出力に求める内容（チェックリスト）

1. **情報設計**: §1 は用語集・サイドバー。§2〜§5 は手順書1〜4の章。
2. **表の扱い**: `No | 画面 | 操作 | 結果確認` を UI に落とし込む。
3. **ユーザー向け文言**: [ユーザー向け資料での表記](#ユーザー向け資料での表記) 準拠。
4. **画像**: `docs/assets/guides/guide{n}-{nn}-*.png` を参照（[`docs/index.html`](./docs/index.html）のファイル名と一致）。
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
| `.env.sample` | Cognito 撮影用の環境変数テンプレート（`LOOP_LIVE_HUB_USER_ID` / `LOOP_LIVE_HUB_PASSWORD`）。 |
| `.env` | 上記をコピーした**ローカル専用**（**Git に含めない**）。 |
| `assets/guides/` | 手順用スクリーンショット（リポジトリルート・命名規則の正）。 |
| `docs/index.html` | ユーザー向け静的サイト（`LoopLiveの操作手順.md` に基づく生成物）。 |
| `docs/assets/css/styles.css` | 上記サイトのスタイル。 |
| `docs/assets/guides/` | GitHub Pages 用の画像配置先（`/docs` 公開時）。 |
| `README.md` | 本ファイル（作成手順・AI 指示・公開方針）。 |
