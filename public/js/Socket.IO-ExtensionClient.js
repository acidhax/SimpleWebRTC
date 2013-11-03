var SocketIOExtensionClient = function (collider, socket) {
	this.collider = theBackgroundPage;
	SimplEE.EventEmitter.call(this);
	var self = this;
	this.on("newListener", function (ev, fn) {
		// Send to Background page.
		this.collider.on("socketIO"+ev, function () {
			fn.apply(self, [].slice.call(arguments));
		});
	});
	this.isBackground = chrome.runtime.getBackgroundPage != null || false;
	this.socket = socket || {};
	if (this.isBackground) {
		this.on("Session", function (cb) {
			cb(self.socket.socket.sessionid);
		});
	} else if (!this.isBackground) {
		this.collider.transmit("socketIOSession", function (sessionId) {
			self.socket.sessionId = sessionId;
		})
		this.on("Session", function (sessionId) {
			self.socket.sessionId = sessionId;
		});
	}
};
SocketIOExtensionClient.prototype = Object.create(SimplEE.EventEmitter.prototype);
SocketIOExtensionClient.prototype.emit = function () {
	// Send to Background page.
	this.collider.transmit.apply(this.collider, [].slice.call(arguments));
};