import { BaseModel } from './BaseModel.js';
import { Counter, Trend } from 'k6/metrics';
import { CONFIG } from '../config/config.js';
import http from 'k6/http';

// Кастомные метрики
export const totalResponseTime = new Trend('total_response_time');
export const totalSuccessRequests = new Counter('total_success_requests');
export const totalFailureRequests = new Counter('total_failure_requests');
export const totalRequests = new Counter('total_requests');
export const uniqueProjects = new Counter('unique_projects');

export class ReservesModel extends BaseModel {
    constructor(environment = 'development') {
        super(environment);
        this.headers = {
            'accept': 'application/json'
        };
    }

    // Получение списка лимитов резервов
    getReservesLimits(limit = CONFIG.defaults.limit, offset = 0) {
        return http.get(
            `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.reservesLimits}?limit=${limit}&offset=${offset}`,
            {
                headers: this.headers,
                timeout: '300s'
            }
        );
    }

    // Получение фактических резервов по имени проекта
    getReservesFact(projectName) {
        return http.get(
            `${CONFIG.api.baseUrl}${CONFIG.api.endpoints.reservesFact}?projectName=${encodeURIComponent(projectName)}`,
            {
                headers: this.headers,
                tags: { project: projectName }
            }
        );
    }

    // Обработка результатов запроса
    processResponse(response, tags = {}) {
        const duration = response.timings.duration;
        const mergedTags = { ...CONFIG.commonTags, ...tags };

        // Добавляем время ответа
        totalResponseTime.add(duration, mergedTags);

        // Проверяем успешность
        const isStatus200 = response.status === 200;
        let isJSONValid = false;

        try {
            JSON.parse(response.body);
            isJSONValid = true;
        } catch (e) {
            isJSONValid = false;
        }

        if (isStatus200 && isJSONValid) {
            totalSuccessRequests.add(1, mergedTags);
            return true;
        } else {
            totalFailureRequests.add(1, mergedTags);
            console.error(`Ошибка ${response.status}: ${response.error || 'Нет ответа'}`);
            return false;
        }
    }

    // Извлечение имен проектов из ответа
    extractProjectNames(response) {
        try {
            const data = JSON.parse(response.body);
            const projects = data.data
                .map(p => p.projectName)
                .filter(name => name && name.trim() !== 'Синергия 4.2.1');

            // Добавляем уникальные проекты в метрики
            [...new Set(projects)].forEach(name => {
                uniqueProjects.add(1, { project: name });
            });

            return projects;
        } catch (e) {
            console.error('Ошибка извлечения projectNames:', e.message);
            return [];
        }
    }
} 