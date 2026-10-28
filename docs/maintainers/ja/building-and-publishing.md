# ビルドと公開

ローカルでの開発から、サイトのビルド、npm公開の準備までをまとめています。この資料は開発者向けにリポジトリ内で管理し、公開ドキュメントサイトには含めません。

## 開発を始める

このワークスペースでは、Vite+ と npm を使います。まず `vp install` で依存を揃え、FoldLab は `vp run dev`、FoldNotes は `vp run dev:foldnotes`、ドキュメントは `vp run dev:docs` で起動できます。ライブラリは `vp pack` でビルドし、ESM・型定義・source map を配布します。

内部パッケージの依存には npm 互換の semver を使うため、`workspace:*` の指定は必要ありません。Blume は、新しい依存構成でnpmのpeer解決が循環したことから、現在は2.1.0に固定しています。更新するときは、ビルドとあわせて依存解決も確認します。このワークスペースでは `legacy-peer-deps` の設定は不要です。

公開ドキュメントは `apps/docs/docs` に置きます。実機検証やビルド・公開手順などの開発者向け資料は `docs/maintainers` で管理し、Blume が読み込む範囲から外します。

公開ドキュメントは英語を原文とし、日本語のページを `apps/docs/docs/ja` に置いています。新しい翻訳を確認したら、`vp run docs#translations:adopt` で Blume 公式のワークフローに既存ページを採用させ、対応する原文の版を記録できます。CIでは `vp run docs#translations:check` を使い、翻訳が古くなっていないか確認します。原文を変更したときは日本語も更新し、公式ワークフローで記録を揃えます。詳しい流れは [Blumeの翻訳ガイド](https://useblume.dev/guides/translate-markdown-documentation)で紹介されています。この開発者向け資料は、Blume の翻訳管理とは別に更新します。

## GitHub Pagesへ公開する

Pages のワークフローは、ドキュメント、FoldLab、FoldNotes を別々にビルドしてから、1つの配信物にまとめます。ドキュメントはサイトのルート、FoldLab は `/foldlab/`、FoldNotes は `/foldnotes/` に配置します。アップロード前に `vp run test:pages` でアプリのパス、アセット、ドキュメントのナビゲーションリンクを検証します。

`FOLYX_BASE` が配信パス、`FOLYX_SITE` が origin です。Actions では、どちらも `configure-pages` から取得します。ローカルの Pages ビルドとドキュメント開発サーバーは、既定で `/folyx/` を使います。

リポジトリを接続するときは、Settings → Pages で GitHub Actions を選びます。その後は `main` へのpushか手動操作でデプロイできます。カスタムドメインを使う場合は、先に Pages 側へ設定すると、ビルドに渡す origin と base を公開先に揃えられます。出力は静的ファイルなので、サーバー側のAPIは必要ありません。

## npm公開を準備する

2つのパッケージは、0.1.0から同じバージョンで更新します。公開時は両方の版、Vue から Core への依存、アプリの依存、lockfile を更新します。変更をcommitして対応する v 付きタグを作り、そのタグで手動の release ワークフローを実行します。

ワークフローは、バージョン・ビルド・テスト・配布内容を確認してから、Core、Vue の順で公開します。途中で止まった場合も、内容が一致する既公開の版はスキップして再実行できます。2つの公開は別々の操作になるため、まとめて元に戻すトランザクションではありません。

初回の公開には、`@folyx` scope の権限、公開GitHubリポジトリ、両manifestの正しい repository メタデータ、各パッケージで `release.yml` を指定した Trusted Publisher の設定が必要です。release ワークフローが実際のGitHubリポジトリの情報を設定してからpackするため、このcheckoutに仮の作者名やURLを記載する必要はありません。

新しいパッケージ名では、まずscope所有者が、検証済みの配布物と自身のnpm認証を使って初回公開を行います。その後、パッケージ単位の Trusted Publishing を設定すると、以降は GitHub-hosted runner から OIDC で公開できます。この方法では、長期npmトークンをリポジトリに保存する必要はありません。設定の詳細は [npmのTrusted Publishingガイド](https://docs.npmjs.com/trusted-publishers/)をご覧ください。
