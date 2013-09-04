
exports.home = function (req, res) {
	res.render('home', {title: 'loading'});
};

exports.extensionGet = function (req, res) {
	if (req.hasExtension) {
		res.redirect('/welcome');
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