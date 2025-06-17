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
    const checks = check(limitsResponse, {
        'List API status 200': (r) => r.status === 200,
        'Valid list response': (r) => {
            try {
                const data = JSON.parse(r.body);
                return !!data?.data;
            } catch (e) {
                return false;
            }
        }
    });

    if (!checks) {
        console.error('Ошибка при получении списка лимитов');
        return { projectNames: [] };
    }

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

    // Выполняем запросы для каждого проекта
    projectNames.forEach(name => {
        const response = reservesModel.getReservesFact(name);
        reservesModel.processResponse(response, { project: name });
    });

    // Подсчёт общего количества запросов
    totalRequests.add(projectNames.length, CONFIG.commonTags);
} 