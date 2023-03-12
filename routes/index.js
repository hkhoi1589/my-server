const userRoute = require('./user.routes');
const authRoute = require('./auth.routes');
const postRoute = require('./post.routes');
const { verifyKey, isEmpty } = require('../helpers');

// kiem tra token tu cac request den server
const verifyToken = (req, res, next) => {
	const token = req.body.token || req.query.token || req.headers['authorization'];
	if (!token) {
		return res.status(403).send('A token is required for authentication');
	}
	const decoded = verifyKey(token, process.env.ACCESS_TOKEN_SECRET);
	if (!isEmpty(decoded)) return next();
	else return res.status(401).send('Invalid Token');
};

// RestFul Api
function routes(app) {
	app.use('/api/auth', authRoute);
	app.use('/api/user', verifyToken, userRoute);
	app.use('/api/post', verifyToken, postRoute);
	app.use('/', (req, res) => res.send('Home Page'));
}

module.exports = routes;
