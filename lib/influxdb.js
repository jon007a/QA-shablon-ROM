import http from 'k6/http';
import { CONFIG } from '../config/config.js';

// Конфигурация для отправки метрик в InfluxDB
export const influxdbConfig = {
    url: CONFIG.influxDB.url,
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

    const formattedMetric = `${measurement},${tagSet} ${fieldSet}`;
    console.log('Форматированная метрика:', formattedMetric);
    return formattedMetric;
}

// Функция для отправки метрик в InfluxDB
export function sendMetricsToInfluxDB(metrics) {
    if (!metrics || metrics.length === 0) {
        console.log('Нет метрик для отправки');
        return;
    }

    console.log(`Отправка ${metrics.length} метрик в InfluxDB`);
    console.log('InfluxDB конфигурация:', {
        url: influxdbConfig.url,
        org: influxdbConfig.org,
        bucket: influxdbConfig.bucket,
        tokenLength: influxdbConfig.token ? influxdbConfig.token.length : 0
    });

    const payload = metrics.map(({ measurement, fields, tags }) => 
        formatMetric(measurement, fields, tags)
    ).join('\n');

    console.log('Подготовленные данные для отправки:', payload);

    const url = `${influxdbConfig.url}/api/v2/write`;
    console.log('URL для отправки:', url);

    const headers = {
        'Authorization': `Token ${influxdbConfig.token}`,
        'Content-Type': 'text/plain; charset=utf-8',
    };

    const params = {
        org: influxdbConfig.org,
        bucket: influxdbConfig.bucket,
        precision: 'ms'
    };

    try {
        const response = http.post(url, payload, {
            headers: headers,
            params: params,
            timeout: '10s'
        });

        console.log('Ответ от InfluxDB:', {
            status: response.status,
            body: response.body,
            headers: response.headers
        });

        if (response.status !== 204) {
            console.error('Ошибка отправки метрик в InfluxDB:', response.body);
        }

        return response;
    } catch (error) {
        console.error('Ошибка при отправке метрик:', error.message);
        throw error;
    }
}

// Пример использования:
/*
    const metric = formatMetric('http_request', 
        { duration: 123, status: 200 },
        { endpoint: '/users', method: 'GET' }
    );
*/ 