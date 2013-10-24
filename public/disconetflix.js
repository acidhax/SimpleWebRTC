var discoNetflixFunky = function() {
	var self = {};

	self.startFromBeginning = function() {
		self.seek(0);
	};

	self.play = function() {
		netflix.cadmium.objects.videoPlayer().play(); 
	};

	self.pause = function() {
		netflix.cadmium.objects.videoPlayer().pause();
	};

	self.seek = function (a) {
		netflix.cadmium.objects.videoPlayer().seek(a);
	};

	return self;
};
window.discoNetflix = discoNetflixFunky();