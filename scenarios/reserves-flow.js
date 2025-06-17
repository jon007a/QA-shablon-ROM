import { ReservesModel } from '../models/ReservesModel.js';
import { CONFIG } from '../config/config.js';
import { check } from 'k6';

// Экспорт настроек нагрузки
export const options = {
    ...CONFIG.defaults,
    tags: {
        testType: 'reserves-flow',
    },
};

// Глобальный массив для хранения имен проектов
let globalProjectNames = [];

// Подготовка данных перед тестом
export async function setup() {
    const reservesModel = new ReservesModel('development');
    const limit = __ENV.LIMIT || CONFIG.reserves.defaultLimit;
    
    // Получение списка проектов
    const projectNames = await reservesModel.getProjectsList(limit, CONFIG.reserves.defaultOffset);
    
    if (!Array.isArray(projectNames)) {
        console.error('Получен некорректный список проектов');
        return { projectNames: [] };
    }

    globalProjectNames = projectNames;
    console.log(`Получено ${projectNames.length} проектов для тестирования`);

    return { projectNames };
}

// Основной сценарий теста
export default async function (data) {
    const reservesModel = new ReservesModel('development');
    const projectNames = data.projectNames;

    if (!Array.isArray(projectNames) || projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования или некорректный формат данных');
        return;
    }

    // Выбираем случайный проект для каждой итерации
    const randomIndex = Math.floor(Math.random() * projectNames.length);
    const projectName = projectNames[randomIndex];

    try {
        // Делаем запрос для одного случайного проекта
        await reservesModel.getProjectReserves(projectName);
    } catch (error) {
        console.error(`Ошибка при запросе данных для проекта ${projectName}:`, error.message);
    }
} 