var db = require('../db');
var profilePhotoCallback = process.env.serviceExternalUrl + '/facebook/get-profile-photo-callback';

exports.getProfilePhoto = function(req, res) {
	if (req.session.accountId) {
		res.redirect(db.oauth.facebook.getRequestTokenUrl(profilePhotoCallback));
	} else {
		res.redirect('/logout');
	}
};

exports.getProfilePhotoCallback = function(req, res) {
	if (req.session.accountId) {
		var requestToken = req.query.code;
		db.oauth.facebook.getProfilePhotoCallback(profilePhotoCallback, req.session.accountId, requestToken, function(err, imageData) {
			if (!err) {
				db.Account.setPhoto(req.session.accountId, imageData, function (err) {
					db.actionList.updatePhoto(req.session.accountId);
					res.redirect("/logged-in");
				});
			} else {
				console.log('facebook profile photo callback error', err);
				res.redirect('/logged-in?fberr=true');
			}
		});
	} else {
		res.redirect('/logout');
	}
};