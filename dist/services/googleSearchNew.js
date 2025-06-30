"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetEngineStatus = resetEngineStatus;
exports.showEngineStatus = showEngineStatus;
exports.searchGoogleWithSalonName = searchGoogleWithSalonName;
exports.generateSearchQuery = generateSearchQuery;
const axios_1 = __importDefault(require("axios"));
const index_1 = require("../utils/index");
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
    Object.entries(disabledEngines).forEach(([engine, disabled]) => {
        const status = disabled ? '❌ 無効' : '✅ 有効';
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
        console.log(`  🔍 Google Search API検索を実行中...`);
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
        if (data.items && data.items.length > 0) {
            console.log(`    🔍 Google API 検索結果: ${data.items.length}件`);
            // 各検索結果を調べて候補を収集
            for (const item of data.items) {
                const link = item.link || '';
                const snippet = item.snippet || '';
                const title = item.title || '';
                // Instagram URLを検索
                if (link.includes('instagram.com')) {
                    instagramCandidates.push(link);
                    console.log(`    📱 Instagram URL候補: ${link}`);
                }
                else {
                    // スニペットやタイトルからInstagram URLを検索
                    const instagramPatterns = [
                        /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/g,
                        /@([a-zA-Z0-9_\.]+)/g // @アカウント名パターン
                    ];
                    for (const pattern of instagramPatterns) {
                        const text = `${title} ${snippet}`;
                        const matches = text.match(pattern);
                        if (matches && matches.length > 0) {
                            for (const match of matches) {
                                let url = match;
                                if (url.startsWith('@')) {
                                    url = `https://instagram.com/${url.substring(1)}`;
                                }
                                if (!url.startsWith('http')) {
                                    url = 'https://' + url;
                                }
                                if (!instagramCandidates.includes(url)) {
                                    instagramCandidates.push(url);
                                    console.log(`    📱 Instagram URL候補 (抽出): ${url}`);
                                }
                            }
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
            // 関連度フィルタリングを実行（サロン名が提供されている場合）
            if (salonName) {
                console.log(`    🎯 サロン名「${salonName}」との関連度でフィルタリング中...`);
                // Instagram URL候補をフィルタリング
                const relevantInstagramUrls = instagramCandidates.filter(url => {
                    const score = (0, index_1.calculateRelevanceScore)(salonName, url);
                    console.log(`      📱 ${url} → 関連度: ${score.toFixed(2)}`);
                    return score >= 0.3; // 30%以上の関連度で採用
                });
                // 電話番号候補をフィルタリング（関連度チェックを緩和）
                const relevantPhoneNumbers = phoneNumberCandidates.filter(phone => {
                    // 電話番号は数字のみなので関連度を下げて採用
                    return true; // とりあえず全て採用（電話番号は重複が少ないため）
                });
                // メールアドレス候補をフィルタリング
                const relevantEmails = emailCandidates.filter(email => {
                    const score = (0, index_1.calculateRelevanceScore)(salonName, email);
                    console.log(`      📧 ${email} → 関連度: ${score.toFixed(2)}`);
                    return score >= 0.2; // 20%以上の関連度で採用（メールは判定が難しいため低めに）
                });
                // ホームページURL候補をフィルタリング
                const relevantHomepageUrls = homepageCandidates.filter(url => {
                    const score = (0, index_1.calculateRelevanceScore)(salonName, url);
                    console.log(`      🏠 ${url} → 関連度: ${score.toFixed(2)}`);
                    return score >= 0.2; // 20%以上の関連度で採用
                });
                // フィルタリング結果を格納
                result.instagramCandidates = relevantInstagramUrls;
                result.emailCandidates = relevantEmails;
                result.phoneNumberCandidates = relevantPhoneNumbers;
                result.homepageCandidates = relevantHomepageUrls;
                // 最も関連度の高いものを最初に設定
                if (relevantInstagramUrls.length > 0) {
                    result.instagramUrl = relevantInstagramUrls[0];
                }
                if (relevantEmails.length > 0) {
                    result.email = relevantEmails[0];
                }
                if (relevantPhoneNumbers.length > 0) {
                    result.phoneNumber = relevantPhoneNumbers[0];
                }
                if (relevantHomepageUrls.length > 0) {
                    result.homepageUrl = relevantHomepageUrls[0];
                }
                console.log(`    ✅ フィルタリング後: Instagram候補=${relevantInstagramUrls.length}件, Email候補=${relevantEmails.length}件, Phone候補=${relevantPhoneNumbers.length}件, Homepage候補=${relevantHomepageUrls.length}件`);
            }
            else {
                // サロン名が提供されていない場合は従来通り
                result.instagramCandidates = instagramCandidates;
                result.emailCandidates = emailCandidates;
                result.phoneNumberCandidates = phoneNumberCandidates;
                result.homepageCandidates = homepageCandidates;
                if (instagramCandidates.length > 0)
                    result.instagramUrl = instagramCandidates[0];
                if (emailCandidates.length > 0)
                    result.email = emailCandidates[0];
                if (phoneNumberCandidates.length > 0)
                    result.phoneNumber = phoneNumberCandidates[0];
                if (homepageCandidates.length > 0)
                    result.homepageUrl = homepageCandidates[0];
            }
        }
        else {
            console.log(`    ❌ Google API検索結果が見つかりませんでした`);
        }
        console.log(`  🔍 Google API検索結果: Instagram=${result.instagramUrl ? '✓' : '✗'} (候補${(result.instagramCandidates || []).length}件), Email=${result.email ? '✓' : '✗'} (候補${(result.emailCandidates || []).length}件), Phone=${result.phoneNumber ? '✓' : '✗'} (候補${(result.phoneNumberCandidates || []).length}件)`);
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
 * 検索を実行してInstagram URLとメールアドレスを抽出（サロン名付き）
 * @param query 検索クエリ
 * @param salonName サロン名（関連度フィルタリング用）
 * @returns 抽出された情報
 */
async function searchGoogleWithSalonName(query, salonName) {
    console.log('  🔄 関連度フィルタリング付き検索を開始...');
    // 検索エンジンの状態を表示
    showEngineStatus();
    let mergedResult = {};
    // 1. 最優先: Google Search API（有効な場合のみ）
    if (isEngineEnabled('google') && isGoogleApiAvailable()) {
        console.log('  ➡️ Google Search API検索を実行...');
        const googleResult = await searchGoogleApi(query, salonName);
        mergedResult = { ...googleResult };
        // Instagram URLが見つかった場合は早期終了
        if (mergedResult.instagramUrl) {
            console.log('  ✅ Google APIで Instagram URL発見！他の検索エンジンをスキップ');
            return mergedResult;
        }
    }
    else if (!isGoogleApiAvailable()) {
        console.log('  ⚠️  Google Search APIは設定されていません（GOOGLE_API_KEY, GOOGLE_SEARCH_ENGINE_IDが必要）');
    }
    else {
        console.log('  ⚠️  Google Search APIは無効化されているためスキップ');
    }
    return mergedResult;
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
