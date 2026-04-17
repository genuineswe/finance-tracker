import axios from 'axios';

// 1. Interface Dasar Data
export interface Transaction {
    id: number;
    description: string;
    amount: number;
    category_id: number;
    category_name?: string; // Karena ada JOIN di backend
    date: string;
    created_at?: string;
}

export interface CreateTransactionDto {
    description: string;
    amount: number;
    category_id: number;
    date: string;
}

// 2. Interface Wraper Response (Generic)
export interface ApiResponse<T> {
    status: 'success' | 'error';
    message?: string;
    data: T;
    pagination?: {
        total: number;
        totalPages: number;
        page: number;
        limit: number;
    };
}

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const transactionService = {
    // Memakai ApiResponse<Transaction[]>
    getAll: async (): Promise<ApiResponse<Transaction[]>> => {
        const response = await apiClient.get<ApiResponse<Transaction[]>>('/transactions');
        return response.data;
    },

    // Memakai ApiResponse<Transaction>
    create: async (data: CreateTransactionDto): Promise<ApiResponse<Transaction>> => {
        const response = await apiClient.post<ApiResponse<Transaction>>('/transactions', data);
        return response.data;
    },

    // Karena delete tidak mengembalikan data, kita pakai null atau any
    delete: async (id: number | string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(`/transactions/${id}`);
        return response.data;
    }
};

export default apiClient;
