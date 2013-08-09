var db = require('../db'),
	clc = require('cli-color'),
	fs = require('fs'),
	check = require('validator').check,
	async = require('async');

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
		res.render('register', {message: '', email: ''});
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
			email = email.toLowerCase();
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
					fs.readFile(req.files.picture.path, function (err, photo) {
						console.log('THIS IS A THING THAT SHOULD FIRE PLZ', err, photo);

						if (!err && photo && photo.length) {

							var account = new db.Account({
								email: email
							});
							account.save(function(err) {
								if (!err) {
									// Upload photostuff time!!!
									req.session.accountId = account._id;
								
									db.Account.setPhoto(req.session.accountId, photo, function (err) {
										console.log('THIS IS THE CALLBACK FROM CLEANER', err);
										if (!err) {
											res.redirect("/logged-in");
										} else {
											account.remove();
											message += 'Did you SERIOUSLY upload a strange file that we couldn\'t process for your picture?';
											done();
										}
									});
									
								} else {
									message + "I've made a huge mistake (database problem 2)";
									done();
								}

							});

						} else {
							message += 'You need to upload a proper photo.';
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
				res.render('register', {message: message, email:email});
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
		var email = req.body.email.toLowerCase();
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
				res.send({success: false, reason: 'db-err-2', message: "That's not an account. Try again?"});
				
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
				var emails = [account.email];
				for (var n = 0; n < account.friends.length; n++) {
					emails.push(account.friends[n].email);
				}

				db.Account.find({email: {$nin: emails}}).sort({email: 1}).exec(function(err, accounts) {
					if (!err && accounts) {
						res.render('logged-in', {email: account.email, friends: account.friends, accountId: account._id, accounts: accounts});
					} else {
						res.send('db-error');
					}
				});
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
	res.redirect('/welcome');
};

exports.addFriend = function(req, res) {
	var email = req.body.email;
	if (req.session.accountId) {
		var myAccount, theirAccount;

		async.parallel([function(next) {
			db.Account.findById(req.session.accountId, function(err, _myAccount) {
				if (!err && _myAccount) {
					myAccount = _myAccount;
					next();
				} else {
					next(err);
				}
			});
		}, function(next) {
			db.Account.findByEmail(email, function(err, _theirAccount) {
				if (!err && _theirAccount) {
					theirAccount = _theirAccount;
					next();
				} else {
					next(err);
				}
			});
		}], function(err) {
			if (!err) {
				if (!myAccount) {
					res.send({success: false, reason: 'wtf2'});
				} else if (!theirAccount) {
					res.send({success: false, reason: 'no-account'});
				} else if (myAccount._id.equals(theirAccount._id)) {
					res.send({success: false, reason: 'not-yourself-bro'});
				} else if (myAccount.friends.length >= 7) {
					res.send({success: false, reason: 'too-many-friends-on-the-dancefloor'});
				} else if (theirAccount.friends.length >= 7) {
					res.send({success: false, reason: 'they-are-too-popular'});
				} else {
					// Holy shit it works
					myAccount.friends.addToSet(theirAccount);
					theirAccount.friends.addToSet(myAccount);
					myAccount.save(function(err) {
						if (!err) {
							theirAccount.save(function(err) {
								if (!err) {
									res.send({success: true});
								} else {
									res.send({success: false, reason: 'db-error3'});
								}
							});
						} else {
							res.send({success: false, reason: 'db-error2'});
						}
					});
				}
			} else {
				res.send({success: false, reason: 'db-error'});
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