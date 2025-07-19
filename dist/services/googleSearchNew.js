"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleApiRequestCount = getGoogleApiRequestCount;
exports.resetGoogleApiRequestCount = resetGoogleApiRequestCount;
exports.checkGoogleApiLimit = checkGoogleApiLimit;
exports.resetEngineStatus = resetEngineStatus;
exports.showEngineStatus = showEngineStatus;
exports.searchGoogleWithSalonName = searchGoogleWithSalonName;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const index_1 = require("../utils/index");
const index_2 = require("../constants/index");
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
};
// ======================= Google API リクエストカウンター ========================
/**
 * Google Custom Search API の使用回数を記録
 * 100回制限を管理するために使用
 */
let googleApiRequestCount = 0;
const GOOGLE_API_LIMIT = 100;
/**
 * Google API リクエストカウントを増加
 */
function incrementGoogleApiRequestCount() {
    googleApiRequestCount++;
    console.log(`  📊 Google API リクエスト: ${googleApiRequestCount}/${GOOGLE_API_LIMIT}`);
}
/**
 * 現在の Google API リクエスト数を取得
 * @returns 現在のリクエスト数
 */
function getGoogleApiRequestCount() {
    return googleApiRequestCount;
}
/**
 * Google API リクエストカウントをリセット
 */
function resetGoogleApiRequestCount() {
    googleApiRequestCount = 0;
    console.log('  🔄 Google API リクエストカウンターをリセットしました');
}
/**
 * Google API リクエスト制限をチェック
 * @param estimatedRequests 予想されるリクエスト数
 * @returns 制限を超えるかどうか
 */
function checkGoogleApiLimit(estimatedRequests = 1) {
    return (googleApiRequestCount + estimatedRequests) > GOOGLE_API_LIMIT;
}
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
    resetGoogleApiRequestCount();
    console.log('  🔄 検索エンジンの無効化状態をリセットしました');
}
/**
 * 現在の検索エンジン状態を表示
 */
