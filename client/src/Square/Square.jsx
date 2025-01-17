import React, { useState } from "react";
import "./Square.css";

// SVG for a circle
const circleSvg = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);

// SVG for a cross
const crossSvg = (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M19 5L5 19M5.00001 5L19 19"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    ></path>
  </svg>
);

const Square = ({
  id, // Unique identifier for the square (0 to 8)
  socket, // Socket instance to communicate moves
  playingAs, // The current player's assigned symbol ('circle' or 'cross')
  currentElement, // Current state of the square ('circle', 'cross', or null)
  gameFinished, // Boolean indicating if the game is finished
  currentPlayer, // The player whose turn it is
  setCurrentPlayer, // Function to update the current player
  setBoardState, // Function to update the board state
  winningCells, // Array of winning cells (if any)
}) => {
  const [icon, setIcon] = useState(null); // Local state to store the icon rendered in the square

  // Function to handle click events on the square
  const clickOnSquare = () => {
    // Prevent clicking if it's not the current player's turn, the game is finished, or the square is already occupied
    if (playingAs !== currentPlayer || gameFinished || currentElement === "circle" || currentElement === "cross") return;
  
    const myCurrentPlayer = currentPlayer; // Cache the current player before the move
  
    // Set the icon for the square based on the current player's symbol
    setIcon(myCurrentPlayer === "circle" ? circleSvg : crossSvg);
  
    // Emit the move to the server
    socket.emit("player_move_from_client", {
      state: {
        id, // ID of the square clicked
        sign: myCurrentPlayer, // Symbol of the current player
      },
    });
  
    // Update the current player to the opponent
    setCurrentPlayer(myCurrentPlayer === "circle" ? "cross" : "circle");
  
    // Update the board state with the move
    setBoardState((prevState) => {
      const newState = [...prevState]; // Create a shallow copy of the board state
      const rowIndex = Math.floor(id / 3); // Calculate the row index
      const colIndex = id % 3; // Calculate the column index
      newState[rowIndex][colIndex] = myCurrentPlayer; // Set the player's symbol in the square
      return newState; // Return the updated state
    });
  };  

  // Render the square
  return (
    <div
      onClick={clickOnSquare} // Attach the click handler
      className={`square 
        ${gameFinished ? "not-allowed" : ""} // Add 'not-allowed' class if the game is finished
        ${currentPlayer !== playingAs ? "not-allowed" : ""} // Add 'not-allowed' if it's not the player's turn
        ${winningCells.includes(id) ? gameFinished + "-won" : ""} // Highlight the square if it's part of the winning cells
        ${
          gameFinished && gameFinished !== playingAs ? "grey-background" : ""
        }`} // Add grey background if the player lost
    >
      {currentElement === "circle"
        ? circleSvg // Render the circle icon if the square's state is 'circle'
        : currentElement === "cross"
        ? crossSvg // Render the cross icon if the square's state is 'cross' Otherwise, render the local icon state
        : icon }  
    </div>
  );
};

export default Square;
