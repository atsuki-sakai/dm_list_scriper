# 開発ガイド

## 🛠 開発環境セットアップ

### 必要なツール
- Node.js 18以上
- pnpm 8以上
- TypeScript 5以上

### 環境構築
```bash
# リポジトリクローン
git clone <repository-url>
cd DM_list_scriper

# 依存関係インストール
pnpm install

# TypeScript コンパイル確認
pnpm run build

# 実行テスト
pnpm start
```

## 📝 コーディング規約

### 1. ファイル・ディレクトリ命名
- **ファイル名**: camelCase（例: `userInput.ts`）
- **ディレクトリ名**: camelCase（例: `services/`）
- **型名**: PascalCase（例: `SalonDetails`）
- **関数名**: camelCase（例: `fetchSubAreas`）
- **定数名**: SCREAMING_SNAKE_CASE（例: `AREA_URL_MAP`）

### 2. インポート順序
```typescript
// 1. Node.js標準ライブラリ
import * as readline from 'node:readline';
import { URL } from 'node:url';

// 2. 外部ライブラリ
import axios from 'axios';
import * as cheerio from 'cheerio';

// 3. 内部モジュール（types → constants → utils → services → controllers）
import { Area, SubArea } from '../types/index.js';
import { SELECTORS, DELAY_MS } from '../constants/index.js';
import { sleep, resolveUrl } from '../utils/index.js';
```

### 3. 関数定義
```typescript
/**
 * 関数の説明
 * @param param1 パラメータ1の説明
 * @param param2 パラメータ2の説明
 * @returns 戻り値の説明
 */
export async function functionName(param1: string, param2: number): Promise<string> {
    // 実装
}
```

### 4. エラーハンドリング
```typescript
async function exampleFunction(): Promise<Result | null> {
    try {
        const result = await someAsyncOperation();
        return result;
    } catch (error) {
        console.error('具体的なエラーメッセージ:', error);
        return null; // または適切なフォールバック
    }
}
```

### 5. 型安全性
- `any` 型の使用を避ける
- 適切な型ガードを実装
- 必要に応じてユニオン型を活用

## 🔧 新機能の追加方法

### 1. 新しいスクレイピング対象の追加

#### ステップ1: 型定義の追加
```typescript
// src/types/index.ts
export interface NewDataType {
    field1: string;
    field2: number;
}
```

#### ステップ2: セレクタの定義
```typescript
// src/constants/index.ts
export const SELECTORS = {
    // ... 既存のセレクタ
    NEW_DATA_SELECTOR: '.new-data-class',
} as const;
```

#### ステップ3: スクレイピング関数の実装
```typescript
// src/services/scraper.ts
export async function extractNewData(url: string): Promise<NewDataType | null> {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        
        // データ抽出ロジック
        const field1 = $(SELECTORS.NEW_DATA_SELECTOR).text().trim();
        
        return { field1, field2: 123 };
    } catch (error) {
        console.error('新データ取得に失敗:', error);
        return null;
    }
}
```

#### ステップ4: 表示関数の追加
```typescript
// src/services/display.ts
export function displayNewData(data: NewDataType): void {
    console.log(`📊 新データ: ${data.field1}`);
}
```

#### ステップ5: コントローラーの更新
```typescript
// src/controllers/newController.ts または既存のコントローラー
export async function processNewData(url: string): Promise<void> {
    const data = await extractNewData(url);
    if (data) {
        displayNewData(data);
    }
}
```

### 2. 新しい入力方法の追加

#### ステップ1: プロンプト関数の追加
```typescript
// src/services/userInput.ts
export async function promptNewSelection(): Promise<string> {
    const question = '新しい選択肢を入力してください: ';
    return askQuestion(question);
}
```

#### ステップ2: コントローラーでの利用
```typescript
// 適切なコントローラーで新しいプロンプトを使用
const userChoice = await promptNewSelection();
```

### 3. 新しい表示形式の追加

