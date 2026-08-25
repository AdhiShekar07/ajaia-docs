import client from './client';
import type { User } from '../types';

export async function fetchUsers(): Promise<User[]> {
    const { data } = await client.get<User[]>('/users');
    return data;
}
