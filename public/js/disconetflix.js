var discoNetflixFunky = function() {

	var self = {};

	self.startFromBeginning = function() {
	netflix.cadmium.objects.videoPlayer().seek(0);  
	};

	self.play = function() {
	netflix.cadmium.objects.videoPlayer().play(); 
	};

	self.pause = function() {
	netflix.cadmium.objects.videoPlayer().pause();
	};

	return self;
};
window.discoNetflix = discoNetflixFunky();