import { getAllSalons, extractSalonDetails } from '../services/scraper';
import { resetEngineStatus } from '../services/googleSearchNew';
import { searchGoogleWithSalonName } from '../services/googleSearchNew';
import { exportToCSV, displayCSVStats } from '../services/csvExport';
import { displayError, displayProgress, displaySuccess } from '../services/display';
import { ExtendedSalonDetails, SalonDetails, GoogleSearchResult, AreaSelectionResult } from '../types/index';
import { sleep, calculateRelevanceScore } from '../utils/index';

/**
 * 検索結果を正規化（全ての候補を保持、関連度フィルタリングなし）
 * @param searchResult Google検索結果
 * @param salonName サロン名（未使用、後方互換性のため保持）
 * @returns 正規化された結果
 */
function normalizeSearchResult(searchResult: GoogleSearchResult, salonName: string): GoogleSearchResult {
    const result: GoogleSearchResult = {};
    
    // Instagram URL候補をそのまま保持
    if (searchResult.instagramCandidates && searchResult.instagramCandidates.length > 0) {
        result.instagramCandidates = searchResult.instagramCandidates;
        // 最初の候補をメインURLとして設定
        result.instagramUrl = searchResult.instagramCandidates[0];
        console.log(`  📱 Instagram候補処理: ${searchResult.instagramCandidates.length}件中、最初の候補をメインURLに設定 -> ${result.instagramUrl}`);
    } else if (searchResult.instagramUrl) {
        // 直接URLが設定されている場合はそのまま使用
        result.instagramUrl = searchResult.instagramUrl;
        result.instagramCandidates = [searchResult.instagramUrl];
        console.log(`  📱 Instagram直接URL処理: ${result.instagramUrl}`);
    }
    
    // メールアドレス候補をそのまま保持
    if (searchResult.emailCandidates && searchResult.emailCandidates.length > 0) {
        result.emailCandidates = searchResult.emailCandidates;
        result.email = searchResult.emailCandidates[0];
    } else if (searchResult.email) {
        result.email = searchResult.email;
    }
    
    // ホームページURL（GoogleBusinessから高信頼度で取得）
    if (searchResult.homepageUrl) {
        result.homepageUrl = searchResult.homepageUrl;
    }
    
    // Google Business情報をそのまま転送
    if (searchResult.googleBusinessInfo) {
        result.googleBusinessInfo = searchResult.googleBusinessInfo;
    }
    
    return result;
}

// ======================= バルクサロンコントローラー ========================

/**
 * エリアの総サロン数の50%を対象に一括処理を実行
 * @param listUrl リストページのURL
 * @param ratio 処理対象の比率（0.5 = 50%）
 * @param areaSelection エリア選択情報（CSV出力用）
 */
