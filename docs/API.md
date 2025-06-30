# API リファレンス

## 📋 型定義 (`/src/types/`)

### Area
エリア情報を表すインターフェース
```typescript
interface Area {
    name: string;  // エリア名（例: "関西"）
    url: string;   // エリアページのURL
}
```

### SubArea
サブエリア情報を表すインターフェース
```typescript
interface SubArea {
    name: string;  // サブエリア名（例: "川西・宝塚・三田・豊岡"）
    url: string;   // サブエリアページのURL
}
```

### DetailArea
詳細エリア情報を表すインターフェース
```typescript
interface DetailArea {
    name: string;  // 詳細エリア名（例: "豊岡・丹波・篠山（35）"）
    url: string;   // 詳細エリアページのURL
}
```

### SalonDetails
サロンの詳細情報を表すインターフェース
```typescript
interface SalonDetails {
    name: string;           // サロン名
    address: string;        // 住所
    access: string;         // アクセス方法
    businessHours: string;  // 営業時間
    closedDays: string;     // 定休日
    paymentMethods: string; // 支払い方法
    cutPrice: string;       // カット価格
    seatCount: string;      // 席数
    staffCount: string;     // スタッフ数
    parking: string;        // 駐車場情報
    features: string;       // こだわり条件
    remarks: string;        // 備考
    other: string;          // その他
}
```

## ⚙️ 定数 (`/src/constants/`)

### AREA_URL_MAP
エリア名とURLのマッピング
```typescript
const AREA_URL_MAP: Readonly<Record<string, string>> = {
    '北海道': 'https://beauty.hotpepper.jp/svcSD/',
    '東北': 'https://beauty.hotpepper.jp/svcSE/',
    // ... 他7地域
};
```

### DELAY_MS
スクレイピング時の遅延時間（ミリ秒）
```typescript
const DELAY_MS = 2000;
```

### SELECTORS
CSSセレクタの定数
```typescript
const SELECTORS = {
    SUBAREAS: 'ul.routeMa a',
    DETAIL_AREAS: 'div.searchAreaListWrap ul.searchAreaList a',
    PAGINATION: 'ul.paging.jscPagingParents li a',
    SALON_LIST: 'ul.slnCassetteList',
    SALON_LIST_ITEMS: 'ul.slnCassetteList li',
    SALON_LINKS: 'a[href*="slnH"]',
    SALON_DATA_TABLE: 'table.slnDataTbl tr',
} as const;
```

## 🛠 ユーティリティ関数 (`/src/utils/`)

### sleep(ms: number): Promise<void>
指定されたミリ秒数だけ処理を停止
```typescript
await sleep(2000); // 2秒待機
```

### resolveUrl(href: string, baseUrl: string): string
相対URLを絶対URLに変換
```typescript
const absoluteUrl = resolveUrl('./page.html', 'https://example.com/');
// 戻り値: 'https://example.com/page.html'
```

### extractQueryParam(url: string, paramName: string): string | undefined
URLからクエリパラメータの値を抽出
```typescript
const cstt = extractQueryParam('https://example.com/?cstt=123', 'cstt');
// 戻り値: '123'
```

### removeDuplicates<T>(array: T[], keyFn: (item: T) => string): T[]
配列から重複要素を除去
```typescript
const unique = removeDuplicates(areas, (area) => area.url);
```

### normalizeText(text: string): string
文字列の空白文字を正規化
```typescript
const normalized = normalizeText('  多重  空白  文字  ');
// 戻り値: '多重 空白 文字'
```

## 🔍 スクレイピングサービス (`/src/services/scraper.ts`)

### fetchSubAreas(areaUrl: string): Promise<SubArea[]>
指定されたエリアページからサブエリア一覧を取得
```typescript
const subAreas = await fetchSubAreas('https://beauty.hotpepper.jp/svcSB/');
```

### fetchDetailAreas(subAreaUrl: string): Promise<DetailArea[]>
サブエリアページから詳細エリア一覧を取得
```typescript
const detailAreas = await fetchDetailAreas('https://beauty.hotpepper.jp/svcSB/macBK/');
```

### resolveLastPageUrl(listUrl: string): Promise<string>
ページネーションを解析して最後のページURLを取得
```typescript
const lastPageUrl = await resolveLastPageUrl(listUrl);
```

### extractSalonDetails(salonUrl: string): Promise<SalonDetails | null>
サロンページから詳細情報を抽出
```typescript
const details = await extractSalonDetails('https://beauty.hotpepper.jp/slnH000xxx/');
```

