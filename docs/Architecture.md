# アーキテクチャ詳細

## 📐 設計思想

このプロジェクトは**階層化アーキテクチャ（Layered Architecture）**を採用し、機能別に責任を分離しています。

```
┌─────────────────────────────────────┐
│            Entry Point              │  scraper.ts
├─────────────────────────────────────┤
│           Controllers               │  制御ロジック
├─────────────────────────────────────┤
│            Services                 │  ビジネスロジック
├─────────────────────────────────────┤
│     Utils & Constants & Types       │  共通機能・設定・型
└─────────────────────────────────────┘
```

## 📁 ディレクトリ構造詳細

### `/src/scraper.ts` - メインエントリーポイント
**役割**: アプリケーションの開始点・全体フローの制御
- アプリケーションの初期化
- エラーハンドリングの最上位層
- コントローラーの呼び出し

**コード例**:
```typescript
async function main(): Promise<void> {
    // エリア選択 → サロン処理の流れを制御
}
```

### `/src/types/` - 型定義
**役割**: TypeScriptの型安全性を担保
- インターフェース定義
- 型エイリアス
- 型ガード用の型

**含まれる型**:
- `Area` - エリア情報
- `SubArea` - サブエリア情報  
- `DetailArea` - 詳細エリア情報
- `SalonDetails` - サロン詳細情報
- `AreaSelectionOptions` - エリア選択オプション

### `/src/constants/` - 定数・設定値
**役割**: アプリケーション全体で使用する設定値の管理
- URL マッピング
- CSS セレクタ
- タイムアウト値
- その他設定値

**主要定数**:
- `AREA_URL_MAP` - エリア名とURLのマッピング
- `DELAY_MS` - 遅延時間設定
- `SELECTORS` - CSS セレクタ集

### `/src/utils/` - ユーティリティ関数
**役割**: 汎用的なヘルパー関数
- 純粋関数（副作用なし）
- 他のプロジェクトでも再利用可能
- ドメインに依存しない機能

**主要関数**:
- `sleep()` - 遅延処理
- `resolveUrl()` - URL解決
- `extractQueryParam()` - クエリパラメータ抽出
- `removeDuplicates()` - 重複除去
- `normalizeText()` - テキスト正規化

### `/src/services/` - ビジネスロジック
**役割**: 具体的な機能実装・外部APIとの通信

#### `/src/services/scraper.ts`
**スクレイピング関連の全機能**
- `fetchSubAreas()` - サブエリア一覧取得
- `fetchDetailAreas()` - 詳細エリア一覧取得
- `resolveLastPageUrl()` - 最終ページURL取得
- `extractSalonDetails()` - サロン詳細情報抽出
- `getLastSalonUrl()` - 最後のサロンURL取得
- `findSalonByName()` - サロン名検索
- `getSalonList()` - サロン一覧取得

#### `/src/services/userInput.ts`
**ユーザー入力処理**
- `askQuestion()` - 汎用質問関数
- `promptFromList()` - リスト選択関数
- `promptAreaSelection()` - エリア選択プロンプト
- `promptSubAreaSelection()` - サブエリア選択プロンプト
- `promptDetailAreaSelection()` - 詳細エリア選択プロンプト
- `promptSalonSelectionMethod()` - サロン選択方法プロンプト
- `promptSalonSelection()` - サロン選択プロンプト

#### `/src/services/display.ts`
**表示・出力処理**
- `displaySalonDetails()` - サロン詳細情報表示
- `displayError()` - エラーメッセージ表示
- `displaySuccess()` - 成功メッセージ表示
- `displayInfo()` - 情報メッセージ表示
- `displayProgress()` - 進行状況メッセージ表示

### `/src/controllers/` - 制御ロジック
**役割**: サービス層の組み合わせ・フロー制御

#### `/src/controllers/areaController.ts`
**エリア選択フロー制御**
- `processAreaSelection()` - エリア選択の全フロー
- `selectMainArea()` - メインエリア選択
- `selectSubArea()` - サブエリア選択
- `selectDetailArea()` - 詳細エリア選択

#### `/src/controllers/salonController.ts`
**サロン関連フロー制御**
- `processListing()` - サロン一覧処理
- `processSalonDetails()` - サロン詳細処理
- `selectFromSalonList()` - サロン一覧選択

## 🔄 データフロー

```
1. ユーザー入力 (userInput service)
        ↓
2. エリア選択フロー (areaController)
        ↓
3. スクレイピング実行 (scraper service)
        ↓
4. サロン選択フロー (salonController)
        ↓
5. 詳細情報表示 (display service)
```

## 🎯 設計原則

### 1. 単一責任の原則 (SRP)
各ファイル・関数は1つの責任のみを持つ

### 2. 依存関係逆転の原則 (DIP)
上位層は下位層に依存し、具体的実装ではなく抽象に依存

### 3. 開放閉鎖の原則 (OCP)
拡張には開放的、修正には閉鎖的

### 4. インターフェース分離の原則 (ISP)
必要最小限のインターフェースのみを公開

## 🧪 テスタビリティ

- **純粋関数**: utils層の関数は副作用がなくテストしやすい
- **依存注入**: 外部依存を注入可能
- **モック化**: サービス層を個別にテスト可能
- **小さな単位**: 各関数が小さく、テストケースを作りやすい

## 🔧 拡張性

### 新しいスクレイピング対象の追加
1. `constants/` に新しいセレクタを追加
2. `services/scraper.ts` に新しい抽出関数を追加
3. `types/` に必要な型を追加

### 新しい入力方法の追加
1. `services/userInput.ts` に新しいプロンプト関数を追加
2. コントローラー層で新しいフローを組み立て

### 新しい表示形式の追加
1. `services/display.ts` に新しい表示関数を追加
2. 必要に応じて型定義を拡張 