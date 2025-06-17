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
export function setup() {
    const reservesModel = new ReservesModel('development');
    const limit = __ENV.LIMIT || CONFIG.reserves.defaultLimit;
    
    // Получение списка проектов
    const projectNames = reservesModel.getProjectsList(limit, CONFIG.reserves.defaultOffset);
    globalProjectNames = projectNames;

    return { projectNames };
}

// Основной сценарий теста
export default function (data) {
    const reservesModel = new ReservesModel('development');
    const projectNames = data.projectNames;

    if (projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования');
        return;
    }

    // Формирование промисов для всех проектов
    const requests = projectNames.map(name => {
        return new Promise((resolve) => {
            const response = reservesModel.getProjectReserves(name);
            resolve({ response, projectName: name });
        });
    });

    // Выполнение всех запросов параллельно
    Promise.all(requests).catch(error => {
        console.error('Ошибка выполнения запросов:', error.message);
    });
} 