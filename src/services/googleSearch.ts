import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleSearchResult, GoogleBusinessInfo } from '../types/index';
import { sleep, calculateRelevanceScore } from '../utils/index';
import { BRING_SEARCH, YAHOO_SEARCH } from '../constants/index';
import { extractInstagramFromSearchItem, extractInstagramUrls } from './instagramExtractor';

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
            console.log(`    🔍 Google API検索結果: ${data.items.length}件`);
            
            // デバッグ: Instagram関連結果を確認
            data.items.forEach((item: any, index: number) => {
                const title = item.title || '';
                const link = item.link || '';
                const snippet = item.snippet || '';
                
                if (title.toLowerCase().includes('instagram') || 
                    link.includes('instagram.com') || 
                    snippet.toLowerCase().includes('instagram') ||
                    snippet.toLowerCase().includes('インスタ')) {
                    console.log(`    📱 [${index}] Instagram関連結果発見:`);
                    console.log(`        タイトル: ${title}`);
                    console.log(`        リンク: ${link}`);
                    console.log(`        スニペット: ${snippet.substring(0, 150)}...`);
                }
            });
            
            // Instagram URL候補を全て収集
            const instagramCandidates: string[] = [];
            
            // 各検索結果からInstagram URLを抽出
            for (const item of data.items) {
                const instagramUrl = extractInstagramFromSearchItem(item);
                if (instagramUrl) {
                    instagramCandidates.push(instagramUrl);
                    if (!result.instagramUrl) {
                        result.instagramUrl = instagramUrl;
                    }
                }
                
                // 検索結果が見つかった場合、早期終了オプション
                if (result.instagramUrl) {
                    break;
                }
            }
            
            // Instagram候補をresultに追加
            if (instagramCandidates.length > 0) {
                result.instagramCandidates = [...new Set(instagramCandidates)]; // 重複を除去
                console.log(`    📱 Instagram候補収集: ${result.instagramCandidates.length}件`);
            }
            
            // 各検索結果を調べて他の情報を抽出
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                
                // pagemapからOG URLを取得
                let ogUrl = '';
                if (item.pagemap && item.pagemap.metatags && item.pagemap.metatags.length > 0) {
                    ogUrl = item.pagemap.metatags[0]['og:url'] || '';
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

                // 電話番号はGoogle Business情報からのみ取得する
                // （Google Business情報から既に取得されている場合は、後でresultに追加される）

                // ホームページURLを検索（候補リストに追加）
                if (link && !link.includes('instagram.com') && !link.includes('hotpepper.jp') && 
                    !link.includes('google.com') && !link.includes('facebook.com') && 
                    !link.includes('twitter.com') && !link.includes('youtube.com') &&
                    !link.includes('bing.com') && !link.includes('yahoo.co.jp') &&
                    !link.includes('wikipedia.org') && !link.includes('amazon.') &&
                    (link.startsWith('http://') || link.startsWith('https://'))) {
                    
                    // ホームページ候補として保存
                    if (!result.homepageCandidates) {
                        result.homepageCandidates = [];
                    }
                    
                    // 重複を避ける
                    if (!result.homepageCandidates.includes(link)) {
                        result.homepageCandidates.push(link);
                        
                        // 最初の候補を暫定的にホームページURLとして設定
                        if (!result.homepageUrl) {
                            result.homepageUrl = link;
                        }
                    }
                }
            }
            

            
            // Google Business情報をresultに追加
            if (googleBusinessInfo) {
                result.googleBusinessInfo = googleBusinessInfo;
                
                // Google Business情報から不足している情報を補完
                if (!result.phoneNumber && googleBusinessInfo.phoneNumber) {
                    result.phoneNumber = googleBusinessInfo.phoneNumber;
                }
                if (!result.homepageUrl && googleBusinessInfo.website) {
                    result.homepageUrl = googleBusinessInfo.website;
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
        
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            
            const href = $(el).attr('href');
            if (href && !instagramUrl) {
                // 直接リンクまたはBingのリダイレクトURLから実際のURLを抽出
                if (href.includes('instagram.com')) {
                    instagramUrl = href;
                    return false; // 最初に見つかったものを使用
                }
            }
        });
        
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
        
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            
            const href = $(el).attr('href');
            if (href && !instagramUrl) {
                // Yahooのリダイレクトや直接リンクから実際のURLを抽出
                if (href.includes('/RU=')) {
                    // Yahooリダイレクト形式: /RU=https%3A//instagram.com/...
                    const match = href.match(/\/RU=([^\/]+)/);
                    if (match) {
                        const decodedUrl = decodeURIComponent(match[1]);
                        if (decodedUrl.includes('instagram.com')) {
                            instagramUrl = decodedUrl;
                            return false;
                        }
                    }
                } else if (href.includes('instagram.com')) {
                    instagramUrl = href;
                    return false; // 最初に見つかったものを使用
                }
            }
        });
        
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
    console.log(`  🔄 最終統合検索結果: Instagram=${mergedResult.instagramUrl ? '✓' : '✗'}, Email=${mergedResult.email ? '✓' : '✗'}, Phone=${mergedResult.phoneNumber ? '✓' : '✗'}, Homepage=${mergedResult.homepageUrl ? '✓' : '✗'}`);
    if (mergedResult.instagramUrl) {
        console.log(`    📱 Instagram: ${mergedResult.instagramUrl}`);
    }
    if (mergedResult.email) {
        console.log(`    📧 Email: ${mergedResult.email}`);
    }
    if (mergedResult.phoneNumber) {
        console.log(`    📞 Phone: ${mergedResult.phoneNumber}`);
    }
    if (mergedResult.homepageUrl) {
        console.log(`    🏠 Homepage: ${mergedResult.homepageUrl}`);
    }
    
    // 最終統合結果を表示
    const results = [];
    if (mergedResult.instagramUrl) results.push('Instagram=✓');
    if (mergedResult.email) results.push('Email=✓');
    if (mergedResult.phoneNumber) results.push('Phone=✓');
    if (mergedResult.homepageUrl) results.push('Homepage=✓');
    
    console.log(`  🔄 最終統合検索結果: ${results.length > 0 ? results.join(', ') : 'なし'}`);
    if (mergedResult.instagramUrl) console.log(`    📱 Instagram: ${mergedResult.instagramUrl}`);
    if (mergedResult.email) console.log(`    📧 Email: ${mergedResult.email}`);
    if (mergedResult.phoneNumber) console.log(`    📞 Phone: ${mergedResult.phoneNumber}`);
    if (mergedResult.homepageUrl) console.log(`    🏠 Homepage: ${mergedResult.homepageUrl}`);
    
    return mergedResult;
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
    const cleanAddress = address.trim().replace(/\s+/g, ' ').replace(/\n/g, '');
    
    // ヘアサロン特化の包括的な検索クエリを生成
    // 形式: "ヘアサロン サロン名 住所"
    // Google My Businessの情報も含めて広く検索できるようにする
    return `ヘアサロン ${cleanSalonName} ${cleanAddress}`;
}