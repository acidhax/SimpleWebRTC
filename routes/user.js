
exports.login = function(req, res) {
	console.log('wut');
	if (req.session.email) {
		res.redirect('/logged-in');
	} else {
		res.render('login');
	}
};

exports.loginPost = function(req, res) {
	if (req.body.email) {
		req.session.email = req.body.email;
		res.send({success: true});
	} else {
		res.send({success: false});
	}
};

exports.loggedIn = function(req, res) {
	if (req.session.email) {
		res.render('logged-in', {email: req.session.email});
	} else {
		res.redirect('/login');
	}
}

exports.logout = function(req, res) {
	req.session.email = null;
	res.redirect('/login');
};