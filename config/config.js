export const CONFIG = {
    // Настройки InfluxDB
    influxDB: {
        url: 'http://158.160.147.11:30086',
        token: __ENV.K6_INFLUXDB_TOKEN,
        org: __ENV.K6_INFLUXDB_ORGANIZATION,
        bucket: __ENV.K6_INFLUXDB_BUCKET,
    },

    // Настройки API
    api: {
        baseUrl: 'http://10.11.183.212:16000',
        endpoints: {
            reservesLimits: '/v1/reserves-limits',
            reservesFact: '/v1/reserves-fact'
        }
    },

    // Общие теги
    commonTags: {
        version: __ENV.APP_VERSION || 'v1.0',
        load: __ENV.LOAD_PROFILE || 'nagruzka'
    },

    // Настройки тестов по умолчанию
    defaults: {
        stages: [
            { duration: '3m', target: 500 }
        ],
        limit: __ENV.LIMIT || 500
    },

    // Настройки для различных окружений
    environments: {
        development: {
            baseUrl: 'http://localhost:3000',
        },
        staging: {
            baseUrl: 'https://staging-api.example.com',
        },
        production: {
            baseUrl: 'https://api.example.com',
        },
    },
}; 