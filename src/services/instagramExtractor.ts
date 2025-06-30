/**
 * Instagram URL抽出専用サービス
 * 検索結果からより確実にInstagram URLを抽出する
 */

// ======================= Instagram URL抽出 ========================

/**
 * Instagram URLをクリーンアップして正規化する
 * @param url 生のURL
 * @returns クリーンアップされたInstagram URL または null
 */
export function cleanInstagramUrl(url: string): string | null {
    if (!url || !url.includes('instagram.com')) {
        return null;
    }
    
    // URL正規化
    let cleanUrl = url.trim();
    
    // HTTPSに統一
    if (cleanUrl.startsWith('http://')) {
        cleanUrl = cleanUrl.replace('http://', 'https://');
    } else if (!cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
    }
    
    // ユーザー名を抽出
    const match = cleanUrl.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
    if (!match || !match[1] || match[1].length === 0) {
        return null;
    }
    
    const username = match[1];
    
    // 無効なユーザー名をフィルタリング
    if (username === 'p' || username === 'stories' || username === 'reels' || 
        username === 'tv' || username === 'explore' || username === 'direct' ||
        username.length < 1 || username.length > 30) {
        return null;
    }
    
    return `https://instagram.com/${username}`;
}

/**
 * サロン名からInstagram検索用のクエリを生成
 * @param salonName サロン名
 * @returns 検索クエリの配列（1つのみ）
 */
export function generateInstagramSearchQueries(salonName: string): string[] {
    // ヘアサロンを先頭に付けたクエリを生成（ベースクエリと統一）
    return [`ヘアサロン ${salonName} instagram`];
}

/**
 * Instagram URLの関連度を計算（簡易版）
 * @param instagramUrl Instagram URL
 * @param salonName サロン名
 * @returns 関連度スコア（0-1）
 */
export function calculateInstagramRelevance(instagramUrl: string, salonName: string): number {
    if (!instagramUrl || !salonName) return 0;
    
    // Instagram URLからユーザー名を抽出
    const usernameMatch = instagramUrl.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
    if (!usernameMatch || !usernameMatch[1]) return 0;
    
    const username = usernameMatch[1].toLowerCase();
    const salonLower = salonName.toLowerCase();
    
    // 1. 直接文字列比較
    if (username.includes(salonLower) || salonLower.includes(username)) {
        return 0.9;
    }
    
    // 2. 括弧内の英語表記との比較
    const englishMatch = salonName.match(/\(([A-Za-z\s]+)\)/);
    if (englishMatch && englishMatch[1]) {
        const englishName = englishMatch[1].trim().toLowerCase();
        if (username.includes(englishName) || englishName.includes(username)) {
            return 0.8;
        }
    }
    
    // 3. 基本的な部分マッチング
    const salonWords = salonName.replace(/[（）()]/g, '').split(/\s+/);
    for (const word of salonWords) {
        if (word.length >= 3 && username.includes(word.toLowerCase())) {
            return 0.6;
        }
    }
    
    return 0;
}

/**
 * テキストからInstagram URLを抽出する（改善版）
 * @param text 検索対象のテキスト
 * @returns 抽出されたInstagram URLの配列
 */
