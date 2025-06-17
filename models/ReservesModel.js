import { BaseModel } from './BaseModel.js';
import { Counter, Trend } from 'k6/metrics';
import { influxdbConfig, sendMetricsToInfluxDB } from '../lib/influxdb.js';

// Кастомные метрики для k6
export const totalResponseTime = new Trend('total_response_time');
export const totalSuccessRequests = new Counter('total_success_requests');
export const totalFailureRequests = new Counter('total_failure_requests');
export const totalRequests = new Counter('total_requests');
export const uniqueProjects = new Counter('unique_projects');

export class ReservesModel extends BaseModel {
    constructor(environment) {
        super(environment);
        this.endpoint = '/v1';
        this.metrics = [];
    }

    // Получение списка проектов
    async getProjectsList(limit = 500, offset = 0) {
        const startTime = new Date();
        const response = await this.get(
            `${this.endpoint}/reserves-limits?limit=${limit}&offset=${offset}`,
            {
                headers: { 'accept': 'application/json' },
                timeout: '300s'
            }
        );
        const duration = new Date() - startTime;

        // Обработка ответа
        if (response.status === 200) {
            try {
                const data = this.parseResponse(response);
                if (data?.data) {
                    // Фильтрация проектов
                    const projectNames = [...new Set(
                        data.data
                            .map(p => p.projectName)
                            .filter(name => name && name.trim() !== 'Синергия 4.2.1')
                    )];

                    // Отмечаем уникальные проекты и отправляем метрики
                    projectNames.forEach(name => {
                        uniqueProjects.add(1, { project: name });
                        this.addMetric(influxdbConfig.metrics.unique_projects, {
                            count: 1,
                            project_name: name
                        });
                    });

                    // Метрики для списка проектов
                    this.addMetric(influxdbConfig.metrics.response_time, {
                        value: duration,
                        endpoint: 'reserves-limits'
                    });

                    this.addMetric(influxdbConfig.metrics.success_requests, {
                        count: 1,
                        endpoint: 'reserves-limits'
                    });

                    // Отправляем накопленные метрики
                    this.flushMetrics();

                    return projectNames;
                }
            } catch (e) {
                console.error('Ошибка обработки ответа:', e.message);
                this.addMetric(influxdbConfig.metrics.failure_requests, {
                    count: 1,
                    endpoint: 'reserves-limits',
                    error: e.message
                });
            }
        } else {
            this.addMetric(influxdbConfig.metrics.failure_requests, {
                count: 1,
                endpoint: 'reserves-limits',
                error: `Status ${response.status}`
            });
        }

        // Отправляем метрики в случае ошибки
        this.flushMetrics();
        return [];
    }

    // Получение фактических резервов по проекту
    async getProjectReserves(projectName) {
        const startTime = new Date();
        const response = await this.get(
            `${this.endpoint}/reserves-fact?projectName=${encodeURIComponent(projectName)}`,
            {
                headers: { 'accept': 'application/json' },
                tags: { project: projectName }
            }
        );
        const duration = new Date() - startTime;

        // Обработка метрик
        totalRequests.add(1);
        this.addMetric(influxdbConfig.metrics.total_requests, {
            count: 1,
            project_name: projectName
        });
        
        // Метрики времени ответа
        totalResponseTime.add(duration);
        this.addMetric(influxdbConfig.metrics.response_time, {
            value: duration,
            endpoint: 'reserves-fact',
            project_name: projectName
        });

        // Проверка успешности
        const isStatus200 = response.status === 200;
        let isJSONValid = false;
        
        try {
            this.parseResponse(response);
            isJSONValid = true;
        } catch (e) {
            isJSONValid = false;
        }

        if (isStatus200 && isJSONValid) {
            totalSuccessRequests.add(1);
            this.addMetric(influxdbConfig.metrics.success_requests, {
                count: 1,
                endpoint: 'reserves-fact',
                project_name: projectName
            });
        } else {
            totalFailureRequests.add(1);
            this.addMetric(influxdbConfig.metrics.failure_requests, {
                count: 1,
                endpoint: 'reserves-fact',
                project_name: projectName,
                error: response.error || 'Invalid JSON'
            });
            console.error(`Ошибка ${response.status} для ${projectName}: ${response.error || 'Нет ответа'}`);
        }

        // Отправляем накопленные метрики
        this.flushMetrics();

        return response;
    }

    // Добавление метрики в очередь
    addMetric(measurement, fields, tags = {}) {
        this.metrics.push({
            measurement,
            fields,
            tags: {
                ...tags,
                environment: this.environment
            }
        });
    }

    // Отправка накопленных метрик в InfluxDB
    flushMetrics() {
        if (this.metrics.length > 0) {
            sendMetricsToInfluxDB(this.metrics);
            this.metrics = [];
        }
    }
} 