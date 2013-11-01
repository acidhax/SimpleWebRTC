var VideoStream = function () {
	this._mediaSource = new WebKitMediaSource();
	this._el = document.createElement("video");
	this._el.src = window.URL.createObjectURL(this._mediaSource);

	this.start();
};

VideoStream.prototype.start = function(headers) {
	this._mediaSource.addEventListener('webkitsourceopen', function(e) {
	this._sourceBuffer = this._mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');
};

VideoStream.prototype.data = function(data) {
  	var dataArray = new Uint8Array(data);
  	this._sourceBuffer.append(dataArray);
};

VideoStream.prototype.end = function() {
	this._mediaSource.endOfStream();
};