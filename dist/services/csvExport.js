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
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportToCSV = exportToCSV;
exports.displayCSVStats = displayCSVStats;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ======================= CSV出力サービス ========================
/**
 * サロン詳細情報をCSV形式でエクスポート
 * @param salons サロン詳細情報の配列
 * @param areaSelection エリア選択情報（ファイル名生成用）
 * @param ratio 処理割合（0.5 = 50%, 1.0 = 100%）
 * @param filename ファイル名（オプション、指定した場合はエリア情報は無視）
 * @returns 出力されたファイルパス
 */
function exportToCSV(salons, areaSelection, ratio, filename) {
    // ファイル名を生成（指定されていない場合）
    if (!filename) {
        if (areaSelection) {
            // エリア名を使ったファイル名を生成
            filename = generateAreaBasedFilename(areaSelection, ratio);
        }
        else {
            // フォールバック: タイムスタンプベースのファイル名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            filename = `salon_details_${timestamp}.csv`;
        }
    }
    // CSVヘッダーを定義
    const headers = [
        'インデックス',
        'サロン名',
        '住所',
        'アクセス',
        '営業時間',
        '定休日',
        'カット価格',
        'スタッフ数',
        '支払い方法',
        'こだわり条件',
        '備考',
        'その他',
        'Instagram URL',
        'Instagram URL候補',
        'メールアドレス',
        '電話番号',
        '電話番号候補',
        'ホームページURL',
        'ホームページURL候補',
        'Google Business評価',
        'Google Businessレビュー数',
        'Google Business営業時間',
        'Google Business営業状況',
        'Google Business住所',
        'Google Business電話番号',
        'Google Businessウェブサイト',
        'Google Businessカテゴリ',
        '検索クエリ'
    ];
    // CSV行を生成（インデックス付き - 下位の店舗から1番開始）
    const csvRows = [
        headers.join(','), // ヘッダー行
        ...salons.map((salon, index) => [
            escapeCSVField((index + 1).toString()), // インデックス（1から開始）
            escapeCSVField(salon.name),
            escapeCSVField(salon.address),
            escapeCSVField(salon.access),
            escapeCSVField(salon.businessHours),
            escapeCSVField(salon.closedDays),
            escapeCSVField(salon.cutPrice),
            escapeCSVField(salon.staffCount),
            escapeCSVField(salon.paymentMethods),
            escapeCSVField(salon.features),
            escapeCSVField(salon.remarks),
            escapeCSVField(salon.other),
            escapeCSVField(salon.instagramUrl || ''),
            escapeCSVField(salon.instagramCandidates?.join('; ') || ''), // Instagram URL候補
            escapeCSVField(salon.email || ''),
            escapeCSVField(salon.phoneNumber || ''),
            escapeCSVField(salon.phoneNumberCandidates?.join('; ') || ''), // 電話番号候補
            escapeCSVField(salon.homepageUrl || ''),
            escapeCSVField(salon.homepageCandidates?.join('; ') || ''), // ホームページURL候補
            escapeCSVField(salon.googleBusinessInfo?.rating?.toString() || ''), // Google Business評価
            escapeCSVField(salon.googleBusinessInfo?.reviewCount?.toString() || ''), // Google Businessレビュー数
            escapeCSVField(salon.googleBusinessInfo?.businessHours || ''), // Google Business営業時間
            escapeCSVField(salon.googleBusinessInfo?.businessStatus || ''), // Google Business営業状況
            escapeCSVField(salon.googleBusinessInfo?.address || ''), // Google Business住所
            escapeCSVField(salon.googleBusinessInfo?.phoneNumber || ''), // Google Business電話番号
            escapeCSVField(salon.googleBusinessInfo?.website || ''), // Google Businessウェブサイト
            escapeCSVField(salon.googleBusinessInfo?.categories?.join('; ') || ''), // Google Businessカテゴリ
            escapeCSVField(salon.searchQuery)
        ].join(','))
    ];
    // CSVファイルの内容を生成
    const csvContent = csvRows.join('\n');
    // ファイルパスを決定（プロジェクトルートに保存）
    const filePath = path.join(process.cwd(), filename);
    try {
        // UTF-8 BOM付きで保存（Excelで正しく開けるように）
        const bom = '\uFEFF';
        fs.writeFileSync(filePath, bom + csvContent, 'utf8');
        console.log(`\n✅ CSVファイルが作成されました: ${filePath}`);
        console.log(`📊 出力されたサロン数: ${salons.length}件`);
        return filePath;
    }
    catch (error) {
        console.error('❌ CSVファイルの保存に失敗しました:', error);
        throw error;
    }
}
/**
 * エリア情報を基にファイル名を生成
 * @param areaSelection エリア選択情報
 * @param ratio 処理割合（0.5 = 50%, 1.0 = 100%）
 * @returns 生成されたファイル名
 */
