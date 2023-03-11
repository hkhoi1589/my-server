const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const moment = require('moment');

const isEmpty = (value) =>
	value === undefined ||
	value === null ||
	(typeof value === 'object' && Object.keys(value).length === 0) ||
	(typeof value === 'string' && value.trim().length === 0);

const handlePassword = async (password) => {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
};

const comparePassword = async (password, truePassword) => {
	const result = await bcrypt.compare(password, truePassword);
	return result;
};

const createAccessToken = (payload) => {
	return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
};

const createRefreshToken = (payload) => {
	return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' });
};

const getTokenExp = () => {
	return moment().add(1, 'days');
};

const verifyKey = (token, secret_key) => {
	const decoded = jwt.verify(token, secret_key);
	return decoded;
};

const getUserId = (req) => {
	const token = req.body.token || req.query.token || req.headers['authorization'];
	const decoded = jwt.decode(token);
	return decoded.id;
};

module.exports = {
	isEmpty,
	handlePassword,
	comparePassword,
	createAccessToken,
	createRefreshToken,
	getTokenExp,
	verifyKey,
	getUserId,
};
