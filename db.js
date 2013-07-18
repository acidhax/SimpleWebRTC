var fs = require('fs');
if (fs.existsSync('../disco-database')) {
	module.exports = require('../disco-database');
} else {
	module.exports = require('disco-database');
}