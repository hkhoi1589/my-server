// import
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const SocketServer = require('./socketServer');
const routes = require('./routes');
const db = require('./models');

dotenv.config();

const app = express();
app.use(
	cors({
		origin: '*',
	})
);
app.use(express.json());
app.use(cookieParser());
app.use(
	helmet.hsts({
		maxAge: 36000000,
	})
);

// Socket
const http = require('http');
const server = http.createServer(app); // https server
const { Server } = require('socket.io');
const io = new Server(server, {
	cors: {
		origin: '*',
	},
	transports: ['websocket'],
	allowUpgrades: false,
});

// socket io
io.on('connection', (socket) => {
	SocketServer(socket);
});

// Route
routes(app);

//connect mongodb
db.connect();

server.listen(process.env.PORT || 8080, () => {
	console.log('Server is running on port', process.env.PORT || 8080);
});
