# dm_list_scriper

HotPepper Beauty サロン情報スクレイパー

## 概要
HotPepper Beautyからサロン情報を収集し、Google検索を使ってInstagram URLやビジネス情報を取得するツールです。

## 機能
- サロン情報の階層的な検索（地域→サブエリア→詳細エリア）
- Instagram URL、メールアドレス、ホームページURLの自動取得
- Google Business情報の収集
- CSV形式でのデータエクスポート

## 使用方法
```bash
pnpm install
pnpm start
```

## 環境変数
`.env.example`を`.env`にコピーして、必要に応じてGoogle APIキーを設定してください。