"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBulkSalons = processBulkSalons;
const scraper_1 = require("../services/scraper");
const googleSearch_1 = require("../services/googleSearch");
const csvExport_1 = require("../services/csvExport");
const display_1 = require("../services/display");
const index_1 = require("../utils/index");
// ======================= バルクサロンコントローラー ========================
/**
 * エリアの総サロン数の50%を対象に一括処理を実行
 * @param listUrl リストページのURL
 */
async function processBulkSalons(listUrl, ratio = 0.5) {
    try {
        (0, display_1.displayProgress)('サロン一覧を取得中...');
        // 1. 全サロン一覧を取得
        const allSalons = await (0, scraper_1.getAllSalons)(listUrl);
        if (allSalons.length === 0) {
            (0, display_1.displayError)('サロンが見つかりませんでした。');
            return;
        }
        // 2. 対象比率のサロンを抽出（最後から）
        const targetCount = Math.ceil(allSalons.length * ratio);
        const targetSalons = allSalons.slice(-targetCount);
        const percentLabel = Math.round(ratio * 100);
        console.log(`\n📊 処理対象: ${targetSalons.length}件のサロン（全${allSalons.length}件の${percentLabel}%）`);
        console.log('💡 最後のサロンから順番に処理します...\n');
        // 3. 各サロンの詳細情報を取得し、Google検索を実行
        const extendedSalonDetails = [];
        for (let i = 0; i < targetSalons.length; i++) {
            const salon = targetSalons[i];
            const progress = `[${i + 1}/${targetSalons.length}]`;
            console.log(`${progress} 処理中: ${salon.name}`);
            try {
                // サロン詳細情報を取得
                (0, display_1.displayProgress)(`  サロン詳細を取得中...`);
                const salonDetails = await (0, scraper_1.extractSalonDetails)(salon.url);
                if (!salonDetails) {
                    console.log(`  ❌ サロン詳細の取得に失敗: ${salon.name}`);
                    continue;
                }
                // Google検索クエリを生成
                const searchQuery = (0, googleSearch_1.generateSearchQuery)(salonDetails.name, salonDetails.address);
                console.log(`  🔍 検索クエリ: ${searchQuery}`);
                // Google検索を実行
                const googleResult = await (0, googleSearch_1.searchGoogle)(searchQuery);
                // 拡張サロン詳細情報を作成
                const extendedDetails = {
                    ...salonDetails,
                    instagramUrl: googleResult.instagramUrl,
                    email: googleResult.email,
                    searchQuery
                };
                extendedSalonDetails.push(extendedDetails);
                console.log(`  ✅ 完了: ${salon.name}\n`);
                // レート制限対策
                if (i < targetSalons.length - 1) {
                    await (0, index_1.sleep)(1000);
                }
            }
            catch (error) {
                console.error(`  ❌ エラー発生: ${salon.name}`, error);
                continue;
            }
        }
        // 4. 結果を最後のサロンから順番にソート（リバース）
        extendedSalonDetails.reverse();
        // 5. CSV出力
        if (extendedSalonDetails.length > 0) {
            (0, display_1.displaySuccess)(`${extendedSalonDetails.length}件のサロン情報を取得完了`);
            // 統計情報を表示
            (0, csvExport_1.displayCSVStats)(extendedSalonDetails);
            // CSVファイルを出力
            const csvPath = (0, csvExport_1.exportToCSV)(extendedSalonDetails);
            (0, display_1.displaySuccess)(`処理完了！CSVファイル: ${csvPath}`);
        }
        else {
            (0, display_1.displayError)('処理できたサロン情報がありませんでした。');
        }
    }
    catch (error) {
        (0, display_1.displayError)('バルク処理でエラーが発生しました', error);
    }
}
/**
 * 処理プログレスを表示
 * @param current 現在の処理数
 * @param total 総処理数
 * @param message メッセージ
 */
function displayProcessProgress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    console.log(`[${progressBar}] ${percentage}% ${message}`);
}