#### JSON出力の追加例
```typescript
// src/services/display.ts
export function displayAsJson(data: SalonDetails): void {
    console.log(JSON.stringify(data, null, 2));
}

export function saveToFile(data: SalonDetails, filename: string): void {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 ファイルに保存しました: ${filename}`);
}
```

## 🧪 テスト

### 単体テストの例（将来実装時）
```typescript
// tests/utils.test.ts
import { normalizeText, extractQueryParam } from '../src/utils/index.js';

describe('Utils', () => {
    test('normalizeText should normalize whitespace', () => {
        expect(normalizeText('  多重  空白  ')).toBe('多重 空白');
    });

    test('extractQueryParam should extract parameter', () => {
        const url = 'https://example.com/?cstt=123';
        expect(extractQueryParam(url, 'cstt')).toBe('123');
    });
});
```

### 統合テストの例
```typescript
// tests/integration.test.ts
import { fetchSubAreas } from '../src/services/scraper.js';

describe('Integration Tests', () => {
    test('fetchSubAreas should return valid data', async () => {
        const subAreas = await fetchSubAreas('https://beauty.hotpepper.jp/svcSB/');
        expect(Array.isArray(subAreas)).toBe(true);
        expect(subAreas.length).toBeGreaterThan(0);
    });
});
```

## 📋 チェックリスト

### プルリクエスト前の確認事項
- [ ] TypeScript コンパイルエラーがない
- [ ] ESLint エラーがない
- [ ] 新しい関数にJSDocコメントを追加
- [ ] エラーハンドリングを適切に実装
- [ ] 型安全性を確保
- [ ] 実際の動作確認
- [ ] 必要に応じてドキュメント更新

### コードレビューポイント
- [ ] 単一責任の原則に従っているか
- [ ] 適切な層に実装されているか
- [ ] エラーハンドリングが適切か
- [ ] 型定義が正確か
- [ ] パフォーマンスに問題がないか
- [ ] セキュリティ上の問題がないか

## 🚨 よくある問題と解決方法

### 1. TypeScript コンパイルエラー
```bash
# モジュール解決の問題
Error TS2307: Cannot find module './types/index.js'

# 解決: .js拡張子でインポート（ES Modules）
import { Area } from './types/index.js';
```

### 2. スクレイピング失敗
```typescript
// 問題: セレクタが見つからない
const element = $('.nonexistent-class');

// 解決: 存在チェックを追加
const element = $('.target-class');
if (element.length === 0) {
    console.warn('要素が見つかりませんでした');
    return null;
}
```

### 3. 非同期処理のエラー
```typescript
// 問題: Promise の適切な処理
function fetchData() {
    return axios.get(url); // Promise を返すが await していない
}

// 解決: 適切な非同期処理
async function fetchData(): Promise<Data | null> {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('データ取得失敗:', error);
        return null;
    }
}
```

### 4. メモリリーク
```typescript
// 問題: readline インターフェースをcloseしていない
const rl = readline.createInterface({ input, output });
rl.question('質問', callback); // close() を呼んでいない

// 解決: 適切なクリーンアップ
const rl = readline.createInterface({ input, output });
try {
    const answer = await new Promise<string>((resolve) => {
        rl.question('質問', resolve);
    });
    return answer;
} finally {
    rl.close(); // 必ずクリーンアップ
}
```

## 📚 推奨リソース

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)

### Web スクレイピング
- [Cheerio Documentation](https://cheerio.js.org/)
- [Axios Documentation](https://axios-http.com/docs/intro)

### Node.js
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [ES Modules in Node.js](https://nodejs.org/api/esm.html)

## 🔄 デプロイメント

### 本番環境での注意点
1. **レート制限**: スクレイピング間隔を適切に設定
2. **エラー監視**: ログ出力とエラー通知の実装
3. **設定管理**: 環境変数での設定値管理
4. **依存関係**: セキュリティアップデートの定期実行

### 環境変数の例
```bash
# .env
DELAY_MS=2000
LOG_LEVEL=info
USER_AGENT=MyApp/1.0.0
``` 