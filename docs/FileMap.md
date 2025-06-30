# ファイルマップ - クイックリファレンス

## 📍 どこに何があるかの早見表

### 🎯 「〇〇したい」から探す

| やりたいこと | ファイル | 関数/定数 |
|-------------|---------|-----------|
| **エリアを追加したい** | `src/constants/index.ts` | `AREA_URL_MAP` |
| **新しいCSS選択子を追加** | `src/constants/index.ts` | `SELECTORS` |
| **新しい型を定義したい** | `src/types/index.ts` | インターフェース定義 |
| **URLを操作したい** | `src/utils/index.ts` | `resolveUrl()`, `extractQueryParam()` |
| **重複を除去したい** | `src/utils/index.ts` | `removeDuplicates()` |
| **待機処理を入れたい** | `src/utils/index.ts` | `sleep()` |
| **ユーザーに質問したい** | `src/services/userInput.ts` | `askQuestion()`, `promptFromList()` |
| **スクレイピングしたい** | `src/services/scraper.ts` | `fetchSubAreas()`, `extractSalonDetails()` など |
| **画面に表示したい** | `src/services/display.ts` | `displaySalonDetails()`, `displayError()` など |
| **エリア選択フローを変更** | `src/controllers/areaController.ts` | `processAreaSelection()` |
| **サロン選択フローを変更** | `src/controllers/salonController.ts` | `processListing()` |
| **アプリ全体の流れを変更** | `src/scraper.ts` | `main()` |

### 🗂 ファイル別機能一覧

## `/src/scraper.ts` - メインエントリーポイント
```
🎯 役割: アプリケーション開始・全体制御
📦 依存: controllers, services/display
⚡ 主な機能:
  - main() - アプリケーション全体の流れ制御
```

---

## `/src/types/index.ts` - 型定義
```
🎯 役割: TypeScript型安全性の確保
📦 依存: なし
⚡ 主な型:
  - Area          - エリア情報
  - SubArea       - サブエリア情報  
  - DetailArea    - 詳細エリア情報
  - SalonDetails  - サロン詳細情報
```

---

## `/src/constants/index.ts` - 定数・設定値
```
🎯 役割: アプリ全体の設定値管理
📦 依存: なし
⚡ 主な定数:
  - AREA_URL_MAP  - エリア名→URL変換表
  - DELAY_MS      - スクレイピング間隔
  - SELECTORS     - CSS選択子集
```

---

## `/src/utils/index.ts` - ユーティリティ関数
```
🎯 役割: 汎用ヘルパー関数（純粋関数）
📦 依存: node:url
⚡ 主な関数:
  - sleep()             - 遅延処理
  - resolveUrl()        - URL解決
  - extractQueryParam() - クエリ抽出
  - removeDuplicates()  - 重複除去
  - normalizeText()     - テキスト正規化
```

---

## `/src/services/userInput.ts` - ユーザー入力処理
```
🎯 役割: CLI対話処理
📦 依存: node:readline, types
⚡ 主な関数:
  - askQuestion()                 - 汎用質問
  - promptFromList()              - リスト選択
  - promptAreaSelection()         - エリア選択
  - promptSubAreaSelection()      - サブエリア選択
  - promptDetailAreaSelection()   - 詳細エリア選択
  - promptSalonSelectionMethod()  - サロン選択方法
  - promptSalonSelection()        - サロン選択
```

---

## `/src/services/scraper.ts` - スクレイピング処理
```
🎯 役割: Webスクレイピング・データ抽出
📦 依存: axios, cheerio, types, utils, constants
⚡ 主な関数:
  - fetchSubAreas()        - サブエリア一覧取得
  - fetchDetailAreas()     - 詳細エリア一覧取得
  - resolveLastPageUrl()   - 最終ページURL取得
  - extractSalonDetails()  - サロン詳細抽出
  - getLastSalonUrl()      - 最後のサロンURL取得
  - findSalonByName()      - サロン名検索
  - getSalonList()         - サロン一覧取得
```

---

