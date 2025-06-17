import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// === Кастомные метрики для InfluxDB ===
export const totalResponseTime = new Trend('total_response_time');
export const totalSuccessRequests = new Counter('total_success_requests');
export const totalFailureRequests = new Counter('total_failure_requests');
export const totalRequests = new Counter('total_requests');
export const uniqueProjects = new Counter('unique_projects');

// === Теги для метрик ===
const общиеTags = {
  version: __ENV.APP_VERSION || 'v1.0',
  load: __ENV.LOAD_PROFILE || 'nagruzka'
};

// === Настройки нагрузки ===
export const options = {
  stages: [
    { duration: '3m', target: 500 },
    //{ duration: '1m', target: 180 },
   // { duration: '1m', target: 100 },
  ],
};

// === Предварительная загрузка проектов ===
let globalProjectNames = [];

export function setup() {
  const limit = __ENV.LIMIT || 500;
  const listRes = http.get(
    `http://10.11.183.212:16000/v1/reserves-limits?limit=${limit}&offset=0`,
    {
      headers: { 'accept': 'application/json' },
      timeout: '300s'
    }
  );

  // Проверка первого запроса
  check(listRes, {
    'List API status 200': (r) => r.status === 200,
    'Valid list response': (r) => !!r.json()?.data
  });

  // Извлечение уникальных проектов
  try {
    globalProjectNames = [...new Set(
      listRes.json().data
        .map(p => p.projectName)
        .filter(name => name && name.trim() !== 'Синергия 4.2.1')
    )];
  } catch (e) {
    console.error('Ошибка извлечения projectNames:', e.message);
    return { projectNames: [] };
  }

  // Отправка уникальных проектов один раз
  globalProjectNames.forEach(name => {
    uniqueProjects.add(1, { project: name });
  });

  return { projectNames: globalProjectNames };
}

// === Основной тест с Promise.all() ===
export default function (data) {
  const projectNames = data.projectNames;

  if (projectNames.length === 0) {
    console.error('Не найдены проекты для тестирования');
    return;
  }

  // Формирование промисов для всех проектов
  const requests = projectNames.map(name => {
    return new Promise((resolve) => {
      const res = http.get(
        `http://10.11.183.212:16000/v1/reserves-fact?projectName=${encodeURIComponent(name)}`,
        {
          headers: { 'accept': 'application/json' },
          tags: { project: name }
        }
      );
      resolve({ res, projectName: name });
    });
  });

  // Выполнение всех промисов параллельно
  Promise.all(requests).then(responses => {
    // Подсчёт всех запросов
    totalRequests.add(projectNames.length, общиеTags);

    // Обработка результатов
    responses.forEach(({ res, projectName }, i) => {
      const duration = res.timings.duration;

      // Время ответа
      totalResponseTime.add(duration, общиеTags);

      // Проверка успешности
      const isStatus200 = res.status === 200;
      let isJSONValid = false;
      try {
        JSON.parse(res.body);
        isJSONValid = true;
      } catch (e) {
        isJSONValid = false;
      }

      if (isStatus200 && isJSONValid) {
        totalSuccessRequests.add(1, общиеTags);
      } else {
        totalFailureRequests.add(1, общиеTags);
        console.error(`Ошибка ${res.status} для ${projectName}: ${res.error || 'Нет ответа'}`);
      }
    });
  }).catch(error => {
    console.error('Ошибка выполнения запросов:', error.message);
  });
}