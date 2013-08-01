var db = require('../db'),
	clc = require('cli-color');

exports.login = function(req, res) {
	if (req.session.email) {
		res.redirect('/logged-in');
	} else {
		res.render('login');
	}
};

exports.loginPost = function(req, res) {
	if (req.body.email) {
		var email = req.body.email;
		db.Account.findByEmail(req.body.email, function(err, account) {
			if (!err && account) {
				console.log(clc.green('Logging in') + ':', account.email, account.loggedInCount);
				req.session.accountId = account._id;
				account.loggedInCount++;
				account.save();
				res.send({success: true});
				db.metrics.login(account.email);
				db.sessions.addSessionToAccount(account._id, req.sessionID);
			} else if (!err) {
				account = new db.Account({email: email, loggedInCount: 1});
				console.log(clc.green('Creating and logging in') + ':', account.email);
				account.save(function(err) {
					if (!err) {
						req.session.accountId = account._id;
						res.send({success: true});
						db.metrics.accountCreated(account.email);
						db.metrics.login(account.email);
						db.sessions.addSessionToAccount(account._id, req.sessionID);
					} else {
						res.send({success: false, reason: 'db-err-2'});
					}
				});
			} else {
				res.send({success: false, reason: 'db-err'});
			}
		});
	} else {
		res.send({success: false});
	}
};

exports.loggedIn = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId).populate('friends').exec(function(err, account) {
			if (!err && account) {
				res.render('logged-in', {email: account.email, friends: account.friends});
			} else {
				req.session.accountId = null;
				res.redirect('/login');
			}
		});
		
	} else {
		console.log(clc.red('Ummm, unauthorized?'));
		res.redirect('/login');
	}
}

exports.logout = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, account) {
			if (!err && account) {
				db.metrics.logout(account.email);
				db.sessions.removeSessionFromAccount(account._id, req.sessionID);
			}
		});
	}
	
	req.session.accountId = null;
	res.redirect('/login');
};

exports.addFriend = function(req, res) {
	var email = req.body.email;
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, myAccount) {
			if (!err && myAccount) {
				if (myAccount.email === email) {
					res.send({success: false, reason:'not-yourself-bro'});
				} else {
					myAccount.addFriendByEmail(email, function(err, account) {
						if (!err && account) {
							res.send({success: true});
							db.metrics.addFriend(myAccount.email, account.email);
						} else if (!err) {
							res.send({success: false, reason:'no-account'});
						} else {
							res.send({success: false});
						}
					});
				}
			} else {
				res.send({success: false, reason: 'not-logged-in-wtf'});
			}
		});
	} else {
		res.send({success: false, reason: 'wtf'});
	}
};
