
exports.home = function (req, res) {
	res.render('home', {title: 'loading', hasExtension: req.hasExtension});
};

exports.howToShare = function (req, res) {
	res.render('how-to-share', {});
};

exports.extensionGetLogin = function (req, res) {
	if (req.hasExtension) {
		res.redirect('/login');
	} else {
		res.render('extension-get', {title: 'Extension Get'});
	}
};

exports.extensionGetRegister = function (req, res) {
	if (req.hasExtension) {
		res.redirect('/register');
	} else {
		res.render('extension-get', {title: 'Extension Get'});
	}
};

exports.noChrome = function (req, res) {
	if (req.hasExtension) {
		res.redirect('/welcome');
	} else {
		res.render('no-chrome', {title: 'Get some chrome, yo'});
	}
};