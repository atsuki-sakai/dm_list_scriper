"use strict";
/**
 * 日本語をローマ字に変換するユーティリティ
 * Instagram アカウント名のマッチング精度向上のため
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToRomaji = convertToRomaji;
exports.calculateRomajiSimilarity = calculateRomajiSimilarity;
exports.generateInstagramSearchKeywords = generateInstagramSearchKeywords;
// ======================= ローマ字変換マッピング ========================
// ひらがな → ローマ字マッピング（ヘボン式ベース）
const HIRAGANA_TO_ROMAJI = {
    'あ': ['a'], 'い': ['i'], 'う': ['u'], 'え': ['e'], 'お': ['o'],
    'か': ['ka'], 'き': ['ki'], 'く': ['ku'], 'け': ['ke'], 'こ': ['ko'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'さ': ['sa'], 'し': ['shi', 'si'], 'す': ['su'], 'せ': ['se'], 'そ': ['so'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'だ': ['da'], 'ぢ': ['ji', 'di'], 'づ': ['zu', 'du'], 'で': ['de'], 'ど': ['do'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'ゐ': ['wi'], 'ゑ': ['we'], 'を': ['wo', 'o'],
    'ん': ['n'],
    // 拗音（きゃ、しゃなど）
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'],
    'ちゃ': ['cha', 'tya'], 'ちゅ': ['chu', 'tyu'], 'ちょ': ['cho', 'tyo'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'jya', 'zya'], 'じゅ': ['ju', 'jyu', 'zyu'], 'じょ': ['jo', 'jyo', 'zyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
};
// カタカナ → ひらがな変換
const KATAKANA_TO_HIRAGANA = {
    'ア': 'あ', 'イ': 'い', 'ウ': 'う', 'エ': 'え', 'オ': 'お',
    'カ': 'か', 'キ': 'き', 'ク': 'く', 'ケ': 'け', 'コ': 'こ',
    'ガ': 'が', 'ギ': 'ぎ', 'グ': 'ぐ', 'ゲ': 'げ', 'ゴ': 'ご',
    'サ': 'さ', 'シ': 'し', 'ス': 'す', 'セ': 'せ', 'ソ': 'そ',
    'ザ': 'ざ', 'ジ': 'じ', 'ズ': 'ず', 'ゼ': 'ぜ', 'ゾ': 'ぞ',
    'タ': 'た', 'チ': 'ち', 'ツ': 'つ', 'テ': 'て', 'ト': 'と',
    'ダ': 'だ', 'ヂ': 'ぢ', 'ヅ': 'づ', 'デ': 'で', 'ド': 'ど',
    'ナ': 'な', 'ニ': 'に', 'ヌ': 'ぬ', 'ネ': 'ね', 'ノ': 'の',
    'ハ': 'は', 'ヒ': 'ひ', 'フ': 'ふ', 'ヘ': 'へ', 'ホ': 'ほ',
    'バ': 'ば', 'ビ': 'び', 'ブ': 'ぶ', 'ベ': 'べ', 'ボ': 'ぼ',
    'パ': 'ぱ', 'ピ': 'ぴ', 'プ': 'ぷ', 'ペ': 'ぺ', 'ポ': 'ぽ',
    'マ': 'ま', 'ミ': 'み', 'ム': 'む', 'メ': 'め', 'モ': 'も',
    'ヤ': 'や', 'ユ': 'ゆ', 'ヨ': 'よ',
    'ラ': 'ら', 'リ': 'り', 'ル': 'る', 'レ': 'れ', 'ロ': 'ろ',
    'ワ': 'わ', 'ヰ': 'ゐ', 'ヱ': 'ゑ', 'ヲ': 'を',
    'ン': 'ん',
    // 拗音
    'キャ': 'きゃ', 'キュ': 'きゅ', 'キョ': 'きょ',
    'シャ': 'しゃ', 'シュ': 'しゅ', 'ショ': 'しょ',
    'チャ': 'ちゃ', 'チュ': 'ちゅ', 'チョ': 'ちょ',
    'ニャ': 'にゃ', 'ニュ': 'にゅ', 'ニョ': 'にょ',
    'ヒャ': 'ひゃ', 'ヒュ': 'ひゅ', 'ヒョ': 'ひょ',
    'ミャ': 'みゃ', 'ミュ': 'みゅ', 'ミョ': 'みょ',
    'リャ': 'りゃ', 'リュ': 'りゅ', 'リョ': 'りょ',
    'ギャ': 'ぎゃ', 'ギュ': 'ぎゅ', 'ギョ': 'ぎょ',
    'ジャ': 'じゃ', 'ジュ': 'じゅ', 'ジョ': 'じょ',
    'ビャ': 'びゃ', 'ビュ': 'びゅ', 'ビョ': 'びょ',
    'ピャ': 'ぴゃ', 'ピュ': 'ぴゅ', 'ピョ': 'ぴょ',
    // 特殊文字
    'ー': '', // 長音符は無視
    '・': '', // 中点は無視
    'ヴ': 'ぶ', // ヴはブ音として処理
};
// よく使われる漢字 → 読み仮名のマッピング（美容院関連）
const KANJI_TO_HIRAGANA = {
    // 美容・サロン関連
    '美': ['び', 'うつく'],
    '容': ['よう'],
    '室': ['しつ'],
    '院': ['いん'],
    '店': ['てん', 'みせ'],
    '館': ['かん'],
    '屋': ['や'],
    '家': ['いえ', 'や', 'か'],
    '工': ['こう'],
    '房': ['ぼう'],
    // 人名関係
    '花': ['はな', 'か'],
    '子': ['こ'],
    '愛': ['あい', 'め'],
    '香': ['か', 'かおり'],
    '里': ['り', 'さと'],
    '奈': ['な'],
    '菜': ['な'],
    '恵': ['え', 'めぐ'],
    '絵': ['え'],
    '理': ['り'],
    '沙': ['さ'],
    '紗': ['さ'],
    '麻': ['ま', 'あさ'],
    '真': ['ま', 'しん'],
    '心': ['こころ', 'しん'],
    // 色・形容詞
    '白': ['しろ', 'はく'],
    '黒': ['くろ', 'こく'],
    '赤': ['あか'],
    '青': ['あお'],
    '緑': ['みどり'],
    '金': ['きん', 'かね'],
    '銀': ['ぎん'],
    '新': ['しん', 'あたら'],
    '古': ['ふる', 'こ'],
    '大': ['だい', 'おお'],
    '小': ['しょう', 'ちい'],
    // 数字
    '一': ['いち', 'ひと'],
    '二': ['に', 'ふた'],
    '三': ['さん', 'み'],
    '四': ['し', 'よん'],
    '五': ['ご', 'いつ'],
    '六': ['ろく', 'む'],
    '七': ['しち', 'なな'],
    '八': ['はち', 'や'],
    '九': ['きゅう', 'く'],
    '十': ['じゅう', 'とお'],
};
// ======================= 変換関数 ========================
/**
 * カタカナをひらがなに変換
 */
