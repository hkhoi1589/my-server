const User = require('../models').users;
const Post = require('../models').posts;
const mongoose = require('mongoose');
const { handlePassword, getUserId } = require('../helpers');

// Get random friend
exports.getFriend = async (req, res) => {
	try {
		let users;
		const { excludeList } = req.body;
		const count = (await User.estimatedDocumentCount()) - 1; // tinh so luong record - 1 vi record cua user
		const rand = Math.floor(Math.random() * count); // tinh random

		if (count - rand < 10) {
			users = await User.find({ _id: { $nin: excludeList } }) // tim cac record khong co id trong excludeList
				.select('profilePicture username followers')
				.lean();
		} else {
			users = await User.find({ _id: { $nin: excludeList } }) // tim cac record khong co id trong excludeList
				.select('profilePicture username followers')
				.skip(rand)
				.limit(10) // skip so luong record random va lay 10 record
				.lean();
		}
		return res.json({ status: 200, users });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// Search friend
exports.searchFriend = async (req, res) => {
	try {
		const { username, excludeList } = req.body;
		const users = await User.find({
			_id: { $nin: excludeList },
			username: { $regex: username, $options: 'i' },
		})
			.select('profilePicture username followers')
			.lean();
		return res.json({ status: 200, users });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// update user for new user
exports.updateNewUser = async (req, res) => {
	try {
		const { username, password, gender } = req.body;
		const id = getUserId(req);

		const existedUserName = await User.findOne({ username }); // kiem tra trung username
		if (existedUserName)
			return res.json({ status: 400, message: 'This username is already used' });

		let user;

		// Hash password
		const hashedPassword = await handlePassword(password);

		// find and update
		user = await User.findByIdAndUpdate(
			id,
			{
				$set: {
					username,
					password: hashedPassword,
					gender,
				},
			},
			{ new: true } // tra ve document da update
		).lean();

		const access_token = createAccessToken({ id: user._id });
		const refresh_token = createRefreshToken({ id: user._id });
		const expires_at = getTokenExp(); // gia han access_token 1 days hien tai

		if (!user) return res.json({ status: 404, message: 'User is not found.' });

		return res.json({
			status: 200,
			message: 'Updated successfully',
			access_token,
			refresh_token,
			expires_at,
			user,
		});
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// update profile
exports.updateUser = async (req, res) => {
	try {
		const { fullname, username, email, password, gender, avatar } = req.body;
		const id = getUserId(req);

		const existedUserName = await User.findOne({ username }); // kiem tra trung username
		if (existedUserName)
			return res.json({ status: 400, message: 'This username is already used' });

		let user;

		if (password !== '') {
			// for new user
			// Hash password
			const hashedPassword = await handlePassword(password);

			// find and update
			user = await User.findByIdAndUpdate(
				id,
				{
					$set: {
						fullname,
						username,
						email,
						password: hashedPassword,
						gender,
						avatar,
					},
				},
				{ new: true } // tra ve document da update
			).lean();
		} else {
			// find and update
			user = await User.findByIdAndUpdate(
				id,
				{
					$set: {
						fullname,
						username,
						email,
						gender,
						avatar,
					},
				},
				{ new: true } // tra ve document da update
			).lean();
		}

		if (!user) return res.json({ status: 404, message: 'User is not found.' });

		return res.json({ status: 200, message: 'Updated successfully', user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// delete user
exports.deleteUser = async (req, res) => {
	try {
		const id = getUserId(req);
		// find
		let user = await User.findById(id);

		// loai user khoi followers
		user.followers.map(async (_id) => {
			await User.findByIdAndUpdate(_id, {
				$pull: { following: id },
			});
		});

		// loai user khoi following
		user.following.map(async (_id) => {
			await User.findByIdAndUpdate(_id, {
				$pull: { followers: id },
			});
		});

		//xoa post cua user
		await Post.deleteMany({ author: id });

		// xoa user
		await User.findByIdAndDelete(id);

		return res.json({ status: 200, message: `Deleted: ${user.username}` });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// Get user by id
exports.getUser = async (req, res) => {
	const { id } = req.params;

	if (req.body.action === 'authUser') {
		try {
			let user = await User.findById(id)
				.populate([
					{ path: 'following', select: 'username profilePicture' },
					{ path: 'followers', select: 'username profilePicture' },
					{
						path: 'noti',
						populate: { path: 'user', select: 'username profilePicture' },
					},
					{
						path: 'saved',
						populate: { path: 'author', select: 'username profilePicture' },
					},
				])
				.lean();

			if (user) {
				return res.json({ status: 200, user });
			} else {
				return res.json({ status: 404, message: 'User is not found.' });
			}
		} catch (error) {
			return res.status(500).send({ message: error.message, status: 500 });
		}
	}

	try {
		let user = await User.findById(id)
			.populate([
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
			])
			.lean();

		if (user) {
			return res.json({ status: 200, user });
		} else {
			return res.json({ status: 404, message: 'User is not found.' });
		}
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// follow
exports.follow = async (req, res) => {
	try {
		const { friendId } = req.params;
		const id = getUserId(req);
		if (!friendId) return res.json({ status: 404, message: 'No user ID found' });

		await User.findOneAndUpdate(
			{ _id: id },
			{
				$push: { following: new mongoose.Types.ObjectId(friendId) },
			},
			{ new: true }
		);

		const user = await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$push: { followers: new mongoose.Types.ObjectId(id) },
			},
			{ new: true }
		)
			.select('username profilePicture')
			.populate([
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
			])
			.lean();

		return res.json({ status: 200, message: 'Followed this user', user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

// unfollow
exports.unfollow = async (req, res) => {
	try {
		const { friendId } = req.params;
		const id = getUserId(req);
		if (!friendId) return res.json({ status: 404, message: 'No ID found' });

		await User.findOneAndUpdate(
			{ _id: id },
			{
				$pull: { following: friendId },
			},
			{ new: true }
		);

		const user = await User.findOneAndUpdate(
			{ _id: friendId },
			{
				$pull: { followers: id },
			},
			{ new: true }
		)
			.select('username profilePicture following followers')
			.populate([
				{ path: 'following', select: 'username profilePicture' },
				{ path: 'followers', select: 'username profilePicture' },
			])
			.lean();

		return res.json({ status: 200, message: 'Unfollowed this user', user });
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};
