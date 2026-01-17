import { useGetHelloQuery } from "./services/api";

export default function App() {
  const { data, isLoading, isError, error, refetch } = useGetHelloQuery();

  return (
    <div style={{ padding: 24 }}>
      <h1>End-to-End App</h1>

      <button onClick={() => refetch()}>Refetch</button>

      {isLoading && <p>Loading...</p>}
      {isError && <pre>{JSON.stringify(error, null, 2)}</pre>}

      {data && (
        <pre style={{ marginTop: 16 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}