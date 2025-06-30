import { Area, SubArea, DetailArea } from '../types/index';
import { AREA_URL_MAP } from '../constants/index';
import { fetchSubAreas, fetchDetailAreas } from '../services/scraper';
import { 
    promptAreaSelection, 
    promptSubAreaSelection, 
    promptDetailAreaSelection 
} from '../services/userInput';
import { displayError, displayProgress } from '../services/display';

// ======================= エリアコントローラー ========================

/**
 * メインエリアからサブエリア、詳細エリアまでの選択フローを実行
 * @returns 最終的に選択されたエリアのURL
 */
export async function processAreaSelection(): Promise<string | undefined> {
    try {
        // 1. トップレベルエリア選択
        const selectedArea = await selectMainArea();
        if (!selectedArea) {
            displayError('エリアが選択されませんでした。');
            return undefined;
        }

        // 2. サブエリア選択
        const selectedSubArea = await selectSubArea(selectedArea.url);
        if (!selectedSubArea) {
            // サブエリアが無い場合はメインエリアのURLを返す
            return selectedArea.url;
        }

        // 3. 詳細エリア選択
        const selectedDetailArea = await selectDetailArea(selectedSubArea.url);
        if (!selectedDetailArea) {
            // 詳細エリアが無い場合はサブエリアのURLを返す
            return selectedSubArea.url;
        }

        return selectedDetailArea.url;
    } catch (error) {
        displayError('エリア選択でエラーが発生しました', error);
        return undefined;
    }
}

/**
 * メインエリア選択を実行
 * @returns 選択されたエリア
 */
async function selectMainArea(): Promise<Area | undefined> {
    const areas: Area[] = Object.entries(AREA_URL_MAP).map(([name, url]) => ({
        name,
        url
    }));

    return await promptAreaSelection(areas);
}

/**
 * サブエリア選択を実行
 * @param areaUrl メインエリアのURL
 * @returns 選択されたサブエリア
 */
async function selectSubArea(areaUrl: string): Promise<SubArea | undefined> {
    try {
        displayProgress('サブエリア一覧を取得中...');
        const subAreas = await fetchSubAreas(areaUrl);
        
        if (subAreas.length === 0) {
            console.log('サブエリアが見つかりませんでした。');
            return undefined;
        }

        return await promptSubAreaSelection(subAreas);
    } catch (error) {
        displayError('サブエリア選択でエラーが発生しました', error);
        return undefined;
    }
}

/**
 * 詳細エリア選択を実行
 * @param subAreaUrl サブエリアのURL
 * @returns 選択された詳細エリア
 */
async function selectDetailArea(subAreaUrl: string): Promise<DetailArea | undefined> {
    try {
        displayProgress('詳細エリア一覧を取得中...');
        const detailAreas = await fetchDetailAreas(subAreaUrl);
        
        if (detailAreas.length === 0) {
            console.log('詳細エリアが見つかりませんでした。');
            return undefined;
        }

        return await promptDetailAreaSelection(detailAreas);
    } catch (error) {
        displayError('詳細エリア選択でエラーが発生しました', error);
        return undefined;
    }
} 