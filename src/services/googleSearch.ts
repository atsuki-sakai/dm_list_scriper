import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearchResult, GoogleBusinessInfo } from '../types/index';
import { sleep, calculateRelevanceScore, generateLocationBasedSearchQuery } from '../utils/index';
import { BRING_SEARCH, YAHOO_SEARCH } from '../constants/index';
import { extractInstagramFromSearchItem, calculateInstagramRelevance } from './instagramExtractor';

// ======================= 検索エンジン状態管理 ========================

/**
 * 検索エンジンの無効化状態を記録するオブジェクト
 * 429エラー（レート制限）が発生したエンジンは無効化される
 */
const disabledEngines = {
    google: false,
    bing: false,
    yahoo: false
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
    const engines = [];
    if (isEngineEnabled('google') && isGoogleApiAvailable()) engines.push('Google');
    if (BRING_SEARCH && isEngineEnabled('bing')) engines.push('Bing');
    if (YAHOO_SEARCH && isEngineEnabled('yahoo')) engines.push('Yahoo');
    
    console.log(`  🔍 検索エンジン: ${engines.length > 0 ? engines.join(', ') : '無効'}`);
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
    
    return hasApiKey && hasEngineId;
}

/**
 * Google Business情報を抽出する
 * @param item Google Custom Search APIの検索結果アイテム
 * @returns Google Business情報
 */
function extractGoogleBusinessInfo(item: any): GoogleBusinessInfo {
    const businessInfo: GoogleBusinessInfo = {};
    
    const snippet = item.snippet || '';
    const title = item.title || '';
    const pagemap = item.pagemap || {};
    
    // pagemapから構造化データを抽出
    if (pagemap.metatags && pagemap.metatags.length > 0) {
        const metatag = pagemap.metatags[0];
        
        // Business情報を抽出
        if (metatag['og:title']) {
            // タイトルから評価を抽出
            const ratingMatch = metatag['og:title'].match(/★?(\d+\.?\d*)/);
            if (ratingMatch) {
                businessInfo.rating = parseFloat(ratingMatch[1]);
            }
        }
        
        if (metatag['og:description']) {
            // 説明文からビジネス情報を抽出
            const description = metatag['og:description'];
            
            // 営業時間の抽出
            const hoursPatterns = [
                /営業時間[：:]\s*([^。]+)/,
                /時間[：:]\s*([^。]+)/,
                /(\d{1,2}:\d{2}[^\d]+\d{1,2}:\d{2})/
            ];
            
            for (const pattern of hoursPatterns) {
                const match = description.match(pattern);
                if (match) {
                    businessInfo.businessHours = match[1].trim();
                    break;
                }
            }
            
            // カテゴリ情報の抽出
            const categories = [];
            const categoryKeywords = ['美容室', 'ヘアサロン', 'salon', 'hair', 'beauty', 'カット', 'パーマ', 'カラー'];
            for (const keyword of categoryKeywords) {
                if (description.toLowerCase().includes(keyword.toLowerCase())) {
                    categories.push(keyword);
                }
            }
            if (categories.length > 0) {
                businessInfo.categories = categories;
            }
        }
    }
    
    // スニペットから情報を抽出
    const combinedText = `${title} ${snippet}`;
    
    // 評価の抽出
    if (!businessInfo.rating) {
        const ratingPatterns = [
            /★\s*(\d+\.?\d*)/,
            /評価[：:]\s*(\d+\.?\d*)/,
            /レビュー[：:]\s*(\d+\.?\d*)/,
            /(\d+\.?\d*)\s*つ星/,
            /(\d+\.?\d*)\/5/
        ];
        
        for (const pattern of ratingPatterns) {
            const match = combinedText.match(pattern);
            if (match) {
                businessInfo.rating = parseFloat(match[1]);
                break;
            }
        }
    }
    
    // レビュー数の抽出
    const reviewPatterns = [
        /(\d+)\s*件?のレビュー/,
        /(\d+)\s*レビュー/,
        /(\d+)\s*reviews/i,
        /(\d+)\s*口コミ/
    ];
    
    for (const pattern of reviewPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            businessInfo.reviewCount = parseInt(match[1]);
            break;
        }
    }
    
    // 営業時間の抽出（スニペットから）
    if (!businessInfo.businessHours) {
        const hoursPatterns = [
            /営業時間[：:]\s*([^。\n]+)/,
            /時間[：:]\s*([^。\n]+)/,
            /(\d{1,2}:\d{2}[～\-~]\d{1,2}:\d{2})/,
            /(月|火|水|木|金|土|日).*(開店|閉店|\d{1,2}:\d{2})/
        ];
        
        for (const pattern of hoursPatterns) {
            const match = combinedText.match(pattern);
            if (match) {
                businessInfo.businessHours = match[1].trim();
                break;
            }
        }
    }
    
    // 営業状況の抽出
    const statusPatterns = [
        /(営業中|営業時間外|一時休業|閉店|休業中)/,
        /(開店|閉店)\s*(\d{1,2}:\d{2})/
    ];
    
    for (const pattern of statusPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            businessInfo.businessStatus = match[1];
            break;
        }
    }
    
    // 住所の抽出
    const addressPatterns = [
        /〒?\d{3}-?\d{4}\s*([^。\n]+)/,
        /(東京都|大阪府|京都府|神奈川県|埼玉県|千葉県|愛知県|兵庫県|福岡県|北海道|宮城県|広島県|静岡県|茨城県|栃木県|群馬県|山梨県|長野県|新潟県|富山県|石川県|福井県|岐阜県|三重県|滋賀県|奈良県|和歌山県|鳥取県|島根県|岡山県|山口県|徳島県|香川県|愛媛県|高知県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)[^。\n]+/
    ];
    
    for (const pattern of addressPatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            businessInfo.address = match[0].trim();
            break;
        }
    }
    
    // 電話番号の抽出
    const phonePatterns = [
        /0\d{1,4}[-\s]\d{1,4}[-\s]\d{3,4}/,
        /TEL[：:]\s*(0\d{1,4}[-\s]\d{1,4}[-\s]\d{3,4})/,
        /電話[：:]\s*(0\d{1,4}[-\s]\d{1,4}[-\s]\d{3,4})/
    ];
    
    for (const pattern of phonePatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            businessInfo.phoneNumber = match[1] || match[0];
            break;
        }
    }
    
    // ウェブサイトの抽出
    if (item.link && !item.link.includes('google.com')) {
        businessInfo.website = item.link;
    }
    
    // メールアドレスの抽出（Google Business情報として信頼度が高い）
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = combinedText.match(emailPattern);
    
    if (emailMatches && emailMatches.length > 0) {
        // Google Business情報として、より信頼度の高いメールアドレスをフィルタリング
        const businessEmails = emailMatches.filter(email => {
            const lowerEmail = email.toLowerCase();
            return (
                // フリーメールは除外（ビジネス用ではない可能性が高い）
                !lowerEmail.includes('@gmail.com') && 
                !lowerEmail.includes('@yahoo.co.jp') && 
                !lowerEmail.includes('@yahoo.com') &&
                !lowerEmail.includes('@hotmail.com') &&
                !lowerEmail.includes('@outlook.com') &&
                // システム系メールも除外
                !lowerEmail.includes('noreply') &&
                !lowerEmail.includes('no-reply') &&
                !lowerEmail.includes('@google.com') &&
                // 基本的な形式チェック
                email.length > 5 && email.includes('@') && email.includes('.')
            );
        });
        
        if (businessEmails.length > 0) {
            businessInfo.email = businessEmails[0]; // 最初の有効なビジネスメールを採用
            console.log(`      📧 Google Businessメール発見: ${businessInfo.email}`);
        }
    }
    
    return businessInfo;
}

