import { 
    resolveLastPageUrl, 
    findSalonByName, 
    extractSalonDetails 
} from '../services/scraper';
import { 
    askQuestion, 
    promptSalonSelectionMethod 
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
                // サロン名で検索
                const targetName = await askQuestion('検索するサロン名を入力してください: ');
                salonUrl = await findSalonByName(lastPageUrl, targetName + ' インスタグラム instagram');
                break;
                
            case '2':
                // バルク処理（50%のサロンをCSV出力）
                await processBulkSalons(listUrl, 0.5, areaSelection);
                return; // バルク処理は完了したので関数を終了
                
            case '3':
                // 全件バルク処理（100%のサロンをCSV出力）
                await processBulkSalons(listUrl, 1.0, areaSelection);
                return; // 100%処理完了後に終了
                
            default:
                console.log('無効な選択です。サロン名検索を実行します。');
                const defaultTargetName = await askQuestion('検索するサロン名を入力してください: ');
                salonUrl = await findSalonByName(lastPageUrl, defaultTargetName + ' インスタグラム instagram');
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

 