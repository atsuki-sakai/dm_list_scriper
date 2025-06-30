# HotPepper Beauty サロンスクレイパー

HotPepper Beauty のサロン情報を階層的にスクレイピングし、詳細情報を取得するTypeScriptアプリケーションです。

## 🎯 機能概要

- **階層的エリア選択**: 地域 → サブエリア → 詳細エリアの3段階で絞り込み
- **柔軟なサロン選択**: 最後のサロン、名前検索、一覧から選択の3つの方法
- **詳細情報取得**: 住所、営業時間、料金、設備など13項目の情報を構造化して取得
- **Google検索統合**: Instagram URL、メールアドレス、ホームページURLを自動取得
- **Google Business情報**: 評価、レビュー数、営業時間などのビジネス情報を収集
- **バルク処理**: 複数のサロン情報を一括で処理し、CSV形式でエクスポート
- **ページネーション対応**: 複数ページにまたがるサロン一覧を自動処理

## 🚀 クイックスタート

### 1. インストール
```bash
pnpm install
```

### 2. 環境設定（オプション）
Google Custom Search APIを使用する場合は、`.env.example`を`.env`にコピーして設定：
```bash
cp .env.example .env
```

`.env`ファイルに以下を設定：
- `GOOGLE_API_KEY`: Google Custom Search APIキー
- `GOOGLE_SEARCH_ENGINE_ID`: カスタム検索エンジンID

※設定しない場合は、Bing、Yahoo、goo、Baiduの検索エンジンが使用されます。

### 3. 実行
```bash
pnpm start
```

### 4. 使用方法
1. 地域を選択（1-9の数字または地域名）
2. サブエリアを選択（表示された選択肢から）
3. 詳細エリアを選択（表示された選択肢から）
4. サロン選択方法を選択
   - `1`: 最後のサロン（自動）
   - `2`: サロン名で検索
   - `3`: 一覧から手動選択
5. サロン詳細情報が表示されます

## 📁 プロジェクト構造

```
src/
├── scraper.ts                     # メインエントリーポイント
├── types/                         # 型定義
├── constants/                     # 定数・設定値
├── utils/                         # ユーティリティ関数
├── services/                      # ビジネスロジック
│   ├── scraper.ts                # スクレイピング機能
│   ├── googleSearch.ts           # Google検索統合
│   ├── csvExport.ts              # CSV出力機能
│   ├── userInput.ts              # ユーザー入力処理
│   └── display.ts                # 表示処理
└── controllers/                   # 制御ロジック
    ├── areaController.ts         # エリア選択制御
    ├── salonController.ts        # サロン処理制御
    └── bulkSalonController.ts    # バルク処理制御
```

## 🔧 収集される情報

### サロン基本情報
- サロン名
- 住所
- アクセス・道案内
- 営業時間
- 定休日
- カット価格
- 席数
- スタッフ数
- 駐車場
- 支払い方法
- こだわり条件
- 備考

### Google検索で追加される情報
- Instagram URL
- メールアドレス
- ホームページURL
- Google Business情報
  - 評価（★評価）
  - レビュー数
  - 営業時間
  - 営業状況
  - 電話番号（Google Businessのみ）

## 📚 ドキュメント

詳細なドキュメントは`docs/`ディレクトリを参照してください：
- [Architecture.md](./docs/Architecture.md) - 設計思想・アーキテクチャ詳細
- [API.md](./docs/API.md) - API リファレンス・関数仕様
- [Development.md](./docs/Development.md) - 開発ガイド・拡張方法

## 🛠 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **パッケージマネージャー**: pnpm
- **スクレイピング**: axios + cheerio
- **アーキテクチャ**: 階層化アーキテクチャ（レイヤードアーキテクチャ）

## 📋 要件

- Node.js 18以上
- pnpm 8以上

## 📝 ライセンス

ISC