/**
 * Google Custom Search APIを使用してInstagram URLとメールアドレスと電話番号、Google Business情報を抽出
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchGoogleApi(query: string): Promise<GoogleSearchResult> {
    if (!isGoogleApiAvailable()) {
        console.log('  ⚠️  Google Search API設定が見つかりません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
        return {};
    }

    try {
        console.log(`  🔍 Google Search API検索を実行中...`);
        console.log(`  🔍 検索クエリ: "${query}"`);
        
        // Google Custom Search API URLを構築
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&lr=lang_ja&gl=jp`;
        
        const { data } = await axios.get(searchUrl, {
            timeout: 15000
        });

        const result: GoogleSearchResult = {};
        let googleBusinessInfo: GoogleBusinessInfo | undefined;

        if (data.items && data.items.length > 0) {
            
            // Instagram URL候補を全て収集
            const instagramCandidates: string[] = [];
            
            // 各検索結果を調べて情報を抽出
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                
                // pagemapからOG URLを取得
                let ogUrl = '';
                if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
                    ogUrl = item.pagemap.metatags[0]['og:url'] || '';
                }
                
                const fullText = `${title} ${snippet} ${link} ${ogUrl}`;
                
                // Instagram URLを最優先で検索（複数の抽出方法を試行）
                if (!result.instagramUrl) {
                    // 方法1: 直接リンクチェック
                    if (link.includes('instagram.com')) {
                        result.instagramUrl = link;
                    }
                    // 方法2: OG URLチェック
                    else if (ogUrl.includes('instagram.com')) {
                        result.instagramUrl = ogUrl;
                    }
                    // 方法3: より広範囲な正規表現パターンでテキスト全体を検索
                    else {
                        const instagramPatterns = [
                            // 完全なURL形式（パラメータも含む）
                            /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+(?:\?[^\/\s]*)?/gi,
                            // www付きのドメインのみ
                            /www\.instagram\.com\/[a-zA-Z0-9_\.]+/gi,
                            // ドメインのみ
                            /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
                            // URLの一部として表示される場合（例: › instagram.com › slow_1118）
                            /›\s*instagram\.com\s*›\s*([a-zA-Z0-9_\.]+)/gi,
                            // @ユーザー名パターン（より柔軟に）
                            /@[a-zA-Z0-9_\.]+/g,
                            // 「インスタ」や「Instagram」と一緒に記載されているアカウント名
                            /(?:インスタ|Instagram|instagram|INSTAGRAM|インスタグラム)[\s:：\-]*[@]?([a-zA-Z0-9_\.]+)/gi,
                            // 括弧内のアカウント名（例: Instagram(slow_1118)）
                            /(?:Instagram|instagram|インスタ)\s*[\(（]([a-zA-Z0-9_\.]+)[\)）]/gi
                        ];
                        
                        for (const pattern of instagramPatterns) {
                            const matches = fullText.match(pattern);
                            if (matches && matches.length > 0) {
                                for (const match of matches) {
                                    let candidateUrl = match.trim();
                                    
                                    // 特殊なパターンの処理（例: › instagram.com › slow_1118）
                                    if (candidateUrl.includes('›')) {
                                        const usernameMatch = candidateUrl.match(/›\s*instagram\.com\s*›\s*([a-zA-Z0-9_\.]+)/i);
                                        if (usernameMatch && usernameMatch[1]) {
                                            candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                                        }
                                    }
                                    // 括弧内のアカウント名を抽出（例: Instagram(slow_1118)）
                                    else if (candidateUrl.match(/Instagram|instagram|インスタ/i) && candidateUrl.includes('(')) {
                                        const usernameMatch = candidateUrl.match(/[\(（]([a-zA-Z0-9_\.]+)[\)）]/);
                                        if (usernameMatch && usernameMatch[1]) {
                                            candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                                        }
                                    }
                                    // 「インスタ」や「Instagram」と一緒に記載されているアカウント名を抽出
                                    else if (candidateUrl.match(/インスタ|Instagram|instagram|INSTAGRAM|インスタグラム/i)) {
                                        const usernameMatch = candidateUrl.match(/(?:インスタ|Instagram|instagram|INSTAGRAM|インスタグラム)[\s:：\-]*[@]?([a-zA-Z0-9_\.]+)/i);
                                        if (usernameMatch && usernameMatch[1]) {
                                            candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                                        }
                                    }
                                    // URL形式に正規化
                                    else if (candidateUrl.startsWith('@')) {
                                        candidateUrl = `https://instagram.com/${candidateUrl.substring(1)}`;
                                    } else if (candidateUrl.includes('instagram.com/') && !candidateUrl.startsWith('http')) {
                                        candidateUrl = 'https://' + candidateUrl;
                                    } else if (candidateUrl.match(/^[a-zA-Z0-9_\.]+$/)) {
                                        // アカウント名のみの場合
                                        candidateUrl = `https://instagram.com/${candidateUrl}`;
                                    }
                                    
                                    // Instagram URLとして有効かチェック（ユーザー名が含まれているか確認）
                                    if (candidateUrl.includes('instagram.com/') && candidateUrl.startsWith('http')) {
                                        // ユーザー名部分を抽出して検証
                                        const usernameFromUrl = candidateUrl.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
                                        if (usernameFromUrl && usernameFromUrl[1] && usernameFromUrl[1].length > 0) {
                                            instagramCandidates.push(candidateUrl);
                                            if (!result.instagramUrl) {
                                                result.instagramUrl = candidateUrl;
                                            }
                                        }
                                    }
                                }
                                if (result.instagramUrl) break;
                            }
                        }
                    }
                }
                
                // Google Business情報を抽出（より広範囲にチェック）
                if (!googleBusinessInfo) {
                    // Google My Businessのリンクまたはビジネス情報を含む可能性がある場合
                    const isBusinessInfo = link.includes('google.com/maps') || 
                                         link.includes('maps.google.com') ||
                                         title.toLowerCase().includes('google') ||
                                         snippet.includes('営業時間') || 
                                         snippet.includes('評価') ||
                                         snippet.includes('レビュー') ||
                                         snippet.includes('★') ||
                                         snippet.includes('電話') ||
                                         snippet.includes('TEL') ||
                                         snippet.match(/\d{1,2}:\d{2}/); // 時間のパターン
                    
                    if (isBusinessInfo) {
                        const businessInfo = extractGoogleBusinessInfo(item);
                        if (Object.keys(businessInfo).length > 0) {
                            googleBusinessInfo = businessInfo;
                        }
                    }
                }

                // メールアドレスを検索
                const text = `${title} ${snippet}`;
                const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const emailMatches = text.match(emailPattern);
                
                if (emailMatches && emailMatches.length > 0) {
                    // メールアドレス候補を収集
                    if (!result.emailCandidates) {
                        result.emailCandidates = [];
                    }
                    
                    // フィルタリング（ビジネスメール優先）
                    const filteredEmails = emailMatches.filter(email => {
                        const lowerEmail = email.toLowerCase();
                        return (
                            !lowerEmail.includes('@gmail.com') && 
                            !lowerEmail.includes('@yahoo.co.jp') && 
                            !lowerEmail.includes('@yahoo.com') &&
                            !lowerEmail.includes('@hotmail.com') &&
                            !lowerEmail.includes('@outlook.com') &&
                            !lowerEmail.includes('@google.com') &&
                            !lowerEmail.includes('noreply') &&
                            !lowerEmail.includes('no-reply') &&
                            email.length > 5 && email.includes('@') && email.includes('.')
                        );
                    });
                    
                    // 候補として追加
                    for (const email of filteredEmails) {
                        if (!result.emailCandidates.includes(email)) {
                            result.emailCandidates.push(email);
                        }
                    }
                    
                    // 最初の候補をメールアドレスとして設定
                    if (result.emailCandidates.length > 0 && !result.email) {
                        result.email = result.emailCandidates[0];
                    }
                }

                // GoogleBusinessから取得したホームページURLのみを使用（候補は収集しない）
                if (link && !link.includes('instagram.com') && !link.includes('hotpepper.jp') && 
                    !link.includes('google.com') && !link.includes('facebook.com') && 
                    !link.includes('twitter.com') && !link.includes('youtube.com') &&
                    !link.includes('bing.com') && !link.includes('yahoo.co.jp') &&
                    !link.includes('wikipedia.org') && !link.includes('amazon.') &&
                    (link.startsWith('http://') || link.startsWith('https://'))) {
                    
                    // 最初に見つかったサロン関連サイトを暫定的にホームページURLとして設定
                    if (!result.homepageUrl) {
                        result.homepageUrl = link;
                    }
                }
            }
            
            // Instagram候補をresultに追加（最大2つまで）
            if (instagramCandidates.length > 0) {
                const uniqueCandidates = [...new Set(instagramCandidates)]; // 重複を除去
                result.instagramCandidates = uniqueCandidates.slice(0, 2); // 最大2つまで
                console.log(`    📱 Instagram候補: ${result.instagramCandidates.length}件（最大2件に制限）`);
            }
            
            // Google Business情報をresultに追加
            if (googleBusinessInfo) {
                result.googleBusinessInfo = googleBusinessInfo;
                
                // Google Business情報から不足している情報を補完（高信頼度）
                if (!result.homepageUrl && googleBusinessInfo.website) {
                    result.homepageUrl = googleBusinessInfo.website;
                }
                
                // Google Businessメールアドレスは最優先（信頼度が高いため）
                if (googleBusinessInfo.email) {
                    result.email = googleBusinessInfo.email;
                    console.log(`    📧 Google Businessメールアドレスを優先採用: ${result.email}`);
                    
                    // Google Businessメールを候補の最初に追加
                    if (!result.emailCandidates) {
                        result.emailCandidates = [];
                    }
                    if (!result.emailCandidates.includes(googleBusinessInfo.email)) {
                        result.emailCandidates.unshift(googleBusinessInfo.email); // 最初に追加
                    }
                }
            }
            
        }
        
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

// ======================= 検索サービス ========================

/**
 * Bing検索を実行してInstagram URLとメールアドレスと電話番号を抽出（複数ページ対応）
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchBing(query: string): Promise<GoogleSearchResult> {
    try {
        const result: GoogleSearchResult = {};
        
        // 1ページ目から検索
        console.log(`  🔍 Bing 1ページ目を検索中...`);
        const firstPageResult = await searchBingPage(query, 1);
        
        // 1ページ目の結果をマージ
        Object.assign(result, firstPageResult);
        
        // Instagram URLが見つかった場合は2ページ目をスキップ（効率化）
        if (result.instagramUrl) {
            console.log(`  🔍 Bing: Instagram URLが見つかったため2ページ目をスキップ`);
        } else if (isEngineEnabled('bing')) {
            // Bingエンジンが有効で、Instagram URLが見つからない場合のみ2ページ目を検索
            console.log(`  🔍 Bing 2ページ目を検索中...`);
            const secondPageResult = await searchBingPage(query, 2);
            
            // 2ページ目の結果で不足分を補完
            if (!result.instagramUrl && secondPageResult.instagramUrl) {
                result.instagramUrl = secondPageResult.instagramUrl;
            }
            if (!result.email && secondPageResult.email) {
                result.email = secondPageResult.email;
            }
            if (!result.homepageUrl && secondPageResult.homepageUrl) {
                result.homepageUrl = secondPageResult.homepageUrl;
            }
        } else {
            console.log(`  🚫 Bing検索エンジンが無効化されているため2ページ目をスキップ`);
        }
        
        console.log(`  🔍 Bing検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'}, Email=${result.email ? '✓' : '✗'}, Homepage=${result.homepageUrl ? '✓' : '✗'}`);
        if (result.instagramUrl) {
            console.log(`    📱 Instagram: ${result.instagramUrl}`);
        }
        if (result.email) {
            console.log(`    📧 Email: ${result.email}`);
        }
        if (result.homepageUrl) {
            console.log(`    🏠 Homepage: ${result.homepageUrl}`);
        }
        
        return result;
        
    } catch (error) {
        console.error(`  ❌ Bing検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            disableEngine('bing');
        }
        return {};
    }
}

/**
 * Bing検索の特定ページを検索
 * @param query 検索クエリ
 * @param page ページ番号
 * @returns 抽出された情報
 */
