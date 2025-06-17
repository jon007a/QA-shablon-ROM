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

        if (response.status === 200 && response.json()?.data) {
            const projectNames = [...new Set(
                response.json().data
                    .map(p => p.projectName)
                    .filter(name => name && name.trim() !== 'Синергия 4.2.1')
            )];

            // Отправка метрик для уникальных проектов
            projectNames.forEach(name => {
                uniqueProjects.add(1, { project: name });
            });

            return projectNames;
        }

        return [];
    }

    // Получение данных по проекту
    async getProjectData(projectName) {
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
        }

        if (isStatus200 && isJSONValid) {
            totalSuccessRequests.add(1);
        } else {
            totalFailureRequests.add(1);
            console.error(`Ошибка ${response.status} для ${projectName}: ${response.error || 'Нет ответа'}`);
        }

        return response;
    }
} 