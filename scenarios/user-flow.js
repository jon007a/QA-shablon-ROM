import { UserModel } from '../models/UserModel.js';
import { CONFIG } from '../config/config.js';
import { group } from 'k6';

// Инициализация конфигурации теста
export const options = {
    ...CONFIG.defaults,
    tags: {
        testType: 'user-flow',
    },
};

// Создание тестовых данных
const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
};

export default function() {
    const userModel = new UserModel('development');
    let userId;

    group('User Creation Flow', function() {
        // Создание пользователя
        const createResponse = userModel.createUser(testUser);
        if (createResponse.status === 201) {
            const userData = userModel.parseResponse(createResponse);
            userId = userData.id;
        }

        // Получение информации о пользователе
        if (userId) {
            userModel.getUser(userId);
        }

        // Обновление пользователя
        if (userId) {
            userModel.updateUser(userId, {
                ...testUser,
                name: 'Updated Test User',
            });
        }

        // Получение постов пользователя
        if (userId) {
            userModel.getUserPosts(userId);
        }

        // Удаление пользователя
        if (userId) {
            userModel.deleteUser(userId);
        }
    });
} 