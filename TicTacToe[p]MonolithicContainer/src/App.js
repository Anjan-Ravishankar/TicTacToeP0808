import React, { useState, useEffect, useRef } from "react";
import "./App.css";

/** Constants */
const EMPTY_BOARD = Array(9).fill(null);
const AI_DIFFICULTY = {
  HUMAN: "Human",
  EASY: "Easy (Random)",
  HARD: "Advanced AI"
};
const PLAYER_MARK = {
  X: "X",
  O: "O"
};
const COLOR_MODES = {
  NORMAL: "normal",
  COLOR_BLIND: "color-blind"
};

/** Helper functions */
// PUBLIC_INTERFACE
function calculateWinner(squares) {
  /** Checks if there's a winner in the board.
   *  Returns {winner: "X"|"O"|null, line: [number]|null}
   */
  const lines = [
    [0, 1, 2],[3, 4, 5],[6, 7, 8], // rows
    [0, 3, 6],[1, 4, 7],[2, 5, 8], // cols
    [0, 4, 8],[2, 4, 6] // diagonals
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return { winner: squares[a], line };
    }
  }
  return { winner: null, line: null };
}

// PUBLIC_INTERFACE
function isDraw(squares) {
  /** Checks if the board is a draw (no empty squares, no winner) */
  return squares.every(Boolean) && !calculateWinner(squares).winner;
}

// PUBLIC_INTERFACE
function getAvailableMoves(squares) {
  /** Returns indexes of available (empty) cells */
  return squares
    .map((v, idx) => (v == null ? idx : null))
    .filter((v) => v !== null);
}

// PUBLIC_INTERFACE
function randomAIMove(squares) {
  /** Basic AI - picks a random empty cell */
  const moves = getAvailableMoves(squares);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// PUBLIC_INTERFACE
function advancedAIMove(squares, aiMark, playerMark) {
  /** Advanced AI using minimax for perfect play. */
  function minimax(board, depth, isMax) {
    const { winner } = calculateWinner(board);
    if (winner === aiMark) return { score: 10 - depth };
    if (winner === playerMark) return { score: depth - 10 };
    if (board.every(Boolean)) return { score: 0 };
    let best;
    if (isMax) {
      best = { score: -Infinity, idx: null };
      for (let idx of getAvailableMoves(board)) {
        const copy = [...board];
        copy[idx] = aiMark;
        const result = minimax(copy, depth + 1, false);
        if (result.score > best.score) {
          best = { score: result.score, idx };
        }
      }
    } else {
      best = { score: Infinity, idx: null };
      for (let idx of getAvailableMoves(board)) {
        const copy = [...board];
        copy[idx] = playerMark;
        const result = minimax(copy, depth + 1, true);
        if (result.score < best.score) {
          best = { score: result.score, idx };
        }
      }
    }
    return best;
  }
  return minimax(squares, 0, true).idx;
}

// PUBLIC_INTERFACE
function loadStatsFromStorage() {
  /** Gets stats from localStorage or default stats. */
  try {
    const raw = localStorage.getItem("TicTacToeStats");
    if (!raw) throw new Error();
    const obj = JSON.parse(raw);
    return {
      played: obj.played || 0,
      won: obj.won || 0,
      lost: obj.lost || 0,
      draw: obj.draw || 0,
      ai: obj.ai || { easy: { won: 0, lost: 0, draw: 0 }, hard: { won: 0, lost: 0, draw: 0 } }
    };
  } catch {
    return {
      played: 0, won: 0, lost: 0, draw: 0,
      ai: { easy: { won: 0, lost: 0, draw: 0 }, hard: { won: 0, lost: 0, draw: 0 } }
    };
  }
}

// PUBLIC_INTERFACE
function saveStatsToStorage(stats) {
  /** Saves stats to localStorage */
  try {
    localStorage.setItem("TicTacToeStats", JSON.stringify(stats));
  } catch {
    // Ignore errors
  }
}

/** Color-blind board marks */
const COLOR_MAP = {
  normal: { X: "#1976d2", O: "#e87a41" },
  "color-blind": { X: "#1565c0", O: "#6d4c41" } // blue X, brown O
};

/** Accessibility: Announce changes for screen readers */
function useLiveRegion() {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const announce = (msg, timeout = 2500) => {
    setMessage("");
    window.requestAnimationFrame(() => {
      setMessage(msg);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(""), timeout);
    });
  };

  return [message, announce];
}

