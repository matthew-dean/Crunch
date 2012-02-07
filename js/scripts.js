
(function($) {
	
var Crunch = function() {

	var pendingClose = false;
	var scrollWidth = 100;

	//var lessParser = less.Parser;
	//less.Parser = {};
	//less.Parser.prototype = lessParser;
	
	
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
				openProject(file);
				return false;			
			}
			else
				openFile(file);
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
				pendingClose = true;
				tryCloseTab($(this));
			});
		}
		else
			nativeWindow.close();		
	}

	function invokeHandler(event) {
		if (event.arguments.length > 0) {
			openFile(new air.File(event.arguments[0]));
		}
	}
	
	function setActive(el) {
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
				adjustTabOverflow();
			}
			});
		}
		else if(parent.position().left < 0) {
			tabs.animate({'margin-left': tabs.margin().left - parent.position().left + 25}, 
				{duration: 'fast', complete: function() {
				adjustTabOverflow();
			}
			});
		}
		parent.data('editor').focus();
		parent.data('editor').resize();
	}
	function tryCloseTab(el) {
		if(!el.data('saved')) {
			openWindow('win/save.html?#' + el.attr('id'),350,225, true);
		}
		else
			closeTab(el);
	}
	function closeTab(el) {
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
					setActive($('#tabs > li > a')[i]);
				else
					setActive($('#tabs > li > a')[i-1]);
			}
			else
				setActive($('#tabs > li.active > a'));
		}
		if(pendingClose)
			closeWindow();
		adjustTabOverflow();
		return false;
	}

	function adjustTabOverflow() {
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
	function unSave(el) {
		if(el.data('saved')) {
			el.data('saved',false);
			el.find('.save').show();
		}
	}
	function newTab(css, position) {
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
				unSave(activeEl);
				activeEl.data('dirty',false);
			}
		});
		el.find('textarea').bind('keydown',function(e) {
			 el.data('dirty',true);
		});
		if(css) {
			setTabType(el,true);
			el.find('.filename').html('new.css');
		}
		el.data('editor',editor);
		el.data('saved',true);
		setActive(el.find('a.tab'));
		adjustTabOverflow();
		return el;
	}
	function setTabType(el, notless) {
		el.data('notless',notless);
		if(notless)
			el.find('a.tab').addClass('other');
		else
			el.find('a.tab').removeClass('other');
	}
	var commands = require("ace/commands/default_commands").commands;

	commands.push({
		name: "find",
		bindKey: {
			win: "Ctrl-F",
			mac: "Command-F",
			sender: "editor"
		},
		exec: function() {
			$("#findbar").animate({ top: '0' }, 100 ).find('input').focus();
		}
	}, {
		name: "replace",
		bindKey: {
			win: "Ctrl-R",
			mac: "Command-R",
			sender: "editor"
		},
		exec: function() {
			// Not implemented
		}
	}, {
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

	
	function findText(val) {
		$("#tabs li.active").data('editor')
			.find(val,{
			  wrap: true,
			  caseSensitive: false,
			  wholeWord: false,
			  regExp: false
			});
		return false;
	}

	
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

	var directory = air.File.documentsDirectory;
	var cssDirectory = air.File.documentsDirectory;
	var lessDirectory = air.File.documentsDirectory;
	var lastCrunch;


	// Intercept AJAX requests because AIR doesn't use them	
	$.mockjax({
		url: 'dir.html',
		status: 200,
		response: function(settings) {
			this.responseText = getTree(settings.data.path);
		}
	});

	// Less.js tries to do an XMLHttpRequest. Not sure how to circumvent, so we'll just hijack that too.	
	// Yes, the fact that there are two hijackers is stupid, I know. There's a good explanation... well, a reasonable explanation, and I'll fix later.
	var server = new MockHttpServer();
	server.handle = function (request) {

		if(request.url.match(/\.less/i)) {
			request.url = request.url.replace(/app:\//ig,'');
			var getFile = directory.resolvePath(request.url);
			if(!getFile.exists) {
				request.receive(404, "Not found.");
			}
			else {
				request.setResponseHeader("Last-Modified", getFile.modificationDate);
				var fileStream = new air.FileStream();
				fileStream.open(getFile, air.FileMode.READ);
				request.receive(200, fileStream.readUTFBytes(fileStream.bytesAvailable));
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
//		showMessage(activeEl, e.message + "<br>Filename: " + href
//			.replace('app:/' + $('#root').attr('title'),''));
		showMessage(activeEl, e.message + "<br>Filename: " + href
			.replace('app://',''));

	});
	function showMessage(el,msg) {
		el.addClass('show').find('.description').html(msg);
		el.closest('li').data('editor').resize();
	}
	function hideMessage(el) { 
		el.removeClass('show').find('.description').html('');
		el.closest('li').data('editor').resize();
	}

	function openFile(file, silent) {
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
					var fileData = stream.readUTFBytes(stream.bytesAvailable);
					stream.close();
					$(this).data('editor').getSession().setValue(fileData);				
				}
				if(!silent)
					setActive($(this).find('a.tab'));
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
			var fileData = stream.readUTFBytes(stream.bytesAvailable);
			stream.close();

			var el;
			if(silent)
				el = newTab(false, $("#tabs li.active"));
			else
				el = newTab(false);
			el.find('.filename').html(file.name);
			el.data('editor').getSession().setValue(fileData);

			el.data('saved',true);
			el.find('.save').hide();
			if(!file.name.match(/\.less/i)) {
				setTabType(el,true);
			}
			el.data('file-less',file);
			setActive(el.find('a.tab'));
			//setTimeout(function() {
			//	$("li.active").data('editor').resize();
			//},1000);

		}

	}
	

	function crunchFile(el) {
		var output;
		try {
			var parser = new(less.Parser)({
					paths: [el.data('file-less').nativePath.replace(/[\w\.-]+$/, '')],
					filename: el.data('file-less').name
				}).parse(el.data('editor').getSession().getValue(), function (err, tree) {

					if (err) { throw err; }

					output = "/* CSS crunched with Crunch - http://crunchapp.net/ */\n" + tree.toCSS({ compress: true });
					//$('#output').val(output);
					hideMessage(el.find('.messages'));
			});	
		}
		catch(err) {
			var errMessage = err.message;
			//if(err.index) {
			//	errMessage += ' Index: ' + err.index;
			//}
			if(err.line) {
				errMessage += ' (Line: ' + err.line + ')';
			}
			if(err.filename) {
				errMessage += '<br>Filename: ' + err.filename;
			}
			showMessage(el.find('.messages'),errMessage); return false;
		}

		return output;
	}
	function trySave(el, crunch, closeWindow) {
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
			saveAsFile(el, crunch, closeWindow);
		}
		else {
			saveFile(el, crunch, false);
			if(closeWindow)
				closeTab(el);
		}
	}

	function saveFile(el, crunch, ask, update) {
		var fileSelect;
		var writeData;
		if(crunch) {
			fileSelect = el.data('file-css');
			try {
				writeData = lastCrunch;
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
					setTabType(el,false);
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
			openFile(fileSelect, true);
		el.data('saved',true);
		el.find('.save').hide();

		if(update) {
			$('#filelist li').each(function() {
				if($(this).attr('title') == fileSelect.parent.nativePath)
					$('#filelist').jstree('refresh',this);
			});
		}
		setActive(el.find('a.tab'));

		return true;

	}
	function saveAsFile(el, crunch, closeAfterSave) {
		var filename = el.find('.filename').html();
		var fileSelect;
		if(crunch) {
			if(!el.data('file-css'))
				fileSelect = cssDirectory.resolvePath(filename.replace('.less','.css'));
			else
				fileSelect = el.data('file-css');
		}
		else {
			if(!el.data('file-less'))
				fileSelect = lessDirectory.resolvePath(filename);

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
				cssDirectory = newFile.parent;
			}
			else {
				el.data('file-less',newFile);
				el.find('.filename').html(newFile.name);
				el.find('.tab').attr('title',newFile.nativePath);
				lessDirectory = newFile.parent;
			}

			saveFile(el, crunch, false, true);

			if(closeAfterSave) {
				//closeAfterSave.close();
				closeTab(el);
			}
		}
	}
	
	function openWindow(url,width,height,utility) {
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
	function htmlEncode(value){
	  return $('<div/>').text(value).html();
	}
	function textEncode(value) {
		return $('<div/>').html(value).text();
	}

	function getTree(treePath) {
		var target = directory.resolvePath(treePath);
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

	function openProject(dir) {
		directory = cssDirectory = lessDirectory = dir;
		var tree = '<li id="root" class="jstree-open" title="' + directory.nativePath + '"><a href="#">' + directory.name + '</a>'
				+ getTree(directory.nativePath) + '</li>';
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
	
	
	function init() {
		
		$("#container > table").colResizable({
			minWidth: 215,
			liveDrag:true,
			gripInnerHtml:'<div id="resize"></div>',
			onResize: function() {
				if($('#tabs li.active').length > 0) {
					$('#tabs li.active').data('editor').resize();
					adjustTabOverflow();
				}
			}
		});
		$(window).resize(function() {
			if($('#tabs li.active').length > 0) {
				$('#tabs li.active').data('editor').resize();
				adjustTabOverflow();
			}
		});
	
		$('#tabs > li > a').click(function() {
			setActive(this);
		});
		$("#arrow-left").click(function() {
			var tabs = $("#tabs");
			if(tabs.margin().left > -scrollWidth)
				tabs.animate({'margin-left': "0"}, {duration: 'fast', complete: function() {
					adjustTabOverflow();
				}
				});
			else
				tabs.animate({'margin-left': "+=" + scrollWidth}, {duration: 'fast', complete: function() {
					adjustTabOverflow();
				}
				});
		});
		$("#arrow-right").click(function() {
			var tabs = $("#tabs");
			var width = $("#scroller").width();
			if(((tabs.margin().left*-1) + width + scrollWidth) > tabs[0].scrollWidth)
				tabs.animate({'margin-left': (tabs[0].scrollWidth - width)*-1}, 
					{duration: 'fast', complete: function() {
					adjustTabOverflow();
				}
				});
			else
				tabs.animate({'margin-left': "-=" + scrollWidth}, 
					{duration: 'fast', complete: function() {
					adjustTabOverflow();
				}
				});
		});
		$("#findbar .up").click(function() {
			$("#tabs li.active").data('editor').findPrevious();
		});
		$("#findbar .down").click(function() {
			$("#tabs li.active").data('editor').findNext();
		});	
		$('#tabs a.tab .close').click(function() {
			var listItem = $(this).parent().parent();
			tryCloseTab(listItem);
		});
		
		$("#findbar .close").click(function() {
			$("#findbar").animate({	top: '-33px' }, 100 );
			$("#tabs li.active").data('editor').focus();
		});
		$("#find").submit(function() {
			findText($("#findbar input").val());
			return false;
		});
		$("#findbar input").change(function() {
			findText($("#findbar input").val());
		});
		$("#filelist").dblclick(function(e) {

			var $target = $(event.target);
			if( $target.is("a") ) $target = $target.parent();
			if( $target.is("li") ) {
				var title = $target.attr('title');
				if(title.match(/\.(less|css)$/i)) {
					var fileToOpen = new air.File(title);
					openFile(fileToOpen);
				}
			}
		});
		$('.new-less').click(function() {
			newTab();
		});
		$('.new-css').click(function() {
			newTab(true);
		});
		
		$('.open-file').click(function() {
			var fileToOpen = new air.File(lessDirectory.nativePath);
			var txtFilter = new air.FileFilter("LESS file", "*.less;*.css");
			try {
				fileToOpen.browseForOpen("Open", [txtFilter]);
				fileToOpen.addEventListener(air.Event.SELECT, fileSelected);
			}
			catch (error) {
				alert("FRAK. This happened: " + error.message);
			}
	
			function fileSelected(event) {
				openFile(event.target);			
			}
		});
		$('#save').click(function() {
			var activeEl = $("#tabs li.active");
			trySave(activeEl, false);
		});
		$('#save-as').click(function() {
			var activeEl = $("#tabs li.active");
			saveAsFile(activeEl, false);
		});
		$('#convert').bind('click', function(event) {
			var activeEl = $("#tabs li.active");
			lastCrunch = crunchFile(activeEl);
			if(!lastCrunch) return;
	
			if(!(activeEl.data('saved'))) {
				var answer = confirm('You have to save before crunching. Go ahead and save?');
				if(answer) {
					trySave(activeEl, false);
				}
				else
					return;
			}
			trySave(activeEl, true);
	
		});
		$('#openwindow').click(function() {
			openWindow('win/save.html',350,225,true);
		});
		$('#open-project').bind('click', function(event) {
			var selectDir = new air.File(directory.nativePath);
			try	{
				selectDir.browseForDirectory("Select Directory");
				selectDir.addEventListener(air.Event.SELECT, directorySelected);
			}
			catch (error) {
				alert("Failed:" + error.message);
			}
	
			function directorySelected(event) {
				openProject(event.target);
			}
		});
	
		$('#info').click(function() {
			openWindow('win/about.html',522,550, true);
		});
		$('#help').click(function() {
			openWindow('win/help.html',750,490, false);
		});
	
	}
	return {
		init: init,
		closeTab: closeTab,
		trySave: trySave
	}
}();

	window.Crunch = Crunch;
	
	$(document).ready(function() {
		Crunch.init();
	});
})(jQuery);

