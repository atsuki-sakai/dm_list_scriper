import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearchResult } from '../types/index';
import { sleep, calculateRelevanceScore } from '../utils/index';
import { BRING_SEARCH, YAHOO_SEARCH } from '../constants/index';
import { 
    generateInstagramSearchQueries, 
    extractInstagramFromSearchItem, 
    calculateInstagramRelevance 
} from './instagramExtractor';


// ======================= 検索エンジン状態管理 ========================

/**
 * 検索エンジンの無効化状態を記録するオブジェクト
 * 429エラー（レート制限）が発生したエンジンは無効化される
 */
const disabledEngines = {
    google: false,
    bing: false,
    yahoo: false,
    goo: false,
    baidu: false
};

/**
 * 検索エンジンを無効化する
 * @param engineName 無効化する検索エンジン名
 */
function disableEngine(engineName: keyof typeof disabledEngines): void {
    disabledEngines[engineName] = true;
    console.log(`  ⚠️  ${engineName.toUpperCase()}検索エンジンを無効化しました（429エラーのため）`);
}

/**
 * 検索エンジンが有効かどうかをチェック
 * @param engineName 検索エンジン名
 * @returns 有効かどうか
 */
function isEngineEnabled(engineName: keyof typeof disabledEngines): boolean {
    return !disabledEngines[engineName];
}

/**
 * 無効化状態をリセット（新しいセッション開始時に使用）
 */
export function resetEngineStatus(): void {
    Object.keys(disabledEngines).forEach(key => {
        disabledEngines[key as keyof typeof disabledEngines] = false;
    });
    console.log('  🔄 検索エンジンの無効化状態をリセットしました');
}

/**
 * 現在の検索エンジン状態を表示
 */
export function showEngineStatus(): void {
    console.log('  📊 検索エンジン状態:');
    
    // 設定による有効/無効状態を表示
    console.log('  📊 設定による検索エンジン制御:');
    console.log(`    BING: ${BRING_SEARCH ? '✅ 有効' : '❌ 無効 (設定により)'}`);
    console.log(`    YAHOO: ${YAHOO_SEARCH ? '✅ 有効' : '❌ 無効 (設定により)'}`);
    
    // 動的な無効化状態を表示
    console.log('  📊 動的無効化状態 (エラーによる):');
    Object.entries(disabledEngines).forEach(([engine, disabled]) => {
        const status = disabled ? '❌ 無効 (エラーのため)' : '✅ 有効';
        console.log(`    ${engine.toUpperCase()}: ${status}`);
    });
}

// ======================= Google Search API 設定 ========================

/**
 * Google Custom Search APIの設定
 * 環境変数から取得します
 */
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

/**
 * Google Search APIが利用可能かチェック
 * @returns APIが利用可能かどうか
 */
