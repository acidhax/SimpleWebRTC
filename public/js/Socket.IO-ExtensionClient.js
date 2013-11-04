var SocketIOExtensionClient = function (collider, wh) {
	this.collider = theBackgroundPage;
	SimplEE.EventEmitter.call(this);
	var self = this;
	this.on("newListener", function (ev, fn) {
		this.collider.on("socketIO"+ev, function () {
			fn.apply(self, [].slice.call(arguments));
		});
	});
	this.isBackground = chrome.runtime.getBackgroundPage != null || false;
	// 
	if (this.isBackground) {
		this.wh = wh;
		this.socket = wh.socket || {};
		this.on("Session", function (cb) {
			cb(self.socket.socket.sessionid);
		});
		this.collider.on("socketIO", function (ev, cb) {
			// 
		});
	} else if (!this.isBackground) {
		this.socket = {};
		this.collider.transmit("socketIO", "Session", function (sessionId) {
			self.socket.sessionId = sessionId;
		});
		this.on("Session", function (sessionId) {
			self.socket.sessionId = sessionId;
		});
	}
};
SocketIOExtensionClient.prototype = Object.create(SimplEE.EventEmitter.prototype);
SocketIOExtensionClient.prototype.emit = function () {
	if (this.isBackground) {
		var args = [].slice.call(arguments);
		ev = args.shift();
		this.wh.rpc[ev].call(this.wh, args);
	} else {
		// Send to Background page.
		this.collider.transmit.apply(this.collider, [].slice.call(arguments));
	}
};

// var fakeIO = function () {
// 	this.connect = function () {
// 		return new SocketIOExtensionClient(theBackgroundPage);
// 	};
// };

// window.io = new fakeIO();