## `/src/services/display.ts` - 表示処理
```
🎯 役割: コンソール出力・メッセージ表示
📦 依存: types
⚡ 主な関数:
  - displaySalonDetails() - サロン詳細表示
  - displayError()        - エラーメッセージ
  - displaySuccess()      - 成功メッセージ
  - displayInfo()         - 情報メッセージ
  - displayProgress()     - 進行状況表示
```

---

## `/src/controllers/areaController.ts` - エリア選択制御
```
🎯 役割: エリア選択フローの制御
📦 依存: types, constants, services/scraper, services/userInput, services/display
⚡ 主な関数:
  - processAreaSelection() - エリア選択全フロー
  - selectMainArea()       - メインエリア選択
  - selectSubArea()        - サブエリア選択
  - selectDetailArea()     - 詳細エリア選択
```

---

## `/src/controllers/salonController.ts` - サロン制御
```
🎯 役割: サロン関連フローの制御
📦 依存: services/scraper, services/userInput, services/display
⚡ 主な関数:
  - processListing()       - サロン一覧処理
  - processSalonDetails()  - サロン詳細処理
  - selectFromSalonList()  - サロン一覧選択
```

---

## 🔄 依存関係マップ

```
scraper.ts
    ↓
controllers/ (areaController, salonController)
    ↓
services/ (userInput, scraper, display)
    ↓
utils/, constants/, types/
```

### 具体的な依存関係
```
scraper.ts
├── controllers/areaController.ts
│   ├── services/scraper.ts
│   ├── services/userInput.ts
│   └── services/display.ts
└── controllers/salonController.ts
    ├── services/scraper.ts
    ├── services/userInput.ts
    └── services/display.ts

services/scraper.ts
├── utils/index.ts
├── constants/index.ts
└── types/index.ts

services/userInput.ts
└── types/index.ts

services/display.ts
└── types/index.ts
```

## 🔍 特定の処理がどこにあるか

### スクレイピング関連
- **エリア一覧取得**: `services/scraper.ts` → `fetchSubAreas()`
- **サロン詳細取得**: `services/scraper.ts` → `extractSalonDetails()`
- **ページネーション**: `services/scraper.ts` → `resolveLastPageUrl()`

### ユーザー操作関連
- **エリア選択**: `services/userInput.ts` → `promptAreaSelection()`
- **汎用質問**: `services/userInput.ts` → `askQuestion()`
- **リスト選択**: `services/userInput.ts` → `promptFromList()`

### 表示関連
- **サロン情報表示**: `services/display.ts` → `displaySalonDetails()`
- **エラー表示**: `services/display.ts` → `displayError()`
- **進捗表示**: `services/display.ts` → `displayProgress()`

### フロー制御
- **エリア選択フロー**: `controllers/areaController.ts` → `processAreaSelection()`
- **サロン選択フロー**: `controllers/salonController.ts` → `processListing()`

### 設定・定数
- **エリアURL**: `constants/index.ts` → `AREA_URL_MAP`
- **CSS選択子**: `constants/index.ts` → `SELECTORS`
- **遅延時間**: `constants/index.ts` → `DELAY_MS`

### ユーティリティ
- **URL操作**: `utils/index.ts` → `resolveUrl()`, `extractQueryParam()`
- **配列操作**: `utils/index.ts` → `removeDuplicates()`
- **文字列操作**: `utils/index.ts` → `normalizeText()`
- **待機処理**: `utils/index.ts` → `sleep()`

## 📝 修正時の影響範囲

| 変更内容 | 影響ファイル |
|---------|-------------|
| 新エリア追加 | `constants/index.ts` のみ |
| 新CSS選択子追加 | `constants/index.ts` + 使用する `services/scraper.ts` の関数 |
| 新表示項目追加 | `types/index.ts` + `services/scraper.ts` + `services/display.ts` |
| 新ユーザー入力追加 | `services/userInput.ts` + 呼び出し元コントローラー |
| フロー変更 | 対応する `controllers/` ファイル | 