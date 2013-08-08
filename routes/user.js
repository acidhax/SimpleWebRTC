var db = require('../db'),
	clc = require('cli-color'),
	fs = require('fs'),
	check = require('validator').check;

exports.welcome = function(req,res) {
	if (req.session.email) {
		res.redirect('/logged-in');
	} else {
		res.render('welcome');
	}
};

exports.register = function(req, res) {
	if (req.session.email) {
		res.redirect('/logged-in');
	} else {
		res.render('register', {message: ''});
	}	
};

exports.registerPost = function(req, res) {
	if (req.session.email) {
		// How did they do that?!
		res.redirect('/logged-in');
	} else {
		var email = req.body.email;
		var message = '';
		if (!email) {
			message += 'Yo, you totally need to enter an email.<br/>';
		} else {
			try {
				!check(email).isEmail();
			} catch(e) {
				message += 'Yo, that\'s totally not a valid email.<br/>';
			}
		}

		if (!req.files || !req.files.picture) {
			message += 'Ummm... You need to upload a photo, fyi<br/>';
		}


		if (!message) {

			db.Account.findByEmail(email, function(err, account) {
				if (!err && !account) {
					// Create account, maybe?
					var account = new db.Account({
						email: email
					});
					account.save(function(err) {
						if (!err) {
							// Upload photostuff time!!!
							req.session.accountId = account._id;
							fs.readFile(req.files.picture.path, function (err, photo) {
								db.Account.setPhoto(req.session.accountId, photo, function (err) {
									if (!err) {
										res.redirect("/logged-in");
									} else {
										message + 'Did you SERIOUSLY upload a strange photo that we couldn\'t process?';
										done();
									}
								});
							});
						} else {
							message + "I've made a huge mistake (database problem 2)";
							done();
						}
					});

				} else if (!err && account) {
					message += 'That account already exists, bud. <a href="/login">Go login like a normal person</a>.'
					done();
				} else {
					message += "I've made a huge mistake (database problems)";
					done();
				}
			});

		} else {
			done();
		}


		function done() {
			if (!message) {

			} else {
				res.render('register', {message: message});
			}
		}
	}
};

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
				res.render('logged-in', {email: account.email, friends: account.friends, accountId: account._id});
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

exports.uploadPhoto = function (req, res) {
	if (req.session && req.session.accountId && req.files && req.files.displayImage) {
		fs.readFile(req.files.displayImage.path, function (err, photo) {
			db.Account.setPhoto(req.session.accountId, photo, function (err) {
				res.redirect("back");
			});
		});
	} else {
		res.send("not done");
	}
};

exports.getProfilePhoto = function (req, res) {
	res.setHeader('Content-Type', 'image/jpeg');
	if (req.params && req.params.accountId) {
		db.Account.getProfilePhoto(req.params.accountId, function (err, data) {
			if (!err && data) {
				res.setHeader('Content-Length', data.length);
				res.end(data, "binary");
			} else {
				res.end();
			}
		});
	} else {
		res.end();
	}
};