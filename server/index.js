const { createServer } = require('http'); 
const { Server } = require('socket.io');

const httpServer = createServer(); 
const io = new Server(httpServer, {
    cors: { 
        origin: "http://localhost:5173",
    },
});

// Store connected users and active rooms
const allUsers = {}; // Object to store user details with socket IDs as keys
const allRooms = []; // Array to store information about active rooms (games)

// Handle new connections from clients
io.on("connection", (socket) => { // Listen for new client connections
    console.log(`User connected: ${socket.id}`);

    // Add the connected user to the user list
    allUsers[socket.id] = { // Store the user's socket, online status, and playing status
        socket, // Store the socket reference
        online: true, // Mark the user as online
        playing: false, // Mark the user as not currently playing a game
    };

    // Handle game request from the user
    socket.on("request_to_play", (data) => { // Listen for the 'request_to_play' event from the client
        const currentUser = allUsers[socket.id]; // Get the current user object using socket.id
        currentUser.playerName = data.playerName; // Set the playerName from the incoming data

        console.log(`Player ${currentUser.playerName} is looking for a match`); // Log that the player is looking for a match

        let opponentPlayer = null; // Variable to store the opponent player object

        // Find an available opponent
        for (const key in allUsers) { // Loop through all connected users
            const user = allUsers[key]; // Get the user object for each socket ID
            if (user.online && !user.playing && socket.id !== key) { // Check if the user is online, not playing, and not the same as the current user
                opponentPlayer = user; // If a match is found, set the opponent player
                break; // Break the loop once an opponent is found
            }
        }

        // If an opponent is found, set up the match
        if (opponentPlayer) {
            console.log(`Match found: ${currentUser.playerName} vs ${opponentPlayer.playerName}`); // Log that a match has been found

            // Mark both players as playing
            currentUser.playing = true; // Set the current player as playing
            opponentPlayer.playing = true; // Set the opponent player as playing

            // Create a room for the match
            allRooms.push({ // Push the room data to the allRooms array
                player1: opponentPlayer, // Assign player1
                player2: currentUser, // Assign player2
            });

            // Notify both players of the match
            opponentPlayer.socket.emit("opponent_found", { // Emit the 'opponent_found' event to the opponent with relevant details
                opponentName: currentUser.playerName, // Set the opponent's player name
                playingAs: "circle", // Set the current player as "circle"
            });

            currentUser.socket.emit("opponent_found", { // Emit the 'opponent_found' event to the current player with relevant details
                opponentName: opponentPlayer.playerName, // Set the opponent's player name
                playingAs: "cross", // Set the current player as "cross"
            });

            // Handle moves from both players
            currentUser.socket.on("player_move_from_client", (data) => { // Listen for player moves from the current player
                opponentPlayer.socket.emit("player_move_from_server", data); // Emit the move data to the opponent
            });

            opponentPlayer.socket.on("player_move_from_client", (data) => { // Listen for player moves from the opponent
                currentUser.socket.emit("player_move_from_server", data); // Emit the move data to the current player
            });
        } else {
            // If no opponent is available
            currentUser.socket.emit("opponent_not_found"); // Notify the current player that no opponent was found
            console.log(`No opponent found for ${currentUser.playerName}`); 
        }
    });

    // Handle disconnection from the user
    socket.on("disconnect", () => { // Listen for when a user disconnects
        console.log(`User disconnected: ${socket.id}`); // Log the socket ID of the disconnected user

        const currentUser = allUsers[socket.id]; // Get the current user object using socket.id
        if (!currentUser) return; // If the user does not exist, return

        currentUser.online = false; // Mark the user as offline
        currentUser.playing = false; // Mark the user as not playing

        // Notify opponent if the user was in a match
        for (let i = 0; i < allRooms.length; i++) { // Loop through all active rooms
            const { player1, player2 } = allRooms[i]; // Destructure the player1 and player2 from the room
            if (player1.socket.id === socket.id) { // If the disconnected user is player1
                player2.socket.emit("opponent_left_match"); // Notify player2 that the opponent left
                console.log(`Player ${player2.playerName} notified of opponent leaving`);
                break; // Break the loop once the opponent is notified
            }
            if (player2.socket.id === socket.id) { // If the disconnected user is player2
                player1.socket.emit("opponent_left_match"); // Notify player1 that the opponent left
                console.log(`Player ${player1.playerName} notified of opponent leaving`);
                break; // Break the loop once the opponent is notified
            }
        }

        // Clean up disconnected user
        delete allUsers[socket.id]; // Remove the user from the allUsers object
    });
});

// Start the server
httpServer.listen(3000, () => { 
    console.log("Server is listening on port 3000"); 
});
