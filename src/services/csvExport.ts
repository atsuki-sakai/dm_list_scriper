import * as fs from 'fs';
import * as path from 'path';
import { ExtendedSalonDetails, AreaSelectionResult } from '../types/index';

// ======================= CSV出力サービス ========================

/**
 * サロン詳細情報をCSV形式でエクスポート
 * @param salons サロン詳細情報の配列
 * @param areaSelection エリア選択情報（ファイル名生成用）
 * @param ratio 処理割合（0.5 = 50%, 1.0 = 100%）
 * @param filename ファイル名（オプション、指定した場合はエリア情報は無視）
 * @returns 出力されたファイルパス
 */
export function exportToCSV(salons: ExtendedSalonDetails[], areaSelection?: AreaSelectionResult, ratio?: number, filename?: string): string {
    // ファイル名を生成（指定されていない場合）
    if (!filename) {
        if (areaSelection) {
            // エリア名を使ったファイル名を生成
            filename = generateAreaBasedFilename(areaSelection, ratio);
        } else {
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
        '電話番号',
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
        'ホームページURL',
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
            escapeCSVField(salon.phone || ''), // 電話番号
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
            escapeCSVField(salon.homepageUrl || ''),
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

    // list フォルダをプロジェクトルート直下に作成（なければ）
    const outputDir = path.join(process.cwd(), 'list');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 list フォルダを作成しました: ${outputDir}`);
    }

    // list フォルダ配下に保存
    const filePath = path.join(outputDir, filename);

    try {
        // UTF-8 BOM付きで保存（Excelで正しく開けるように）
        const bom = '\uFEFF';
        fs.writeFileSync(filePath, bom + csvContent, 'utf8');
        
        console.log(`\n✅ CSVファイルが作成されました: ${filePath}`);
        console.log(`📊 出力されたサロン数: ${salons.length}件`);
        
        return filePath;
    } catch (error) {
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
function generateAreaBasedFilename(areaSelection: AreaSelectionResult, ratio?: number): string {
    // ファイル名に不適切な文字を置換する関数
    const sanitizeForFilename = (str: string): string => {
        return str
            .replace(/[\/\\\?%\*:|"<>]/g, '') // ファイル名に使えない文字を削除
            .replace(/\s+/g, '') // スペースを削除
            .replace(/[\(\)]/g, ''); // 括弧も削除
    };

    const parts: string[] = [];
    
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
function escapeCSVField(field: string): string {
    if (!field) return '""';
    
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
export function displayCSVStats(salons: ExtendedSalonDetails[]): void {
    const instagramCount = salons.filter(s => s.instagramUrl).length;
    const emailCount = salons.filter(s => s.email).length;
    const homepageCount = salons.filter(s => s.homepageUrl).length;
    
    // デバッグ情報: Instagram URLを持つサロンの詳細表示
    console.log('🔧 Instagram URL詳細確認:');
    const salonsWithInstagram = salons.filter(s => s.instagramUrl);
    salonsWithInstagram.forEach((salon, idx) => {
        console.log(`  [${idx + 1}] ${salon.name}: ${salon.instagramUrl}`);
    });
    
    if (salonsWithInstagram.length === 0) {
        console.log('  ❌ Instagram URLを持つサロンが見つかりませんでした');
        // 候補を持つサロンを確認
        const salonsWithCandidates = salons.filter(s => s.instagramCandidates && s.instagramCandidates.length > 0);
        if (salonsWithCandidates.length > 0) {
            console.log('  📋 Instagram候補を持つサロン:');
            salonsWithCandidates.forEach((salon, idx) => {
                console.log(`    [${idx + 1}] ${salon.name}: 候補${salon.instagramCandidates?.length}件`);
                salon.instagramCandidates?.forEach((candidate, candIdx) => {
                    console.log(`      - ${candidate}`);
                });
            });
        }
    }
    
    // Google Business情報の統計
    const googleBusinessCount = salons.filter(s => s.googleBusinessInfo).length;
    const googleRatingCount = salons.filter(s => s.googleBusinessInfo?.rating).length;
    const googleReviewCount = salons.filter(s => s.googleBusinessInfo?.reviewCount).length;
    const googleHoursCount = salons.filter(s => s.googleBusinessInfo?.businessHours).length;
    
    // 候補数も集計
    const instagramCandidatesCount = salons.reduce((acc, s) => acc + (s.instagramCandidates?.length || 0), 0);
    
    console.log('\n📈 CSV出力統計:');
    console.log(`   総サロン数: ${salons.length}件`);
    console.log(`   Instagram URL取得: ${instagramCount}件 (${Math.round(instagramCount / salons.length * 100)}%) | 候補総数: ${instagramCandidatesCount}件`);
    console.log(`   メールアドレス取得: ${emailCount}件 (${Math.round(emailCount / salons.length * 100)}%)`);
    console.log(`   ホームページURL取得: ${homepageCount}件 (${Math.round(homepageCount / salons.length * 100)}%)`);
    
    console.log(`\n🏢 Google Business情報取得:`);
    console.log(`   Google Business情報: ${googleBusinessCount}件 (${Math.round(googleBusinessCount / salons.length * 100)}%)`);
    console.log(`   Google評価: ${googleRatingCount}件 (${Math.round(googleRatingCount / salons.length * 100)}%)`);
    console.log(`   Google レビュー数: ${googleReviewCount}件 (${Math.round(googleReviewCount / salons.length * 100)}%)`);
    console.log(`   Google営業時間: ${googleHoursCount}件 (${Math.round(googleHoursCount / salons.length * 100)}%)`);
}

// ======================= CSV分割機能 ========================

/**
 * CSVファイルの行データ
 */
interface CSVRow {
    [key: string]: string;
}

/**
 * CSV分割オプション
 */
export interface CSVSplitOptions {
    chunkSize: number;
    inputFilePath: string;
    outputDir?: string;
}

/**
 * CSVファイルを任意の行数で分割する
 * @param options 分割オプション
 * @returns 分割されたファイルパスの配列
 */
export function splitCSV(options: CSVSplitOptions): string[] {
    const { chunkSize, inputFilePath, outputDir } = options;
    
    // 出力ディレクトリを決定（指定されていない場合は入力ファイルと同じディレクトリ）
    const finalOutputDir = outputDir || path.dirname(inputFilePath);
    
    // 出力ディレクトリを作成（存在しない場合）
    if (!fs.existsSync(finalOutputDir)) {
        fs.mkdirSync(finalOutputDir, { recursive: true });
    }

    console.log(`📄 CSVファイルを分割中: ${path.basename(inputFilePath)}`);
    console.log(`📦 分割サイズ: ${chunkSize}行/ファイル`);

    try {
        const content = fs.readFileSync(inputFilePath, 'utf-8');
        const { headers, rows } = parseCSV(content);
        
        const outputPaths = writeChunks(inputFilePath, finalOutputDir, headers, rows, chunkSize);
        
        console.log(`✅ 分割完了: ${outputPaths.length}個のファイルに分割 (総行数: ${rows.length}行)`);
        return outputPaths;
    } catch (error) {
        console.error('❌ CSV分割に失敗しました:', error);
        throw error;
    }
}

/**
 * シンプルなCSV解析関数
 * @param content CSVファイルの内容
 * @returns ヘッダーと行データ
 */
function parseCSV(content: string): { headers: string[], rows: CSVRow[] } {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const row: CSVRow = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        return row;
    });

    return { headers, rows };
}

/**
 * CSV行を解析する（カンマとクォートを適切に処理）
 * @param line CSV行
 * @returns 列の値の配列
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }
    
    result.push(current);
    return result;
}

/**
 * 分割されたCSVファイルを書き込む
 * @param originalPath 元のファイルパス
 * @param outputDir 出力ディレクトリ
 * @param headers ヘッダー行
 * @param rows データ行
 * @param chunkSize 分割サイズ
 * @returns 作成されたファイルパスの配列
 */
function writeChunks(
    originalPath: string,
    outputDir: string,
    headers: string[],
    rows: CSVRow[],
    chunkSize: number
): string[] {
    const originalFileName = path.basename(originalPath, '.csv');
    const totalChunks = Math.ceil(rows.length / chunkSize);
    const outputPaths: string[] = [];

    for (let i = 0; i < totalChunks; i++) {
        const startIndex = i * chunkSize;
        const endIndex = Math.min(startIndex + chunkSize, rows.length);
        const chunk = rows.slice(startIndex, endIndex);

        const chunkFileName = `${originalFileName}_part${i + 1}_of_${totalChunks}.csv`;
        const outputPath = path.join(outputDir, chunkFileName);

        // CSVコンテンツを作成
        let csvContent = headers.join(',') + '\n';
        
        chunk.forEach(row => {
            const rowValues = headers.map(header => {
                const value = row[header] || '';
                // クォートをエスケープし、必要に応じてクォートで囲む
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += rowValues.join(',') + '\n';
        });

        // UTF-8 BOM付きで保存（Excelで正しく開けるように）
        const bom = '\uFEFF';
        fs.writeFileSync(outputPath, bom + csvContent, 'utf-8');
        outputPaths.push(outputPath);
        
        console.log(`  📄 作成: ${chunkFileName} (${chunk.length}行)`);
    }

    return outputPaths;
}