function showEngineStatus() {
    // Google API リクエスト数を表示
    console.log(`  📊 Google API リクエスト数: ${googleApiRequestCount}/${GOOGLE_API_LIMIT}`);
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
    // ウェブサイト情報の抽出
    if (item.link && !item.link.includes('google.com') && !item.link.includes('hotpepper.jp')) {
        const url = item.link;
        const salonKeywords = ['美容室', 'ヘアサロン', 'salon', 'hair', 'beauty', 'cut', 'カット'];
        const hasRelevantKeyword = salonKeywords.some(keyword => combinedText.toLowerCase().includes(keyword.toLowerCase()));
        if (hasRelevantKeyword) {
            businessInfo.website = url;
        }
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
                email.length > 5 && email.includes('@') && email.includes('.'));
        });
        if (businessEmails.length > 0) {
            businessInfo.email = businessEmails[0]; // 最初の有効なビジネスメールを採用
            console.log(`      📧 Google Businessメール発見: ${businessInfo.email}`);
        }
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
        // Google API リクエストカウントを増加
        incrementGoogleApiRequestCount();
        // Google Custom Search API URLを構築
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5&lr=lang_ja&gl=jp`;
        const { data } = await axios_1.default.get(searchUrl, {
            timeout: 15000
        });
        const result = {};
        // 候補を格納する配列
        const instagramCandidates = [];
        const emailCandidates = [];
        let googleBusinessInfo;
        if (data.items && data.items.length > 0) {
            console.log(`    🔍 Google API 検索結果: ${data.items.length}件`);
            // === Google Custom Search APIレスポンス詳細デバッグ ===
            console.log(`    📋 === Google Custom Search API レスポンス詳細 ===`);
            console.log(`    📋 検索クエリ: "${query}"`);
            console.log(`    📋 検索結果総数: ${data.items.length}件`);
            if (index_2.FULL_PAGE_MAP) {
                data.items.forEach((item, index) => {
                    console.log(`    📋 [${index + 1}] ================================`);
                    console.log(`      🏷️  タイトル: "${item.title}"`);
                    console.log(`      🔗 リンク: "${item.link}"`);
                    console.log(`      📝 表示リンク: "${item.displayLink || 'なし'}"`);
                    console.log(`      📄 スニペット: "${item.snippet}"`);
                    // htmlSnippetも確認
                    if (item.htmlSnippet) {
                        console.log(`      📄 HTML スニペット: "${item.htmlSnippet}"`);
                    }
                    // pagemapの詳細確認
                    if (item.pagemap) {
                        console.log(`      📋 pagemap構造:`);
                        // metatags
                        if (item.pagemap.metatags && item.pagemap.metatags.length > 0) {
                            console.log(`        📊 metatags (${item.pagemap.metatags.length}件):`);
                            item.pagemap.metatags.forEach((meta, metaIndex) => {
                                console.log(`          [${metaIndex}] og:url: "${meta['og:url'] || 'なし'}"`);
                                console.log(`          [${metaIndex}] og:title: "${meta['og:title'] || 'なし'}"`);
                                console.log(`          [${metaIndex}] og:description: "${meta['og:description'] || 'なし'}"`);
                                console.log(`          [${metaIndex}] og:image: "${meta['og:image'] || 'なし'}"`);
                                console.log(`          [${metaIndex}] twitter:url: "${meta['twitter:url'] || 'なし'}"`);
                                console.log(`          [${metaIndex}] canonical: "${meta['canonical'] || 'なし'}"`);
                            });
                        }
                        else {
                            console.log(`        📊 metatags: なし`);
                        }
                        // person情報
                        if (item.pagemap.person && item.pagemap.person.length > 0) {
                            console.log(`        👤 person (${item.pagemap.person.length}件):`);
                            item.pagemap.person.forEach((person, personIndex) => {
                                console.log(`          [${personIndex}] url: "${person.url || 'なし'}"`);
                                console.log(`          [${personIndex}] name: "${person.name || 'なし'}"`);
                            });
                        }
                        // localbusiness情報
                        if (item.pagemap.localbusiness && item.pagemap.localbusiness.length > 0) {
                            console.log(`        🏢 localbusiness (${item.pagemap.localbusiness.length}件):`);
                            item.pagemap.localbusiness.forEach((business, businessIndex) => {
                                console.log(`          [${businessIndex}] name: "${business.name || 'なし'}"`);
                                console.log(`          [${businessIndex}] url: "${business.url || 'なし'}"`);
                                console.log(`          [${businessIndex}] telephone: "${business.telephone || 'なし'}"`);
                                console.log(`          [${businessIndex}] address: "${business.address || 'なし'}"`);
                            });
                        }
                        // その他のpagemap構造
                        const pagemapKeys = Object.keys(item.pagemap);
                        if (pagemapKeys.length > 0) {
                            console.log(`        🗝️  その他のpagemap keys: ${pagemapKeys.join(', ')}`);
                        }
                    }
                    else {
                        console.log(`      📋 pagemap: なし`);
                    }
                    // Instagram関連の文字列検索（強化デバッグ）
                    const allText = `${item.title} ${item.snippet} ${item.link} ${item.displayLink}`;
                    const hasInstagramKeyword = allText.toLowerCase().includes('instagram');
                    console.log(`      📱 Instagram関連キーワード含有: ${hasInstagramKeyword ? '✅ あり' : '❌ なし'}`);
                    if (hasInstagramKeyword) {
                        // Instagram関連の部分を抽出
                        const instagramMatches = allText.match(/[^.]*instagram[^.]*/gi);
                        if (instagramMatches) {
                            console.log(`        📱 Instagram関連部分:`);
                            instagramMatches.forEach((match, matchIndex) => {
                                console.log(`          [${matchIndex}] "${match.trim()}"`);
                            });
                        }
                        // URL形式の詳細チェック
                        console.log(`        🔍 URL形式詳細チェック:`);
                        const urlPatterns = [
                            /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
                            /›\s*instagram\.com\s*›\s*[a-zA-Z0-9_\.]+/gi,
                            /@[a-zA-Z0-9_\.]+/gi
                        ];
                        urlPatterns.forEach((pattern, patternIndex) => {
                            const matches = allText.match(pattern);
                            if (matches) {
                                console.log(`          パターン${patternIndex + 1} (${pattern.source}): ${matches.length}件`);
                                matches.forEach((match, matchIndex) => {
                                    console.log(`            [${matchIndex}] "${match}"`);
                                });
                            }
                        });
                    }
                    console.log(`    ---`);
                });
                console.log(`    📋 === レスポンス詳細終了 ===`);
            }
            // 各検索結果を調べて候補を収集
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                // Instagram URL抽出（複数のアプローチを試行）
                // アプローチ1: 新しいInstagram抽出機能を使用
                const instagramResult = (0, instagramExtractor_1.extractInstagramFromSearchItem)(item, salonName);
                if (instagramResult) {
                    // 重複チェック
                    const exists = instagramCandidates.find(candidate => candidate.url === instagramResult.url);
                    if (!exists) {
                        // 関連度に関係なく候補に追加（関連度0でも追加）
                        instagramCandidates.push(instagramResult);
                        console.log(`    📱 Instagram候補追加 (instagramExtractor): ${instagramResult.url} (関連度: ${(instagramResult.relevance * 100).toFixed(1)}%)`);
                    }
                }
                // アプローチ2: 直接的なパターンマッチング（フォールバック・強化版）
                const allText = `${title} ${snippet} ${link}`;
                const directPatterns = [
                    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|\?|$)/gi,
                    /instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|\?|$)/gi,
                    /›\s*instagram\.com\s*›\s*([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})/gi,
                    // 追加パターン：検索結果でよく見られる形式
                    /Instagram\s*[\(（]([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})[\)）]/gi,
                    /@([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})\b/g
                ];
                for (const pattern of directPatterns) {
                    const matches = [...allText.matchAll(pattern)];
                    for (const match of matches) {
                        let candidateUrl;
                        if (match[0].startsWith('http')) {
                            candidateUrl = match[0];
                        }
                        else if (match[1]) {
                            candidateUrl = `https://instagram.com/${match[1]}`;
                        }
                        else if (match[0].includes('instagram.com/')) {
                            candidateUrl = `https://${match[0]}`;
                        }
                        else {
                            continue;
                        }
                        // 基本的なクリーンアップ
                        candidateUrl = candidateUrl.replace(/[\?\/#].*$/, ''); // パラメータやフラグメント除去
                        // 重複チェック
                        const exists = instagramCandidates.find(candidate => candidate.url === candidateUrl);
                        if (!exists) {
                            // 関連度を計算（新しいURLの場合）
                            let relevance = 0.5; // デフォルト関連度
                            if (salonName) {
                                relevance = (0, instagramExtractor_1.calculateInstagramRelevance)(candidateUrl, salonName);
                            }
                            // 関連度に関係なく候補に追加（関連度0でも追加）
                            instagramCandidates.push({ url: candidateUrl, relevance: relevance });
                            console.log(`    📱 Instagram候補追加 (直接パターン): ${candidateUrl} (関連度: ${(relevance * 100).toFixed(1)}%) [パターン: ${pattern.source.substring(0, 30)}...]`);
                        }
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
                // Google Business情報を抽出（改善された特定条件）
                if (!googleBusinessInfo) {
                    // より包括的なGoogle Business情報の特定条件
                    const isBusinessInfo = 
                    // 1. Google Maps関連
                    link.includes('google.com/maps') ||
                        link.includes('maps.google.com') ||
                        link.includes('goo.gl/maps') ||
                        link.includes('maps.app.goo.gl') ||
                        // 2. Googleサービス関連
                        title.toLowerCase().includes('google') ||
                        title.toLowerCase().includes('maps') ||
                        // 3. ビジネス情報キーワード（営業時間）
                        snippet.includes('営業時間') ||
                        snippet.includes('営業中') ||
                        snippet.includes('営業時間外') ||
                        snippet.includes('定休日') ||
                        snippet.includes('休業日') ||
                        // 4. ビジネス情報キーワード（評価・レビュー）
                        snippet.includes('評価') ||
                        snippet.includes('レビュー') ||
                        snippet.includes('口コミ') ||
                        snippet.includes('★') ||
                        snippet.includes('☆') ||
                        snippet.match(/\d+\.\d+\s*星/) ||
                        snippet.match(/\d+\.\d+\/5/) ||
                        // 5. 連絡先情報
                        snippet.includes('電話') ||
                        snippet.includes('TEL') ||
                        snippet.includes('tel:') ||
                        snippet.includes('住所') ||
                        snippet.includes('〒') ||
                        // 6. 時間パターン
                        snippet.match(/\d{1,2}:\d{2}/) ||
                        snippet.match(/\d{1,2}時\d{2}分/) ||
                        // 7. 美容室特有の情報
                        (snippet.toLowerCase().includes('salon') ||
                            snippet.includes('美容室') ||
                            snippet.includes('ヘアサロン')) &&
                            (snippet.includes('カット') ||
                                snippet.includes('パーマ') ||
                                snippet.includes('カラー') ||
                                snippet.includes('シャンプー') ||
                                snippet.includes('スタイリング') ||
                                snippet.includes('料金') ||
                                snippet.includes('価格'));
                    // より積極的なGoogle Business情報抽出
                    if (isBusinessInfo) {
                        const businessInfo = extractGoogleBusinessInfo(item);
                        if (Object.keys(businessInfo).length > 0) {
                            googleBusinessInfo = businessInfo;
                            console.log(`    🏢 Google Business情報発見 (${link.includes('google.com') ? 'Google Maps' : 'ビジネス情報サイト'}):`);
                        }
                    }
                    else {
                        // すべての検索結果からビジネス情報を抽出試行（フォールバック）
                        const businessInfo = extractGoogleBusinessInfo(item);
                        if (businessInfo.rating || businessInfo.businessHours || businessInfo.phoneNumber) {
                            googleBusinessInfo = businessInfo;
                            console.log(`    🏢 フォールバック: ビジネス情報を部分的に発見`);
                        }
                    }
                }
            }
            // Instagram候補を関連度で並び替え
            instagramCandidates.sort((a, b) => b.relevance - a.relevance);
            // 結果を格納
            const instagramUrls = instagramCandidates.map(candidate => candidate.url);
            // Instagram候補を最大2つまでに制限
            result.instagramCandidates = instagramUrls.slice(0, 2);
            result.emailCandidates = emailCandidates;
            // Google Business情報を追加
            if (googleBusinessInfo) {
                result.googleBusinessInfo = googleBusinessInfo;
                // Google Business情報から不足している情報を補完（高信頼度）
                if (!result.homepageUrl && googleBusinessInfo.website) {
                    result.homepageUrl = googleBusinessInfo.website;
                    console.log(`    🏠 Google Businessからウェブサイトを補完: ${result.homepageUrl}`);
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
            // 最も関連度の高いものを設定
            if (instagramCandidates.length > 0) {
                result.instagramUrl = instagramCandidates[0].url;
                console.log(`    ✅ 最高関連度Instagram URL: ${result.instagramUrl} (${(instagramCandidates[0].relevance * 100).toFixed(1)}%)`);
            }
            if (emailCandidates.length > 0 && !result.email) {
                result.email = emailCandidates[0];
            }
            console.log(`    ✅ Instagram候補=${instagramUrls.length}件 (最大2件に制限), Email候補=${emailCandidates.length}件`);
        }
        else {
            console.log(`    ❌ Google API検索結果が見つかりませんでした`);
        }
        console.log(`  🔍 Google API検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (候補${(result.instagramCandidates || []).length}件), Email=${result.email ? '✓' : '✗'} (候補${(result.emailCandidates || []).length}件), GoogleBusiness=${result.googleBusinessInfo ? '✓' : '✗'}`);
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
 * Bing検索を実行してInstagram URLとメールアドレスを抽出
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchBing(query) {
    if (!index_2.BRING_SEARCH || !isEngineEnabled('bing')) {
        console.log('  🚫 Bing検索はスキップされました（設定により無効化）');
        return {};
    }
    try {
        console.log(`  🔍 Bing検索を実行中: "${query}"`);
        // ページ間の遅延
        await (0, index_1.sleep)(1500 + Math.random() * 1000); // 1.5-2.5秒のランダムな遅延
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&mkt=ja-JP&setlang=ja`;
        const { data } = await axios_1.default.get(searchUrl, {
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
        const result = {};
        // Instagram URLを検索
        const instagramLinks = $('a[href*="instagram.com"]');
        console.log(`    🔍 Bing Instagram候補リンク数: ${instagramLinks.length}`);
        let instagramUrl;
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            const href = $(el).attr('href');
            if (href && !instagramUrl && href.includes('instagram.com')) {
                instagramUrl = href;
                return false; // 最初に見つかったものを使用
            }
        });
        if (instagramUrl) {
            result.instagramUrl = instagramUrl;
            result.instagramCandidates = [instagramUrl];
        }
        // メールアドレスを検索
        const searchResults = $('body').text();
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = searchResults.match(emailPattern);
        if (emailMatches && emailMatches.length > 0) {
            console.log(`    📧 Bing 発見メール候補: ${emailMatches.length}件`);
            const filteredEmails = emailMatches.filter(email => {
                const lowerEmail = email.toLowerCase();
                return (!lowerEmail.includes('@gmail.com') &&
                    !lowerEmail.includes('@yahoo.co.jp') &&
                    !lowerEmail.includes('@yahoo.com') &&
                    !lowerEmail.includes('@hotmail.com') &&
                    !lowerEmail.includes('@outlook.com') &&
                    !lowerEmail.includes('@bing.com') &&
                    !lowerEmail.includes('@microsoft.com') &&
                    !lowerEmail.includes('@google.com') &&
                    !lowerEmail.includes('noreply') &&
                    !lowerEmail.includes('no-reply') &&
                    email.length > 5 && email.includes('@') && email.includes('.'));
            });
            if (filteredEmails.length > 0) {
                result.email = filteredEmails[0];
                result.emailCandidates = filteredEmails;
                console.log(`    ✅ 採用メール: ${result.email}`);
            }
        }
        console.log(`  🔍 Bing検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'}, Email=${result.email ? '✓' : '✗'}`);
        return result;
    }
    catch (error) {
        console.error(`  ❌ Bing検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            disableEngine('bing');
        }
        return {};
    }
}
/**
 * Yahoo検索を実行してInstagram URLとメールアドレスを抽出
 * @param query 検索クエリ
 * @returns 抽出された情報
 */
async function searchYahoo(query) {
    if (!index_2.YAHOO_SEARCH || !isEngineEnabled('yahoo')) {
        console.log('  🚫 Yahoo検索はスキップされました（設定により無効化）');
        return {};
    }
    try {
        console.log(`  🎯 Yahoo検索を実行中: "${query}"`);
        // ページ間の遅延（Yahooは制限が厳しいため長めに）
        await (0, index_1.sleep)(500 + Math.random() * 1000); // 0.5-1.5秒のランダムな遅延
        const searchUrl = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}&fr=top_ga1_sa&ei=UTF-8`;
        const { data } = await axios_1.default.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.yahoo.co.jp/',
            },
            timeout: 15000
        });
        const $ = cheerio.load(data);
        const result = {};
        // Instagram URLを検索
        const instagramLinks = $('a[href*="instagram.com"]');
        console.log(`    🎯 Yahoo Instagram候補リンク数: ${instagramLinks.length}`);
        let instagramUrl;
        instagramLinks.each((idx, el) => {
            if (idx < 3) { // 最初の3件を表示
                const hrefDbg = $(el).attr('href');
                console.log(`      [${idx}] ${hrefDbg}`);
            }
            const href = $(el).attr('href');
            if (href && !instagramUrl) {
                if (href.includes('/RU=https%3A//instagram.com/...')) {
                    // Yahooリダイレクト形式: /RU=https%3A//instagram.com/...
                    const match = href.match(/\/RU=([^\/]+)/);
                    if (match) {
                        const decodedUrl = decodeURIComponent(match[1]);
                        if (decodedUrl.includes('instagram.com')) {
                            instagramUrl = decodedUrl;
                            return false;
                        }
                    }
                }
                else if (href.includes('instagram.com')) {
                    instagramUrl = href;
                    return false;
                }
            }
        });
        if (instagramUrl) {
            result.instagramUrl = instagramUrl;
            result.instagramCandidates = [instagramUrl];
        }
        // メールアドレスを検索
        const searchResults = $('body').text();
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emailMatches = searchResults.match(emailPattern);
        if (emailMatches && emailMatches.length > 0) {
            console.log(`    📧 Yahoo 発見メール候補: ${emailMatches.length}件`);
            const filteredEmails = emailMatches.filter(email => {
                const lowerEmail = email.toLowerCase();
                return (!lowerEmail.includes('@gmail.com') &&
                    !lowerEmail.includes('@yahoo.co.jp') &&
                    !lowerEmail.includes('@yahoo.com') &&
                    !lowerEmail.includes('@hotmail.com') &&
                    !lowerEmail.includes('@outlook.com') &&
                    !lowerEmail.includes('@google.com') &&
                    !lowerEmail.includes('noreply') &&
                    !lowerEmail.includes('no-reply') &&
                    email.length > 5 && email.includes('@') && email.includes('.'));
            });
            if (filteredEmails.length > 0) {
                result.email = filteredEmails[0];
                result.emailCandidates = filteredEmails;
                console.log(`    ✅ 採用メール: ${result.email}`);
            }
        }
        console.log(`  🎯 Yahoo検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'}, Email=${result.email ? '✓' : '✗'}`);
        return result;
    }
    catch (error) {
        console.error(`  ❌ Yahoo検索でエラーが発生: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // 429エラー（レート制限）の場合は検索エンジンを無効化
        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
            disableEngine('yahoo');
        }
        return {};
    }
}
/**
 * 複数の検索結果をマージして最適な結果を作成
 * @param results 検索結果の配列
 * @returns マージされた最適な結果
 */
function mergeMultipleSearchResults(results) {
    const merged = {};
    // 各フィールドについて、最初に見つかった値を使用
    for (const result of results) {
        if (!merged.instagramUrl && result.instagramUrl) {
            merged.instagramUrl = result.instagramUrl;
        }
        if (!merged.email && result.email) {
            merged.email = result.email;
        }
        if (!merged.homepageUrl && result.homepageUrl) {
            merged.homepageUrl = result.homepageUrl;
        }
        if (!merged.googleBusinessInfo && result.googleBusinessInfo) {
            merged.googleBusinessInfo = result.googleBusinessInfo;
        }
    }
    // 候補配列をマージ（重複排除）
    const allInstagramCandidates = [];
    const allEmailCandidates = [];
    for (const result of results) {
        if (result.instagramCandidates)
            allInstagramCandidates.push(...result.instagramCandidates);
        if (result.emailCandidates)
            allEmailCandidates.push(...result.emailCandidates);
    }
    // 重複排除
    merged.instagramCandidates = [...new Set(allInstagramCandidates)];
    merged.emailCandidates = [...new Set(allEmailCandidates)];
    return merged;
}
/**
 * 3段階マルチエンジン検索を実行してInstagram URLとビジネス情報を抽出（最適化済み）
 * @param query 元の検索クエリ（後方互換性のため保持）
 * @param salonName サロン名（関連度フィルタリング用）
 * @param address 住所（ビジネス情報検索用）
 * @returns 抽出された統合情報
 */
async function searchGoogleWithSalonName(query, salonName, address) {
    console.log('💻 マルチエンジン検索を開始...');
    // 検索エンジンの状態を表示
    showEngineStatus();
    if (!salonName) {
        console.log('  ⚠️  サロン名が指定されていません。従来の単一検索を実行...');
        // Google APIが利用可能な場合のみ実行
        if (isGoogleApiAvailable() && isEngineEnabled('google')) {
            return await searchGoogleApi(query);
        }
        return {};
    }
    // 【最適化】地域情報を含むInstagram検索クエリを生成
    let instagramQuery;
    if (address) {
        instagramQuery = (0, index_1.generateLocationBasedSearchQuery)(salonName, address);
    }
    else {
        // 住所がない場合は従来の短縮クエリ
        instagramQuery = `${salonName} Instagram`;
    }
    console.log(`  🔍 Instagram検索クエリ: "${instagramQuery}"`);
    const searchResults = [];
    // === 🔄 並列検索ロジック開始 ===
    // Yahoo / Bing / Google の順で優先実行し、完了したものから結果を取り込む
    const parallelPromises = [];
    const engineLabels = [];
    // Yahoo スクレイピング（最優先）
    if (index_2.YAHOO_SEARCH && isEngineEnabled('yahoo')) {
        console.log('  🎯 Yahoo検索実行中（並列・最優先）...');
        parallelPromises.push(searchYahoo(instagramQuery));
        engineLabels.push('Yahoo');
    }
    // Bing スクレイピング
    if (index_2.BRING_SEARCH && isEngineEnabled('bing')) {
        console.log('  🔍 Bing検索実行中（並列）...');
        parallelPromises.push(searchBing(instagramQuery));
        engineLabels.push('Bing');
    }
    // Google Custom Search API（最後の選択肢）
    if (isEngineEnabled('google') && isGoogleApiAvailable()) {
        console.log('  📡 Google Search API (Instagram & Business情報検索) 実行中（並列・最後の選択肢）...');
        // Instagramとビジネス情報の両方をカバーするクエリを生成
        const combinedQuery = `${salonName} ${address || ''} Instagram`;
        parallelPromises.push(searchGoogleApi(combinedQuery, salonName));
        engineLabels.push('Google');
    }
    // 並列実行結果を取得（すべて完了を待つ）
    const settledResults = await Promise.allSettled(parallelPromises);
    // 成功したものだけを抽出し、デバッグ出力
    settledResults.forEach((res, idx) => {
        const label = engineLabels[idx];
        if (res.status === 'fulfilled') {
            const value = res.value;
            if (Object.keys(value).length > 0) {
                searchResults.push(value);
                console.log(`    ✅ ${label}: Instagram=${value.instagramUrl ? '✓' : '✗'}, Email=${value.email ? '✓' : '✗'}`);
            }
            else {
                console.log(`    ✗ ${label}: 結果なし`);
            }
        }
        else {
            console.error(`    ❌ ${label}検索失敗: ${res.reason}`);
            // Google Search API が失敗した場合は処理を終了
            if (label === 'Google') {
                throw new Error('Google Search API でエラーが発生したため処理を終了します');
            }
        }
    });
    // === 🔄 並列検索ロジック終了 ===
    // 検索結果がない場合の処理
    if (searchResults.length === 0) {
        console.log('  😞 すべての検索エンジンで結果が得られませんでした');
        return {};
    }
    // 複数の検索結果をマージ
    console.log(`  🔧 === マージ前デバッグ情報 ===`);
    console.log(`    入力検索結果数: ${searchResults.length}件`);
    searchResults.forEach((result, index) => {
        console.log(`    [${index}] Instagram URL: ${result.instagramUrl || 'なし'}`);
        console.log(`    [${index}] Instagram候補: ${(result.instagramCandidates || []).length}件`);
        if (result.instagramCandidates && result.instagramCandidates.length > 0) {
            result.instagramCandidates.forEach((candidate, candidateIndex) => {
                console.log(`      候補${candidateIndex + 1}: ${candidate}`);
            });
        }
    });
    const mergedResult = mergeMultipleSearchResults(searchResults);
    // Instagram候補から最適なURLを選択
    if (mergedResult.instagramCandidates && mergedResult.instagramCandidates.length > 0) {
        const best = (0, instagramExtractor_1.selectBestInstagramUrl)(mergedResult.instagramCandidates, salonName);
        if (best) {
            mergedResult.instagramUrl = best;
        }
    }
    console.log(`  🔧 === マージ後デバッグ情報 ===`);
    console.log(`    マージ後 Instagram URL: ${mergedResult.instagramUrl || 'なし'}`);
    console.log(`    マージ後 Instagram候補: ${(mergedResult.instagramCandidates || []).length}件`);
    if (mergedResult.instagramCandidates && mergedResult.instagramCandidates.length > 0) {
        mergedResult.instagramCandidates.forEach((candidate, candidateIndex) => {
            console.log(`      マージ候補${candidateIndex + 1}: ${candidate}`);
        });
    }
    console.log(`  🔧 === マージデバッグ情報終了 ===`);
    // 最終結果をログ出力
    const summaryItems = [];
    if (mergedResult.instagramUrl)
        summaryItems.push('Instagram');
    if (mergedResult.email)
        summaryItems.push('メール');
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
    console.log(`  🎯 マルチエンジン検索完了！取得成功: ${summaryItems.length > 0 ? summaryItems.join(', ') : 'なし'}`);
    console.log(`  📊 使用検索エンジン数: ${searchResults.length}個`);
    return mergedResult;
}
