var db = require('../db'),
	clc = require('cli-color'),
	fs = require('fs'),
	check = require('validator').check,
	async = require('async'),
	os = require('os')
	string_score = require('../public/js/string_score.min'),
	adminNotify = db.adminNotify;

exports.welcome = function(req,res) {
	if (req.session.accountId) {
		res.redirect('/logged-in');
	} else {
		res.render('welcome', {hasExtension: req.hasExtension});
	}
};

exports.register = function(req, res) {
	if (req.hasExtension) {
		if (req.session.accountId) {
			res.redirect('/logged-in');
		} else {
			res.render('register', {message: '', email: '', firstName: '', lastName: ''});
		}
	} else {
		res.redirect('/extension-get-register');
	}
};

exports.registerPost = function(req, res) {
	if (req.session.accountId) {
		// How did they do that?!
		res.redirect('/logged-in');
	} else {
		var email = req.body.email;
		var password = req.body.password;
		var firstName = (req.body.firstName || '').trim();
		var lastName = (req.body.lastName || '').trim();
		var message = '';
		if (!email) {
			message += 'Please enter a valid email address :)<br/>';
		} else {
			email = email.toLowerCase();
			try {
				!check(email).isEmail();
			} catch(e) {
				message += 'Please enter a valid email address,<br>Emails need to be in the format xxx@yyy.zz<br/>';
			}
		}

		if (!password) {
			message += 'Please enter a password<br/>';
		} else if (password.length < 2) {
			message += 'Please use at least two characters for your password!<br/>';
		}

		if (!firstName) {
			message += 'You\'re going to need a first name!<br/>';
		}
		if (!lastName) {
			message += 'You\'re going to need a last name!<br/>';
		}

		var picturePath = __dirname + '/../public/img/Email-Batman.png';
		if (req.files && req.files.picture && req.files.picture.length) {
			picturePath = req.files.picture.path;
		}

		if (!message) {

			db.Account.findByEmail(email, function(err, account) {
				if (!err && !account) {
					// Create account, maybe?
					fs.readFile(picturePath, function (err, photo) {

						if (!err && photo && photo.length) {

							var account = new db.Account({
								email: email,
								firstName: firstName,
								lastName: lastName
							});
							account.setPassword(password, function(err) {
								if (!err) {
									account.save(function(err) {
										if (!err) {
											// Upload photostuff time!!!
											req.session.accountId = account._id;
											db.vanity.accounts.incr();
											db.Account.setPhoto(req.session.accountId, photo, function (err) {
												if (!err) {
													db.sessions.addSessionToAccount(account._id, req.sessionID);
													db.metrics.accountCreated(account._id, req.ip);
													db.metrics.login(account._id);
													db.alphabeticalAssholes.addAccount(account);
													db.cache.expire('totalAccountCache');
													db.creepyJesus.registered(account._id);
													db.redisCallback.exec('onboardShare4', account._id, function (){});
													res.redirect("/logged-in");
												} else {
													account.remove();
													db.vanity.accounts.decr();
													message += 'Sorry! We couldn\'t use that file! Try another please :)';
													done();
												}
											});
										} else {
											message + "I've made a huge mistake (database problem 2)";
											done();
										}

									});

								} else {
									message += 'An error occured with something... if it happens again, let us know.';
									done();
								}
							});

						} else {
							message += 'You need to upload a proper photo.';
							done();
						}
					});

				} else if (!err && account) {
					message += 'That account already exists! <br/><a href="/login">Go log in to your account</a>.'
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
				res.render('register', {message: message, email:email, firstName: firstName, lastName: lastName });
			}
		}
	}
};

exports.hasPassword = function(req, res) {
	var email = req.body.email;
	db.Account.findByEmail(email, function(err, account) {
		if (!err && account) {
			account.hasPassword(function(err, hasPassword) {
				res.send({ hasPassword: hasPassword });
			});
		} else {
			res.send({ hasPassword: false });
		}
	});
};

exports.login = function(req, res) {
	if (req.hasExtension) {
		if (req.session.accountId) {
			res.redirect('/logged-in');
		} else {
			res.render('login')
		}
	} else {
		res.redirect('/extension-get-login');
	}
};

exports.loginPost = function(req, res) {
	if (req.body.email) {
		var email = req.body.email.toLowerCase();
		var password = req.body.password;
		db.Account.findByEmail(email, function(err, account) {
			if (!err && account) {
				account.hasPassword(function(err, hasPassword) {
					if (!err) {
						if (hasPassword) {
							account.verifyPassword(password, function(err, result) {
								if (!err) { 
									if (result) {
										processLogin(account);
									} else {
										res.send({success: false, reason: 'db-err-2', message: "Invalid email or password."});
									}
								} else {
									res.send({success: false, reason: 'db-err'});
								}
							});
						} else {
							processLogin(account);
						}
					} else {
						res.send({success: false, reason: 'db-err'});
					}
				});
			} else if (!err) {
				res.send({success: false, reason: 'db-err-2', message: "Invalid email or password."});
			} else {
				res.send({success: false, reason: 'db-err'});
			}
		});
	} else {
		res.send({success: false});
	}

	function processLogin(account) {
		console.log(clc.green('Logging in') + ':', account.email, account.loggedInCount);
		req.session.accountId = account._id;
		account.loggedInCount++;
		account.save();
		res.send({success: true});
		db.metrics.login(account.email);
		db.creepyJesus.loggedIn(account._id);
		db.sessions.addSessionToAccount(account._id, req.sessionID);
	}
};

exports.loggedIn = function(req, res) {
	if (req.hasExtension) {
		if (req.session.accountId) {
			db.Account.findById(req.session.accountId).populate('friends').exec(function(err, account) {
				if (!err && account) {
					account.hasPassword(function(err, hasPassword) {
						if (!err) {
							if (!hasPassword) {
								res.redirect('/change-password');
							} else {
								var emails = [account.email];
								for (var n = 0; n < account.friends.length; n++) {
									emails.push(account.friends[n].email);
								}

								db.Account.find({email: {$nin: emails}}).sort({email: 1}).exec(function(err, accounts) {
									if (!err && accounts) {

										async.map(accounts, function(mongoAccount, next) {
											var account = mongoAccount.toObject();
											account.displayName = account.email;

											if (account.firstName) {
												account.displayName = account.firstName + ' ' + account.lastName;
											}

											next(null, account);
										}, function(err, accounts) {
											async.sortBy(accounts, function(account, next) {
												next(null, account.displayName.toLowerCase())
											}, function(err, accounts) {
												var serviceUrl = (process.env.serviceExternalProtocol || 'http') + '://' + os.hostname();
												if (process.env.serviceExternalUrl) {
													serviceUrl = process.env.serviceExternalUrl;
												}
												res.render('logged-in', {
													email: account.email, 
													friends: account.friends, 
													accountId: account._id, 
													accounts: accounts, 
													serviceUrl: serviceUrl
												});
											});
										});
									} else {
										res.send('db-error');
									}
								});
							}
						} else {
							res.send('db-error');
						}
					});
				} else {
					req.session.accountId = null;
					res.redirect('/welcome');
				}
			});

		} else {
			console.log(clc.red('Ummm, unauthorized?'));
			res.redirect('/welcome');
		}
	} else {
		res.redirect('/logout');
	}
};

exports.getFriends = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId).populate('friends').exec(function(err, account) {
			if (!err && account) {
				res.send({ friends: account.friends });
			} else {
				res.send({});
			}
		});
	} else {
		res.end();
	}
}