function katakanaToHiragana(text) {
    return text.split('').map(char => KATAKANA_TO_HIRAGANA[char] || char).join('');
}
/**
 * ひらがなをローマ字に変換（複数パターン対応）
 */
function hiraganaToRomaji(hiragana) {
    const results = [];
    // 長い音から順にマッチング（拗音を優先）
    const sortedKeys = Object.keys(HIRAGANA_TO_ROMAJI).sort((a, b) => b.length - a.length);
    function convertRecursive(remaining, current) {
        if (remaining.length === 0) {
            results.push(current.toLowerCase());
            return;
        }
        for (const key of sortedKeys) {
            if (remaining.startsWith(key)) {
                const romajiOptions = HIRAGANA_TO_ROMAJI[key];
                for (const romaji of romajiOptions) {
                    convertRecursive(remaining.slice(key.length), current + romaji);
                }
                return;
            }
        }
        // マッチしない文字はそのまま追加
        convertRecursive(remaining.slice(1), current + remaining[0]);
    }
    convertRecursive(hiragana, '');
    return [...new Set(results)]; // 重複除去
}
/**
 * 漢字を含む文字列をひらがなに変換（推測）
 */
function kanjiToHiragana(text) {
    const results = [];
    function convertRecursive(remaining, current) {
        if (remaining.length === 0) {
            results.push(current);
            return;
        }
        // 漢字マッピングから検索
        for (const kanji of Object.keys(KANJI_TO_HIRAGANA)) {
            if (remaining.startsWith(kanji)) {
                const readings = KANJI_TO_HIRAGANA[kanji];
                for (const reading of readings) {
                    convertRecursive(remaining.slice(kanji.length), current + reading);
                }
                return;
            }
        }
        // ひらがな・カタカナはそのまま
        const char = remaining[0];
        if (KATAKANA_TO_HIRAGANA[char]) {
            convertRecursive(remaining.slice(1), current + KATAKANA_TO_HIRAGANA[char]);
        }
        else {
            convertRecursive(remaining.slice(1), current + char);
        }
    }
    convertRecursive(text, '');
    return [...new Set(results)];
}
// ======================= 公開関数 ========================
/**
 * 日本語テキストをローマ字に変換（複数パターン生成）
 * @param text 日本語テキスト
 * @returns ローマ字パターンの配列
 */
