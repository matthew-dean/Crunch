(function($) {
	
var FileMonitor = function() {
	var monitored = {};
	var timer = null;
	var interval = 2000;
	
	function watch(file) {

		if(!(file.nativePath) || monitored[file.nativePath])
			return;
			
		//console.log('Watching: ' + file.nativePath);
		monitored[file.nativePath] = {
			origModificationDate: file.modificationDate,
			file: file
		};
		
		if(timer === null) start();
	}
	function unwatch(file) {
		
		//console.log('Un-watching: ' + file.nativePath);
		
		if(monitored[file.nativePath])
			delete monitored[file.nativePath];
		var i = 0;
		$.each(monitored, function(idx, val) {
			i++;
		});
		if(i == 0) {
			clearInterval(timer);
			timer = null;
		}
	}
	function watchInterval() {
		
		$.each(monitored, function(idx, val) { 
			if(val.file.exists) {
				if(val.file.modificationDate.getTime() != val.origModificationDate.getTime()) {
					$(window).trigger('crunch.filechanged', val.file);
					val.origModificationDate = val.file.modificationDate;
				}
			}
		});
	}
	function stop() { if(timer !== null) { clearInterval(timer); timer = null; } }
	function start() { if(timer === null) { timer = setInterval(watchInterval, interval); } }

	return {
		watch: watch,
		unwatch: unwatch,
		stop: stop,
		start: start
	}
}();

	Crunch.FileMonitor = FileMonitor;
	
})(jQuery);