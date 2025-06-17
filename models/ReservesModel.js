import { BaseModel } from './BaseModel.js';
import { Counter, Trend } from 'k6/metrics';

// Кастомные метрики
export const totalResponseTime = new Trend('total_response_time');
export const totalSuccessRequests = new Counter('total_success_requests');
export const totalFailureRequests = new Counter('total_failure_requests');
export const totalRequests = new Counter('total_requests');
export const uniqueProjects = new Counter('unique_projects');

export class ReservesModel extends BaseModel {
    constructor(environment) {
        super(environment);
        this.endpoints = {
            limits: '/v1/reserves-limits',
            fact: '/v1/reserves-fact'
        };
    }

    // Получение списка проектов
    async getProjects(limit = 500) {
        const response = await this.get(
            `${this.endpoints.limits}?limit=${limit}&offset=0`,
            {
                headers: { 'accept': 'application/json' },
                timeout: '300s'
            }
        );

        let projectNames = [];

        try {
            if (response.status === 200) {
                const responseBody = response.json();
                console.log('Получен ответ от API:', JSON.stringify(responseBody, null, 2));

                if (responseBody && responseBody.data && Array.isArray(responseBody.data)) {
                    // Извлекаем уникальные projectName
                    projectNames = [...new Set(
                        responseBody.data
                            .filter(item => item.projectName && 
                                          item.projectName.trim() !== '' && 
                                          item.projectName !== 'Синергия 4.2.1')
                            .map(item => item.projectName)
                    )];

                    console.log('Найдено проектов:', projectNames.length);
                    console.log('Примеры проектов:', projectNames.slice(0, 3));

                    // Отправка метрик для уникальных проектов
                    projectNames.forEach(name => {
                        uniqueProjects.add(1, { project: name });
                    });
                } else {
                    console.error('Неверная структура ответа API:', responseBody);
                }
            } else {
                console.error('Ошибка API:', response.status, response.body);
            }
        } catch (error) {
            console.error('Ошибка при обработке ответа:', error.message);
            console.error('Тело ответа:', response.body);
        }

        return projectNames;
    }

    // Получение данных по проекту
    async getProjectData(projectName) {
        console.log('Запрос данных для проекта:', projectName);
        
        const response = await this.get(
            `${this.endpoints.fact}?projectName=${encodeURIComponent(projectName)}`,
            {
                headers: { 'accept': 'application/json' },
                tags: { project: projectName }
            }
        );

        const duration = response.timings.duration;
        totalResponseTime.add(duration);

        const isStatus200 = response.status === 200;
        let isJSONValid = false;
        try {
            JSON.parse(response.body);
            isJSONValid = true;
        } catch (e) {
            isJSONValid = false;
            console.error('Ошибка парсинга JSON для проекта', projectName, e.message);
        }

        if (isStatus200 && isJSONValid) {
            totalSuccessRequests.add(1);
            console.log('Успешный запрос для проекта:', projectName);
        } else {
            totalFailureRequests.add(1);
            console.error(`Ошибка ${response.status} для ${projectName}: ${response.error || 'Нет ответа'}`);
        }

        return response;
    }
} 