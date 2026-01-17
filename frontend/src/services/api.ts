import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type HelloResponse = {
  message: string;
  source: string;
  timestramp: number;
};

export const api = createApi({
  reducerPath: "api",
baseQuery: fetchBaseQuery({ baseUrl: "" }),
  endpoints: (builder) => ({
    getHello: builder.query<HelloResponse, void>({
      query: () => "/api/hello",
    }),
  }),
});

export const { useGetHelloQuery } = api;