
exports.home = function (req, res) {
	res.render('home', {title: 'loading'});
};

exports.extensionGet = function (req, res) {
	res.render('extension-get', {title: 'Extension Get'});
};

exports.noChrome = function (req, res) {
	res.render('no-chrome', {title: 'Get some chrome, yo'});
};