export async function processBulkSalons(listUrl: string, ratio: number = 0.5, areaSelection?: AreaSelectionResult): Promise<void> {
    const startTime = Date.now(); // ⏱ 処理開始時間を記録
    try {
        // 検索エンジンの無効化状態をリセット（新しい処理セッション開始）
        resetEngineStatus();
        
        displayProgress('サロン一覧を取得中...');
        
        // 1. 全サロン一覧を取得
        const allSalons = await getAllSalons(listUrl);
        
        if (allSalons.length === 0) {
            displayError('サロンが見つかりませんでした。');
            return;
        }

        // 2. 対象比率のサロンを抽出（最後から）
        const targetCount = Math.ceil(allSalons.length * ratio);
        const targetSalons = allSalons.slice(-targetCount);
        
        const percentLabel = Math.round(ratio * 100);
        console.log(`\n📊 処理対象: ${targetSalons.length}件のサロン（全${allSalons.length}件の${percentLabel}%）`);
        console.log('💡 最後のサロンから順番に処理します...\n');

        // 3. 各サロンの詳細情報を取得し、Google検索を実行
        const extendedSalonDetails: ExtendedSalonDetails[] = [];
        
        for (let i = 0; i < targetSalons.length; i++) {
            const salon = targetSalons[i];
            const progress = `[${i + 1}/${targetSalons.length}]`;
            
            console.log(`${progress} 処理中: ${salon.name}`);
            console.log(`🔍   サロン詳細を取得中...`);
            
            try {
                // サロン詳細情報を取得
                const salonDetails = await extractSalonDetails(salon.url);
                
                if (!salonDetails) {
                    console.log(`  ❌ サロン詳細の取得に失敗: ${salon.name}`);
                    continue;
                }

                // 新しいInstagram検索機能を使用
                const searchQuery = `ヘアサロン ${salonDetails.name} ${salonDetails.address} Instagram`;
              
                console.log(`  🔍 ベース検索クエリ: ${searchQuery}`);
                
                let initialResult: GoogleSearchResult;
                try {
                    initialResult = await searchGoogleWithSalonName(searchQuery, salonDetails.name, salonDetails.address);
                } catch (error) {
                    displayError('Google Search APIが利用できません。処理を終了します。');
                    console.error('エラー詳細:', error);
                    process.exit(1);
                }
                
                // 検索結果を正規化
                const googleResult = normalizeSearchResult(initialResult, salonDetails.name);

                // Instagram URLの関連性をチェック（無関係なものを除外）
                if (googleResult.instagramUrl) {
                    const relevance = calculateRelevanceScore(salonDetails.name, googleResult.instagramUrl);
                    console.log(`    📊 Instagram URL関連度チェック: ${(relevance * 100).toFixed(1)}%`);
                    
                    if (relevance === 0) {
                        console.log(`    ❌ 無関係なInstagram URLを除外: ${googleResult.instagramUrl}`);
                        googleResult.instagramUrl = undefined; // 除外
                        googleResult.instagramCandidates = []; // 候補もクリア
                    } else {
                        console.log(`    ✅ Instagram URL採用: ${googleResult.instagramUrl} (関連度: ${(relevance * 100).toFixed(1)}%)`);
                    }
                }
                
                // 最終結果の表示
                if (googleResult.instagramUrl) {
                    console.log(`    ✅ Instagram URL発見 - CSV出力対象に追加: ${googleResult.instagramUrl}`);
                } else {
                    console.log(`    ℹ️  Instagram URL未発見 - CSV出力対象に追加（検索結果として記録）`);
                }
                
                // 拡張サロン詳細情報を作成
                const extendedDetails: ExtendedSalonDetails = {
                    ...salonDetails,
                    instagramUrl: googleResult.instagramUrl,
                    email: googleResult.email,
                    homepageUrl: googleResult.homepageUrl,
                    googleBusinessInfo: googleResult.googleBusinessInfo,
                    searchQuery: searchQuery,
                    // Instagram候補も追加（最大2件）
                    instagramCandidates: googleResult.instagramCandidates,
                    emailCandidates: googleResult.emailCandidates
                };

                // デバッグ情報: Instagram URL設定状況を詳細に表示
                console.log(`  🔧 Instagram URL設定状況の確認:`);
                console.log(`    検索結果のInstagram URL: ${googleResult.instagramUrl || 'なし'}`);
                console.log(`    拡張詳細情報のInstagram URL: ${extendedDetails.instagramUrl || 'なし'}`);
                console.log(`    Instagram候補数: ${googleResult.instagramCandidates?.length || 0}件`);
                if (googleResult.instagramCandidates && googleResult.instagramCandidates.length > 0) {
                    googleResult.instagramCandidates.forEach((candidate, idx) => {
                        console.log(`      候補${idx + 1}: ${candidate}`);
                    });
                }

                extendedSalonDetails.push(extendedDetails);
                console.log(`  ✅ 完了: ${salon.name} - CSV追加済み\n`);

                // レート制限対策
                if (i < targetSalons.length - 1) {
                    await sleep(1000);
                }

            } catch (error) {
                console.error(`  ❌ エラー発生: ${salon.name}`, error);
                continue;
            }
        }

        // 4. 結果を最後のサロンから順番にソート（リバース）
        extendedSalonDetails.reverse();

        // 5. CSV出力
        if (extendedSalonDetails.length > 0) {
            displaySuccess(`${extendedSalonDetails.length}件のサロン情報を取得完了`);
            
            // 統計情報を表示
            displayCSVStats(extendedSalonDetails);
            
            // CSVファイルを出力
            const csvPath = exportToCSV(extendedSalonDetails, areaSelection, ratio);
            displaySuccess(`処理完了！CSVファイル: ${csvPath}`);
        } else {
            displayError('処理できたサロン情報がありませんでした。');
        }

        // 6. 実行時間を表示
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n⏱ 処理時間: ${elapsedSec} 秒`);

    } catch (error) {
        displayError('バルク処理でエラーが発生しました', error);
    }
}

/**
 * 処理プログレスを表示
 * @param current 現在の処理数
 * @param total 総処理数
 * @param message メッセージ
 */
function displayProcessProgress(current: number, total: number, message: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5));
    console.log(`[${progressBar}] ${percentage}% ${message}`);
}