/** Game Board Square component */
function Square({
  value,
  onClick,
  isHighlight,
  isActive,
  ariaLabel,
  tabIndex,
  disabled,
  colorMode,
  ...rest
}) {
  return (
    <button
      className={`ttt-square${isHighlight ? " highlight" : ""}${
        isActive ? " active-focus" : ""
      }`}
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      disabled={disabled}
      style={{ color: value ? COLOR_MAP[colorMode][value] : undefined }}
      {...rest}
    >
      <span aria-hidden="true" style={{ fontWeight: "bold" }}>
        {value}
      </span>
    </button>
  );
}

/** Full Game Board grid */
function Board({
  squares,
  onSquareClick,
  winningLine,
  boardActive,
  focusIndex,
  setFocusIndex,
  colorMode,
  tabFocusEnabled,
  boardRef
}) {
  // Keyboard navigation for accessibility (arrow keys, enter/space)
  function handleKeyDownBoard(e) {
    if (!tabFocusEnabled) return;
    // Flat 3x3 grid, indexes 0-8
    const ROWS = 3,
      COLS = 3;
    let next = focusIndex;
    switch (e.key) {
      case "ArrowRight":
        next = (focusIndex + 1) % 9;
        break;
      case "ArrowLeft":
        next = (focusIndex + 8) % 9;
        break;
      case "ArrowUp":
        next = (focusIndex + 6) % 9;
        break;
      case "ArrowDown":
        next = (focusIndex + 3) % 9;
        break;
      case "Enter":
      case " ":
        if (
          boardActive &&
          !squares[focusIndex] &&
          typeof onSquareClick === "function"
        )
          onSquareClick(focusIndex);
        return;
      default:
        return;
    }
    setFocusIndex(next);
    e.preventDefault();
    if (boardRef&&boardRef.current) {
      const btn = boardRef.current.querySelectorAll("button")[next];
      if (btn) btn.focus();
    }
  }

  return (
    <div
      className="ttt-board"
      role="grid"
      aria-label="Tic Tac Toe game grid"
      tabIndex={tabFocusEnabled ? 0 : -1}
      onKeyDown={handleKeyDownBoard}
      ref={boardRef}
      style={{
        outline: "none",
      }}
    >
      {Array(3)
        .fill(null)
        .map((_, r) => (
          <div className="ttt-row" role="row" key={`row-${r}`}>
            {Array(3)
              .fill(null)
              .map((_, c) => {
                const idx = r * 3 + c;
                return (
                  <Square
                    key={idx}
                    value={squares[idx]}
                    onClick={() => boardActive && !squares[idx] && onSquareClick(idx)}
                    isHighlight={
                      winningLine && winningLine.includes(idx)
                    }
                    isActive={focusIndex === idx && tabFocusEnabled}
                    ariaLabel={
                      squares[idx]
                        ? `${squares[idx]} piece at row ${r + 1}, column ${
                            c + 1
                          }`
                        : `Empty cell row ${r + 1} column ${c + 1}, click to place`
                    }
                    tabIndex={tabFocusEnabled ? 0 : -1}
                    disabled={!boardActive || !!squares[idx]}
                    colorMode={colorMode}
                  />
                );
              })}
          </div>
        ))}
    </div>
  );
}

