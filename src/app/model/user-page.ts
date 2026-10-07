import { User } from "./user";

export interface UserPage {
    content: User[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
}