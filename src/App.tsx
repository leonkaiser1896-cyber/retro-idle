import { GamePage } from "./ui/pages/GamePage";
import type { GameHost } from "./app/host/GameHost";

interface AppProps {
  host: GameHost;
}

export default function App({ host }: AppProps) {
  return <GamePage host={host} />;
}