async function searchBingPage(query: string, page: number): Promise<GoogleSearchResult> {
    try {
        // ページ間の遅延
        await sleep(1500 + Math.random() * 1000); // 1.5-2.5秒のランダムな遅延
        
        // 2ページ目の場合はfirstパラメータで開始位置を指定
        const startIndex = (page - 1) * 10;
        const searchUrl = page === 1 
            ? `https://www.bing.com/search?q=${encodeURIComponent(query)}&mkt=ja-JP&setlang=ja`
            : `https://www.bing.com/search?q=${encodeURIComponent(query)}&mkt=ja-JP&setlang=ja&first=${startIndex}`;
        
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.bing.com/',
            },
            timeout: 12000
        });

        const $ = cheerio.load(data);
        const result: GoogleSearchResult = {};

        // Instagram URLを検索
        let instagramUrl: string | undefined;
        
        // Bingのリンク構造に合わせて検索
        const instagramLinks = $('a[href*="instagram.com"]');
        console.log(`    🔍 Bing ${page}ページ目 Instagram候補リンク数: ${instagramLinks.length}`);
        
        const instagramCandidates: { url: string; relevance: number }[] = [];
        
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            
            const href = $(el).attr('href');
            if (href && href.includes('instagram.com')) {
                // 関連度計算を適用
                const relevance = calculateInstagramRelevance(href, query.replace(/[^a-zA-Z0-9\s]/g, '').split(' ')[0] || '');
                if (relevance >= 0.1) {
                    instagramCandidates.push({ url: href, relevance });
                    console.log(`      📱 Bing候補: ${href} (関連度: ${(relevance * 100).toFixed(1)}%)`);
                }
            }
        });
        
        // 最も関連度の高いものを選択
        if (instagramCandidates.length > 0) {
            instagramCandidates.sort((a, b) => b.relevance - a.relevance);
            instagramUrl = instagramCandidates[0].url;
            console.log(`    ✅ Bing最高関連度: ${instagramUrl} (${(instagramCandidates[0].relevance * 100).toFixed(1)}%)`);
        }
        
        // テキスト内のInstagram URLも検索
        if (!instagramUrl) {
            const bodyText = $('body').text();
            const instagramPatterns = [
                /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g,
                /@https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g,
                /instagram\.com\/[a-zA-Z0-9_\.]+/g
            ];
            
            for (const pattern of instagramPatterns) {
                const matches = bodyText.match(pattern);
                if (matches && matches.length > 0) {
                    let url = matches[0];
                    if (url.startsWith('@')) {
                        url = url.substring(1);
                    }
                    if (!url.startsWith('http')) {
                        url = 'https://' + url;
                    }
                    instagramUrl = url;
                    break;
                }
            }
        }
        
        if (instagramUrl) {
            result.instagramUrl = instagramUrl;
        }

        // メールアドレスを検索（緩和されたフィルタリング）
        const searchResults = $('body').text();
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = searchResults.match(emailPattern);
        
        if (emailMatches && emailMatches.length > 0) {
            console.log(`    📧 Bing ${page}ページ目 発見メール候補: ${emailMatches.length}件`);
            emailMatches.slice(0, 3).forEach((email, idx) => {
                console.log(`      [${idx}] ${email}`);
            });
            
            // フィルタリング条件を緩和（ビジネスメールを優先的に保持）
            const filteredEmails = emailMatches.filter(email => {
                const lowerEmail = email.toLowerCase();
                return (
                    // 基本的なフリーメールのみ除外
                    !lowerEmail.includes('@gmail.com') && 
                    !lowerEmail.includes('@yahoo.co.jp') && 
                    !lowerEmail.includes('@yahoo.com') &&
                    !lowerEmail.includes('@hotmail.com') &&
                    !lowerEmail.includes('@outlook.com') &&
                    // 検索エンジン関連のメールを除外
                    !lowerEmail.includes('@bing.com') &&
                    !lowerEmail.includes('@microsoft.com') &&
                    !lowerEmail.includes('@google.com') &&
                    // システム系メールを除外
                    !lowerEmail.includes('example.com') &&
                    !lowerEmail.includes('noreply') &&
                    !lowerEmail.includes('no-reply') &&
                    !lowerEmail.includes('admin@') &&
                    !lowerEmail.includes('webmaster@') &&
                    !lowerEmail.includes('support@') &&
                    !lowerEmail.includes('info@') && // 一般的すぎるinfoメールも除外
                    // 有効なメールアドレス形式をチェック
                    email.length > 5 && email.includes('@') && email.includes('.') &&
                    // ドメイン名が適切な長さ
                    email.split('@')[1]?.length > 3
                );
            });
            
            if (filteredEmails.length > 0) {
                result.email = filteredEmails[0];
                console.log(`    ✅ 採用メール: ${result.email}`);
            } else {
                console.log(`    ❌ フィルタリング後、有効なメールなし`);
            }
        }

        // 電話番号はGoogle Business情報からのみ取得するため、ここでは取得しない

        // ホームページURLを検索
        let homepageUrl: string | undefined;
        
        // 公式サイトのリンクを検索（Instagram、HotPepper、SNS以外）
        $('a').each((idx, el) => {
            const href = $(el).attr('href');
            const linkText = $(el).text().toLowerCase();
            
            if (href && !homepageUrl && 
                !href.includes('instagram.com') && 
                !href.includes('hotpepper.jp') &&
                !href.includes('facebook.com') && 
                !href.includes('twitter.com') && 
                !href.includes('youtube.com') &&
                !href.includes('bing.com') &&
                !href.includes('google.com') &&
                (href.startsWith('http') || href.startsWith('https'))) {
                
                // サロン関連のキーワードをチェック
                const isRelevant = linkText.includes('公式') || 
                                 linkText.includes('ホームページ') || 
                                 linkText.includes('サイト') ||
                                 linkText.includes('hp') ||
                                 href.includes('salon') ||
                                 href.includes('hair') ||
                                 href.includes('beauty');
                
                if (isRelevant) {
                    homepageUrl = href;
                    console.log(`    🏠 Bing ${page}ページ目 ホームページURL発見: ${href} (${linkText})`);
                }
            }
        });

        if (homepageUrl) {
            result.homepageUrl = homepageUrl;
        }

        return result;

    } catch (error) {
        console.error(`  ❌ Bing ${page}ページ目検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            console.log(`  🚫 Bing検索エンジンを無効化しました（レート制限のため）`);
            disableEngine('bing');
        }
        
        return {};
    }
}

/**
 * Yahoo検索を実行してInstagram URLとメールアドレスを抽出（複数ページ対応）
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchYahoo(query: string): Promise<GoogleSearchResult> {
    try {
        const result: GoogleSearchResult = {};
        
        // 1ページ目から検索
        console.log(`  🎯 Yahoo 1ページ目を検索中...`);
        const firstPageResult = await searchYahooPage(query, 1);
        
        // 1ページ目の結果をマージ
        Object.assign(result, firstPageResult);
        
        // Instagram URLが見つかった場合は2ページ目をスキップ（効率化）
        if (result.instagramUrl) {
            console.log(`  🎯 Yahoo: Instagram URLが見つかったため2ページ目をスキップ`);
        } else if (isEngineEnabled('yahoo')) {
            // Yahooエンジンが有効で、Instagram URLが見つからない場合のみ2ページ目を検索
            console.log(`  🎯 Yahoo 2ページ目を検索中...`);
            const secondPageResult = await searchYahooPage(query, 2);
            
            // 2ページ目の結果で不足分を補完
            if (!result.instagramUrl && secondPageResult.instagramUrl) {
                result.instagramUrl = secondPageResult.instagramUrl;
            }
            if (!result.email && secondPageResult.email) {
                result.email = secondPageResult.email;
            }
        } else {
            console.log(`  🚫 Yahoo検索エンジンが無効化されているため2ページ目をスキップ`);
        }
        
        console.log(`  🎯 Yahoo検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'}, Email=${result.email ? '✓' : '✗'}`);
        if (result.instagramUrl) {
            console.log(`    📱 Instagram: ${result.instagramUrl}`);
        }
        if (result.email) {
            console.log(`    📧 Email: ${result.email}`);
        }
        
        return result;
        
    } catch (error) {
        console.error(`  ❌ Yahoo検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            disableEngine('yahoo');
        }
        return {};
    }
}

/**
 * Yahoo検索の特定ページを検索
 * @param query 検索クエリ
 * @param page ページ番号
 * @returns 抽出された情報
 */
async function searchYahooPage(query: string, page: number): Promise<GoogleSearchResult> {
    try {
        // ページ間の遅延（Yahooは制限が厳しいため長めに）
        await sleep(500 + Math.random() * 1000); // 0.5-1.5秒のランダムな遅延
        
        // 2ページ目の場合はbパラメータで開始位置を指定
        const startIndex = (page - 1) * 10 + 1;
        const searchUrl = page === 1 
            ? `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}&fr=top_ga1_sa&ei=UTF-8`
            : `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}&fr=top_ga1_sa&ei=UTF-8&b=${startIndex}`;
        
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.yahoo.co.jp/',
            },
            timeout: 15000 // タイムアウトを長めに
        });

        const $ = cheerio.load(data);
        const result: GoogleSearchResult = {};

        // Instagram URLを検索
        let instagramUrl: string | undefined;
        
        // Yahooのリンク構造に合わせて検索
        const instagramLinks = $('a[href*="instagram.com"]');
        console.log(`    🎯 Yahoo ${page}ページ目 Instagram候補リンク数: ${instagramLinks.length}`);
        
        const instagramCandidates: { url: string; relevance: number }[] = [];
        
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            
            const href = $(el).attr('href');
            if (href) {
                let candidateUrl = '';
                
                // Yahooのリダイレクトや直接リンクから実際のURLを抽出
                if (href.includes('/RU=')) {
                    // Yahooリダイレクト形式: /RU=https%3A//instagram.com/...
                    const match = href.match(/\/RU=([^\/]+)/);
                    if (match) {
                        const decodedUrl = decodeURIComponent(match[1]);
                        if (decodedUrl.includes('instagram.com')) {
                            candidateUrl = decodedUrl;
                        }
                    }
                } else if (href.includes('instagram.com')) {
                    candidateUrl = href;
                }
                
                if (candidateUrl) {
                    // 関連度計算を適用
                    const relevance = calculateInstagramRelevance(candidateUrl, query.replace(/[^a-zA-Z0-9\s]/g, '').split(' ')[0] || '');
                    if (relevance >= 0.1) {
                        instagramCandidates.push({ url: candidateUrl, relevance });
                        console.log(`      📱 Yahoo候補: ${candidateUrl} (関連度: ${(relevance * 100).toFixed(1)}%)`);
                    }
                }
            }
        });
        
        // 最も関連度の高いものを選択
        if (instagramCandidates.length > 0) {
            instagramCandidates.sort((a, b) => b.relevance - a.relevance);
            instagramUrl = instagramCandidates[0].url;
            console.log(`    ✅ Yahoo最高関連度: ${instagramUrl} (${(instagramCandidates[0].relevance * 100).toFixed(1)}%)`);
        }
        
        // テキスト内のInstagram URLも検索
        if (!instagramUrl) {
            const bodyText = $('body').text();
            const instagramPatterns = [
                /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g,
                /@https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g,
                /instagram\.com\/[a-zA-Z0-9_\.]+/g
            ];
            
            for (const pattern of instagramPatterns) {
                const matches = bodyText.match(pattern);
                if (matches && matches.length > 0) {
                    let url = matches[0];
                    if (url.startsWith('@')) {
                        url = url.substring(1);
                    }
                    if (!url.startsWith('http')) {
                        url = 'https://' + url;
                    }
                    instagramUrl = url;
                    break;
                }
            }
        }
        
        if (instagramUrl) {
            result.instagramUrl = instagramUrl;
        }

        // メールアドレスを検索（緩和されたフィルタリング）
        const searchResults = $('body').text();
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = searchResults.match(emailPattern);
        
        if (emailMatches && emailMatches.length > 0) {
            console.log(`    📧 Yahoo ${page}ページ目 発見メール候補: ${emailMatches.length}件`);
            emailMatches.slice(0, 3).forEach((email, idx) => {
                console.log(`      [${idx}] ${email}`);
            });
            
            // フィルタリング条件を緩和（ビジネスメールを優先的に保持）
            const filteredEmails = emailMatches.filter(email => {
                const lowerEmail = email.toLowerCase();
                return (
                    // 基本的なフリーメールのみ除外
                    !lowerEmail.includes('@gmail.com') && 
                    !lowerEmail.includes('@yahoo.co.jp') && 
                    !lowerEmail.includes('@yahoo.com') &&
                    !lowerEmail.includes('@hotmail.com') &&
                    !lowerEmail.includes('@outlook.com') &&
                    // 検索エンジン関連のメールを除外
                    !lowerEmail.includes('@yahoo.com') &&
                    !lowerEmail.includes('@google.com') &&
                    // システム系メールを除外
                    !lowerEmail.includes('example.com') &&
                    !lowerEmail.includes('noreply') &&
                    !lowerEmail.includes('no-reply') &&
                    !lowerEmail.includes('admin@') &&
                    !lowerEmail.includes('webmaster@') &&
                    !lowerEmail.includes('support@') &&
                    !lowerEmail.includes('info@') && // 一般的すぎるinfoメールも除外
                    // 有効なメールアドレス形式をチェック
                    email.length > 5 && email.includes('@') && email.includes('.') &&
                    // ドメイン名が適切な長さ
                    email.split('@')[1]?.length > 3
                );
            });
            
            if (filteredEmails.length > 0) {
                result.email = filteredEmails[0];
                console.log(`    ✅ 採用メール: ${result.email}`);
            } else {
                console.log(`    ❌ フィルタリング後、有効なメールなし`);
            }
        }

        // 電話番号はGoogle Business情報からのみ取得するため、ここでは取得しない

        return result;

    } catch (error) {
        console.error(`  ❌ Yahoo ${page}ページ目検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            console.log(`  🚫 Yahoo検索エンジンを無効化しました（レート制限のため）`);
            disableEngine('yahoo');
        }
        
        return {};
    }
}

