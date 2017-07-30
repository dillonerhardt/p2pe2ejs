// Set our peerjs api key
const peerApiKey = '5iebqvgngtuwstt9';

// Variable for this peer
var peer;

// Bit value for RSA key
const Bits = 1024;

// Peer Private Key
var PrivateKey;

// Public Key
var PublicKey;

// List of connected peers
var connectedPeers = {};

// List of peer public keys
var peerPublicKeys = {};

startApp();

function startApp() {
    // Create a new peer
    peer = new Peer({
        // Set API key for cloud server
        key: peerApiKey,
        // Set highest debug level (log everything!).
        debug: 3,
        // Set a logging function:
        logFunction: function() {
            var copy = Array.prototype.slice.call(arguments).join(' ');
            console.log(copy);
        }
    });
    // Show this peers id
    peer.on('open', function(id){
        document.getElementById('peerId').innerHTML = 'My id: ' + id;
    });
    // Generate Private key
    PrivateKey = cryptico.generateRSAKey(randomString.entropy(128), Bits);
    // Generate public key
    PublicKey = cryptico.publicKeyString(PrivateKey);
    // Await connections from others
    peer.on('connection', connect);
    // Console log any errors
    peer.on('error', function(err) {
        console.log(err);
    });
}

// Send a message on click
function sendMessage() {
    // Get input field element
    var inputField = document.getElementById('messageInput');
    // Get message from input field
    var message = inputField.value;
    // Make sure message isn't empty
    if(message.length <= 0) {
        return false;
    }
    // Send message
	eachActiveConnection(function(c, peerId) {
        if(c.label == 'chat') {
            // Encrypt message
            encryptedMessage = encryptMessage(message, peerId);
            // Check message is okay
            if(encryptedMessage) {
                // Send encrypted message
                c.send(encryptedMessage);
            }
        }
    });
    // Add message to view
    addMessage(message, 'Me');
    // Clear message
    inputField.value = '';
}

// Construct message html and add to view
function addMessage(message, peer) {
    // Create the message node
    var newMessage = document.createElement('div');
    // Add .message class
    newMessage.className = 'message';
    // Add the message text
    newMessage.innerHTML = peer + ': ' + message;
    // Add to view
    document.getElementById('app').appendChild(newMessage);
    return true;
}

function showAddPeerPopup() {
	document.getElementById('addPeerPopup').style.display = 'flex';
}

// Add peer from input when clicked
function addPeer() {
	// Get peer id input field
	var peerIdInput = document.getElementById('addPeerInput');
	// Get id from input field
	var peerId = peerIdInput.value;
	// Check a id has been entered
	if(peerId.length <= 0) {
		alert('No id entered');
        return false;
    }
	// Create the connection
	createConnection(peerId);
	// Clear input field
	peerIdInput.value = '';
	// Close popup
	document.getElementById('addPeerPopup').style.display = 'none';
}

// Add a public key from peer to list
function addPeerPublicKey(key, conn) {
    peerPublicKeys[conn.peer] = key;
}

// Handle a connection object.
function connect(c) {
  // Handle a chat connection.
  if (c.label === 'chat') {
    c.on('data', function(data) {
        // Decypt message
        var message = decryptMessage(data);
        // Add message to view
		addMessage(message, c.peer);
    });
	c.on('close', function() {
		alert(c.peer + ' has left the chat.');
		delete connectedPeers[c.peer];
	});
  }
  // Handle a key connection.
  if (c.label === 'key') {
    c.on('data', function(data) {
        addPeerPublicKey(data, c);
    });
    // Peer receiving connection
    c.on('open', function() {
        // Send public key
        sendPublicKey();
    });
  }
  connectedPeers[c.peer] = 1;
}

// Create a connection with a peer 
function createConnection(peerId) {
	if (!connectedPeers[peerId]) {
		// Create chat connection
		var c = peer.connect(peerId, {
			label: 'chat',
			serialization: 'none'
		});
		c.on('open', function() {
            // Handle connection
			connect(c);
		});
		c.on('error', function(err) {
            // Notify if connection error
			alert(err);
		});
        // Create key connection
		var k = peer.connect(peerId, {
			label: 'key',
			serialization: 'none'
		});
        // Peer opening connection
		k.on('open', function() {
            // Handle connection
			connect(k);
            // Send public key
            sendPublicKey();
		});
		k.on('error', function(err) {
            // Notify if connection error
			alert(err);
		});
    }
    connectedPeers[peerId] = 1;
}

// Goes through each active peer and calls function on it
function eachActiveConnection(func) {
	var checkedIds = {};
	for (peerId in connectedPeers) {
		if (!checkedIds[peerId]) {
			var conns = peer.connections[peerId];
			for (var i = 0; i < conns.length; i++) {
				var conn = conns[i];
				func(conn, peerId);
			}
		}
		checkedIds[peerId] = 1;
	}
}

function sendPublicKey() {
    eachActiveConnection(function(c) {
        if(c.label == 'key') {
            c.send(PublicKey);
        }
    });
}

// Encrypty a message with a peers public key
function encryptMessage(message, peerId) {
    // Get public key for connection
    var peerPublicKey = peerPublicKeys[peerId];
    // Encrypt message
    var result = cryptico.encrypt(message, peerPublicKey);
    // Check that encryption was successful
    if(result.status != 'success') {
        // If not alert user
        alert('Message could not be sent. Try again');
        return false;
    }
    return result.cipher;
}

// use private key to decrypt messages encrypted with public key
function decryptMessage(message) {
    return cryptico.decrypt(message, PrivateKey).plaintext;
}