export const CONFIG = {
    // Настройки InfluxDB
    influxDB: {
        url: 'http://ip:port',
        token: '__INFLUXDB_TOKEN__',
        org: 'myorg',
        bucket: 'five',
    },

    // Настройки API
    api: {
        baseUrl: 'http://10.11.183.212:16000',
        endpoints: {
            reservesLimits: '/v1/reserves-limits',
            reservesFact: '/v1/reserves-fact'
        }
    },

    // Настройки тестирования
    defaults: {
        stages: [
            { duration: '3m', target: 500 }
        ],
        thresholds: {
            http_req_duration: ['p(95)<500'],
            http_req_failed: ['rate<0.01']
        }
    },

    // Настройки окружения
    environments: {
        development: {
            limit: 500,
            appVersion: 'v1.2.3',
            loadProfile: '2.500-u500'
        }
    }
}; 