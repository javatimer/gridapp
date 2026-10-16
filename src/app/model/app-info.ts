
export interface AppInfo {
    message: string;
    environment: string;
    appversion: string;
    grailsversion: string;
    groovyversion: string;
    jvmversion: string;
    reloadingagentenabled: boolean;
    artefacts: {
        controllers: number;
        domains: number;
        services: number;
    };
    controllers: {
        name: string;
        logicalPropertyName: string;
    }[];
    plugins: {
        name: string;
        version: string;
    }[];
}
