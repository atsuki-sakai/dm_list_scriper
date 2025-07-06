"use strict";
/**
 * Instagram URL抽出専用サービス
 * 検索結果からより確実にInstagram URLを抽出する
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanInstagramUrl = cleanInstagramUrl;
exports.generateInstagramSearchQueries = generateInstagramSearchQueries;
exports.calculateInstagramRelevance = calculateInstagramRelevance;
exports.extractInstagramFromSearchItem = extractInstagramFromSearchItem;
exports.selectBestInstagramUrl = selectBestInstagramUrl;
// ======================= Instagram URL抽出 ========================
/**
 * Instagram URLをクリーンアップして正規化する（シンプル版）
 * @param url 生のURL
 * @returns クリーンアップされたInstagram URL または null
 */
function cleanInstagramUrl(url) {
    if (!url || !url.includes('instagram.com')) {
        return null;
    }
    // URL正規化
    let cleanUrl = url.trim();
    // HTTPSに統一
    if (cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
    }
    else if (!cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
    }
    // ユーザー名を抽出
    const match = cleanUrl.match(/instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|$|\?)/);
    if (!match || !match[1]) {
        return null;
    }
    const username = match[1];
    // 無効なユーザー名をフィルタリング
    const invalidUsernames = ['p', 'stories', 'reels', 'tv', 'explore', 'direct', 'accounts', 'developer'];
    if (invalidUsernames.includes(username) ||
        username.length < 1 || username.length > 30 ||
        username.startsWith('.') || username.endsWith('.') || username.includes('..') ||
        /^[._]+$/.test(username) ||
        /\.(com|net|org|jp)$/i.test(username)) {
        return null;
    }
    return `https://instagram.com/${username}`;
}
/**
 * サロン名からInstagram検索用のクエリを生成
 * @param salonName サロン名
 * @returns 検索クエリの配列（1つのみ）
 */
function generateInstagramSearchQueries(salonName) {
    // ヘアサロンを先頭に付けたクエリを生成（ベースクエリと統一）
    return [`ヘアサロン ${salonName} instagram`];
}
/**
 * 日本語をローマ字に変換（簡易版）
 * @param japanese 日本語文字列
 * @returns ローマ字変換された文字列
 */
function toRomaji(japanese) {
    // 基本的なひらがな→ローマ字変換マップ
    const hiraganaToRomaji = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n'
    };
    // カタカナ→ひらがな変換
    let result = japanese.replace(/[\u30A1-\u30F6]/g, (match) => {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
    // ひらがな→ローマ字変換
    result = result.replace(/[あ-ん]/g, (match) => {
        return hiraganaToRomaji[match] || match;
    });
    return result.toLowerCase();
}
/**
 * 文字列の類似度を計算（Levenshtein距離ベース）
 * @param str1 文字列1
 * @param str2 文字列2
 * @returns 類似度（0.0-1.0）
 */
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2)
        return 1.0;
    if (s1.length === 0 || s2.length === 0)
        return 0.0;
    // 部分マッチもチェック
    if (s1.includes(s2) || s2.includes(s1)) {
        return Math.max(s2.length / s1.length, s1.length / s2.length) * 0.8;
    }
    // Levenshtein距離を計算
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    for (let i = 0; i <= s1.length; i++)
        matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++)
        matrix[j][0] = j;
    for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
        }
    }
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (distance / maxLength);
}
/**
 * Instagram URLの高精度関連性チェック（改良版）
 * @param instagramUrl Instagram URL
 * @param salonName サロン名
 * @returns 関連性スコア（0.0 = 無関係で除外、1.0 = 完全一致）
 */
