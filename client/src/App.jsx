import React, { useEffect, useState } from "react";
import "./App.css"; 
import Square from "./Square/Square"; // Import the Square component to render individual squares
import { io } from "socket.io-client"; // Import socket.io client to handle WebSocket connections
import Swal from "sweetalert2"; // Import SweetAlert2 for displaying alerts

// Initial state of the board
const initialBoardState = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const App = () => {
  const [boardState, setBoardState] = useState(initialBoardState); // Stores the state of the game board
  const [currentPlayer, setCurrentPlayer] = useState("circle"); // Stores the current player ('circle' or 'cross')
  const [gameFinished, setGameFinished] = useState(false); // Indicates whether the game is finished
  const [winningCells, setWinningCells] = useState([]); // Stores the winning cells
  const [playOnline, setPlayOnline] = useState(false); // Boolean to indicate if the player is playing online
  const [socket, setSocket] = useState(null); // Socket connection
  const [playerName, setPlayerName] = useState(""); // Player's name
  const [opponentName, setOpponentName] = useState(null); // Opponent's name
  const [playingAs, setPlayingAs] = useState(null); // Indicates whether the player is 'circle' or 'cross'

  // Function to check the winner of the game
  const checkWinner = () => {
    // Check rows
    for (let i = 0; i < boardState.length; i++) {
      if (
        boardState[i][0] === boardState[i][1] &&
        boardState[i][1] === boardState[i][2]
      ) {
        setWinningCells([i * 3, i * 3 + 1, i * 3 + 2]); // Set the winning cells
        return boardState[i][0]; // Return the winner ('circle' or 'cross')
      }
    }
  
    // Check columns
    for (let i = 0; i < boardState[0].length; i++) {
      if (
        boardState[0][i] === boardState[1][i] &&
        boardState[1][i] === boardState[2][i]
      ) {
        setWinningCells([0 * 3 + i, 1 * 3 + i, 2 * 3 + i]); // Set the winning cells
        return boardState[0][i]; // Return the winner ('circle' or 'cross')
      }
    }
  
    // Check diagonal (top-left to bottom-right)
    if (
      boardState[0][0] === boardState[1][1] &&
      boardState[1][1] === boardState[2][2]
    ) {
      setWinningCells([0, 4, 8]); // Set the winning cells for this diagonal
      return boardState[0][0]; // Return the winner ('circle' or 'cross')
    }
  
    // Check diagonal (top-right to bottom-left)
    if (
      boardState[0][2] === boardState[1][1] &&
      boardState[1][1] === boardState[2][0]
    ) {
      setWinningCells([2, 4, 6]); // Set the winning cells for this diagonal
      return boardState[0][2]; // Return the winner ('circle' or 'cross')
    }
  
    // Check for draw (all cells are filled)
    const isDraw = boardState
      .flat()
      .every((cell) => cell === "circle" || cell === "cross");
    return isDraw ? "draw" : null; // Return "draw" if it's a draw, otherwise return null
  };

  // useEffect hook to check for a winner every time the boardState changes
  useEffect(() => {
    const winner = checkWinner();
    if (winner) {
      setGameFinished(winner); // If there's a winner, update gameFinished state
    }
  }, [boardState]); // Dependency array ensures it runs whenever boardState changes

  // Function to prompt the player to enter their name using SweetAlert2
  const promptPlayerName = async () => {
    const result = await Swal.fire({
      title: "Enter your name",
      input: "text",
      showCancelButton: true,
      inputValidator: (value) =>
        !value ? "You need to write something!" : null,
    });
    return result;
  };

  useEffect(() => {
    if (socket) {
      // Event when opponent leaves the match
      socket.on("opponent_left_match", () => {
        setGameFinished("opponent_left_match"); // Set gameFinished to "opponent_left_match" when opponent leaves
      });

      // Event when the opponent makes a move
      socket.on("player_move_from_server", (data) => {
        const { id, sign } = data.state; // Get the move details from server
        setBoardState((prev) => {
          const updatedState = [...prev]; // Copy the current board state
          updatedState[Math.floor(id / 3)][id % 3] = sign; // Update the board with the opponent's move
          return updatedState; // Return the updated board state
        });
        setCurrentPlayer(sign === "circle" ? "cross" : "circle"); // Switch the current player
      });

      // Event when no opponent is found
      socket.on("opponent_not_found", () => setOpponentName(false));

      // Event when an opponent is found
      socket.on("opponent_found", (data) => {
        setPlayingAs(data.playingAs); // Set the player's sign (circle or cross)
        setOpponentName(data.opponentName); // Set the opponent's name
      });

      // Event when socket connects
      socket.on("connect", () => setPlayOnline(true)); // Set playOnline to true when the socket connection is established
    }
  }, [socket]); // Dependency array ensures it runs when socket state changes

  // Function to handle online play (initiate socket connection and prompt for player name)
  const handlePlayOnline = async () => {
    const result = await promptPlayerName(); // Prompt player to enter their name
    if (!result.isConfirmed) return; // If user cancels, return early

    setPlayerName(result.value); // Set the player's name in state

    const newSocket = io("http://localhost:3000"); // Create a new socket connection
    newSocket.emit("request_to_play", { playerName: result.value }); // Emit a request to play with the server
    setSocket(newSocket); // Set the socket state
  };

  // If the player is not playing online, show the "Play Online" button
  if (!playOnline) {
    return (
      <div className="main-div">
        <button onClick={handlePlayOnline} className="playOnline">
          Play Online
        </button>
      </div>
    );
  }

  // If waiting for an opponent, display a waiting message
  if (playOnline && !opponentName) {
    return (
      <div className="waiting">
        <p>Waiting for Opponent...</p>
      </div>
    );
  }

  return (
    <div className="main-div">
      <div className="move-detection">
        {/* Display the player's and opponent's name */}
        <div
          className={`left ${
            currentPlayer === playingAs ? `current-move-${currentPlayer}` : ""
          }`}
        >
          {playerName}
        </div>
        <div
          className={`right ${
            currentPlayer !== playingAs ? `current-move-${currentPlayer}` : ""
          }`}
        >
          {opponentName}
        </div>
      </div>

      {/* Game heading */}
      <h1 className="game-heading water-background">Tic Tac Toe</h1>

      {/* Render the game board */}
      <div className="square-wrapper">
        {boardState.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Square
              id={rowIndex * 3 + colIndex} // Calculate the square id
              socket={socket} // Pass the socket connection
              playingAs={playingAs} // Pass the player's sign
              currentElement={cell} // Pass the current value of the square (empty, 'circle', or 'cross')
              gameFinished={gameFinished} // Pass whether the game is finished
              currentPlayer={currentPlayer} // Pass the current player
              setCurrentPlayer={setCurrentPlayer} // Pass the function to set the current player
              setBoardState={setBoardState} // Pass the function to update the board state
              winningCells={winningCells} // Pass the winning cells to highlight the winner
            />
          ))
        )}
      </div>

      {/* Display the game result */}
      {gameFinished && gameFinished !== "opponent_left_match" && (
        <h3 className="finished-state">
          {gameFinished === "draw"
            ? "It's a Draw!" // If it's a draw
            : gameFinished === playingAs
            ? "You won!" // If the player won
            : `${opponentName} won!`}  
        </h3> // If the opponent won
      )}

      {/* Display message if opponent leaves */}
      {gameFinished === "opponent_left_match" && (
        <h3 className="finished-state">
          You won! Opponent has left the match.
        </h3>
      )}

      {/* Display who the player is playing against */}
      {!gameFinished && <h2>You are playing against {opponentName}</h2>}
    </div>
  );
};

export default App;
