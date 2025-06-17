import http from 'k6/http';
import { CONFIG } from '../config/config.js';

// Конфигурация для отправки метрик в InfluxDB
export const influxdbConfig = {
    url: CONFIG.influxDB.url || 'http://158.160.147.11:30086/',
    token: CONFIG.influxDB.token,
    org: CONFIG.influxDB.org,
    bucket: CONFIG.influxDB.bucket,
    
    // Теги по умолчанию для reserves API
    defaultTags: {
        service: 'reserves-api',
        version: __ENV.APP_VERSION || 'v1.0',
        environment: __ENV.ENV || 'development',
        load_profile: __ENV.LOAD_PROFILE || 'default'
    },
    
    // Метрики для reserves API
    metrics: {
        response_time: 'reserves_response_time',
        success_requests: 'reserves_success_requests',
        failure_requests: 'reserves_failure_requests',
        total_requests: 'reserves_total_requests',
        unique_projects: 'reserves_unique_projects'
    }
};

// Форматирование метрик для InfluxDB Line Protocol
export function formatMetric(measurement, fields, tags = {}) {
    const allTags = {
        ...influxdbConfig.defaultTags,
        ...tags
    };
    
    const tagSet = Object.entries(allTags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    
    const fieldSet = Object.entries(fields)
        .map(([key, value]) => `${key}=${typeof value === 'string' ? `"${value}"` : value}`)
        .join(',');

    return `${measurement},${tagSet} ${fieldSet}`;
}

// Функция для отправки метрик в InfluxDB
export function sendMetricsToInfluxDB(metrics) {
    const payload = metrics.map(({ measurement, fields, tags }) => 
        formatMetric(measurement, fields, tags)
    ).join('\n');

    return http.post(`${influxdbConfig.url}/api/v2/write`, payload, {
        headers: {
            'Authorization': `Token ${influxdbConfig.token}`,
            'Content-Type': 'text/plain; charset=utf-8',
        },
        params: {
            org: influxdbConfig.org,
            bucket: influxdbConfig.bucket,
            precision: 'ms'
        }
    });
}

// Пример использования:
/*
    const metric = formatMetric('http_request', 
        { duration: 123, status: 200 },
        { endpoint: '/users', method: 'GET' }
    );
*/ 