/** Statistics Panel */
function StatsPanel({ stats, onReset }) {
  return (
    <section
      className="ttt-stats-panel"
      aria-label="Statistics"
      tabIndex={0}
    >
      <h3>Statistics</h3>
      <ul>
        <li>
          <strong>Games Played:</strong> {stats.played}
        </li>
        <li>
          <strong>Won:</strong> {stats.won}
        </li>
        <li>
          <strong>Lost:</strong> {stats.lost}
        </li>
        <li>
          <strong>Draw:</strong> {stats.draw}
        </li>
        <li>
          <details>
            <summary>AI vs You Details</summary>
            <ul>
              <li>
                <strong>Easy AI –</strong> Win: {stats.ai?.easy.won}
                , Lose: {stats.ai?.easy.lost}, Draw: {stats.ai?.easy.draw}
              </li>
              <li>
                <strong>Advanced AI –</strong> Win: {stats.ai?.hard.won}
                , Lose: {stats.ai?.hard.lost}, Draw: {stats.ai?.hard.draw}
              </li>
            </ul>
          </details>
        </li>
      </ul>
      <button
        className="ttt-reset-stats-btn"
        onClick={onReset}
        aria-label="Reset statistics"
      >
        Reset Stats
      </button>
    </section>
  );
}

/** Accessibility: Short Documentation panel */
function AccessibilityDoc({ onClose }) {
  return (
    <div className="ttt-accessibility-modal" role="dialog" aria-modal="true">
      <div className="ttt-accessibility-content">
        <h2>Accessibility Quick Reference</h2>
        <ul>
          <li>All actions support keyboard: use Tab &rarr;/Shift+Tab to cycle, arrow keys to move on grid, Enter/Space to play.</li>
          <li>Screen reader labels are present for board, status, menus.</li>
          <li>Color-blind-friendly mode can be enabled.</li>
          <li>
            High contrast (dark mode) and normal mode. Toggle in top right.
          </li>
          <li>
            Use <kbd>Alt+A</kbd> to open/close Accessibility Info.
          </li>
        </ul>
        <button
          className="ttt-doc-close"
          onClick={onClose}
          aria-label="Close accessibility info"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      tabIndex={0}
    >
      {theme === "light" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}

function ColorBlindToggle({ colorMode, setColorMode }) {
  return (
    <button
      className="ttt-color-blind-toggle"
      aria-label={`Toggle color-blind mode (currently: ${
        colorMode === "normal" ? "Normal" : "Color-blind friendly"
      })`}
      onClick={() =>
        setColorMode(colorMode === "normal" ? "color-blind" : "normal")
      }
      tabIndex={0}
    >
      {colorMode === "normal" ? "Color Blind Mode" : "Normal Colors"}
    </button>
  );
}

/** Main App */
// PUBLIC_INTERFACE
function App() {
  // --- THEME ---
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // --- COLOR MODE (accessibility) ---
  const [colorMode, setColorMode] = useState(COLOR_MODES.NORMAL);

  // --- AI Difficulty settings ---
  const [ai1, setAi1] = useState(AI_DIFFICULTY.HUMAN);
  const [ai2, setAi2] = useState(AI_DIFFICULTY.HUMAN);

  // --- Board and Game State ---
  const [squares, setSquares] = useState([...EMPTY_BOARD]);
  const [xIsNext, setXIsNext] = useState(true);
  const [gameMode, setGameMode] = useState("2P");
  const [statusMsg, setStatusMsg] = useState("");
  const [movePending, setMovePending] = useState(false);

  // --- Accessibility ---
  const [liveMsg, announce] = useLiveRegion();
  const [accDocOpen, setAccDocOpen] = useState(false);

  // --- Statistics Management ---
  const [stats, setStats] = useState(loadStatsFromStorage());

  // --- Board Focus for Keyboard Navigation ---
  const [focusIndex, setFocusIndex] = useState(0);
  const [tabFocus, setTabFocus] = useState(true);
  const boardRef = useRef(null);

  // --- Effect: Save stats on change ---
  useEffect(() => { saveStatsToStorage(stats); }, [stats]);

  // --- Effect: Reset board when game mode/AI changes ---
  useEffect(() => {
    handleGameReset();
    // eslint-disable-next-line
  }, [gameMode, ai1, ai2, colorMode]);

  // --- Computed values ---
  const { winner, line: winLine } = calculateWinner(squares);
  const draw = !winner && isDraw(squares);
  const playerMark = xIsNext ? PLAYER_MARK.X : PLAYER_MARK.O;
  const aiInfo =
    gameMode === "HUMAN-VS-EASY"
      ? { ai: PLAYER_MARK.O, aiType: "easy" }
      : gameMode === "HUMAN-VS-HARD"
      ? { ai: PLAYER_MARK.O, aiType: "hard" }
      : gameMode === "EASY-VS-HARD"
      ? { ai: PLAYER_MARK.X, ai2: PLAYER_MARK.O, aiType: "easy", aiType2: "hard" }
      : {};

  // --- Effect: Real-time status & announcer ---
  useEffect(() => {
    if (winner) {
      setStatusMsg(
        `Winner: Player ${winner === PLAYER_MARK.X ? "X" : "O"}`
      );
      announce(`Game over. Winner is ${winner}`);
      updateStats(winner);
    } else if (draw) {
      setStatusMsg("Draw! Nobody wins.");
      announce("Game over. Draw!");
      updateStats(null);
    } else {
      let msg = `Turn: Player ${playerMark}`;
      if (gameMode !== "2P" &&
        ((aiInfo.ai && playerMark === aiInfo.ai) ||
        (aiInfo.ai2 && playerMark === aiInfo.ai2))
      ) {
        msg = `AI's turn (${playerMark})`;
      }
      setStatusMsg(msg);
      announce(msg, 1200);
    }
    // Disable movePending after move is resolved.
    if (movePending) setMovePending(false);
    // eslint-disable-next-line
  }, [winner, draw, xIsNext, gameMode, squares]);

  // --- Effect: Handle AI Moves ---
  useEffect(() => {
    // Only when it’s AI’s turn, not over, and not already pending.
    let timeout;
    if (
      !winner &&
      !draw &&
      !movePending &&
      (gameMode !== "2P" &&
        ((aiInfo.ai && playerMark === aiInfo.ai) ||
        (aiInfo.ai2 && (playerMark === aiInfo.ai || playerMark === aiInfo.ai2)))
      )
    ) {
      setMovePending(true);
      timeout = setTimeout(() => {
        let moveIdx;
        if (
          (aiInfo.ai && playerMark === aiInfo.ai && aiInfo.aiType === "easy") ||
          (aiInfo.ai2 && playerMark === aiInfo.ai2 && aiInfo.aiType2 === "easy")
        ) {
          moveIdx = randomAIMove(squares);
        } else {
          const aiMark =
            aiInfo.ai && playerMark === aiInfo.ai
              ? aiInfo.ai
              : aiInfo.ai2 && playerMark === aiInfo.ai2
              ? aiInfo.ai2
              : PLAYER_MARK.O;
          const humanMark = aiMark === PLAYER_MARK.X ? PLAYER_MARK.O : PLAYER_MARK.X;
          moveIdx = advancedAIMove(squares, aiMark, humanMark);
        }
        handleMove(moveIdx);
      }, 700);
    }
    return () => clearTimeout(timeout);
    // eslint-disable-next-line
  }, [xIsNext, winner, draw, movePending, gameMode, aiInfo, squares, playerMark]);

  // PUBLIC_INTERFACE
  function handleMove(idx) {
    // Ignore if not player's turn or square filled
    if (squares[idx] != null || winner || draw) return;
    const newSquares = [...squares];
    newSquares[idx] = playerMark;
    setSquares(newSquares);
    setXIsNext((x) => !x);
    setFocusIndex(idx); // For focus restoration
  }

  // PUBLIC_INTERFACE
  function handleGameReset() {
    setSquares([...EMPTY_BOARD]);
    setXIsNext(true);
    setStatusMsg("");
    setMovePending(false);
    setFocusIndex(0);
  }

  // PUBLIC_INTERFACE
  function updateStats(gameWinner) {
    // Only update if game finished
    if (!winner && !draw) return;
    let upd = { ...stats };
    upd.played += 1;
    if (gameWinner === null) {
      upd.draw += 1;
      if (gameMode === "HUMAN-VS-EASY")
        upd.ai.easy.draw += 1;
      if (gameMode === "HUMAN-VS-HARD")
        upd.ai.hard.draw += 1;
    } else if (gameWinner === PLAYER_MARK.X) {
      if (
        (gameMode === "2P" && !upd.won) ||
        (gameMode === "HUMAN-VS-EASY" && xIsNext) ||
        (gameMode === "HUMAN-VS-HARD" && xIsNext)
      ) {
        // X is player1 and starts
        upd.won += 1;
      } else {
        upd.lost += 1;
      }
      if (gameMode === "HUMAN-VS-EASY") {
        if (gameWinner === aiInfo.ai) upd.ai.easy.lost += 1;
        else upd.ai.easy.won += 1;
      }
      if (gameMode === "HUMAN-VS-HARD") {
        if (gameWinner === aiInfo.ai) upd.ai.hard.lost += 1;
        else upd.ai.hard.won += 1;
      }
      if (gameMode === "EASY-VS-HARD") {
        // AI vs AI special logic
        if (gameWinner === PLAYER_MARK.X) upd.ai.easy.won += 1;
        else upd.ai.hard.won += 1;
      }
    } else if (gameWinner === PLAYER_MARK.O) {
      if (
        (gameMode === "2P" && upd.lost === stats.lost) ||
        (gameMode === "HUMAN-VS-EASY" && !xIsNext) ||
        (gameMode === "HUMAN-VS-HARD" && !xIsNext)
      ) {
        // The 'lost' logic
        upd.lost += 1;
      } else {
        upd.won += 1;
      }
      if (gameMode === "HUMAN-VS-EASY") {
        if (gameWinner === aiInfo.ai) upd.ai.easy.won += 1;
        else upd.ai.easy.lost += 1;
      }
      if (gameMode === "HUMAN-VS-HARD") {
        if (gameWinner === aiInfo.ai) upd.ai.hard.won += 1;
        else upd.ai.hard.lost += 1;
      }
      if (gameMode === "EASY-VS-HARD") {
        if (gameWinner === PLAYER_MARK.X) upd.ai.easy.won += 1;
        else upd.ai.hard.won += 1;
      }
    }
    setStats(upd);
  }

  // PUBLIC_INTERFACE
  function handleResetStats() {
    setStats({
      played: 0,
      won: 0,
      lost: 0,
      draw: 0,
      ai: { easy: { won: 0, lost: 0, draw: 0 }, hard: { won: 0, lost: 0, draw: 0 } }
    });
  }

  // Keyboard accessibility: Open access doc with Alt+A; return focus
  useEffect(() => {
    const handler = e => {
      if (e.altKey && e.key.toLowerCase() === "a") {
        setAccDocOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus restoration for accessibility after modal & moves
  useEffect(() => {
    if (!accDocOpen && boardRef.current) {
      const btns = boardRef.current.querySelectorAll("button");
      if (btns[focusIndex]) btns[focusIndex].focus();
    }
    // eslint-disable-next-line
  }, [accDocOpen]);

  // --- COMPONENT RENDER ---
  // DEBUG: Try to always show a root banner to prove React renders at all
  // Remove once confirmed visible!
  return (
    <div className="App ttt-root">
      <div style={{
        background: "yellow",
        color: "black",
        position: "fixed",
        top: 0, left: 0, width: "100%", zIndex: 9999, fontSize: 18, fontWeight: "bold", textAlign: "center"
      }}>
        DEBUG: React App is Rendering. If you see this, React/root mounting is working!
      </div>
      <header className="ttt-header App-header" tabIndex={-1}>
        <ThemeToggle theme={theme} onToggle={() => setTheme(t => (t === "light" ? "dark" : "light"))} />
        <ColorBlindToggle colorMode={colorMode} setColorMode={setColorMode} />
        <button
          className="ttt-acc-doc-btn"
          aria-label="Show accessibility instructions (Alt+A)"
          tabIndex={0}
          onClick={() => setAccDocOpen(true)}
        >
          Accessibility Info
        </button>
        <h1 className="ttt-title">Tic Tac Toe</h1>
        <div
          className="ttt-status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={0}
          style={{ fontWeight: winner || draw ? "bold" : "normal" }}
        >
          {statusMsg}
        </div>
        <GameModeSelector
          value={gameMode}
          setGameMode={setGameMode}
          ai1={ai1}
          ai2={ai2}
          setAi1={setAi1}
          setAi2={setAi2}
        />
      </header>
      <main className="ttt-main" tabIndex={-1}>
        <Board
          squares={squares}
          onSquareClick={handleMove}
          winningLine={winLine}
          boardActive={!winner && !draw && !movePending}
          focusIndex={focusIndex}
          setFocusIndex={setFocusIndex}
          colorMode={colorMode}
          tabFocusEnabled={tabFocus}
          boardRef={boardRef}
        />
        <div className="ttt-controls">
          <button
            onClick={handleGameReset}
            className="ttt-reset-btn"
            aria-label="Restart Game"
            tabIndex={0}
          >
            Restart
          </button>
        </div>
        <StatsPanel stats={stats} onReset={handleResetStats} />
      </main>
      <footer className="ttt-footer">
        <LiveRegionMsg message={liveMsg} />
        <span>
          <small>
            Built for accessibility: <kbd>Tab</kbd> to navigate, <kbd>Alt+A</kbd> opens help.
          </small>
        </span>
      </footer>
      {accDocOpen && (
        <AccessibilityDoc onClose={() => setAccDocOpen(false)} />
      )}
    </div>
  );
}

// PUBLIC_INTERFACE
function GameModeSelector({ value, setGameMode, ai1, ai2, setAi1, setAi2 }) {
  return (
    <section
      className="ttt-mode-selector"
      aria-label="Game Mode Selection"
      tabIndex={0}
    >
      <label>
        <span className="ttt-label">Game Mode:</span>{" "}
        <select
          value={value}
          onChange={e => setGameMode(e.target.value)}
          aria-label="Select game mode"
        >
          <option value="2P">2 Players</option>
          <option value="HUMAN-VS-EASY">You vs AI (Easy)</option>
          <option value="HUMAN-VS-HARD">You vs AI (Advanced)</option>
          <option value="EASY-VS-HARD">AI (Easy) vs AI (Hard)</option>
        </select>
      </label>
      {value === "HUMAN-VS-EASY" && (
        <PlayerMarkInfo aiType="easy" />
      )}
      {value === "HUMAN-VS-HARD" && (
        <PlayerMarkInfo aiType="hard" />
      )}
      {value === "EASY-VS-HARD" && (
        <>
          <span>
            <strong>Left</strong>: Easy AI (<span style={{ color: COLOR_MAP.normal.X }}>X</span>) &mdash; <strong>Right</strong>: Hard AI (<span style={{ color: COLOR_MAP.normal.O }}>O</span>)
          </span>
        </>
      )}
    </section>
  );
}
function PlayerMarkInfo({ aiType }) {
  return (
    <span className="ttt-player-info" style={{ marginLeft: 8 }}>
      You (<span style={{ color: COLOR_MAP.normal.X }}>X</span>) vs&nbsp;
      {aiType === "easy" ? "Easy AI" : "Advanced AI"} (<span style={{ color: COLOR_MAP.normal.O }}>O</span>)
    </span>
  );
}

function LiveRegionMsg({ message }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden"
      }}
      tabIndex={-1}
    >
      {message}
    </div>
  );
}

export default App;
