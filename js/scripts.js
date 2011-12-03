var appUpdater = new runtime.air.update.ApplicationUpdaterUI(); 
appUpdater.configurationFile = new air.File("app:/updateConfig.xml"); 
appUpdater.initialize();
Crunch = {};
Crunch.pendingClose = false;
Crunch.scrollWidth = 100;
$(document).ready(function() {
	
	
	// Keyboard mappings
	var meta = "ctrl";
	if(navigator.platform.indexOf('Mac') > -1)
		meta = "cmd"

	bindKey('n', function () { 
		$('#new-file:not(:disabled)').click();
	});

	bindKey('o', function () { 
		$('#open-file:not(:disabled)').click();
	});

	bindKey('shift+o', function () { 
		$('#open-project:not(:disabled)').click();
	});

	bindKey('s', function () { 
		$('#save:not(:disabled)').click();
	});

	bindKey('shift+s', function () { 
		$('#save-as:not(:disabled)').click();
	});

	bindKey('enter', function () { 
		$('#convert:not(:disabled)').click();
	});

	function bindKey(keys, fn) {
		jwerty.key(meta + '+' + keys, fn);
		$('#tabs li textarea').live('keydown', jwerty.event(meta + '+' + keys, false));
	}
	
	// Let's get rid of those pesky Mac menus. We can add stuff in later.
	if (air.NativeApplication.supportsMenu) {
		var appMenu = air.NativeApplication.nativeApplication.menu;
		while (appMenu.items.length > 1) {
			appMenu.removeItemAt(appMenu.items.length - 1);
		}
	}
	
	window.htmlLoader.addEventListener("nativeDragDrop",function(event){ 
        var filelist = event.clipboard.getData(air.ClipboardFormats.FILE_LIST_FORMAT); 
        $.each(filelist, function(index, item) {
			var file = new air.File(item.url);
			if(file.isDirectory) {
				Crunch.openProject(file);
				return false;			
			}
			else
				Crunch.openFile(file);
		});
		//air.trace(filelist[0].url); 
    }); 

	var t = 0;
	air.NativeApplication.nativeApplication.addEventListener(air.InvokeEvent.INVOKE, invokeHandler);
	
	window.nativeWindow.addEventListener(air.Event.CLOSING, closingHandler);

	function closingHandler(event){
		event.preventDefault();
		closeWindow();
	}
	function closeWindow() {
		var tabsToClose = $("#tabs li[id]");
		if(tabsToClose.length > 0) {
			$(tabsToClose).first().each(function() {
				Crunch.pendingClose = true;
				Crunch.tryCloseTab($(this));
			});
		}
		else
			nativeWindow.close();		
	}
	
	function invokeHandler(event) {
		if (event.arguments.length > 0) {
			Crunch.openFile(new air.File(event.arguments[0]));
		}
	}
	$("#container > table").colResizable({
		minWidth: 215,
		liveDrag:true,
	    gripInnerHtml:'<div id="resize"></div>',
		onResize: function() {
			if($('#tabs li.active').length > 0) {
				$('#tabs li.active').data('editor').resize();
				Crunch.adjustTabOverflow();
			}
		}
	});
	$(window).resize(function() {
		if($('#tabs li.active').length > 0) {
			$('#tabs li.active').data('editor').resize();
			Crunch.adjustTabOverflow();
		}
	});
	
	$('#tabs > li > a').click(function() {
		Crunch.setActive(this);
	});
	$("#arrow-left").click(function() {
		var tabs = $("#tabs");
		if(tabs.margin().left > -Crunch.scrollWidth)
			tabs.animate({'margin-left': "0"}, {duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
		else
			tabs.animate({'margin-left': "+=" + Crunch.scrollWidth}, {duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
	});
	$("#arrow-right").click(function() {
		var tabs = $("#tabs");
		var width = $("#scroller").width();
		if(((tabs.margin().left*-1) + width + Crunch.scrollWidth) > tabs[0].scrollWidth)
			tabs.animate({'margin-left': (tabs[0].scrollWidth - width)*-1}, 
				{duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
		else
			tabs.animate({'margin-left': "-=" + Crunch.scrollWidth}, 
				{duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
	});
	Crunch.setActive = function(el) {
		$('#tabs li').removeClass('active');
		var parent = $(el).parent();
		parent.addClass('active');
		if(parent.data('notless') || !parent.data('file-less')) {
			$("#convert").attr('disabled', 'disabled');
		}
		else {
			$("#convert").removeAttr('disabled');
		}
		var width = $("#scroller").width();
		var tabs = $('#tabs');
		
		if((parent.outerWidth() + parent.position().left) > width) {
			tabs.animate({'margin-left': (tabs[0].scrollWidth - width)*-1}, 
				{duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
		}
		else if(parent.position().left < 0) {
			tabs.animate({'margin-left': tabs.margin().left - parent.position().left + 25}, 
				{duration: 'fast', complete: function() {
				Crunch.adjustTabOverflow();
			}
			});
		}
		parent.data('editor').focus();
		parent.data('editor').resize();
	}
	Crunch.tryCloseTab = function(el) {
		if(!el.data('saved')) {
			Crunch.openWindow('win/save.html?#' + el.attr('id'),350,225, true);
		}
		else
			Crunch.closeTab(el);
	}
	Crunch.closeTab = function(el) {
		var i = $(el).index();
		var wasActive = $(el).hasClass('active');
		$(el).data('editor',null).remove();
		if($('#tabs').children().length == 1) {
			$('#splash').show();
			$('#save, #save-as, #convert').attr('disabled','disabled');
			if($("#findbar").css("top") == 0)
				alert('visible');
			$("#findbar").animate({ top: '-33px' }, 100 ).find('input').blur();
			//newTab();
		}
		else {
			if(wasActive) {
				if(i == 1)
					Crunch.setActive($('#tabs > li > a')[i]);
				else
					Crunch.setActive($('#tabs > li > a')[i-1]);
			}
			else
				Crunch.setActive($('#tabs > li.active > a'));
		}
		if(Crunch.pendingClose)
			closeWindow();
		Crunch.adjustTabOverflow();
		return false;
	}
	$('#tabs a.tab .close').click(function() {
		var listItem = $(this).parent().parent();
		Crunch.tryCloseTab(listItem);
	});
	
	Crunch.adjustTabOverflow = function() {
		var tabs = $('#tabs');
		var width = $("#scroller").width();
		if(tabs.margin().left < 0)
			$("#arrow-left").removeAttr("disabled");
		else
			$("#arrow-left").attr("disabled","disabled");

		if(tabs[0].scrollWidth == (width - tabs.margin().left))
			$("#arrow-right").attr("disabled","disabled");
		else
			$("#arrow-right").removeAttr("disabled");
	}
	Crunch.unSave = function(el) {
		if(el.data('saved')) {
			el.data('saved',false);
			el.find('.save').show();
		}
	}
	Crunch.newTab = function(css, position) {
		$('#splash').hide();
		$('#save, #save-as').removeAttr('disabled');
		var el;
		if(position && position.length == 1)
			el = $('#tabs li:first-child').clone(true, true).show().insertAfter(position);
		else
			el = $('#tabs li:first-child').clone(true, true).show().appendTo('#tabs');			
			
		t++;
		el.attr('id', 'panel-' + t);
		el.find('.messages').attr('id','messages-' + t);
		el.find('.editor').attr('id','editor-' + t);
		
		var editor = ace.edit('editor-' + t);
		//editor.setTheme("ace/theme/textmate");	
		editor.setShowPrintMargin(false);
		var newMode = require("ace/mode/less").Mode;
		editor.getSession().setMode(new newMode());
		editor.getSession().on('change', function() {
			var activeEl = $("#tabs li.active");
			//  && arguments[0].data.text.length==1
			if(activeEl.data('dirty')) {
				Crunch.unSave(activeEl);
				activeEl.data('dirty',false);
			}
		});
		el.find('textarea').bind('keydown',function(e) {
			 el.data('dirty',true);
		});
		if(css) {
			Crunch.setTabType(el,true);
			el.find('.filename').html('new.css');
		}
		el.data('editor',editor);
		el.data('saved',true);
		Crunch.setActive(el.find('a.tab'));
		Crunch.adjustTabOverflow();
		return el;
	}
	Crunch.setTabType = function(el, notless) {
		el.data('notless',notless);
		if(notless)
			el.find('a.tab').addClass('other');
		else
			el.find('a.tab').removeClass('other');
	}
	var canon = require("pilot/canon");
	
	canon.addCommand({
		name: "find",
		bindKey: {
			win: "Ctrl-F",
			mac: "Command-F",
			sender: "editor"
		},
		exec: function() {
			$("#findbar").animate({ top: '0' }, 100 ).find('input').focus();
		}
	});
	
	canon.addCommand({
		name: "replace",
		bindKey: {
			win: "Ctrl-R",
			mac: "Command-R",
			sender: "editor"
		},
		exec: function() {
			// Not implemented
		}
	});

	canon.addCommand({
		name: "replaceall",
		bindKey: {
			win: "Ctrl-Shift-R",
			mac: "Command-Shift-R",
			sender: "editor"
		},
		exec: function() {
			// Not implemented
		}
	});

	$("#findbar .close").click(function() {
		$("#findbar").animate({	top: '-33px' }, 100 );
		$("#tabs li.active").data('editor').focus();
	});
	$("#find").submit(function() {
		Crunch.findText($("#findbar input").val());
		return false;
	});
	$("#findbar input").change(function() {
		Crunch.findText($("#findbar input").val());
	});
	Crunch.findText = function(val) {
		$("#tabs li.active").data('editor')
			.find(val,{
			  wrap: true,
			  caseSensitive: false,
			  wholeWord: false,
			  regExp: false
			});
		return false;
	}
	
	$("#findbar .up").click(function() {
		$("#tabs li.active").data('editor').findPrevious();
	});
	$("#findbar .down").click(function() {
		$("#tabs li.active").data('editor').findNext();
	});	
//
//	canon.addCommand({
//		name: "crunch",
//		bindKey: {
//			win: "Ctrl-Shift-S",
//			mac: "Command-Shift-S",
//			sender: "editor"
//		},
//		exec: function() {
//			$('#convert:not(:disabled)').click();
//		}
//	});


	//newTab();
	
	Crunch.directory = air.File.documentsDirectory;
	Crunch.cssDirectory = air.File.documentsDirectory;
	Crunch.lessDirectory = air.File.documentsDirectory;
	Crunch.lastCrunch;


	// Intercept AJAX requests because AIR doesn't use them	
	$.mockjax({
		url: 'dir.html',
		status: 200,
		response: function(settings) {
			this.responseText = Crunch.getTree(settings.data.path);
		}
	});

	// Less.js tries to do an XMLHttpRequest. Not sure how to circumvent, so we'll just hijack that too.	
	// Yes, the fact that there are two hijackers is stupid, I know. There's a good explanation... well, a reasonable explanation, and I'll fix later.
	var server = new MockHttpServer();
	server.handle = function (request) {

		if(request.url.match(/\.less/i)) {
			request.url = request.url.replace(/app:\//ig,'');
			var getFile = Crunch.directory.resolvePath(request.url);
			if(!getFile.exists) {
				request.receive(404, "Not found.");
			}
			else {
				request.setResponseHeader("Last-Modified", getFile.modificationDate);
				var fileStream = new air.FileStream();
				fileStream.open(getFile, air.FileMode.READ);
				request.receive(200, fileStream.readMultiByte(getFile.size, air.File.systemCharset));
				fileStream.close();
			}
		}
	};
	server.start();
	$(window).bind('crunch.error',function(ev, e, href) {
		var activeEl = $("#tabs li.active .messages");
		var msg = e.message;
		// Fix line numbers later
//		showMessage(activeEl, e.message + " (Line " + e.line + ")<br>Filename: " + href
//			.replace('app:/' + $('#root').attr('title'),''));
		Crunch.showMessage(activeEl, e.message + "<br>Filename: " + href
			.replace('app:/' + $('#root').attr('title'),''));
	});
	Crunch.showMessage = function(el,msg) {
		el.addClass('show').find('.description').html(msg);
		el.closest('li').data('editor').resize();
	}
	Crunch.hideMessage = function(el) { 
		el.removeClass('show').find('.description').html('');
		el.closest('li').data('editor').resize();
	}
	$("#filelist").dblclick(function(e) {
	
		var $target = $(event.target);
		if( $target.is("a") ) $target = $target.parent();
		if( $target.is("li") ) {
			var title = $target.attr('title');
			if(title.match(/\.(less|css)$/i)) {
				var fileToOpen = new air.File(title);
				Crunch.openFile(fileToOpen);
			}
		}
	});
	$('.new-less').click(function() {
		Crunch.newTab();
	});
	$('.new-css').click(function() {
		Crunch.newTab(true);
	});
	
	Crunch.openFile = function(file, silent) {
		// For now, only open CSS and LESS files.
		if(!file.nativePath.match(/\.(less|css)$/i))
			return;
		// Wait a tick, what if it's already open?
		var found = false;
		$("#tabs li").each(function() {
			if($(this).data('file-less') && ($(this).data('file-less').nativePath == file.nativePath)) {
				if($(this).data('saved') && $(this).data('file-less').modificationDate != file.modificationDate) {
					var stream = new air.FileStream();
					stream.open(file, air.FileMode.READ);
					var fileData = stream.readMultiByte(file.size, air.File.systemCharset);
					stream.close();
					$(this).data('editor').getSession().setValue(fileData);				
				}
				if(!silent)
					Crunch.setActive($(this).find('a.tab'));
				else
					$(this).find('a.tab').pulse({
						backgroundColor: ['rgba(141,71,28,1)','rgba(141,71,28,0.8)'],
						color: ['#000000', '#FFFFFF']
					}, 200, 3);
				found = true;
			}
		});
		if(!found) {
			var stream = new air.FileStream();
			stream.open(file, air.FileMode.READ);
			var fileData = stream.readMultiByte(file.size, air.File.systemCharset);
			stream.close();
			
			var el;
			if(silent)
				el = Crunch.newTab(false, $("#tabs li.active"));
			else
				el = Crunch.newTab(false);
			el.find('.filename').html(file.name);
			el.data('editor').getSession().setValue(fileData);
			
			el.data('saved',true);
			el.find('.save').hide();
			if(!file.name.match(/\.less/i)) {
				Crunch.setTabType(el,true);
			}
			el.data('file-less',file);
			Crunch.setActive(el.find('a.tab'));
			//setTimeout(function() {
			//	$("li.active").data('editor').resize();
			//},1000);
			
		}
		
	}
	$('.open-file').click(function() {
		var fileToOpen = new air.File(Crunch.lessDirectory.nativePath);
		var txtFilter = new air.FileFilter("LESS file", "*.less;*.css");
		try {
			fileToOpen.browseForOpen("Open", [txtFilter]);
			fileToOpen.addEventListener(air.Event.SELECT, fileSelected);
		}
		catch (error) {
			alert("FRAK. This happened: " + error.message);
		}
		
		function fileSelected(event) {
			Crunch.openFile(event.target);			
		}
	});
	$('#save').click(function() {
		var activeEl = $("#tabs li.active");
		Crunch.trySave(activeEl, false);
	});
	$('#save-as').click(function() {
		var activeEl = $("#tabs li.active");
		Crunch.saveAsFile(activeEl, false);
	});
	$('#convert').bind('click', function(event) {
		var activeEl = $("#tabs li.active");
		Crunch.lastCrunch = Crunch.crunchFile(activeEl);
		if(!Crunch.lastCrunch) return;
		
		if(!(activeEl.data('saved'))) {
			var answer = confirm('You have to save before crunching. Go ahead and save?');
			if(answer) {
				Crunch.trySave(activeEl, false);
			}
			else
				return;
		}
		Crunch.trySave(activeEl, true);
		
	});
	
	Crunch.crunchFile = function(el) {
		var output;
		try {
			var parser = new(less.Parser)({
					paths: [el.data('file-less').nativePath.replace(/[\w\.-]+$/, '')],
					filename: el.data('file-less').name
				}).parse(el.data('editor').getSession().getValue(), function (err, tree) {
					
					if (err) { throw err; }
					
					output = "/* CSS crunched with Crunch - http://crunchapp.net/ */\n" + tree.toCSS({ compress: true });
					//$('#output').val(output);
					Crunch.hideMessage(el.find('.messages'));
			});	
		}
		catch(err) {
			var errMessage = err.message;
			if(err.index) {
				errMessage += ' Index: ' + err.index;
			}
			Crunch.showMessage(el.find('.messages'),errMessage); return false;
		}

		return output;
	}
	Crunch.trySave = function(el, crunch, closeWindow) {
		if(closeWindow) { 
			closeWindow.alwaysInFront = false;
			nativeWindow.activate();
			closeWindow.close();
		}
		else
			closeWindow = false;
		if(crunch)
			fileSelect = el.data('file-css');
		else
			fileSelect = el.data('file-less');
		
		if(!fileSelect) {
			Crunch.saveAsFile(el, crunch, closeWindow);
		}
		else {
			Crunch.saveFile(el, crunch, false);
			if(closeWindow)
				Crunch.closeTab(el);
		}
	}
	
	Crunch.saveFile = function(el, crunch, ask, update) {
		var fileSelect;
		var writeData;
		if(crunch) {
			fileSelect = el.data('file-css');
			try {
				writeData = Crunch.lastCrunch;
			}
			catch(err) {
				alert("I failed at saving. My bad. Here's what happened: " + err.message);
				return false;
			}
		}
		else {
			fileSelect = el.data('file-less');
			writeData = el.data('editor').getSession().getValue();
		}
			
		try {
			if(ask && fileSelect.exists) {
				if(!confirm('Replace "' + fileSelect.name + '"?'))
					return false;
			}
			var stream = new air.FileStream();
			stream.open(fileSelect, air.FileMode.WRITE);
			try {
				stream.writeUTFBytes(writeData);
				if(el.data('notless') && fileSelect.name.match(/\.less/i)) {
					Crunch.setTabType(el,false);
				}
				
			}
			catch(err) {
				alert("I failed at saving. My bad. Here's what happened: " + err.message);
				return false;
			}
			finally {
				stream.close();
			}
		}
		catch(err) {
			alert("I failed in the saving of your glorious creation. Here's why: " + err.message);
			return false;
		}
		if(crunch)
			Crunch.openFile(fileSelect, true);
		el.data('saved',true);
		el.find('.save').hide();
		
		if(update) {
			$('#filelist li').each(function() {
				if($(this).attr('title') == fileSelect.parent.nativePath)
					$('#filelist').jstree('refresh',this);
			});
		}
		Crunch.setActive(el.find('a.tab'));
		
		return true;
		
	}
	Crunch.saveAsFile = function(el, crunch, closeAfterSave) {
		var filename = el.find('.filename').html();
		var fileSelect;
		if(crunch) {
			if(!el.data('file-css'))
				fileSelect = Crunch.cssDirectory.resolvePath(filename.replace('.less','.css'));
			else
				fileSelect = el.data('file-css');
		}
		else {
			if(!el.data('file-less'))
				fileSelect = Crunch.lessDirectory.resolvePath(filename);

			else
				fileSelect = el.data('file-less');	
		}
		setTimeout(function() {
			try {
				fileSelect.browseForSave("Save As");
				fileSelect.addEventListener(air.Event.SELECT, saveData);
			}
			catch (error) {
				alert("I tried to Save As something, but then I must have done something wrong. Error is: " +  err.message);
			}
		
		},100);
		
		function saveData(event) {
			var newFile = event.target;
			if(crunch) {
				el.data('file-css',newFile);
				Crunch.cssDirectory = newFile.parent;
			}
			else {
				el.data('file-less',newFile);
				el.find('.filename').html(newFile.name);
				el.find('.tab').attr('title',newFile.nativePath);
				Crunch.lessDirectory = newFile.parent;
			}
							
			Crunch.saveFile(el, crunch, false, true);
			
			if(closeAfterSave) {
				//closeAfterSave.close();
				Crunch.closeTab(el);
			}
		}
	}
	$('#openwindow').click(function() {
		Crunch.openWindow('win/save.html',350,225,true);
	});
	Crunch.openWindow = function(url,width,height,utility) {
		var winType;
		if(!utility) {
			winType = air.NativeWindowType.NORMAL;
			utility = false;
		}
		else {
			winType = air.NativeWindowType.UTILITY;
			utility = true;
		}
			
		var options = new air.NativeWindowInitOptions();
		var modalWin = null;
		var bounds = new air.Rectangle(
			nativeWindow.x + (width / 2), 
		  nativeWindow.y + (height / 2), 
		  width, height);
//		options.minSize = new air.Point(width, height);
		options.type = winType;
//		options.alwaysInFront = alwaysInFront;
		options.maximizable = !utility;
		options.minimizable = !utility;
		options.resizable = !utility;
		if(utility) options.owner = window.nativeWindow;
		
		modalWin = air.HTMLLoader.createRootWindow(
		   true, options, true, bounds
		);
			
		modalWin.load(new air.URLRequest(
			url
		));
		
		modalWin.addEventListener(
		  air.Event.HTML_DOM_INITIALIZE , 
		  function (e) {
			  e.target.window.parent = e.target.window.opener = this;
			  
		  }  
		);
		
	}
	Crunch.htmlEncode = function(value){
	  return $('<div/>').text(value).html();
	}
	Crunch.textEncode = function(value) {
		return $('<div/>').html(value).text();
	}
	
	Crunch.getTree = function(treePath) {
		var target = Crunch.directory.resolvePath(treePath);
		var files = target.getDirectoryListing();
		var tree = '<ul>';
		for(var i = 0; i < files.length; i++) {
			if(!files[i].isHidden) {
				tree+='<li'; 
				if(files[i].isDirectory) {
					var dir = files[i].getDirectoryListing();
					if(dir.length == 0) 
						tree+=' class="jstree-leaf folder"';
					else
						tree+=' class="jstree-closed folder"';
				}
				else if(files[i].name.match(/\.less$/i))
					tree+=' class="jstree-leaf file less"';
				else if(files[i].name.match(/\.css$/i))
					tree+=' class="jstree-leaf file css"';
				else
					tree+=' class="jstree-leaf file"';
					
				tree+=' title="' + files[i].nativePath + '"><a href="#">' + files[i].name + '</a></li>';
			}
		}
		tree+='</ul>';
		return tree;
	}
	
	Crunch.openProject = function(dir) {
		Crunch.directory = Crunch.cssDirectory = Crunch.lessDirectory = dir;
		var tree = '<li id="root" class="jstree-open" title="' + Crunch.directory.nativePath + '"><a href="#">' + Crunch.directory.name + '</a>'
				+ Crunch.getTree(Crunch.directory.nativePath) + '</li>';
		$("#filelist")
			.jstree({
				"core" : { "initially_open" : [ "root" ], "animation": 100 },
				"ui" : {
					"select_limit": 1
				},
				"html_data" : {
					"data" : tree,
					"ajax" :  { "url" : "dir.html",  
						"data" : function (n) { return { path: n.attr("title")};  }
					}
				},
				"themes" : {
					"theme" : "new",
					"dots" : true,
					"icons" : true
				},
				"plugins" : [ "themes", "html_data", "ui", "types"]
			});
		$('#project').addClass("show").find("#open-project").removeClass('big');
		$('#refresh').removeAttr('disabled').click(function() {
			$('#filelist').jstree('refresh',-1);
			$(this).toggleClass('click');
		});	
	}
	$('#open-project').bind('click', function(event) {
		var selectDir = new air.File(Crunch.directory.nativePath);
		try	{
			selectDir.browseForDirectory("Select Directory");
			selectDir.addEventListener(air.Event.SELECT, directorySelected);
		}
		catch (error) {
			alert("Failed:" + error.message);
		}
		
		function directorySelected(event) {
			Crunch.openProject(event.target);
		}
	});
	
	$('#info').click(function() {
		Crunch.openWindow('win/about.html',522,550, true);
	});
	$('#help').click(function() {
		Crunch.openWindow('win/help.html',750,490, false);
	});	

});
