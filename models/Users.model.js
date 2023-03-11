const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = mongoose.model(
	'Users',
	new Schema(
		{
			fullname: {
				type: String,
				require: true,
			},
			username: {
				type: String,
				require: true,
				unique: true,
			},
			email: {
				type: String,
				require: true,
				unique: true,
			},
			password: {
				type: String,
				require: true,
			},
			gender: {
				type: Boolean,
				require: true,
			},
			avatar: {
				type: String,
				default:
					'https://res.cloudinary.com/dlvk5v5jr/image/upload/v1656087346/cover_qk86qy.png',
			},
			onLive: {
				type: Boolean,
				default: false,
			},
		},
		{ timestamps: true }
	)
);
module.exports = User;