exports.changePassword = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, account) {
			if (!err && account) {
				account.hasPassword(function(err, hasPassword) {
					if (!err) {
						res.render('change-password', { hasPassword: hasPassword });
					} else {
						res.send('db-err');
					}
				});

			} else {
				res.redirect('/logout');
			}
		});
	} else {
		res.redirect('/logout');
	}
};

exports.changePasswordPost = function(req, res) {
	var oldPassword = req.body.oldPassword || '';
	var newPassword = req.body.newPassword || '';
	var firstName = (req.body.firstName || '').trim();
	var lastName = (req.body.lastName || '').trim();

	if (!newPassword || newPassword.length < 2) {
		res.send({ success: false, reason: 'Use at least two characters for your password!'})
	} else if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, account) {
			if (!err && account) {
				account.hasPassword(function(err, hasPassword) {
					if (!err) {
						if (hasPassword) {
							account.verifyPassword(oldPassword, function(err, result) {
								if (!err) {
									if (result) {
										setPassword(account, newPassword);
									} else {
										res.send({ success: false, reason: 'Invalid old password! Did you forget it?!' });
									}
								} else {
									res.send({ success: false, reason: 'db-err'});
								}
							});
						} else {
							if (!firstName || !lastName) {
								res.send({ success: false, reason: 'You need to enter a first and last name!'});
							} else {
								account.firstName = firstName;
								account.lastName = lastName;
								account.save(function(err) {
									setPassword(account, newPassword);
									db.alphabeticalAssholes.addAccount(account);
								});
							}
						}
					} else {
						res.send({ success: false, reason: 'db-err'});
					}
				});

			} else {
				res.send({ success: false, reason: 'not logged in'});
			}
		});
	} else {
		res.send({ success: false, reason: 'not logged in'});
	}


	function setPassword(account, plainText) {
		account.setPassword(plainText, function(err) {
			if (!err) {
				res.send({ success: true });
				db.metrics.changePassword(account.email);
			} else {
				res.send({ success: false, reason: 'db-err'});
			}
		});
	}
};

