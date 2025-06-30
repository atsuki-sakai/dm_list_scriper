"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSalonDetails = processSalonDetails;
exports.processListing = processListing;
const scraper_1 = require("../services/scraper");
const userInput_1 = require("../services/userInput");
const display_1 = require("../services/display");
const bulkSalonController_1 = require("./bulkSalonController");
// ======================= サロンコントローラー ========================
/**
 * サロン詳細情報を取得して表示する
 * @param salonUrl サロンページのURL
 */
async function processSalonDetails(salonUrl) {
    try {
        (0, display_1.displayProgress)(`サロンページを取得中: ${salonUrl}`);
        const salonDetails = await (0, scraper_1.extractSalonDetails)(salonUrl);
        if (salonDetails) {
            (0, display_1.displaySalonDetails)(salonDetails);
        }
        else {
            (0, display_1.displayError)('サロン詳細情報の取得に失敗しました。');
        }
    }
    catch (error) {
        (0, display_1.displayError)('スクレイピング処理でエラーが発生しました', error);
    }
}
/**
 * リストページからサロンを選択して詳細を取得
 * @param listUrl リストページのURL
 * @param areaSelection エリア選択情報（CSV出力用）
 */
async function processListing(listUrl, areaSelection) {
    try {
        (0, display_1.displayProgress)('最終ページを解析中...');
        // 最終ページのURLを取得
        const lastPageUrl = await (0, scraper_1.resolveLastPageUrl)(listUrl);
        console.log(`Last page URL: ${lastPageUrl}`);
        // サロン選択方法をユーザーに確認
        const choice = await (0, userInput_1.promptSalonSelectionMethod)();
        let salonUrl;
        switch (choice.trim()) {
            case '1':
                // サロン名で検索
                const targetName = await (0, userInput_1.askQuestion)('検索するサロン名を入力してください: ');
                salonUrl = await (0, scraper_1.findSalonByName)(lastPageUrl, targetName + ' インスタグラム instagram');
                break;
            case '2':
                // バルク処理（50%のサロンをCSV出力）
                await (0, bulkSalonController_1.processBulkSalons)(listUrl, 0.5, areaSelection);
                return; // バルク処理は完了したので関数を終了
            case '3':
                // 全件バルク処理（100%のサロンをCSV出力）
                await (0, bulkSalonController_1.processBulkSalons)(listUrl, 1.0, areaSelection);
                return; // 100%処理完了後に終了
            default:
                console.log('無効な選択です。サロン名検索を実行します。');
                const defaultTargetName = await (0, userInput_1.askQuestion)('検索するサロン名を入力してください: ');
                salonUrl = await (0, scraper_1.findSalonByName)(lastPageUrl, defaultTargetName + ' インスタグラム instagram');
        }
        if (salonUrl) {
            console.log(`Navigating to salon page: ${salonUrl}`);
            await processSalonDetails(salonUrl);
        }
        else {
            (0, display_1.displayError)('サロンページが見つかりませんでした。');
        }
    }
    catch (error) {
        (0, display_1.displayError)('リスト処理でエラーが発生しました', error);
    }
}
