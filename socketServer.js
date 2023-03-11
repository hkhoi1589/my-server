const User = require('./models').users;
const mongoose = require('mongoose');

let users = [];

// users trung lap
const SocketServer = (socket) => {
	// Connect - Disconnect
	socket.on('joinUser', (user) => {
		let index = users.findIndex((item) => item.socketId === socket.id);
		let newUser = {
			id: user.id,
			socketId: socket.id,
			following: user.following,
			followers: user.followers,
		};
		if (index === -1) {
			users.push(newUser);
		} else {
			users[index] = newUser;
		}
	});

	socket.on('disconnect', () => {
		const data = users.find((user) => user.socketId === socket.id);
		if (data) {
			const clients = users.filter((user) =>
				data.followers.find((item) => item._id === user.id)
			);

			if (clients.length > 0) {
				clients.forEach((client) => {
					socket.to(`${client.socketId}`).emit('CheckUserOffline', data.id);
				});
			}
		}

		users = users.filter((user) => user.socketId !== socket.id);
	});

	// Likes
	socket.on('likePost', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('likeToClient', newPost);
			});
		}
	});

	socket.on('unLikePost', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('unLikeToClient', newPost);
			});
		}
	});

	// Comments
	socket.on('createComment', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));
		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('createCommentToClient', newPost);
			});
		}
	});

	socket.on('deleteComment', (newPost) => {
		const ids = [...newPost.author.followers, newPost.author._id];
		const clients = users.filter((user) => ids.some((id) => id === user.id));

		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('deleteCommentToClient', newPost);
			});
		}
	});

	// Follow
	socket.on('follow', (newUser) => {
		const user = users.find((user) => user.id === newUser._id);
		user && socket.to(`${user.socketId}`).emit('followToClient', newUser);
	});

	socket.on('unFollow', (newUser) => {
		const user = users.find((user) => user.id === newUser._id);
		user && socket.to(`${user.socketId}`).emit('unFollowToClient', newUser);
	});

	// Notification
	socket.on('createNotify', async (msg) => {
		const onlineClients = users.filter((user) =>
			msg.clientId.some((client) => client._id === user.id)
		);
		const offlineClients = msg.clientId.filter((client) =>
			users.every((user) => user.id !== client._id)
		);

		// neu clients offline
		// luu truoc vao db
		offlineClients.forEach(async (client) => {
			await User.findByIdAndUpdate(client._id, {
				$push: {
					noti: {
						user: new mongoose.Types.ObjectId(msg.userId),
						text: msg.text,
						url: msg.url,
						isRead: false,
					},
				},
			});
		});

		// neu clients online
		onlineClients.forEach(async (client) => {
			const user = await User.findByIdAndUpdate(
				client.id,
				{
					$push: {
						noti: {
							user: new mongoose.Types.ObjectId(msg.userId),
							text: msg.text,
							url: msg.url,
							isRead: false,
						},
					},
				},
				{ new: true }
			)
				.select('noti')
				.populate({
					path: 'noti',
					populate: { path: 'user', select: 'username profilePicture' },
				})
				.lean();
			socket.to(`${client.socketId}`).emit('createNotifyToClient', user.noti);
		});
	});

	// Online/Offline
	socket.on('checkUserOnline', (data) => {
		// tim followings dang online
		const following = data.following.filter((f) => users.some((user) => user.id === f._id));

		// tra ve following cho user
		socket.emit('checkUserOnlineToMe', following);

		// tim followers dang online
		const clients = users.filter((user) => data.followers.some((f) => f._id === user.id)); // can socketId

		// thong bao user dang online cho followers
		if (clients.length > 0) {
			clients.forEach((client) => {
				socket.to(`${client.socketId}`).emit('checkUserOnlineToClient', data);
			});
		}
	});
};

module.exports = SocketServer;
