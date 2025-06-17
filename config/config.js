export const CONFIG = {
    // Настройки InfluxDB
    influxDB: {
        url: 'http://158.160.147.11:30086',
        token: __ENV.INFLUXDB_TOKEN || 'TktS_DpjT9vs-1bRfEMnoBTplZhkE0nP96V86OGS2VNBan-8xXQWuemrDCm6VXUke2DXLq1-LnOY96I4ISF88Q==',
        org: __ENV.INFLUXDB_ORG || 'myorg',
        bucket: __ENV.INFLUXDB_BUCKET || 'five',
    },

    // Общие настройки тестирования
    defaults: {
        // Настройки нагрузки
        stages: [
            { duration: '3m', target: 500 },
            //{ duration: '1m', target: 180 },
            //{ duration: '1m', target: 100 },
        ],
    },

    // Настройки для различных окружений
    environments: {
        development: {
            baseUrl: 'http://10.11.183.212:16000',
        },
        staging: {
            baseUrl: 'http://10.11.183.212:16000',
        },
        production: {
            baseUrl: 'http://10.11.183.212:16000',
        },
    },

    // Специфичные настройки для reserves API
    reserves: {
        excludeProjects: ['Синергия 4.2.1'],
        defaultLimit: 500,
        defaultOffset: 0,
        timeout: '300s',
    },
}; 