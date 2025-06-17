import { ReservesModel, totalRequests } from '../models/ReservesModel.js';
import { CONFIG } from '../config/config.js';
import { check } from 'k6';

export const options = {
    stages: CONFIG.defaults.stages
};

// Глобальный массив для хранения имен проектов
let globalProjectNames = [];

export function setup() {
    const reservesModel = new ReservesModel();
    
    // Получаем список лимитов
    const limitsResponse = reservesModel.getReservesLimits();
    
    // Проверяем ответ
    check(limitsResponse, {
        'List API status 200': (r) => r.status === 200,
        'Valid list response': (r) => !!r.json()?.data
    });

    // Обрабатываем ответ и сохраняем имена проектов
    globalProjectNames = reservesModel.extractProjectNames(limitsResponse);
    
    return { projectNames: globalProjectNames };
}

export default function(data) {
    const reservesModel = new ReservesModel();
    const projectNames = data.projectNames;

    if (projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования');
        return;
    }

    // Формируем массив промисов для параллельных запросов
    const requests = projectNames.map(name => {
        return new Promise((resolve) => {
            const response = reservesModel.getReservesFact(name);
            resolve({ response, projectName: name });
        });
    });

    // Выполняем все запросы параллельно
    Promise.all(requests).then(responses => {
        // Подсчёт общего количества запросов
        totalRequests.add(projectNames.length, CONFIG.commonTags);

        // Обработка результатов
        responses.forEach(({ response, projectName }) => {
            reservesModel.processResponse(response, { project: projectName });
        });
    }).catch(error => {
        console.error('Ошибка выполнения запросов:', error.message);
    });
} 