(function($) {
	
var FileMonitor = function() {
	var monitored = {};
	var timer = null;
	
	function watch(file) {

		if(!(file.nativePath) || monitored[file.nativePath])
			return;
			
		//console.log('Watching: ' + file.nativePath);
		monitored[file.nativePath] = {
			origModificationDate: file.modificationDate,
			file: file
		};
		
		if(timer === null)
			timer = setInterval(watchInterval, 2000);
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
	return {
		watch: watch,
		unwatch: unwatch
	}
}();

	Crunch.FileMonitor = FileMonitor;
	
})(jQuery);