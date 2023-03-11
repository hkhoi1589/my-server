const Post = require('../models').posts;
const User = require('../models').users;
const mongoose = require('mongoose');
const { getUserId } = require('../helpers');

//get 10 posts pagination from following
exports.getAllPosts = async (req, res) => {
	let perPage = 10; // số lượng post xuất hiện trên 1 page
	const { page } = req.params;
	const userId = getUserId(req);
	try {
		// lay cac following + userId
		let followings = await User.findById(userId).select('following');
		followings = [...followings.following, new mongoose.Types.ObjectId(userId)];

		// cac post co author trong followings
		let posts = await Post.find({ author: { $in: followings } })
			.sort({ createdAt: 'desc' }) // sap xep desc
			.skip(perPage * page - perPage)
			.limit(perPage)
			.populate([
				{ path: 'author', select: 'username profilePicture' },
				{
					path: 'comments',
					populate: { path: 'user', select: 'username profilePicture' },
				},
			])
			.lean();

		const post_length = await Post.countDocuments({ author: { $in: followings } });
		return res.json({ status: 200, posts, hasNextPage: perPage * page < post_length });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

//get 10 posts from user
exports.getAllPostsByUser = async (req, res) => {
	let perPage = 10; // số lượng post xuất hiện trên 1 page
	const { page, authorId } = req.params;

	try {
		// cac post co author trong followings
		const posts = await Post.find({ author: new mongoose.Types.ObjectId(authorId) })
			.sort({ createdAt: 'desc' }) // sap xep desc
			.skip(perPage * page - perPage)
			.limit(perPage)
			.populate([
				{ path: 'author', select: 'username profilePicture' },
				{
					path: 'comments',
					populate: { path: 'user', select: 'username profilePicture' },
				},
			])
			.lean();

		const post_length = await Post.countDocuments({
			author: new mongoose.Types.ObjectId(authorId),
		});
		return res.json({ status: 200, posts, hasNextPage: perPage * page < post_length });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// get a post by id
exports.getPost = async (req, res) => {
	const { id } = req.params;

	try {
		const post = await Post.findById(id)
			.populate([
				{ path: 'author', select: 'username profilePicture' },
				{
					path: 'comments',
					populate: { path: 'user', select: 'username profilePicture' },
				},
			])
			.lean();
		if (post) {
			return res.json({ status: 200, post });
		} else {
			return res.json({ status: 404, message: 'Post is not found' });
		}
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

//create a post
exports.createPost = async (req, res) => {
	const { text, file } = req.body;
	const authorId = getUserId(req);

	if (text.length === 0 && file.length === 0)
		return res.json({ status: 400, message: 'Content is empty' });

	try {
		let newPost = new Post({ author: new mongoose.Types.ObjectId(authorId), text, file });
		await newPost.save();
		newPost = await newPost.populate([{ path: 'author', select: 'username profilePicture' }]);
		return res.json({ status: 200, message: 'Create successfully', newPost });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// update a post
exports.updatePost = async (req, res) => {
	const { id } = req.params;

	if (req.body.action === 'like') {
		try {
			const post = await Post.findByIdAndUpdate(
				id,
				{
					$push: { likers: req.body.userId },
				},
				{ new: true }
			)
				.select('likers author')
				.populate([{ path: 'author', select: 'followers' }]) // for socket
				.lean();

			if (post) {
				return res.json({ status: 200, post });
			} else {
				return res.json({ status: 404, message: 'Post is not found' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	if (req.body.action === 'dislike') {
		try {
			const post = await Post.findByIdAndUpdate(
				id,
				{
					$pull: { likers: req.body.userId },
				},
				{ new: true }
			)
				.select('likers author')
				.populate([{ path: 'author', select: 'followers' }]) // for socket
				.lean();

			if (post) {
				return res.json({ status: 200, post });
			} else {
				return res.json({ status: 404, message: 'Post is not found' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	if (req.body.action === 'addComment') {
		if (req.body.text.length === 0)
			return res.json({ status: 400, message: 'Comment is empty' });
		try {
			const post = await Post.findByIdAndUpdate(
				id,
				{
					$push: {
						comments: {
							user: new mongoose.Types.ObjectId(req.body.user),
							text: req.body.text,
						},
					},
				},
				{ new: true }
			)
				.select('comments author')
				.populate([
					{
						path: 'comments',
						populate: { path: 'user', select: 'username profilePicture' },
					},
					{ path: 'author', select: 'followers' },
				])
				.lean();

			if (post) {
				return res.json({ status: 200, post });
			} else {
				return res.json({ status: 404, message: 'Post is not found' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	if (req.body.action === 'deleteComment') {
		try {
			const cmt = await Post.findByIdAndUpdate(
				id,
				{
					$pull: {
						comments: {
							_id: req.body.commentId,
						},
					},
				},
				{ new: true }
			)
				.select('author')
				.populate([{ path: 'author', select: 'followers' }])
				.lean();

			if (cmt) {
				return res.json({
					status: 200,
					message: `Deleted comment`,
					deletedCmt: { ...cmt, commentId: req.body.commentId },
				});
			} else {
				return res.json({ status: 404, message: 'Comment is not found' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	if (req.body.action === 'editComment') {
		if (req.body.text.length === 0)
			return res.json({ status: 400, message: 'Comment is empty' });

		try {
			const post = await Post.findById(id)
				.select('comments')
				.populate({
					path: 'comments',
					populate: { path: 'user', select: 'username profilePicture' },
				});

			if (post) {
				const { comments } = post;
				const theComment = comments.find(
					(comment) => comment._id.toString() === req.body.commentId
				);

				if (!theComment) return res.json({ status: 404, message: 'Comment is not found' });
				theComment.text = req.body.text;

				await post.save();

				return res.json({ status: 200, message: `Updated comment`, post });
			} else {
				return res.json({ status: 404, message: 'Post is not found' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	try {
		if (req.body.text.length === 0 && req.body.file.length === 0)
			return res.json({ status: 400, message: 'Content is empty' });

		const post = await Post.findByIdAndUpdate(
			id,
			{ $set: { text: req.body.text, file: req.body.file } },
			{ new: true }
		)
			.select('text file')
			.lean();
		if (post) {
			return res.json({ status: 200, message: 'Updated post successfully', post });
		} else {
			return res.json({ status: 404, message: 'Post is not found' });
		}
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// delete post
exports.deletePost = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	try {
		// tim post can xoa
		const post = await Post.findById(id);
		if (!post) return res.json({ status: 404, message: 'Post is not found' });

		// loai post khoi nhung user da luu, neu co
		if (post.userSaved.length > 0) {
			post.userSaved.map(async (saveUser) => {
				await User.findByIdAndUpdate(saveUser, {
					$pull: {
						saved: {
							_id: id,
						},
					},
				});
			});
		}

		// xoa post
		await Post.findByIdAndDelete(id);

		// lay lai saved cua user moi
		let user = await User.findById(userId)
			.select('saved')
			.populate([
				{
					path: 'saved',
					populate: { path: 'author', select: 'username profilePicture' },
				},
			])
			.lean();
		return res.json({ status: 200, message: `Deleted post`, user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// save
exports.save = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	if (!userId) return res.json({ status: 404, message: 'No user ID found' });

	try {
		const post = await Post.find({ _id: id, userSaved: userId });
		if (post.length > 0)
			return res.json({ status: 400, message: 'You should unsave this post first' });

		const user = await User.findOneAndUpdate(
			{ _id: userId },
			{
				$push: { saved: new mongoose.Types.ObjectId(id) },
			},
			{ new: true }
		)
			.populate([
				{
					path: 'saved',
					populate: { path: 'author', select: 'username profilePicture' },
				},
			])
			.lean();

		await Post.findOneAndUpdate(
			{ _id: id },
			{
				$push: { userSaved: userId },
			},
			{ new: true }
		);
		return res.json({ status: 200, message: 'Saved this post', user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// unsave
exports.unsave = async (req, res) => {
	const { id } = req.params;
	const userId = getUserId(req);
	if (!userId) return res.json({ status: 404, message: 'No user ID found' });

	try {
		const post = await Post.find({ _id: id, userSaved: userId });
		if (post.length === 0)
			return res.json({ status: 400, message: 'You should save this post first' });

		const user = await User.findOneAndUpdate(
			{ _id: userId },
			{
				$pull: { saved: id },
			},
			{ new: true }
		)
			.populate([
				{
					path: 'saved',
					populate: { path: 'author', select: 'username profilePicture' },
				},
			])
			.lean();

		await Post.findOneAndUpdate(
			{ _id: id },
			{
				$pull: { userSaved: userId },
			},
			{ new: true }
		);
		return res.json({ status: 200, message: 'Unsave this post', user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};
