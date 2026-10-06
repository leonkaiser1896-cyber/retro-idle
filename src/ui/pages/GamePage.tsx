import { useGameController } from "../../app/useGameController";
import type { GameHost } from "../../app/host/GameHost";
import { GameShell } from "../game/GameShell";

interface GamePageProps {
  host: GameHost;
}

export function GamePage({ host }: GamePageProps) {
  const controller = useGameController(host);

  if (controller.loading) {
    return (
      <main className="game-shell game-shell-centered">
        <p>Retro Business wird geladen...</p>
      </main>
    );
  }

  if (!controller.view) {
    return (
      <main className="game-shell game-shell-centered">
        <p>{controller.error ?? "Game could not be loaded."}</p>
      </main>
    );
  }

  return <GameShell controller={controller} />;
}