function generateAreaBasedFilename(areaSelection, ratio) {
    // ファイル名に不適切な文字を置換する関数
    const sanitizeForFilename = (str) => {
        return str
            .replace(/[\/\\\?%\*:|"<>]/g, '') // ファイル名に使えない文字を削除
            .replace(/\s+/g, '') // スペースを削除
            .replace(/[\(\)]/g, ''); // 括弧も削除
    };
    const parts = [];
    // メインエリア名を追加
    if (areaSelection.mainAreaName) {
        parts.push(sanitizeForFilename(areaSelection.mainAreaName));
    }
    // サブエリア名を追加
    if (areaSelection.subAreaName) {
        parts.push(sanitizeForFilename(areaSelection.subAreaName));
    }
    // 詳細エリア名を追加
    if (areaSelection.detailAreaName) {
        parts.push(sanitizeForFilename(areaSelection.detailAreaName));
    }
    // 処理割合を追加（50%または100%）
    if (ratio !== undefined) {
        const percentage = Math.round(ratio * 100);
        parts.push(`${percentage}%`);
    }
    // パーツが空の場合はフォールバック
    if (parts.length === 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `salon_details_${timestamp}.csv`;
    }
    // "エリア_エリアの詳細_さらに詳細.csv" の形式で結合
    return `${parts.join('_')}.csv`;
}
/**
 * CSV用にフィールドをエスケープ
 * @param field エスケープするフィールド
 * @returns エスケープされたフィールド
 */
function escapeCSVField(field) {
    if (!field)
        return '""';
    // 改行、カンマ、ダブルクォートを含む場合はダブルクォートで囲む
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
        // ダブルクォートをエスケープ
        const escaped = field.replace(/"/g, '""');
        return `"${escaped}"`;
    }
    // 空白のみの場合やスペシャルケース
    if (field.trim() === '') {
        return '""';
    }
    return `"${field}"`;
}
/**
 * CSV出力の統計情報を表示
 * @param salons サロン詳細情報の配列
 */
function displayCSVStats(salons) {
    const instagramCount = salons.filter(s => s.instagramUrl).length;
    const emailCount = salons.filter(s => s.email).length;
    const phoneCount = salons.filter(s => s.phoneNumber).length;
    const homepageCount = salons.filter(s => s.homepageUrl).length;
    // Google Business情報の統計
    const googleBusinessCount = salons.filter(s => s.googleBusinessInfo).length;
    const googleRatingCount = salons.filter(s => s.googleBusinessInfo?.rating).length;
    const googleReviewCount = salons.filter(s => s.googleBusinessInfo?.reviewCount).length;
    const googleHoursCount = salons.filter(s => s.googleBusinessInfo?.businessHours).length;
    // 候補数も集計
    const instagramCandidatesCount = salons.reduce((acc, s) => acc + (s.instagramCandidates?.length || 0), 0);
    const phoneCandidatesCount = salons.reduce((acc, s) => acc + (s.phoneNumberCandidates?.length || 0), 0);
    const homepageCandidatesCount = salons.reduce((acc, s) => acc + (s.homepageCandidates?.length || 0), 0);
    console.log('\n📈 CSV出力統計:');
    console.log(`   総サロン数: ${salons.length}件`);
    console.log(`   Instagram URL取得: ${instagramCount}件 (${Math.round(instagramCount / salons.length * 100)}%) | 候補総数: ${instagramCandidatesCount}件`);
    console.log(`   メールアドレス取得: ${emailCount}件 (${Math.round(emailCount / salons.length * 100)}%)`);
    console.log(`   電話番号取得: ${phoneCount}件 (${Math.round(phoneCount / salons.length * 100)}%) | 候補総数: ${phoneCandidatesCount}件`);
    console.log(`   ホームページURL取得: ${homepageCount}件 (${Math.round(homepageCount / salons.length * 100)}%) | 候補総数: ${homepageCandidatesCount}件`);
    console.log(`\n🏢 Google Business情報取得:`);
    console.log(`   Google Business情報: ${googleBusinessCount}件 (${Math.round(googleBusinessCount / salons.length * 100)}%)`);
    console.log(`   Google評価: ${googleRatingCount}件 (${Math.round(googleRatingCount / salons.length * 100)}%)`);
    console.log(`   Google レビュー数: ${googleReviewCount}件 (${Math.round(googleReviewCount / salons.length * 100)}%)`);
    console.log(`   Google営業時間: ${googleHoursCount}件 (${Math.round(googleHoursCount / salons.length * 100)}%)`);
    console.log(`\n🎯 関連度フィルタリング効果:`);
    console.log(`   Instagram: 平均 ${instagramCandidatesCount > 0 ? (instagramCandidatesCount / Math.max(salons.filter(s => s.instagramCandidates?.length).length, 1)).toFixed(1) : 0} 候補/サロン`);
}
