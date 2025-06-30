"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetEngineStatus = resetEngineStatus;
exports.showEngineStatus = showEngineStatus;
exports.searchWithMultipleInstagramQueries = searchWithMultipleInstagramQueries;
exports.generateSearchQuery = generateSearchQuery;
exports.searchGoogleWithSalonName = searchGoogleWithSalonName;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../constants/index");
const instagramExtractor_1 = require("./instagramExtractor");
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
function disableEngine(engineName) {
    disabledEngines[engineName] = true;
    console.log(`  ⚠️  ${engineName.toUpperCase()}検索エンジンを無効化しました（429エラーのため）`);
}
/**
 * 検索エンジンが有効かどうかをチェック
 * @param engineName 検索エンジン名
 * @returns 有効かどうか
 */
function isEngineEnabled(engineName) {
    return !disabledEngines[engineName];
}
/**
 * 無効化状態をリセット（新しいセッション開始時に使用）
 */
function resetEngineStatus() {
    Object.keys(disabledEngines).forEach(key => {
        disabledEngines[key] = false;
    });
    console.log('  🔄 検索エンジンの無効化状態をリセットしました');
}
/**
 * 現在の検索エンジン状態を表示
 */
function showEngineStatus() {
    console.log('  📊 検索エンジン状態:');
    // 設定による有効/無効状態を表示
    console.log('  📊 設定による検索エンジン制御:');
    console.log(`    BING: ${index_1.BRING_SEARCH ? '✅ 有効' : '❌ 無効 (設定により)'}`);
    console.log(`    YAHOO: ${index_1.YAHOO_SEARCH ? '✅ 有効' : '❌ 無効 (設定により)'}`);
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
function isGoogleApiAvailable() {
    const hasApiKey = !!GOOGLE_API_KEY;
    const hasEngineId = !!GOOGLE_SEARCH_ENGINE_ID;
    // デバッグ情報を表示
    console.log(`  🔍 Google API設定チェック:`);
    console.log(`    API Key: ${hasApiKey ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`    Engine ID: ${hasEngineId ? '✅ 設定済み' : '❌ 未設定'}`);
    return hasApiKey && hasEngineId;
}
/**
 * Google Business情報を抽出する
 * @param item Google Custom Search APIの検索結果アイテム
 * @returns Google Business情報
 */
function extractGoogleBusinessInfo(item) {
    const businessInfo = {};
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
 * Google Custom Search APIを使用してInstagram URLとメールアドレスと電話番号を抽出（複数候補対応）
 * @param query 検索クエリ
 * @param salonName サロン名（関連度フィルタリング用）
 * @returns 抽出された情報（候補含む）
 */
async function searchGoogleApi(query, salonName) {
    if (!isGoogleApiAvailable()) {
        console.log('  ⚠️  Google Search API設定が見つかりません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
        return {};
    }
    try {
        console.log(`  🔍 Google Search API検索を実行中: "${query}"`);
        // Google Custom Search API URLを構築
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=10&lr=lang_ja&gl=jp`;
        const { data } = await axios_1.default.get(searchUrl, {
            timeout: 15000
        });
        const result = {};
        // 候補を格納する配列
        const instagramCandidates = [];
        const emailCandidates = [];
        const phoneNumberCandidates = [];
        const homepageCandidates = [];
        let googleBusinessInfo;
        if (data.items && data.items.length > 0) {
            console.log(`    🔍 Google API 検索結果: ${data.items.length}件`);
            // 各検索結果を調べて候補を収集
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                // 新しいInstagram抽出機能を使用
                const instagramResult = (0, instagramExtractor_1.extractInstagramFromSearchItem)(item, salonName);
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
                // Google Business情報を抽出（優先的にチェック）
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
                            console.log(`    🏢 Google Business情報発見:`);
                            if (businessInfo.rating)
                                console.log(`      ⭐ 評価: ${businessInfo.rating}`);
                            if (businessInfo.reviewCount)
                                console.log(`      📝 レビュー数: ${businessInfo.reviewCount}`);
                            if (businessInfo.businessHours)
                                console.log(`      🕒 営業時間: ${businessInfo.businessHours}`);
                            if (businessInfo.businessStatus)
                                console.log(`      📊 営業状況: ${businessInfo.businessStatus}`);
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
            // Google Business情報を追加
            if (googleBusinessInfo) {
                result.googleBusinessInfo = googleBusinessInfo;
                console.log(`    ✅ Google Business情報を設定しました`);
                // Google Business情報から不足している情報を補完
                if (!result.phoneNumber && googleBusinessInfo.phoneNumber) {
                    result.phoneNumber = googleBusinessInfo.phoneNumber;
                    console.log(`    📞 Google Businessから電話番号を補完: ${result.phoneNumber}`);
                }
                if (!result.homepageUrl && googleBusinessInfo.website) {
                    result.homepageUrl = googleBusinessInfo.website;
                    console.log(`    🏠 Google Businessからウェブサイトを補完: ${result.homepageUrl}`);
                }
            }
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
        }
        else {
            console.log(`    ❌ Google API検索結果が見つかりませんでした`);
        }
        console.log(`  🔍 Google API検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (候補${(result.instagramCandidates || []).length}件), Email=${result.email ? '✓' : '✗'} (候補${(result.emailCandidates || []).length}件), Phone=${result.phoneNumber ? '✓' : '✗'} (候補${(result.phoneNumberCandidates || []).length}件), GoogleBusiness=${result.googleBusinessInfo ? '✓' : '✗'}`);
        return result;
    }
    catch (error) {
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
async function searchWithMultipleInstagramQueries(salonName, address) {
    console.log(`  🚀 2段階最適化Instagram検索を開始: "${salonName}"`);
    if (!isGoogleApiAvailable() || !isEngineEnabled('google')) {
        console.log('  ⚠️  Google Search APIが利用できません');
        return {};
    }
    // 新しい2段階検索を使用（searchGoogleWithSalonNameに委譲）
    const dummyQuery = `ヘアサロン ${salonName} instagram`; // 後方互換性のため
    const result = await searchGoogleWithSalonName(dummyQuery, salonName, address);
    if (result.instagramUrl) {
        const relevance = (0, instagramExtractor_1.calculateInstagramRelevance)(result.instagramUrl, salonName);
        console.log(`  🎉 Instagram URL発見！"${result.instagramUrl}" (関連度: ${(relevance * 100).toFixed(1)}%)`);
    }
    else {
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
function generateSearchQuery(salonName, address) {
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
async function searchForInstagram(salonName, address) {
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
    }
    else {
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
async function searchForBusinessInfo(salonName, address) {
    console.log('  🏢 ビジネス情報専用検索を開始...');
    // ビジネス情報最適化クエリ: サロン名 + 住所（instagramキーワードなし）
    const businessQuery = `${salonName} ${address}`;
    console.log(`    🔍 ビジネス情報検索クエリ: "${businessQuery}"`);
    const result = await searchGoogleApi(businessQuery, salonName);
    const foundItems = [];
    if (result.email)
        foundItems.push('メール');
    if (result.phoneNumber)
        foundItems.push('電話番号');
    if (result.homepageUrl)
        foundItems.push('ホームページ');
    if (foundItems.length > 0) {
        console.log(`    ✅ ビジネス情報発見: ${foundItems.join(', ')}`);
    }
    else {
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
function mergeSearchResults(instagramResult, businessResult) {
    const merged = {};
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
    // Google Business情報はどちらにもある可能性があるため、より完全な方を優先
    if (businessResult.googleBusinessInfo || instagramResult.googleBusinessInfo) {
        const businessInfo = businessResult.googleBusinessInfo;
        const instagramInfo = instagramResult.googleBusinessInfo;
        if (businessInfo && instagramInfo) {
            // 両方ある場合は、より多くの情報を持つ方を優先してマージ
            merged.googleBusinessInfo = {
                ...instagramInfo,
                ...businessInfo // ビジネス検索結果の方を優先
            };
            console.log(`    🔄 Google Business情報をマージしました`);
        }
        else {
            merged.googleBusinessInfo = businessInfo || instagramInfo;
            console.log(`    ✅ Google Business情報を設定: ${businessInfo ? 'ビジネス検索' : 'Instagram検索'}から`);
        }
    }
    // 候補情報をマージ（重複排除）
    const mergeArrays = (arr1, arr2) => {
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
async function searchGoogleWithSalonName(query, salonName, address) {
    console.log('  🔄 2段階最適化検索を開始...');
    // 検索エンジンの状態を表示
    showEngineStatus();
    if (!isEngineEnabled('google') || !isGoogleApiAvailable()) {
        if (!isGoogleApiAvailable()) {
            console.log('  ⚠️  Google Search APIは設定されていません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
        }
        else {
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
    let businessResult = {};
    if (address) {
        businessResult = await searchForBusinessInfo(salonName, address);
    }
    else {
        console.log('  ⚠️  住所が指定されていません。ビジネス情報検索をスキップ...');
    }
    // 3. 結果をマージ
    const mergedResult = mergeSearchResults(instagramResult, businessResult);
    // 4. 最終結果をログ出力
    const summaryItems = [];
    if (mergedResult.instagramUrl)
        summaryItems.push('Instagram');
    if (mergedResult.email)
        summaryItems.push('メール');
    if (mergedResult.phoneNumber)
        summaryItems.push('電話番号');
    if (mergedResult.homepageUrl)
        summaryItems.push('ホームページ');
    if (mergedResult.googleBusinessInfo) {
        const businessItems = [];
        if (mergedResult.googleBusinessInfo.rating)
            businessItems.push('評価');
        if (mergedResult.googleBusinessInfo.reviewCount)
            businessItems.push('レビュー数');
        if (mergedResult.googleBusinessInfo.businessHours)
            businessItems.push('営業時間');
        if (mergedResult.googleBusinessInfo.businessStatus)
            businessItems.push('営業状況');
        if (businessItems.length > 0) {
            summaryItems.push(`Google Business(${businessItems.join(', ')})`);
        }
        else {
            summaryItems.push('Google Business');
        }
    }
    console.log(`  🎯 2段階検索完了！取得成功: ${summaryItems.length > 0 ? summaryItems.join(', ') : 'なし'}`);
    return mergedResult;
}