exports.logout = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, account) {
			if (!err && account) {
				db.metrics.logout(account.email);
				db.creepyJesus.loggedOut(account._id);
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
				// } else if (myAccount.friends.length >= 7) {
				// 	res.send({success: false, reason: 'too-many-friends-on-the-dancefloor'});
				// } else if (theirAccount.friends.length >= 7) {
				// 	res.send({success: false, reason: 'they-are-too-popular'});
				} else {
					// Holy shit it works
					myAccount.friends.addToSet(theirAccount);
					theirAccount.friends.addToSet(myAccount);
					db.actionList.friendAdded(myAccount._id, {accountId: theirAccount._id});
					db.actionList.friendAdded(theirAccount._id, {accountId: myAccount._id});
					db.pubsub.emit("friendAdded:"+theirAccount._id, myAccount._id);
					myAccount.save(function(err) {
						if (!err) {
							theirAccount.save(function(err) {
								if (!err) {
									res.send({success: true});
									db.metrics.addFriend(myAccount.email, theirAccount.email);
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
			if (!err && photo) {
				db.Account.setPhoto(req.session.accountId, photo, function (err) {
					db.actionList.updatePhoto(req.session.accountId);
					res.redirect("back");
				});
			} else {
				res.redirect('back');
			}
		});
	} else {
		res.redirect('back');
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


exports.updatePhoto = function (req, res) {
	if (req.session.accountId) {
		res.render('update-photo', { accountId: req.session.accountId });
	} else {
		res.redirect('/welcome');
	}
};

exports.getSuggestedFriends = function (req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function (err, account) {
			account.getSuggestedFriends(function (friends) {
				res.send(friends);
			});
		});
	} else {
		res.end();
	}
};

exports.searchPeople = function(req, res) {
	var query = req.body.query;
	var accountId = req.session.accountId;
	// DELETE THE profilePhoto field
	// IGNORE THE USER'S FRIENDS
	db.Account.findById(accountId, function(err, personAccount) {
		if (!err && personAccount) {
			var accountsToIgnore = JSON.parse(JSON.stringify(personAccount)).friends;
			accountsToIgnore.push(personAccount._id.toString());
			db.cache.get('totalAccountCache', function(err, bigString) {
				if (!err && bigString) {
					var accounts = JSON.parse(bigString);

					async.filter(accounts, function(account, next) {
						next(accountsToIgnore.indexOf(account._id) === -1);
					}, function(accounts) {
						if (query) {
							async.map(accounts, function (account, next) {
								account.score = account.displayName.score(query, 0.5) * -1;
								next(null, account);
							}, function (err, list) {
								async.sortBy(list, function (account, next) {
									next(null, account.score);
								}, function (err, endGame) {
									endGame = endGame.splice(0,10);
									res.send(endGame);
								});
							});
						} else {
							async.sortBy(accounts, function (account, next) {
								next(null, account.displayName.toLowerCase());
							}, function(err, endGame) {
								res.send(endGame.slice(0, 10));
							});
						}
					});

				} else {
					res.send([]);
				}
			}, function(cb) {
				db.Account.find({}).select('_id firstName lastName email').exec(function(err, accountList) {
					var out = [];
					async.forEach(accountList, function(account, next) {
						out.push({
							_id: account._id,
							email: account.email,
							displayName: account.firstName?account.firstName + ' ' + account.lastName:account.email
						});
						next();
					}, function() {
						cb(null, JSON.stringify(out));
					});
				});
			});
		} else {
			res.send([]);
		}
	});
};


exports.getAllUsers = function(req, res) {
	if (req.session.accountId) {
		db.Account.findById(req.session.accountId, function(err, account) {
			var ignoreList = JSON.parse(JSON.stringify(account.friends));
			ignoreList.push(account._id.toString());
			var sinceId = req.params.sinceId || null;

			db.alphabeticalAssholes.get(sinceId, function(err, someDudes) {
				async.filter(someDudes, function(someDude, next) {
					if (ignoreList.indexOf(someDude._id.toString()) > -1) {
						next(false);
					} else {
						next(true);
					}
				}, function(someDudes) {
					async.map(someDudes, function(someDude, next) {
						next(null, {
							_id: someDude._id,
							email: someDude.email,
							displayName: someDude.firstName?someDude.firstName + ' ' + someDude.lastName:someDude.email
						});
					}, function(err, someDudes) {
						res.send({success: true, people: someDudes});
					});
				});
			});
		});
	} else {
		res.send({ success: false });
	}
};


exports.inviteFriend = function(req, res) {
	if (req.session.accountId) {
		var email = req.body.email;

		if (!email) {
			res.send({ success: false, reason: 'invalid-email' });
			return;
		} else {
			email = email.toLowerCase();
			try {
				!check(email).isEmail();
			} catch(e) {
				res.send({ success: false, reason: 'invalid-email' });
				return;
			}
		}

		db.metrics.inviteFriend(req.session.accountId, email);
		db.adminNotify.friendInvited(req.session.accountId, email);
		res.send({ success: true });
	} else {
		res.send({ success: false });
	}

};