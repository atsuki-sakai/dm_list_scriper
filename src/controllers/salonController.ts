import { 
    resolveLastPageUrl, 
    getLastSalonUrl, 
    findSalonByName, 
    getSalonList, 
    extractSalonDetails 
} from '../services/scraper';
import { 
    askQuestion, 
    promptSalonSelectionMethod, 
    promptSalonSelection 
} from '../services/userInput';
import { displaySalonDetails, displayError, displayProgress } from '../services/display';
import { processBulkSalons } from './bulkSalonController';
import { AreaSelectionResult } from '../types/index';

// ======================= サロンコントローラー ========================

/**
 * サロン詳細情報を取得して表示する
 * @param salonUrl サロンページのURL
 */
export async function processSalonDetails(salonUrl: string): Promise<void> {
    try {
        displayProgress(`サロンページを取得中: ${salonUrl}`);
        
        const salonDetails = await extractSalonDetails(salonUrl);
        
        if (salonDetails) {
            displaySalonDetails(salonDetails);
        } else {
            displayError('サロン詳細情報の取得に失敗しました。');
        }
        
    } catch (error) {
        displayError('スクレイピング処理でエラーが発生しました', error);
    }
}

/**
 * リストページからサロンを選択して詳細を取得
 * @param listUrl リストページのURL
 * @param areaSelection エリア選択情報（CSV出力用）
 */
export async function processListing(listUrl: string, areaSelection?: AreaSelectionResult): Promise<void> {
    try {
        displayProgress('最終ページを解析中...');
        
        // 最終ページのURLを取得
        const lastPageUrl = await resolveLastPageUrl(listUrl);
        console.log(`Last page URL: ${lastPageUrl}`);

        // サロン選択方法をユーザーに確認
        const choice = await promptSalonSelectionMethod();
        let salonUrl: string | undefined;

        switch (choice.trim()) {
            case '1':
                // 従来通り最後のサロンを取得
                salonUrl = await getLastSalonUrl(lastPageUrl);
                break;
                
            case '2':
                // サロン名で検索
                const targetName = await askQuestion('検索するサロン名を入力してください: ');
                salonUrl = await findSalonByName(lastPageUrl, targetName + ' インスタグラム instagram');
                break;
                
            case '3':
                // 全サロン一覧を表示してユーザーに選択させる
                salonUrl = await selectFromSalonList(lastPageUrl);
                break;
                
            case '4':
                // バルク処理（50%のサロンをCSV出力）
                await processBulkSalons(listUrl, 0.5, areaSelection);
                return; // バルク処理は完了したので関数を終了
                
            case '5':
                // 全件バルク処理（100%のサロンをCSV出力）
                await processBulkSalons(listUrl, 1.0, areaSelection);
                return; // 100%処理完了後に終了
                
            default:
                console.log('デフォルトで最後のサロンを選択します。');
                salonUrl = await getLastSalonUrl(lastPageUrl);
        }

        if (salonUrl) {
            console.log(`Navigating to salon page: ${salonUrl}`);
            await processSalonDetails(salonUrl);
        } else {
            displayError('サロンページが見つかりませんでした。');
        }
    } catch (error) {
        displayError('リスト処理でエラーが発生しました', error);
    }
}

/**
 * サロン一覧から選択する
 * @param listPageUrl リストページのURL
 * @returns 選択されたサロンのURL
 */
async function selectFromSalonList(listPageUrl: string): Promise<string | undefined> {
    try {
        const salons = await getSalonList(listPageUrl);

        if (salons.length === 0) {
            displayError('サロンが見つかりませんでした。');
            return undefined;
        }

        const selectedIndex = await promptSalonSelection(salons);
        
        if (selectedIndex !== undefined) {
            const selected = salons[selectedIndex];
            console.log(`✓ 選択されました: "${selected.name}"`);
            return selected.url;
        }
        
        return undefined;
    } catch (error) {
        displayError('サロン一覧取得に失敗しました', error);
        return undefined;
    }
} 