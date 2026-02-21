import { useEffect } from "react";
import { fetchHello } from "./features/common/commonSlice";
import { useAppDispatch, useAppSelector } from "./app/hooks";

export default function App() {
    const dispatch = useAppDispatch();
    const { data, status, error } = useAppSelector((state) => state.hello);

    useEffect(() => {
        dispatch(fetchHello());
    }, [dispatch]);

    return (
        <div style={{ padding: 24 }}>
            <h1>End-to-End App</h1>

            <button onClick={() => dispatch(fetchHello())}>Refetch</button>

            {status === "loading" && <p>Loading...</p>}
            {status === "failed" && <pre>{error}</pre>}

            {status === "succeeded" && data && (
                <pre style={{ marginTop: 16 }}>
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    );
}