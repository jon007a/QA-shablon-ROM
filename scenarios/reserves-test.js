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
export async function setup() {
    const reservesModel = new ReservesModel('development');
    const limit = __ENV.LIMIT || CONFIG.environments.development.limit;
    
    try {
        const projectNames = await reservesModel.getProjects(limit);
        
        if (!projectNames || projectNames.length === 0) {
            console.error('Не найдены проекты для тестирования');
            return { projectNames: [] };
        }
        
        return { projectNames };
    } catch (error) {
        console.error('Ошибка при загрузке проектов:', error.message);
        return { projectNames: [] };
    }
}

// Основной тест
export default async function(data) {
    const reservesModel = new ReservesModel('development');
    const projectNames = data.projectNames || [];

    if (projectNames.length === 0) {
        console.error('Не найдены проекты для тестирования');
        return;
    }

    try {
        // Формирование промисов для всех проектов
        const requests = projectNames.map(name => {
            return new Promise(async (resolve) => {
                try {
                    const response = await reservesModel.getProjectData(name);
                    resolve({ response, projectName: name });
                } catch (error) {
                    console.error(`Ошибка при получении данных для ${name}:`, error.message);
                    resolve({ error, projectName: name });
                }
            });
        });

        // Выполнение всех промисов параллельно
        await Promise.all(requests).then(() => {
            totalRequests.add(projectNames.length);
        }).catch(error => {
            console.error('Ошибка выполнения запросов:', error.message);
        });
    } catch (error) {
        console.error('Общая ошибка выполнения теста:', error.message);
    }
} 