/**
 * 検索を実行してInstagram URLとメールアドレスを抽出（効率的な検索エンジン戦略）
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
export async function searchGoogle(query: string): Promise<GoogleSearchResult> {
    // 検索エンジンの状態を表示
    showEngineStatus();
    
    let mergedResult: GoogleSearchResult = {};
    
    // 1. 最優先: Google Search API（有効な場合のみ）
    if (isEngineEnabled('google') && isGoogleApiAvailable()) {
        const googleResult = await searchGoogleApi(query);
        mergedResult = { ...googleResult };
        
        // Instagram URLが見つかった場合は早期終了
        if (mergedResult.instagramUrl) {
            return mergedResult;
        }
    }
    
        // 2. Bingで検索（設定と動的無効化状態の両方をチェック）
    if (BRING_SEARCH && isEngineEnabled('bing')) {
        const bingResult = await searchBing(query);
        
        // Bing結果をマージ
        if (!mergedResult.instagramUrl && bingResult.instagramUrl) {
            mergedResult.instagramUrl = bingResult.instagramUrl;
        }
        if (!mergedResult.email && bingResult.email) {
            mergedResult.email = bingResult.email;
        }
        if (!mergedResult.homepageUrl && bingResult.homepageUrl) {
            mergedResult.homepageUrl = bingResult.homepageUrl;
        }
        
        // Instagram URLが見つかった場合は早期終了
        if (mergedResult.instagramUrl) {
            return mergedResult;
        }
    }
    
        // 3. Yahoo検索を試行（設定と動的無効化状態の両方をチェック）
    if (YAHOO_SEARCH && isEngineEnabled('yahoo')) {
        const yahooResult = await searchYahoo(query);
        
        // Yahoo結果をマージ
        if (!mergedResult.instagramUrl && yahooResult.instagramUrl) {
            mergedResult.instagramUrl = yahooResult.instagramUrl;
        }
        if (!mergedResult.email && yahooResult.email) {
            mergedResult.email = yahooResult.email;
        }
        if (!mergedResult.homepageUrl && yahooResult.homepageUrl) {
            mergedResult.homepageUrl = yahooResult.homepageUrl;
        }
        
        // YahooでもInstagram URLが見つかった場合は早期終了
        if (mergedResult.instagramUrl) {
            return mergedResult;
        }
    }
    
    
    // 最終統合結果を表示
    console.log(`  🔄 最終統合検索結果: Instagram=${mergedResult.instagramUrl ? '✓' : '✗'}, Email=${mergedResult.email ? '✓' : '✗'}, Homepage=${mergedResult.homepageUrl ? '✓' : '✗'}`);
    if (mergedResult.instagramUrl) {
        console.log(`    📱 Instagram: ${mergedResult.instagramUrl}`);
    }
    if (mergedResult.email) {
        console.log(`    📧 Email: ${mergedResult.email}`);
    }
    if (mergedResult.homepageUrl) {
        console.log(`    🏠 Homepage: ${mergedResult.homepageUrl}`);
    }
    
    // 最終統合結果を表示
    const results = [];
    if (mergedResult.instagramUrl) results.push('Instagram=✓');
    if (mergedResult.email) results.push('Email=✓');
    if (mergedResult.homepageUrl) results.push('Homepage=✓');
    
    console.log(`  🔄 最終統合検索結果: ${results.length > 0 ? results.join(', ') : 'なし'}`);
    if (mergedResult.instagramUrl) console.log(`    📱 Instagram: ${mergedResult.instagramUrl}`);
    if (mergedResult.email) console.log(`    📧 Email: ${mergedResult.email}`);
    if (mergedResult.homepageUrl) console.log(`    🏠 Homepage: ${mergedResult.homepageUrl}`);
    
    return mergedResult;
}

/**
 * サロン名と住所を組み合わせて検索クエリを生成（都道府県・市を含む最適化版）
 * Instagram検索により効果的で地域特化されたクエリを生成
 * @param salonName サロン名
 * @param address 住所
 * @returns 検索クエリ
 */
export function generateSearchQuery(salonName: string, address: string): string {
    // 地域情報を含む検索クエリを生成
    return generateLocationBasedSearchQuery(salonName, address);
}

/**
 * Instagram専用の最適化された検索クエリを生成（都道府県・市を含む）
 * @param salonName サロン名
 * @param address 住所（オプション）
 * @returns Instagram検索用の地域特化されたクエリ
 */
export function generateInstagramSearchQuery(salonName: string, address?: string): string {
    if (address) {
        // 住所が提供された場合は地域情報を含める
        return generateLocationBasedSearchQuery(salonName, address);
    } else {
        // 従来の方式（後方互換性のため）
        const cleanSalonName = salonName.trim().replace(/\s+/g, ' ');
        return `ヘアサロン ${cleanSalonName} Instagram`;
    }
}