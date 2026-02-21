import { httpGet, httpPost } from "../client";

export type HelloResponse = {
    message: string;
    source: string;
    timestamp: number;
};

export type HelloRequest = {
    message: string;
};

export const helloService = {
    getHello: () =>
        httpGet<HelloResponse>("/api/hello"),
    postHello: (payload: HelloRequest) =>
        httpPost<HelloResponse, HelloRequest>("/api/hello", payload),
};

export default helloService;
