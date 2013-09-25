var AccountSearch = function (accounts) {
	this.accounts = accounts || [];
	async.map(this.accounts, function (account, next) {
		account._el = $('.person-container div.person[data-accountid="'+account._id+'"]')[0];
		next(account);
	}, function (err, list) {
		this.accounts = list;
	});
};

AccountSearch.prototype.search = function(string, cb) {
	async.map(this.accounts, function (account, next) {
		account.score = account.displayName.score(string, 0.5) * -1;
		next(null, account);
	}, function (err, list) {
		async.sortBy(list, function (account, next) {
			next(null, account.score);
		}, function (err, endGame) {
			cb(endGame);
		});
	});
};

AccountSearch.prototype.remove = function (el) {
	var found = false;
	for (var i = 0; i < this.accounts.length && !found; i++) {
		if (this.accounts._el = el) {
			this.accounts.splice(i,1);
			found = true;
		}
	}
};