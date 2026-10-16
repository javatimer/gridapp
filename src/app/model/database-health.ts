export interface DatabaseHealth {
    connected: boolean;
    database: string | null;
    version: string | null;
}