### getLastSalonUrl(listPageUrl: string): Promise<string | undefined>
リストページから最後のサロンURLを取得
```typescript
const salonUrl = await getLastSalonUrl(lastPageUrl);
```

### findSalonByName(listPageUrl: string, targetName: string): Promise<string | undefined>
特定のサロン名でサロンを検索
```typescript
const salonUrl = await findSalonByName(lastPageUrl, 'CLEAR');
```

### getSalonList(listPageUrl: string): Promise<Array<{name: string, url: string, cstt: string}>>
リストページからサロン一覧を取得
```typescript
const salons = await getSalonList(lastPageUrl);
```

## 💬 ユーザー入力サービス (`/src/services/userInput.ts`)

### askQuestion(question: string): Promise<string>
ユーザーに質問を投げかけて回答を取得
```typescript
const answer = await askQuestion('エリアを選択してください: ');
```

### promptFromList<T>(items: T[], prompt: string, keyFn: (item: T) => string): Promise<T | undefined>
リストから項目を選択させる汎用関数
```typescript
const selected = await promptFromList(areas, 'エリアを選択:', (area) => area.name);
```

### promptAreaSelection(areas: Area[]): Promise<Area | undefined>
エリア選択のプロンプト
```typescript
const area = await promptAreaSelection(areas);
```

### promptSubAreaSelection(subAreas: SubArea[]): Promise<SubArea | undefined>
サブエリア選択のプロンプト
```typescript
const subArea = await promptSubAreaSelection(subAreas);
```

### promptDetailAreaSelection(detailAreas: DetailArea[]): Promise<DetailArea | undefined>
詳細エリア選択のプロンプト
```typescript
const detailArea = await promptDetailAreaSelection(detailAreas);
```

### promptSalonSelectionMethod(): Promise<string>
サロン選択方法のプロンプト
```typescript
const method = await promptSalonSelectionMethod();
// 戻り値: '1', '2', または '3'
```

### promptSalonSelection(salons: Array<{name: string, cstt: string}>): Promise<number | undefined>
サロン一覧から選択するためのプロンプト
```typescript
const index = await promptSalonSelection(salons);
```

## 🎨 表示サービス (`/src/services/display.ts`)

### displaySalonDetails(details: SalonDetails): void
サロン詳細情報を整理して表示
```typescript
displaySalonDetails(salonDetails);
```

### displayError(message: string, error?: unknown): void
エラーメッセージを統一フォーマットで表示
```typescript
displayError('エラーが発生しました', error);
```

### displaySuccess(message: string): void
成功メッセージを統一フォーマットで表示
```typescript
displaySuccess('処理が完了しました');
```

### displayInfo(message: string): void
情報メッセージを統一フォーマットで表示
```typescript
displayInfo('処理を開始します');
```

### displayProgress(message: string): void
処理中メッセージを統一フォーマットで表示
```typescript
displayProgress('データを取得中...');
```

## 🎮 コントローラー

### areaController (`/src/controllers/areaController.ts`)

#### processAreaSelection(): Promise<string | undefined>
メインエリアからサブエリア、詳細エリアまでの選択フローを実行
```typescript
const finalUrl = await processAreaSelection();
```

### salonController (`/src/controllers/salonController.ts`)

#### processListing(listUrl: string): Promise<void>
リストページからサロンを選択して詳細を取得
```typescript
await processListing(finalUrl);
```

#### processSalonDetails(salonUrl: string): Promise<void>
サロン詳細情報を取得して表示
```typescript
await processSalonDetails(salonUrl);
```

## 🚨 エラーハンドリング

すべての非同期関数は適切なエラーハンドリングを実装しており、以下のパターンでエラーを処理します：

1. **ネットワークエラー**: axios のエラーをキャッチして適切なメッセージを表示
2. **パースエラー**: HTMLパースに失敗した場合の fallback
3. **ユーザー入力エラー**: 無効な入力に対する適切な警告
4. **データ不整合**: 期待するデータが見つからない場合の処理

## 📝 使用例

```typescript
import { processAreaSelection } from './controllers/areaController.js';
import { processListing } from './controllers/salonController.js';

async function example() {
    // エリア選択
    const finalUrl = await processAreaSelection();
    
    if (finalUrl) {
        // サロン情報取得
        await processListing(finalUrl);
    }
}
``` 