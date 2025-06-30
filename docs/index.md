# HotPepper Beauty サロンスクレイパー - ドキュメント

## 📚 ドキュメント一覧

### 🚀 はじめに
- **[README](./README.md)** - プロジェクト概要・クイックスタート
- **[ファイルマップ](./FileMap.md)** - 📍 どこに何があるかの早見表（迷ったらここ！）

### 📐 設計・アーキテクチャ
- **[アーキテクチャ](./Architecture.md)** - 設計思想・プロジェクト構造の詳細

### 🔧 開発・保守
- **[API リファレンス](./API.md)** - 全関数・型・定数の詳細仕様
- **[開発ガイド](./Development.md)** - 開発時の注意点・拡張方法・トラブルシューティング

---

## 🎯 目的別ガイド

### 🆕 初めて使う方
1. [README](./README.md) でプロジェクト概要を理解
2. [ファイルマップ](./FileMap.md) でファイル構造を把握
3. 実際に動かしてみる（`pnpm start`）

### 🔍 特定の機能を探したい方
1. [ファイルマップ](./FileMap.md) の「〇〇したい」から探す表を確認
2. [API リファレンス](./API.md) で詳細な使い方を確認

### 🛠 開発・拡張したい方
1. [アーキテクチャ](./Architecture.md) で設計思想を理解
2. [開発ガイド](./Development.md) で開発規約とベストプラクティスを確認
3. [API リファレンス](./API.md) で既存機能を把握

### 🚨 問題が発生した方
1. [開発ガイド](./Development.md) の「よくある問題と解決方法」を確認
2. [ファイルマップ](./FileMap.md) で修正対象ファイルを特定

---

## 📁 プロジェクト構造概要

```
src/
├── scraper.ts              # 🎯 メインエントリーポイント
├── types/                  # 📋 型定義
├── constants/              # ⚙️ 定数・設定値
├── utils/                  # 🛠 ユーティリティ関数
├── services/               # 🔧 ビジネスロジック
│   ├── userInput.ts        #   💬 ユーザー入力処理
│   ├── scraper.ts          #   🔍 スクレイピング処理
│   └── display.ts          #   🎨 表示処理
└── controllers/            # 🎮 制御ロジック
    ├── areaController.ts   #   📍 エリア選択制御
    └── salonController.ts  #   🏪 サロン関連制御
```

## 🔗 外部リンク

### 技術参考資料
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Axios Documentation](https://axios-http.com/docs/intro)
- [Node.js Documentation](https://nodejs.org/en/docs/)

### プロジェクト管理
- [GitHub Repository](../README.md)
- [Issues](../../../issues)
- [Pull Requests](../../../pulls)

---

## 💡 ヒント

- **迷ったら [ファイルマップ](./FileMap.md)** - 最も実用的で素早く目的の場所を見つけられます
- **新機能開発時は [開発ガイド](./Development.md)** - ステップバイステップで手順を解説
- **型や関数の詳細は [API リファレンス](./API.md)** - 完全な仕様書として活用
- **設計の意図を知りたい時は [アーキテクチャ](./Architecture.md)** - なぜこの構造にしたかを理解

## 📝 ドキュメント更新

新機能追加や変更時は、該当するドキュメントも併せて更新してください：

1. **新機能追加** → API リファレンス + ファイルマップ
2. **構造変更** → アーキテクチャ + ファイルマップ  
3. **開発手順変更** → 開発ガイド
4. **使い方変更** → README

---

*最終更新: 2024年* 