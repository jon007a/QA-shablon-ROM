import { CONFIG } from '../config/config.js';

// Конфигурация для отправки метрик в InfluxDB
export const influxdbConfig = {
    // Настройка endpoint для отправки метрик
    endpoint: `${CONFIG.influxDB.url}/api/v2/write`,
    
    // Параметры для аутентификации и указания bucket/org
    params: {
        org: CONFIG.influxDB.org,
        bucket: CONFIG.influxDB.bucket,
    },
    
    // Заголовки для аутентификации
    headers: {
        'Authorization': `Token ${CONFIG.influxDB.token}`,
    },

    // Настройка тегов по умолчанию
    tagNames: [
        'scenario',
        'group',
        'status',
        'method',
        'url',
        'name',
        'error',
    ],
};

// Форматирование метрик для InfluxDB Line Protocol
export function formatMetric(measurement, fields, tags = {}) {
    const tagSet = Object.entries(tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    
    const fieldSet = Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');

    return `${measurement},${tagSet} ${fieldSet}`;
}

// Пример использования:
/*
    const metric = formatMetric('http_request', 
        { duration: 123, status: 200 },
        { endpoint: '/users', method: 'GET' }
    );
*/ 