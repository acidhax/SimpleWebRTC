var db = require('../db'),
	async = require('async');

exports.autoNoteFiveThousand = function(req, res) {

	var theKey = req.params.theKey;
	// Get array of people
	var arrayOfPeople = JSON.parse(req.body.users);

	db.AutoNoteFiveThousand.findByTheKey(theKey, function(err, autoNote) {
		if (!err && autoNote) {
			async.forEach(arrayOfPeople, function(person, next) {
				autoNote.goTimeByEmail(person.$distinct_id, next);
			}, function (err) {
				if (err) {
					console.log('AUTONOTE ERR', err);
					console.log('AUTONOTE ERR', err);
					console.log('AUTONOTE ERR', err);
					console.log('AUTONOTE ERR', err);
					console.log('AUTONOTE ERR', err);
					console.log('AUTONOTE ERR', err);
				}
				
				res.end();
			});
		} else {
			console.log('no autoNote found')
			res.end();
		}

	});

};