function isGoogleApiAvailable(): boolean {
    const hasApiKey = !!GOOGLE_API_KEY;
    const hasEngineId = !!GOOGLE_SEARCH_ENGINE_ID;
    
    // デバッグ情報を表示
    console.log(`  🔍 Google API設定チェック:`);
    console.log(`    API Key: ${hasApiKey ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`    Engine ID: ${hasEngineId ? '✅ 設定済み' : '❌ 未設定'}`);
    
    return hasApiKey && hasEngineId;
}

/**
 * Google Custom Search APIを使用してInstagram URLとメールアドレスと電話番号を抽出（複数候補対応）
 * @param query 検索クエリ
 * @param salonName サロン名（関連度フィルタリング用）
 * @returns 抽出された情報（候補含む）
 */
async function searchGoogleApi(query: string, salonName?: string): Promise<GoogleSearchResult> {
    if (!isGoogleApiAvailable()) {
        console.log('  ⚠️  Google Search API設定が見つかりません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
        return {};
    }

    try {
        console.log(`  🔍 Google Search API検索を実行中: "${query}"`);
        
        // Google Custom Search API URLを構築
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&lr=lang_ja&gl=jp`;
        
        const { data } = await axios.get(searchUrl, {
            timeout: 15000
        });

        const result: GoogleSearchResult = {};
        
        // 候補を格納する配列
        const instagramCandidates: Array<{ url: string; relevance: number }> = [];
        const emailCandidates: string[] = [];
        const phoneNumberCandidates: string[] = [];
        const homepageCandidates: string[] = [];

        if (data.items && data.items.length > 0) {
            console.log(`    🔍 Google API 検索結果: ${data.items.length}件`);
            
            // 各検索結果を調べて候補を収集
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                
                // 新しいInstagram抽出機能を使用
                const instagramResult = extractInstagramFromSearchItem(item, salonName);
                if (instagramResult) {
                    // 重複チェック
                    const exists = instagramCandidates.find(candidate => candidate.url === instagramResult.url);
                    if (!exists) {
                        instagramCandidates.push(instagramResult);
                        console.log(`    📱 Instagram候補追加: ${instagramResult.url} (関連度: ${(instagramResult.relevance * 100).toFixed(1)}%)`);
                    }
                }

                // メールアドレスを検索
                const text = `${title} ${snippet}`;
                const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const emailMatches = text.match(emailPattern);
                
                if (emailMatches && emailMatches.length > 0) {
                    for (const email of emailMatches) {
                        const lowerEmail = email.toLowerCase();
                        // 基本的なフリーメールは除外
                        if (!lowerEmail.includes('@gmail.com') && 
                            !lowerEmail.includes('@yahoo.co.jp') && 
                            !lowerEmail.includes('@yahoo.com') &&
                            !lowerEmail.includes('@hotmail.com') &&
                            !lowerEmail.includes('@outlook.com') &&
                            !lowerEmail.includes('@google.com') &&
                            !lowerEmail.includes('noreply') &&
                            !lowerEmail.includes('no-reply') &&
                            email.length > 5 && email.includes('@') && email.includes('.')) {
                            
                            if (!emailCandidates.includes(email)) {
                                emailCandidates.push(email);
                                console.log(`    📧 Email候補: ${email}`);
                            }
                        }
                    }
                }

                // 電話番号を検索
                const phonePatterns = [
                    /0\d{1,4}-\d{1,4}-\d{3,4}/g,
                    /TEL[:\s]*0\d{1,4}-\d{1,4}-\d{3,4}/gi,
                    /電話[:\s]*0\d{1,4}-\d{1,4}-\d{3,4}/gi,
                ];

                for (const pattern of phonePatterns) {
                    const phoneMatches = text.match(pattern);
                    if (phoneMatches && phoneMatches.length > 0) {
                        for (const phone of phoneMatches) {
                            const cleanPhone = phone.replace(/^(TEL[:\s]*|電話[:\s]*)/gi, '').trim();
                            if (!phoneNumberCandidates.includes(cleanPhone)) {
                                phoneNumberCandidates.push(cleanPhone);
                                console.log(`    📞 電話番号候補: ${cleanPhone}`);
                            }
                        }
                    }
                }

                // ホームページURLを検索
                if (link && !link.includes('instagram.com') && !link.includes('hotpepper.jp') && 
                    !link.includes('google.com') && !link.includes('facebook.com') && 
                    !link.includes('twitter.com') && !link.includes('youtube.com')) {
                    
                    // サロン関連のドメインかどうかをチェック
                    const text = `${title} ${snippet}`.toLowerCase();
                    const salonKeywords = ['美容室', 'ヘアサロン', 'salon', 'hair', 'beauty', 'cut', 'カット'];
                    const hasRelevantKeyword = salonKeywords.some(keyword => text.includes(keyword));
                    
                    if (hasRelevantKeyword && !homepageCandidates.includes(link)) {
                        homepageCandidates.push(link);
                        console.log(`    🏠 ホームページURL候補: ${link}`);
                    }
                }
            }
            
            // Instagram候補を関連度で並び替え
            instagramCandidates.sort((a, b) => b.relevance - a.relevance);
            
            // 結果を格納
            const instagramUrls = instagramCandidates.map(candidate => candidate.url);
            result.instagramCandidates = instagramUrls;
            result.emailCandidates = emailCandidates;
            result.phoneNumberCandidates = phoneNumberCandidates;
            result.homepageCandidates = homepageCandidates;
            
            // 最も関連度の高いものを設定
            if (instagramCandidates.length > 0) {
                result.instagramUrl = instagramCandidates[0].url;
                console.log(`    ✅ 最高関連度Instagram URL: ${result.instagramUrl} (${(instagramCandidates[0].relevance * 100).toFixed(1)}%)`);
            }
            if (emailCandidates.length > 0) {
                result.email = emailCandidates[0];
            }
            if (phoneNumberCandidates.length > 0) {
                result.phoneNumber = phoneNumberCandidates[0];
            }
            if (homepageCandidates.length > 0) {
                result.homepageUrl = homepageCandidates[0];
            }
            
            console.log(`    ✅ Instagram候補=${instagramUrls.length}件, Email候補=${emailCandidates.length}件, Phone候補=${phoneNumberCandidates.length}件, Homepage候補=${homepageCandidates.length}件`);
            
        } else {
            console.log(`    ❌ Google API検索結果が見つかりませんでした`);
        }

        console.log(`  🔍 Google API検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (候補${(result.instagramCandidates || []).length}件), Email=${result.email ? '✓' : '✗'} (候補${(result.emailCandidates || []).length}件), Phone=${result.phoneNumber ? '✓' : '✗'} (候補${(result.phoneNumberCandidates || []).length}件)`);
        
        return result;
        
    } catch (error: any) {
        console.error(`  ❌ Google Search API検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Axiosエラーの場合は詳細情報を表示
        if (error.response) {
            console.error(`    ステータスコード: ${error.response.status}`);
            console.error(`    エラーレスポンス:`, JSON.stringify(error.response.data, null, 2));
        }
        
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            disableEngine('google');
        }
        return {};
    }
}

/**
 * Instagram検索クエリを使用して検索を実行
 * @param salonName サロン名
 * @param address 住所（任意）
 * @returns 検索結果
 */
export async function searchWithMultipleInstagramQueries(salonName: string, address?: string): Promise<GoogleSearchResult> {
    console.log(`  🚀 2段階最適化Instagram検索を開始: "${salonName}"`);
    
    if (!isGoogleApiAvailable() || !isEngineEnabled('google')) {
        console.log('  ⚠️  Google Search APIが利用できません');
        return {};
    }
    
    // 新しい2段階検索を使用（searchGoogleWithSalonNameに委譲）
    const dummyQuery = `ヘアサロン ${salonName} instagram`; // 後方互換性のため
    const result = await searchGoogleWithSalonName(dummyQuery, salonName, address);
    
    if (result.instagramUrl) {
        const relevance = calculateInstagramRelevance(result.instagramUrl, salonName);
        console.log(`  🎉 Instagram URL発見！"${result.instagramUrl}" (関連度: ${(relevance * 100).toFixed(1)}%)`);
    } else {
        console.log(`  😞 Instagram URLが見つかりませんでした`);
    }
    
    return result;
}

/**
 * サロン名と住所を組み合わせて検索クエリを生成
 * @param salonName サロン名
 * @param address 住所
 * @returns 検索クエリ
 */
export function generateSearchQuery(salonName: string, address: string): string {
    // サロン名から不要な記号や余分な空白を整理
    const cleanSalonName = salonName.trim().replace(/\s+/g, ' ');
    
    // 住所を整理（余分な空白や改行を除去）
    const cleanAddress = address.trim().replace(/\s+/g, '').replace(/\n/g, '');
    
    // ヘアサロン特化のInstagram検索クエリを生成
    // 形式: "ヘアサロン サロン名 住所 Instagram インスタグラム"
    // 関係のない業種の同じ名前のアカウント取得を削減するため業種キーワードを先頭に追加
    return `ヘアサロン ${cleanSalonName} ${cleanAddress} Instagram インスタグラム`;
}

/**
 * Instagram専用検索を実行
 * @param salonName サロン名
 * @param address 住所（任意）
 * @returns Instagram URLとメタデータ
 */
async function searchForInstagram(salonName: string, address?: string): Promise<GoogleSearchResult> {
    console.log('  📱 Instagram専用検索を開始...');
    
    // Instagram最適化クエリ: ヘアサロンキーワード + サロン名 + 住所 + instagram
    let instagramQuery = `ヘアサロン ${salonName}`;
    if (address) {
        // 住所を整理（余分な空白や改行を除去）
        const cleanAddress = address.trim().replace(/\s+/g, '').replace(/\n/g, '');
        instagramQuery += ` ${cleanAddress}`;
    }
    instagramQuery += ` instagram`;
    
    console.log(`    🔍 Instagram検索クエリ: "${instagramQuery}"`);
    
    const result = await searchGoogleApi(instagramQuery, salonName);
    
    if (result.instagramUrl) {
        console.log(`    ✅ Instagram URL発見: ${result.instagramUrl}`);
    } else {
        console.log(`    ❌ Instagram URLが見つかりませんでした`);
    }
    
    return result;
}

/**
 * ビジネス情報専用検索を実行
 * @param salonName サロン名  
 * @param address 住所
 * @returns ビジネス情報（電話番号、メール、ホームページ等）
 */
async function searchForBusinessInfo(salonName: string, address: string): Promise<GoogleSearchResult> {
    console.log('  🏢 ビジネス情報専用検索を開始...');
    
    // ビジネス情報最適化クエリ: サロン名 + 住所（instagramキーワードなし）
    const businessQuery = `${salonName} ${address}`;
    console.log(`    🔍 ビジネス情報検索クエリ: "${businessQuery}"`);
    
    const result = await searchGoogleApi(businessQuery, salonName);
    
    const foundItems: string[] = [];
    if (result.email) foundItems.push('メール');
    if (result.phoneNumber) foundItems.push('電話番号');
    if (result.homepageUrl) foundItems.push('ホームページ');
    
    if (foundItems.length > 0) {
        console.log(`    ✅ ビジネス情報発見: ${foundItems.join(', ')}`);
    } else {
        console.log(`    ❌ ビジネス情報が見つかりませんでした`);
    }
    
    return result;
}

/**
 * 2つの検索結果をマージ
 * @param instagramResult Instagram検索結果
 * @param businessResult ビジネス情報検索結果
 * @returns マージされた結果
 */
function mergeSearchResults(instagramResult: GoogleSearchResult, businessResult: GoogleSearchResult): GoogleSearchResult {
    const merged: GoogleSearchResult = {};
    
    // Instagram情報は Instagram検索結果を優先
    if (instagramResult.instagramUrl) {
        merged.instagramUrl = instagramResult.instagramUrl;
    }
    if (instagramResult.instagramCandidates) {
        merged.instagramCandidates = instagramResult.instagramCandidates;
    }
    
    // ビジネス情報は ビジネス情報検索結果を優先、なければInstagram検索結果
    merged.email = businessResult.email || instagramResult.email;
    merged.phoneNumber = businessResult.phoneNumber || instagramResult.phoneNumber;
    merged.homepageUrl = businessResult.homepageUrl || instagramResult.homepageUrl;
    
    // 候補情報をマージ（重複排除）
    const mergeArrays = (arr1?: string[], arr2?: string[]) => {
        const combined = [...(arr1 || []), ...(arr2 || [])];
        return [...new Set(combined)];
    };
    
    merged.emailCandidates = mergeArrays(businessResult.emailCandidates, instagramResult.emailCandidates);
    merged.phoneNumberCandidates = mergeArrays(businessResult.phoneNumberCandidates, instagramResult.phoneNumberCandidates);
    merged.homepageCandidates = mergeArrays(businessResult.homepageCandidates, instagramResult.homepageCandidates);
    
    return merged;
}

/**
 * 2段階検索を実行してInstagram URLとビジネス情報を抽出（最適化済み）
 * @param query 元の検索クエリ（後方互換性のため保持）
 * @param salonName サロン名（関連度フィルタリング用）
 * @param address 住所（ビジネス情報検索用）
 * @returns 抽出された統合情報
 */
export async function searchGoogleWithSalonName(query: string, salonName?: string, address?: string): Promise<GoogleSearchResult> {
    console.log('  🔄 2段階最適化検索を開始...');
    
    // 検索エンジンの状態を表示
    showEngineStatus();
    
    if (!isEngineEnabled('google') || !isGoogleApiAvailable()) {
        if (!isGoogleApiAvailable()) {
            console.log('  ⚠️  Google Search APIは設定されていません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
        } else {
            console.log('  ⚠️  Google Search APIは無効化されているためスキップ');
        }
        return {};
    }
    
    if (!salonName) {
        console.log('  ⚠️  サロン名が指定されていません。従来の単一検索を実行...');
        return await searchGoogleApi(query);
    }
    
    // 1. Instagram専用検索を実行（住所を含む）
    const instagramResult = await searchForInstagram(salonName, address);
    
    // 2. ビジネス情報専用検索を実行（住所が利用可能な場合のみ）
    let businessResult: GoogleSearchResult = {};
    if (address) {
        businessResult = await searchForBusinessInfo(salonName, address);
    } else {
        console.log('  ⚠️  住所が指定されていません。ビジネス情報検索をスキップ...');
    }
    
    // 3. 結果をマージ
    const mergedResult = mergeSearchResults(instagramResult, businessResult);
    
    // 4. 最終結果をログ出力
    const summaryItems: string[] = [];
    if (mergedResult.instagramUrl) summaryItems.push('Instagram');
    if (mergedResult.email) summaryItems.push('メール');
    if (mergedResult.phoneNumber) summaryItems.push('電話番号');
    if (mergedResult.homepageUrl) summaryItems.push('ホームページ');
    
    console.log(`  🎯 2段階検索完了！取得成功: ${summaryItems.length > 0 ? summaryItems.join(', ') : 'なし'}`);
    
    return mergedResult;
}