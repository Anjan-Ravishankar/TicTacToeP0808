import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";

// PUBLIC_INTERFACE
describe("TicTacToe App", () => {
  test("renders main title and board", () => {
    render(<App />);
    expect(screen.getByText(/Tic Tac Toe/i)).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  test("2P mode: allows X and O moves, shows winner", () => {
    render(<App />);
    // X plays top-left, O plays top-mid, X center, O bottom-left, X bottom-right
    const squares = screen.getAllByRole("button", { name: /empty cell/i });
    fireEvent.click(squares[0]); // X
    fireEvent.click(squares[1]); // O
    fireEvent.click(squares[4]); // X
    fireEvent.click(squares[6]); // O
    fireEvent.click(squares[8]); // X wins
    expect(screen.getByText(/Winner: Player X/i)).toBeInTheDocument();
  });

  test("stats panel displays", () => {
    render(<App />);
    expect(screen.getByText(/Statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/Games Played:/i)).toBeInTheDocument();
  });

  test("color-blind toggle changes button label", () => {
    render(<App />);
    const btn = screen.getByRole("button", { name: /Toggle color-blind mode/i });
    fireEvent.click(btn);
    expect(btn).toHaveTextContent(/Normal Colors/);
  });

  test("accessibility documentation pops up", () => {
    render(<App />);
    const btn = screen.getByRole("button", { name: "Show accessibility instructions (Alt+A)" });
    fireEvent.click(btn);
    expect(screen.getByText(/Accessibility Quick Reference/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close accessibility info/i }));
    expect(screen.queryByText(/Accessibility Quick Reference/i)).not.toBeInTheDocument();
  });

  test("accessibility ANNOUNCER: live region updates on move", () => {
    render(<App />);
    const squares = screen.getAllByRole("button", { name: /empty cell/i });
    fireEvent.click(squares[0]);
    expect(screen.getByText(/Turn: Player O/i)).toBeInTheDocument();
  });
});
