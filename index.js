var express = require('express'),
	cluster = require('cluster'),
	util = require('util');

if (cluster.isWorker) {
	console.log = function() {
		var theargs = [].slice.call(arguments);

		var thestring = util.format.apply(null, theargs);
		process.send({log: );
	}
}

var app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'your secret here' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res) {
	res.send('yo');
});

app.get('/crash-bandicoot', function(req, res) {
  (function(){
    setTimeout(function () {
      throw new Error();
    });
  })();
});

app.listen(3003, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
