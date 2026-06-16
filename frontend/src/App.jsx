import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "./lib/query/queryClient";
import { MswProvider } from "./components/common/MswProvider";
import { AppRouter } from "./routes/AppRouter";

function App() {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MswProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </MswProvider>
    </QueryClientProvider>
  );
}

export default App;
