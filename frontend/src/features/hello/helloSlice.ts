import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { helloService, type HelloResponse } from "../../api/endpoints/hello";

type HelloState = {
    data: HelloResponse | null;
    status: "idle" | "loading" | "succeeded" | "failed";
    error: string | null;
};

const initialState: HelloState = {
    data: null,
    status: "idle",
    error: null,
};

export const fetchHello = createAsyncThunk("hello/fetchHello", async () => {
    return await helloService.getHello();
});

const helloSlice = createSlice({
    name: "hello",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchHello.pending, (state) => {
                state.status = "loading";
                state.error = null;
            })
            .addCase(fetchHello.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.data = action.payload;
            })
            .addCase(fetchHello.rejected, (state, action) => {
                state.status = "failed";
                state.error = action.error.message ?? "Unknown error";
            });
    },
});

export default helloSlice.reducer;
