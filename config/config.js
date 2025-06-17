export const CONFIG = {
    // Настройки InfluxDB
    influxDB: {
        url: 'http://158.160.147.11:30086',
        token: process.env.K6_INFLUXDB_TOKEN,
        org: process.env.K6_INFLUXDB_ORGANIZATION,
        bucket: process.env.K6_INFLUXDB_BUCKET,
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
        version: process.env.APP_VERSION || 'v1.0',
        load: process.env.LOAD_PROFILE || 'nagruzka'
    },

    // Настройки тестов по умолчанию
    defaults: {
        stages: [
            { duration: '3m', target: 500 }
        ],
        limit: process.env.LIMIT || 500
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