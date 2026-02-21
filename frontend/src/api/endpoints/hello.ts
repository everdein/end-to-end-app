import { httpGet } from "../client";

export type HelloResponse = {
    message: string;
    source: string;
    timestamp: number;
};

export const helloService = {
    getHello: () => httpGet<HelloResponse>("/api/hello"),
};

export default helloService;
