const mongoose = require('mongoose');
const { Schema } = mongoose;

const Post = mongoose.model(
	'Posts',
	new Schema(
		{
			author: { type: Schema.ObjectId, ref: 'Users' },
			comments: {
				type: [
					{
						user: { type: Schema.ObjectId, ref: 'Users' },
						text: String,
					},
				],
				default: [],
			},
			likers: {
				type: [{ type: Schema.ObjectId, ref: 'Users' }],
				default: [],
			},
			text: {
				type: String,
				trim: true,
				default: '',
			},
			file: {
				type: String,
				default: '',
			},
			userSaved: {
				type: [String],
				default: [],
			},
		},
		{ timestamps: true }
	)
);
module.exports = Post;