function calculateInstagramRelevance(instagramUrl, salonName) {
    if (!instagramUrl || !salonName)
        return 0.5; // デフォルト中立
    // Instagram URLからユーザー名を抽出
    const usernameMatch = instagramUrl.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
    if (!usernameMatch || !usernameMatch[1])
        return 0.1;
    const username = usernameMatch[1].toLowerCase();
    const salonLower = salonName.toLowerCase();
    console.log(`        🔍 関連度計算開始: "${salonName}" → "@${username}"`);
    // 1. 明らかに無関係な業種キーワードをチェック（即座に除外）
    const unrelatedKeywords = [
        // 飲食関係
        'restaurant', 'yakiniku', 'meat', 'beef', 'pork', 'takedaya', 'takeda',
        'ramen', 'sushi', 'izakaya', 'bar', 'cafe', 'coffee', 'kitchen', 'food',
        // 宿泊・小売
        'hotel', 'ryokan', 'shop', 'store', 'market', 'mall',
        // 音楽・エンターテイメント
        'music', 'band', 'orchestra', 'marronnier', 'symphony', 'concert',
        // 大学・教育機関
        'university', 'college', 'school', 'daion', 'ocm_t',
        // その他
        'photographer', 'photo', 'model', 'fitness', 'gym'
    ];
    for (const keyword of unrelatedKeywords) {
        if (username.includes(keyword)) {
            console.log(`        ❌ 無関係業種キーワード検出: ${username} contains ${keyword} - 完全除外`);
            return 0.0; // 完全除外
        }
    }
    let score = 0.0;
    let matchDetails = [];
    // 2. ヘアサロン関連キーワードチェック（高得点）
    const salonKeywords = ['hair', 'salon', 'beauty', 'cut', 'style', 'color', 'perm', 'treatment'];
    for (const keyword of salonKeywords) {
        if (username.includes(keyword)) {
            score += 0.4;
            matchDetails.push(`サロンキーワード:${keyword}`);
            console.log(`        ✅ サロンキーワード検出: ${keyword} (+0.4)`);
        }
    }
    // 3. 直接的な店舗名マッチング
    const salonWords = salonLower
        .replace(/[^\w\s]/g, '') // 記号を除去
        .replace(/\s*(美容室|ヘアサロン|サロン|hair|salon)\s*/g, '') // 一般的な業種名を除去
        .split(/\s+/)
        .filter(word => word.length > 1);
    for (const word of salonWords) {
        if (username.includes(word)) {
            const similarity = calculateSimilarity(word, username);
            const wordScore = similarity * 0.5;
            score += wordScore;
            matchDetails.push(`店舗名マッチ:${word}(${(similarity * 100).toFixed(1)}%)`);
            console.log(`        ✅ 店舗名マッチ: "${word}" in "${username}" (+${wordScore.toFixed(2)})`);
        }
    }
    // 4. ローマ字変換による日本語名マッチング
    const romajiSalonName = toRomaji(salonName)
        .replace(/[^\w]/g, '') // 記号除去
        .replace(/(hair|salon|beauty)/g, ''); // 一般的な業種名を除去
    if (romajiSalonName.length > 2) {
        const similarity = calculateSimilarity(romajiSalonName, username);
        if (similarity > 0.3) {
            const romajiScore = similarity * 0.6;
            score += romajiScore;
            matchDetails.push(`ローマ字マッチ:${romajiSalonName}(${(similarity * 100).toFixed(1)}%)`);
            console.log(`        ✅ ローマ字マッチ: "${romajiSalonName}" vs "${username}" = ${(similarity * 100).toFixed(1)}% (+${romajiScore.toFixed(2)})`);
        }
    }
    // 5. 英語表記との比較（括弧内の英語名等）
    const englishMatch = salonName.match(/\(([A-Za-z\s&]+)\)/);
    if (englishMatch && englishMatch[1]) {
        const englishName = englishMatch[1].trim().toLowerCase()
            .replace(/\s+/g, '') // スペース除去
            .replace(/&/g, 'and'); // &をandに変換
        const similarity = calculateSimilarity(englishName, username);
        if (similarity > 0.3) {
            const englishScore = similarity * 0.7;
            score += englishScore;
            matchDetails.push(`英語名マッチ:${englishName}(${(similarity * 100).toFixed(1)}%)`);
            console.log(`        ✅ 英語名マッチ: "${englishName}" vs "${username}" = ${(similarity * 100).toFixed(1)}% (+${englishScore.toFixed(2)})`);
        }
    }
    // 6. 略称・頭文字マッチング
    const initials = salonWords
        .map(word => word.charAt(0))
        .join('')
        .toLowerCase();
    if (initials.length >= 2 && username.includes(initials)) {
        score += 0.3;
        matchDetails.push(`頭文字マッチ:${initials}`);
        console.log(`        ✅ 頭文字マッチ: "${initials}" in "${username}" (+0.3)`);
    }
    // 最終スコアを0-1の範囲に正規化
    const finalScore = Math.min(score, 1.0);
    console.log(`        📊 最終関連度: ${(finalScore * 100).toFixed(1)}% [${matchDetails.join(', ')}]`);
    return finalScore;
}
/**
 * Google検索結果からInstagram URLを抽出する（シンプル版）
 * @param searchItem Google検索結果のアイテム
 * @param salonName サロン名（関連度計算用）
 * @returns 抽出されたInstagram URLと関連度スコア
 */
