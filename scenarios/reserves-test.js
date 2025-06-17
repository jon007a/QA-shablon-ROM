import { ReservesModel } from '../models/ReservesModel.js';
import { CONFIG } from '../config/config.js';
import { totalRequests } from '../models/ReservesModel.js';

// Настройки теста
export const options = {
    ...CONFIG.defaults,
    tags: {
        version: __ENV.APP_VERSION || CONFIG.environments.development.appVersion,
        load: __ENV.LOAD_PROFILE || CONFIG.environments.development.loadProfile
    }
};

// Предварительная загрузка проектов
export function setup() {
    const reservesModel = new ReservesModel('development');
    const limit = __ENV.LIMIT || CONFIG.environments.development.limit;
    const projectNames = reservesModel.getProjects(limit);
    
    if (projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования');
    }
    
    return { projectNames };
}

// Основной тест
export default function(data) {
    const reservesModel = new ReservesModel('development');
    const projectNames = data.projectNames;

    if (projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования');
        return;
    }

    // Формирование промисов для всех проектов
    const requests = projectNames.map(name => {
        return new Promise((resolve) => {
            const response = reservesModel.getProjectData(name);
            resolve({ response, projectName: name });
        });
    });

    // Выполнение всех промисов параллельно
    Promise.all(requests).then(() => {
        totalRequests.add(projectNames.length);
    }).catch(error => {
        console.error('Ошибка выполнения запросов:', error.message);
    });
} 