const User = require('../models').users;
const jwt = require('jsonwebtoken');

const {
	handlePassword,
	comparePassword,
	createAccessToken,
	createRefreshToken,
	getTokenExp,
} = require('../helpers');

exports.register = async (req, res) => {
	try {
		const { fullname, username, email, password, gender, avatar } = req.body;

		// Hash password
		if (password) password = await handlePassword(password);

		// Create new user
		const user = new User({
			fullname,
			username,
			email,
			password,
			gender,
			avatar,
		});

		// Save to DB
		await user.save();

		const access_token = createAccessToken({ id: user._id });
		const refresh_token = createRefreshToken({ id: user._id });
		const expires_at = getTokenExp(); // gia han access_token 1 days hien tai

		return res.json({
			status: 200,
			access_token,
			refresh_token,
			expires_at,
			user: {
				...user._doc,
				password: '',
			},
		});
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

exports.findEmail = async (req, res) => {
	try {
		const { email } = req.body;

		// Find user
		const user = await User.findOne({ email }).lean();
		if (!user) return res.json({ status: 404, message: 'This email does not exist.' });

		const access_token = createAccessToken({ id: user._id });
		const refresh_token = createRefreshToken({ id: user._id });
		const expires_at = getTokenExp(); // gia han access_token 1 days hien tai

		return res.json({
			status: 200,
			access_token,
			refresh_token,
			expires_at,
			user: {
				...user,
				password: '',
			},
		});
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

exports.login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Find user
		const user = await User.findOne({ email }).lean();
		if (!user) return res.json({ status: 404, message: 'This email does not exist.' });

		// Check password
		const validPassword = await comparePassword(password, user.password);
		if (!validPassword) return res.json({ status: 400, message: 'Wrong Password!' });

		const access_token = createAccessToken({ id: user._id });
		const refresh_token = createRefreshToken({ id: user._id });
		const expires_at = getTokenExp(); // gia han access_token 1 days hien tai

		return res.json({
			status: 200,
			access_token,
			refresh_token,
			expires_at,
			user: {
				...user,
				password: '',
			},
		});
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};

exports.generateAccessToken = async (req, res) => {
	try {
		const { refreshtoken: rf_token } = req.body;
		if (!rf_token) return res.json({ status: 400, message: 'Please login now.' });

		jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, async (err, result) => {
			if (err) return res.json({ status: 400, message: 'Please login now.' });

			const user = await User.findById(result.id).select('-password');

			if (!user) return res.json({ status: 404, message: 'This user does not exist.' });

			const access_token = createAccessToken({ id: user._id });
			const refresh_token = createRefreshToken({ id: user._id });
			const expires_at = getTokenExp(); // gia han access_token 1 days hien tai

			return res.json({
				status: 200,
				access_token,
				refresh_token,
				expires_at,
			});
		});
	} catch (error) {
		return res.status(500).send({ message: error.message, status: 500 });
	}
};