function extractInstagramFromSearchItem(searchItem, salonName) {
    const title = searchItem.title || '';
    const link = searchItem.link || '';
    const snippet = searchItem.snippet || '';
    let extractedUrl = null;
    // 1. 直接リンクをチェック（最も確実）
    if (link.includes('instagram.com')) {
        console.log(`        ✅ 直接リンク発見: ${link}`);
        // Instagram の場所ページやExploreページの場合は特別処理
        if (link.includes('/explore/locations/') || link.includes('/locations/')) {
            console.log(`        🏪 Instagram場所ページ検出: ${link}`);
            // スニペットからアカウント名を抽出（複数のパターンを試行）
            const accountPatterns = [
                // パターン1: "detour_hair." のような形式（ピリオドで終わる）
                /\b([a-zA-Z0-9_][a-zA-Z0-9_.]{2,29})\.\s/,
                // パターン2: アカウント名らしき文字列（アンダースコア含む）
                /\b([a-zA-Z0-9_]{3,30})\b/g
            ];
            let accountName = null;
            // 最初にピリオドで終わるパターンを優先的に試行
            const dotPattern = snippet.match(accountPatterns[0]);
            if (dotPattern && dotPattern[1]) {
                accountName = dotPattern[1];
                console.log(`        🎯 ピリオドパターンでアカウント発見: ${accountName}`);
            }
            else {
                // 次にアンダースコア含むパターンを試行
                const allMatches = [...snippet.matchAll(accountPatterns[1])];
                for (const match of allMatches) {
                    const candidate = match[1];
                    // アンダースコアを含む、かつ適切な長さのものを選択
                    if (candidate.includes('_') && candidate.length >= 3 && candidate.length <= 30) {
                        accountName = candidate;
                        console.log(`        🎯 アンダースコアパターンでアカウント発見: ${accountName}`);
                        break;
                    }
                }
            }
            if (accountName) {
                extractedUrl = `https://instagram.com/${accountName}`;
                console.log(`        ✅ 場所ページからアカウント推定: ${extractedUrl}`);
            }
            else {
                console.log(`        ❌ 場所ページからアカウント名を抽出できませんでした`);
            }
        }
        else {
            const cleanUrl = cleanInstagramUrl(link);
            if (cleanUrl) {
                extractedUrl = cleanUrl;
                console.log(`        ✅ Instagram URL確定: ${cleanUrl}`);
            }
        }
    }
    // 2. OG URLをチェック
    if (!extractedUrl && searchItem.pagemap?.metatags?.[0]?.['og:url']) {
        const ogUrl = searchItem.pagemap.metatags[0]['og:url'];
        if (ogUrl.includes('instagram.com')) {
            console.log(`        ✅ OG URL発見: ${ogUrl}`);
            const cleanUrl = cleanInstagramUrl(ogUrl);
            if (cleanUrl) {
                extractedUrl = cleanUrl;
                console.log(`        ✅ Instagram URL確定: ${cleanUrl}`);
            }
        }
    }
    // 3. 拡張されたテキスト検索（複数のパターンに対応）
    if (!extractedUrl) {
        const fullText = `${title} ${snippet}`;
        // Instagram URLの様々なパターンを定義
        const patterns = [
            // 完全なURL形式
            /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|\?|$)/gi,
            // www付きのドメインのみ
            /www\.instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|\?|$)/gi,
            // ドメインのみ
            /instagram\.com\/([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})(?:\/|\?|$)/gi,
            // › instagram.com › username 形式（Google検索結果で一般的）
            /›\s*instagram\.com\s*›\s*([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})/gi,
            // Instagram(username) または Instagram（username）形式
            /(?:Instagram|instagram|インスタ|インスタグラム)\s*[\(（]([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})[\)）]/gi,
            // 「インスタ」や「Instagram」と一緒に記載されているアカウント名
            /(?:インスタ|Instagram|instagram|INSTAGRAM|インスタグラム)[\s:：\-]*[@]?([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})\b/gi,
            // @ユーザー名パターン
            /@([a-zA-Z0-9_][a-zA-Z0-9_.]{0,29})\b/g,
            // スニペット内のアカウント名パターン（アンダースコア含む文字列）
            /\b([a-zA-Z0-9_]{3,30})\b/g
        ];
        // 各パターンを順に試す
        for (const pattern of patterns) {
            const matches = [...fullText.matchAll(pattern)];
            for (const match of matches) {
                const username = match[1];
                if (username) {
                    // アンダースコアパターンの場合は追加チェック
                    if (pattern.source.includes('3,30')) {
                        // アンダースコア含む文字列で、Instagram関連のキーワードが近くにある場合のみ採用
                        if (!username.includes('_') || username.length < 3) {
                            continue;
                        }
                        // 明らかに無関係な文字列を除外
                        const excludeKeywords = ['Hair', 'Salon', 'posts', 'Closed', 'until', 'AM', 'PM'];
                        if (excludeKeywords.some(keyword => username.includes(keyword))) {
                            continue;
                        }
                    }
                    const candidateUrl = `https://instagram.com/${username}`;
                    const cleanUrl = cleanInstagramUrl(candidateUrl);
                    if (cleanUrl) {
                        extractedUrl = cleanUrl;
                        console.log(`        ✅ パターンマッチで発見: ${extractedUrl} (パターン: ${pattern.source.substring(0, 50)}...)`);
                        break;
                    }
                }
            }
            if (extractedUrl)
                break;
        }
    }
    if (!extractedUrl) {
        return null;
    }
    // 関連度を計算
    let relevance = 0.5; // デフォルト関連度
    if (salonName) {
        relevance = calculateInstagramRelevance(extractedUrl, salonName);
        console.log(`      🔍 関連度計算: ${salonName} → ${extractedUrl} = ${(relevance * 100).toFixed(1)}%`);
    }
    console.log(`    📱 Instagram URL抽出成功: ${extractedUrl} (関連度: ${(relevance * 100).toFixed(1)}%)`);
    return {
        url: extractedUrl,
        relevance: relevance
    };
}
function selectBestInstagramUrl(candidates, salonName) {
    if (!candidates || candidates.length === 0)
        return undefined;
    let bestUrl;
    let bestScore = 0;
    for (const candidate of candidates) {
        const cleanUrl = cleanInstagramUrl(candidate);
        if (!cleanUrl)
            continue; // 無効なURLはスキップ
        const score = calculateInstagramRelevance(cleanUrl, salonName);
        if (score > bestScore) {
            bestScore = score;
            bestUrl = cleanUrl;
        }
    }
    // スコアが 0 の場合は関連性なしと判断して undefined を返す
    return bestScore > 0 ? bestUrl : undefined;
}
