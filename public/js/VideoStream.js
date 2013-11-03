var VideoStream = function () {
	this._mediaSource = new WebKitMediaSource();
	this._el = document.createElement("canvas");
	this._el.width = 160;
	this._el.height = 120;
	this.context = this._el.getContext('2d');

	this.start();
};

VideoStream.prototype.start = function() {
	var self = this;
	// this._mediaSource.addEventListener('webkitsourceopen', function(e) {
		// self._sourceBuffer = self._mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');
	// });
};

VideoStream.prototype.data = function(data) {
	var self = this;
	var img = this.getImage(data, function() {
		self.context.drawImage(img, 0, 0);
	});
	// this._el
  	// var dataArray = new Uint8Array(data);
  	// this._sourceBuffer.append(dataArray);
};

VideoStream.prototype.end = function() {
	// this._mediaSource.endOfStream();
};

VideoStream.prototype.getImage = function(data, cb) {
    var img=new Image();
    img.src=data;
    img.onload = function () {
    	cb(img);
    };
    return img;
};