export function extractInstagramUrls(text: string): string[] {
    const urls: string[] = [];
    
    // より包括的なInstagram URL抽出パターン
    const patterns = [
        // 完全なURL形式
        /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_\.]+(?:\/[^\/\s]*)?/gi,
        // www付きドメイン
        /www\.instagram\.com\/[a-zA-Z0-9_\.]+/gi,
        // ドメインのみ
        /instagram\.com\/[a-zA-Z0-9_\.]+/gi,
        // パンくずリスト形式（例: › instagram.com › username）
        /›\s*instagram\.com\s*›\s*([a-zA-Z0-9_\.]+)/gi,
        // Instagram アカウント名を含むパターン
        /(?:instagram|インスタ|インスタグラム)[\s:：\-]*[@]?([a-zA-Z0-9_\.]+)/gi,
        // 括弧内のアカウント名
        /(?:Instagram|instagram|インスタ)\s*[\(（]([a-zA-Z0-9_\.]+)[\)）]/gi,
        // @ユーザー名パターン（Instagram関連文脈で）
        /@([a-zA-Z0-9_\.]+)/g,
        // 日本語文脈でのアカウント名抽出
        /(?:アカウント|account)[\s:：]*[@]?([a-zA-Z0-9_\.]+)/gi,
    ];
    
    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
            for (const match of matches) {
                let candidateUrl = match.trim();
                
                // 特殊パターンの処理
                if (candidateUrl.includes('›')) {
                    // パンくずリスト形式
                    const usernameMatch = candidateUrl.match(/›\s*instagram\.com\s*›\s*([a-zA-Z0-9_\.]+)/i);
                    if (usernameMatch && usernameMatch[1]) {
                        candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                    }
                } else if (candidateUrl.match(/instagram|インスタ/i) && candidateUrl.includes('(')) {
                    // 括弧内アカウント名
                    const usernameMatch = candidateUrl.match(/[\(（]([a-zA-Z0-9_\.]+)[\)）]/);
                    if (usernameMatch && usernameMatch[1]) {
                        candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                    }
                } else if (candidateUrl.match(/instagram|インスタ|account|アカウント/i)) {
                    // テキスト内のアカウント名抽出
                    const usernameMatch = candidateUrl.match(/(?:instagram|インスタ|インスタグラム|account|アカウント)[\s:：\-]*[@]?([a-zA-Z0-9_\.]+)/i);
                    if (usernameMatch && usernameMatch[1]) {
                        candidateUrl = `https://instagram.com/${usernameMatch[1]}`;
                    }
                } else if (candidateUrl.startsWith('@')) {
                    // @ユーザー名形式
                    candidateUrl = `https://instagram.com/${candidateUrl.substring(1)}`;
                } else if (candidateUrl.includes('instagram.com/') && !candidateUrl.startsWith('http')) {
                    // URLプロトコル補完
                    candidateUrl = 'https://' + candidateUrl;
                } else if (candidateUrl.match(/^[a-zA-Z0-9_\.]+$/) && candidateUrl.length > 1) {
                    // ユーザー名のみの場合（Instagram文脈で発見された場合のみ）
                    if (text.toLowerCase().includes('instagram') || text.toLowerCase().includes('インスタ')) {
                        candidateUrl = `https://instagram.com/${candidateUrl}`;
                    } else {
                        continue; // Instagram文脈でない場合はスキップ
                    }
                }
                
                // URLをクリーンアップ
                const cleanUrl = cleanInstagramUrl(candidateUrl);
                if (cleanUrl && !urls.includes(cleanUrl)) {
                    urls.push(cleanUrl);
                }
            }
        }
    }
    
    return urls;
}

/**
 * Google検索結果からInstagram URLを抽出する（統合版）
 * @param searchItem Google検索結果のアイテム
 * @param salonName サロン名（関連度計算用）
 * @returns 抽出されたInstagram URLと関連度スコア
 */
export function extractInstagramFromSearchItem(searchItem: any, salonName?: string): { url: string; relevance: number } | null {
    const title = searchItem.title || '';
    const link = searchItem.link || '';
    const snippet = searchItem.snippet || '';
    
    // OG URL取得
    let ogUrl = '';
    if (searchItem.pagemap && searchItem.pagemap.metatags && searchItem.pagemap.metatags.length > 0) {
        ogUrl = searchItem.pagemap.metatags[0]['og:url'] || '';
    }
    
    let extractedUrl: string | null = null;
    
    // まず直接リンクをチェック
    if (link.includes('instagram.com')) {
        const cleanUrl = cleanInstagramUrl(link);
        if (cleanUrl) {
            extractedUrl = cleanUrl;
        }
    }
    
    // 次にOG URLをチェック
    if (!extractedUrl && ogUrl.includes('instagram.com')) {
        const cleanUrl = cleanInstagramUrl(ogUrl);
        if (cleanUrl) {
            extractedUrl = cleanUrl;
        }
    }
    
    // テキスト全体を検索
    if (!extractedUrl) {
        const fullText = `${title} ${snippet} ${link} ${ogUrl}`;
        const urls = extractInstagramUrls(fullText);
        
        if (urls.length > 0) {
            extractedUrl = urls[0];
        }
    }
    
    if (!extractedUrl) {
        return null;
    }
    
    // 関連度を計算
    let relevance = 0.5; // デフォルト関連度
    if (salonName) {
        relevance = calculateInstagramRelevance(extractedUrl, salonName);
    }
    
    console.log(`    📱 Instagram URL抽出成功: ${extractedUrl} (関連度: ${(relevance * 100).toFixed(1)}%)`);
    
    return {
        url: extractedUrl,
        relevance: relevance
    };
} 