import { BaseModel } from './BaseModel.js';

export class UserModel extends BaseModel {
    constructor(environment) {
        super(environment);
        this.endpoint = '/users';
    }

    // Получение списка пользователей
    async getUsers(params = {}) {
        return this.get(this.endpoint, params);
    }

    // Получение конкретного пользователя
    async getUser(userId) {
        return this.get(`${this.endpoint}/${userId}`);
    }

    // Создание пользователя
    async createUser(userData) {
        return this.post(this.endpoint, userData);
    }

    // Обновление пользователя
    async updateUser(userId, userData) {
        return this.put(`${this.endpoint}/${userId}`, userData);
    }

    // Удаление пользователя
    async deleteUser(userId) {
        return this.delete(`${this.endpoint}/${userId}`);
    }

    // Пример специфичного метода для модели пользователя
    async getUserPosts(userId) {
        return this.get(`${this.endpoint}/${userId}/posts`);
    }
} 