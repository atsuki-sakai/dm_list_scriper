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
 * @param filename ファイル名（オプション）
 * @returns 出力されたファイルパス
 */
function exportToCSV(salons, filename) {
    // ファイル名を生成（指定されていない場合）
    if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        filename = `salon_details_${timestamp}.csv`;
    }
    // CSVヘッダーを定義
    const headers = [
        'サロン名',
        '住所',
        'アクセス',
        '営業時間',
        '定休日',
        'カット価格',
        '席数',
        'スタッフ数',
        '駐車場',
        '支払い方法',
        'こだわり条件',
        '備考',
        'その他',
        'Instagram URL',
        'メールアドレス',
        '検索クエリ'
    ];
    // CSV行を生成
    const csvRows = [
        headers.join(','), // ヘッダー行
        ...salons.map(salon => [
            escapeCSVField(salon.name),
            escapeCSVField(salon.address),
            escapeCSVField(salon.access),
            escapeCSVField(salon.businessHours),
            escapeCSVField(salon.closedDays),
            escapeCSVField(salon.cutPrice),
            escapeCSVField(salon.seatCount),
            escapeCSVField(salon.staffCount),
            escapeCSVField(salon.parking),
            escapeCSVField(salon.paymentMethods),
            escapeCSVField(salon.features),
            escapeCSVField(salon.remarks),
            escapeCSVField(salon.other),
            escapeCSVField(salon.instagramUrl || ''),
            escapeCSVField(salon.email || ''),
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
    console.log('\n📈 CSV出力統計:');
    console.log(`   総サロン数: ${salons.length}件`);
    console.log(`   Instagram URL取得: ${instagramCount}件 (${Math.round(instagramCount / salons.length * 100)}%)`);
    console.log(`   メールアドレス取得: ${emailCount}件 (${Math.round(emailCount / salons.length * 100)}%)`);
}
