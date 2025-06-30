import { getAllSalons, extractSalonDetails } from '../services/scraper';
import { resetEngineStatus } from '../services/googleSearch';
import { searchWithMultipleInstagramQueries } from '../services/googleSearchNew';
import { exportToCSV, displayCSVStats } from '../services/csvExport';
import { displayError, displayProgress, displaySuccess } from '../services/display';
import { ExtendedSalonDetails, SalonDetails, GoogleSearchResult, AreaSelectionResult } from '../types/index';
import { sleep, calculateRelevanceScore } from '../utils/index';

/**
 * 関連度フィルタリングを実行
 * @param searchResult Google検索結果
 * @param salonName サロン名
 * @returns フィルタリングされた結果
 */
function applyRelevanceFiltering(searchResult: GoogleSearchResult, salonName: string): GoogleSearchResult {
    const result: GoogleSearchResult = {};
    
    // Instagram URL候補をフィルタリング
    if (searchResult.instagramCandidates && searchResult.instagramCandidates.length > 0) {
        const relevantInstagramUrls = searchResult.instagramCandidates || []; // 関連度に関係なく全てのInstagram候補を含める
        result.instagramCandidates = relevantInstagramUrls;
        if (relevantInstagramUrls.length > 0) {
            result.instagramUrl = relevantInstagramUrls[0];
        }
    } else if (searchResult.instagramUrl) {
        result.instagramUrl = searchResult.instagramUrl;
    }
    
    // メールアドレス候補をフィルタリング
    if (searchResult.email) {
        result.email = searchResult.email;
    }
    
    // 電話番号候補をフィルタリング（関連度チェックを緩和）
    if (searchResult.phoneNumberCandidates && searchResult.phoneNumberCandidates.length > 0) {
        result.phoneNumberCandidates = searchResult.phoneNumberCandidates;
        result.phoneNumber = searchResult.phoneNumberCandidates[0];
    } else if (searchResult.phoneNumber) {
        result.phoneNumber = searchResult.phoneNumber;
    }
    
    // ホームページURL候補をフィルタリング
    if (searchResult.homepageCandidates && searchResult.homepageCandidates.length > 0) {
        const relevantHomepageUrls = searchResult.homepageCandidates.filter(url => {
            const score = calculateRelevanceScore(salonName, url);
            return score >= 0.2; // 20%以上の関連度で採用
        });
        result.homepageCandidates = relevantHomepageUrls;
        if (relevantHomepageUrls.length > 0) {
            result.homepageUrl = relevantHomepageUrls[0];
        }
    } else if (searchResult.homepageUrl) {
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
                console.log(`  🚀 複数Instagram検索クエリによる検索を開始...`);
                console.log(`  🔍 ベース検索クエリ: ${searchQuery}`);
                const initialResult = await searchWithMultipleInstagramQueries(salonDetails.name, salonDetails.address);
                
                // 関連度フィルタリングを実行
                console.log(`  🎯 サロン名「${salonDetails.name}」との関連度フィルタリング中...`);
                const googleResult = applyRelevanceFiltering(initialResult, salonDetails.name);

                // Instagram URLの関連度をチェック（15%以上のもののみCSV出力）
                let shouldIncludeInCSV = false;
                let relevanceScore = 0;

                if (googleResult.instagramUrl) {
                    relevanceScore = calculateRelevanceScore(salonDetails.name, googleResult.instagramUrl);
                    console.log(`    📊 Instagram URL関連度: ${(relevanceScore * 100).toFixed(1)}%`);
                    
                    // 関連度に関係なく全てのInstagramアカウントを含める
                    shouldIncludeInCSV = true;
                    console.log(`    ✅ Instagram URL発見 - CSV出力対象に追加 (関連度: ${(relevanceScore * 100).toFixed(1)}%)`);
                } else {
                    // Instagram URLが見つからない場合も含める
                    shouldIncludeInCSV = true;
                    console.log(`    ℹ️  Instagram URL未発見 - CSV出力対象に追加（検索結果として記録）`);
                }

                // 全てのサロンをCSVに追加（Instagram URLの有無に関係なく）
                if (shouldIncludeInCSV) {
                    // 拡張サロン詳細情報を作成
                    const extendedDetails: ExtendedSalonDetails = {
                        ...salonDetails,
                        instagramUrl: googleResult.instagramUrl,
                        email: googleResult.email,
                        phoneNumber: googleResult.phoneNumber,
                        homepageUrl: googleResult.homepageUrl,
                        googleBusinessInfo: googleResult.googleBusinessInfo,
                        searchQuery: searchQuery,
                        // 候補も追加
                        instagramCandidates: googleResult.instagramCandidates,
                        phoneNumberCandidates: googleResult.phoneNumberCandidates,
                        homepageCandidates: googleResult.homepageCandidates
                    };

                    extendedSalonDetails.push(extendedDetails);
                    console.log(`  ✅ 完了: ${salon.name} (関連度: ${(relevanceScore * 100).toFixed(1)}%)\n`);
                } else {
                    console.log(`  ⏭️  スキップ: ${salon.name} (関連度不足)\n`);
                }

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