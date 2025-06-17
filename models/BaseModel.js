import http from 'k6/http';
import { check, sleep } from 'k6';
import { CONFIG } from '../config/config.js';

export class BaseModel {
    constructor(environment = 'development') {
        this.baseUrl = CONFIG.environments[environment].baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    // Базовые HTTP методы
    async get(endpoint, params = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = this.handleRequest(() => http.get(url, params));
        return response;
    }

    async post(endpoint, payload, params = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = this.handleRequest(() => 
            http.post(url, JSON.stringify(payload), { 
                headers: { ...this.headers },
                ...params 
            })
        );
        return response;
    }

    async put(endpoint, payload, params = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = this.handleRequest(() => 
            http.put(url, JSON.stringify(payload), { 
                headers: { ...this.headers },
                ...params 
            })
        );
        return response;
    }

    async delete(endpoint, params = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = this.handleRequest(() => http.del(url, null, params));
        return response;
    }

    // Обработка запросов и проверка ответов
    handleRequest(requestFn) {
        const response = requestFn();
        
        // Базовые проверки
        check(response, {
            'status is 2xx': (r) => r.status >= 200 && r.status < 300,
            'response time OK': (r) => r.timings.duration < 500,
        });

        // Добавляем случайную задержку между запросами
        sleep(Math.random() * 2);

        return response;
    }

    // Утилиты для работы с данными
    parseResponse(response) {
        try {
            return JSON.parse(response.body);
        } catch (e) {
            console.error('Failed to parse response:', e);
            return null;
        }
    }

    // Методы для работы с метриками
    addCustomMetric(metric, value, tags = {}) {
        const customMetric = new Trend(metric);
        customMetric.add(value, tags);
    }
} 