function convertToRomaji(text) {
    if (!text)
        return [];
    // 前処理：不要な文字を除去
    const cleaned = text
        .replace(/[（）()「」【】\[\]・\s]/g, '') // 括弧、記号、空白を除去
        .replace(/ー+/g, '') // 長音符を除去
        .toLowerCase();
    if (!cleaned)
        return [];
    const allResults = [];
    // 1. カタカナ → ひらがな → ローマ字
    const hiraganaText = katakanaToHiragana(cleaned);
    const romajiFromHiragana = hiraganaToRomaji(hiraganaText);
    allResults.push(...romajiFromHiragana);
    // 2. 漢字を含む場合の推測変換
    if (/[\u4e00-\u9faf]/.test(cleaned)) {
        const hiraganaVariations = kanjiToHiragana(cleaned);
        for (const variation of hiraganaVariations) {
            const romajiVariations = hiraganaToRomaji(variation);
            allResults.push(...romajiVariations);
        }
    }
    // 3. 短縮形も生成
    const shortForms = [];
    for (const romaji of allResults) {
        // 母音除去版
        const consonantOnly = romaji.replace(/[aiueo]/g, '');
        if (consonantOnly.length > 0) {
            shortForms.push(consonantOnly);
        }
        // 最初の3-5文字
        if (romaji.length > 3) {
            shortForms.push(romaji.substring(0, 3));
            shortForms.push(romaji.substring(0, 4));
            if (romaji.length > 5) {
                shortForms.push(romaji.substring(0, 5));
            }
        }
    }
    allResults.push(...shortForms);
    // 重複除去とフィルタリング
    return [...new Set(allResults)]
        .filter(r => r.length > 0 && r.length <= 30) // 空文字と長すぎるものを除外
        .sort((a, b) => b.length - a.length); // 長い順にソート
}
/**
 * ローマ字の柔軟マッチング
 * @param target 対象文字列
 * @param pattern マッチングパターン
 * @returns マッチ度（0-1）
 */
function calculateRomajiSimilarity(target, pattern) {
    const targetLower = target.toLowerCase();
    const patternLower = pattern.toLowerCase();
    // 完全一致
    if (targetLower === patternLower)
        return 1.0;
    // 部分一致
    if (targetLower.includes(patternLower) || patternLower.includes(targetLower)) {
        const longer = Math.max(targetLower.length, patternLower.length);
        const shorter = Math.min(targetLower.length, patternLower.length);
        return shorter / longer * 0.8;
    }
    // 編集距離ベースの類似度
    const editDistance = calculateEditDistance(targetLower, patternLower);
    const maxLength = Math.max(targetLower.length, patternLower.length);
    if (maxLength === 0)
        return 0;
    const similarity = 1 - (editDistance / maxLength);
    return Math.max(0, similarity - 0.3); // 閾値を設定
}
/**
 * 編集距離（レーベンシュタイン距離）を計算
 */
function calculateEditDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // 置換
                matrix[i][j - 1] + 1, // 挿入
                matrix[i - 1][j] + 1 // 削除
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}
/**
 * サロン名からInstagram検索用のキーワードを生成
 * @param salonName サロン名
 * @returns 検索キーワードの配列
 */
function generateInstagramSearchKeywords(salonName) {
    const keywords = [];
    // 元のサロン名
    keywords.push(salonName);
    // ローマ字変換
    const romajiVariations = convertToRomaji(salonName);
    keywords.push(...romajiVariations);
    // 「ヘアサロン」「美容室」等の接頭詞を除去
    const cleanedName = salonName
        .replace(/^(ヘア|ヘアー|Hair|HAIR|美容室|美容院|サロン|salon|SALON)\s*/i, '')
        .trim();
    if (cleanedName !== salonName) {
        keywords.push(cleanedName);
        const cleanedRomaji = convertToRomaji(cleanedName);
        keywords.push(...cleanedRomaji);
    }
    // 重複除去
    return [...new Set(keywords)].filter(k => k.length > 0);
}
