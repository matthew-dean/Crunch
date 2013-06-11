var appUpdater = new runtime.air.update.ApplicationUpdaterUI();
appUpdater.configurationFile = new air.File("app:/updateConfig.xml");
appUpdater.initialize();

//console = air.Introspector.Console; 

(function($) {

	var Crunch = function() {
		var Parser;
		var pendingClose = false;
		var scrollWidth = 100;

		// Get stored state
		
		// Paths are the default folders for open/save file dialogs
		var Paths = {
			project: air.File.documentsDirectory,
			css: air.File.documentsDirectory,
			less: air.File.documentsDirectory
		}
		var App = {
			paths: {
				project: "",
				css: "",
				less: ""
			},
			// currently open files
			openFiles: {},
			activeTab: "",
			recent: {
				files: [],
				folders: []
			},
			prefs: {
				minify: true
			}
		};	
        var storedPrefs = air.EncryptedLocalStore.getItem("state");
        
        if(storedPrefs != null) {
			var val = storedPrefs.readUTFBytes(storedPrefs.length);
        	$.extend(true, App, JSON.parse(val));
			copyPaths();
		}
		function updateAppState() {
			var str = JSON.stringify(App);
			var bytes = new air.ByteArray();
			bytes.writeUTFBytes(str);
			air.EncryptedLocalStore.setItem("state", bytes);
			copyPaths();
		}
		function checkValidPaths() {
			var update = false;
			var root = Paths.project;
			if(!root.resolvePath(App.paths.project).isDirectory) {
				App.paths.project = "";
				update = true;
			} 
			if(!root.resolvePath(App.paths.css).isDirectory) {
				App.paths.css = "";
				update = true;
			}
			if(!root.resolvePath(App.paths.less).isDirectory) {
				App.paths.less = "";
				update = true;
			}
			$.each(App.openFiles, function(idx, val) {
				if(!root.resolvePath(idx).exists) {
					delete App.openFiles[idx];	
					update = true;
				}
			});
			
			if(update) updateAppState();
			
		}
		function copyPaths() {
			var root = Paths.project;
			if(root.resolvePath(App.paths.project).isDirectory) {
				Paths.project = root.resolvePath(App.paths.project);
			}
			if(root.resolvePath(App.paths.css).isDirectory) {
				Paths.css = root.resolvePath(App.paths.css);
			}
			if(root.resolvePath(App.paths.less).isDirectory) {
				Paths.less = root.resolvePath(App.paths.less);
			}
		}
		
		function addOpenFile(file) {
			var updateState = false;
			if(!(file.nativePath in App.openFiles)) {
				updateState = true;
				App.openFiles[file.nativePath] = {
					rootFile: file.nativePath
				}
			}
			if(App.recent.files.indexOf(file.nativePath) == -1) {
				updateState = true;
				App.recent.files.unshift(file.nativePath);
				if(App.recent.files.length > 10)
					App.recent.files.pop();
			}
			if(updateState)
				updateAppState();
		}
		function updateOpenFile(less, css) {
			if(less.nativePath in App.openFiles) {
				App.openFiles[less.nativePath].cssFile = css.nativePath;
				updateAppState();
			}
		}
		function addRecentProject(dir) {
			
			if(App.recent.folders.indexOf(dir.nativePath) == -1) {	
				App.recent.folders.unshift(dir.nativePath);
				if(App.recent.folders.length > 10)
					App.recent.folders.pop();
				updateAppState();
			}
			
		}
		function removeOpenFile(file) {
			if(file && file.nativePath && (file.nativePath in App.openFiles)) {
				delete App.openFiles[file.nativePath];
				updateAppState();
			}
		}
		//var lessParser = less.Parser;
		//less.Parser = {};
		//less.Parser.prototype = lessParser;


		// Clunky, but works for now
		Commands = {
			newLess: function() {
				newTab();
			},
			newCss: function() {
				newTab(true);
			},
			openFile: function() {
				$('#open-file:not(:disabled)').click();
			},
			openProject: function() {
				$('#open-project:not(:disabled)').click();
			},
			save: function() {
				$('#save:not(:disabled)').click();
			},
			saveAs: function() {
				var activeEl = $("#tabs li.active");
				saveAsFile(activeEl, false);
			},
			crunch: function() {
				$('#convert:not(:disabled)').click();
			},
			checkForUpdates: function() {
				appUpdater.isCheckForUpdateVisible = true;
				appUpdater.checkNow();
			},
			exit: function() {
				closeWindow();
			}
		};
		
		
		// Keyboard mappings
		var meta = "ctrl";
		if(navigator.platform.indexOf('Mac') > -1)
			meta = "cmd"
		bindKey('n', Commands.newLess);
		bindKey('o', Commands.openFile);
		bindKey('shift+o', Commands.openProject);
		bindKey('s', Commands.save);
		bindKey('shift+s', Commands.saveAs);
		bindKey('enter', Commands.crunch);
		bindKey('shift+u', Commands.checkForUpdates);
		bindKey('e', Commands.exit);
		
		function bindKey(keys, fn) {
			jwerty.key(meta + '+' + keys, fn);
			$('#tabs li textarea').live('keydown', jwerty.event(meta + '+' + keys, false));
		}


		window.htmlLoader.addEventListener("nativeDragDrop", function(event) {
			var filelist = event.clipboard.getData(air.ClipboardFormats.FILE_LIST_FORMAT);
			$.each(filelist, function(index, item) {
				var file = new air.File(item.url);
				if(file.isDirectory) {
					openProject(file);
					return false;
				} else
					openFile(file);
			});
		});
		var t = 0;
		air.NativeApplication.nativeApplication.addEventListener(air.InvokeEvent.INVOKE, invokeHandler);

		window.nativeWindow.addEventListener(air.Event.CLOSING, closingHandler);

		function closingHandler(event) {
			event.preventDefault();
			closeWindow();
		}

		function closeWindow() {
			var tabsToClose = $("#tabs li.t[id]");
			if(tabsToClose.length > 0) {
				$(tabsToClose).first().each(function() {
					pendingClose = true;
					tryCloseTab($(this));
				});
			} else
				nativeWindow.close();
		}

		function invokeHandler(event) {
			if(event.arguments.length > 0) {
				openFile(new air.File(event.arguments[0]));
			}
		}

		function setActive(el) {
			$('#tabs li').removeClass('active');
			var parent = $(el).parent();
			parent.addClass('active');
			if(parent.data('notless') || !parent.data('file-less')) {
				$("#convert").attr('disabled', 'disabled');
			} else {
				$("#convert").removeAttr('disabled');
			}
			var width = $("#scroller").width();
			var tabs = $('#tabs');

			if((parent.outerWidth() + parent.position().left) > width) {
				tabs.animate({
					'margin-left' : (tabs[0].scrollWidth - width) * -1
				}, {
					duration : 'fast',
					complete : function() {
						adjustTabOverflow();
					}
				});
			} else if(parent.position().left < 0) {
				tabs.animate({
					'margin-left' : tabs.margin().left - parent.position().left + 25
				}, {
					duration : 'fast',
					complete : function() {
						adjustTabOverflow();
					}
				});
			}
			parent.data('editor').focus();
			parent.data('editor').resize();
			
		}

		function tryCloseTab(el) {
			if(!el.data('saved')) {
				openWindow('win/save.html?#' + el.attr('id'), 520, 225, true);
			} else
				closeTab(el);
		}

		function closeTab(el) {
			var i = $(el).index('#tabs > li.t');
			var wasActive = $(el).hasClass('active');

			// Stop monitoring file
			if($(el).data('file-less'))
				Crunch.FileMonitor.unwatch($(el).data('file-less'));
			
			// Remove from open files list
			if(!pendingClose)
				removeOpenFile($(el).data('file-less'));
				
			$(el).data('editor', null).remove();

			if($('#tabs').children().length == 2) {
				$('#splash').show();
				$('#save, #save-as, #convert').attr('disabled', 'disabled');
				if($("#findbar").css("top") == 0)
					alert('visible');
				$("#findbar").animate({
					top : '-33px'
				}, 100).find('input').blur();
				//newTab();
			} else {
				if(wasActive) {
					if(i == 1)
						setActive($('#tabs > li.t > a')[i]);
					else
						setActive($('#tabs > li.t > a')[i - 1]);
				} else
					setActive($('#tabs > li.t.active > a'));
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
				$("#arrow-left").attr("disabled", "disabled");

			if(tabs[0].scrollWidth == (width - tabs.margin().left))
				$("#arrow-right").attr("disabled", "disabled");
			else
				$("#arrow-right").removeAttr("disabled");
		}

		function unSave(el) {
			if(el.data('saved')) {
				el.data('saved', false);
				el.find('.save').show();
			}
		}

		function newTab(css, position) {
			$('#splash').hide();
			$('#save, #save-as').removeAttr('disabled');
			var el;
			var $firstTab = $('#tabs li:first-child');
			if(position && position.length == 1)
				el = $firstTab.clone(true, true).show().insertAfter(position);
			else
				el = $firstTab.clone(true, true).show().insertBefore($('#tabs li.n'));
			t++;
			el.attr('id', 'panel-' + t);
			el.find('.messages').attr('id', 'messages-' + t);
			el.find('.editor').attr('id', 'editor-' + t);

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
					activeEl.data('dirty', false);
				}
			});
			el.find('textarea').bind('keydown', function(e) {
				el.data('dirty', true);
			});
			if(css) {
				setTabType(el, true);
				el.find('.filename').html('new.css');
			}
			el.data('editor', editor);
			el.data('saved', true);
			setActive(el.find('a.tab'));
			adjustTabOverflow();
			return el;
		}

		function setTabType(el, notless) {
			el.data('notless', notless);
			if(notless)
				el.find('a.tab').addClass('other');
			else
				el.find('a.tab').removeClass('other');
		}

		var commands = require("ace/commands/default_commands").commands;

		commands.push({
			name : "find",
			bindKey : {
				win : "Ctrl-F",
				mac : "Command-F",
				sender : "editor"
			},
			exec : function() {
				$("#findbar").animate({
					top : '0'
				}, 100).find('input').focus().select();
			}
		}, {
			name : "replace",
			bindKey : {
				win : "Ctrl-R",
				mac : "Command-R",
				sender : "editor"
			},
			exec : function() {
				// Not implemented
			}
		}, {
			name : "replaceall",
			bindKey : {
				win : "Ctrl-Shift-R",
				mac : "Command-Shift-R",
				sender : "editor"
			},
			exec : function() {
				// Not implemented
			}
		});

		function findText(val) {
			$("#tabs li.active").data('editor').find(val, {
				wrap : true,
				caseSensitive : false,
				wholeWord : false,
				regExp : false
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

		var lastCrunch;

		// Intercept AJAX requests because AIR doesn't use them
		$.mockjax({
			url : 'dir.html',
			status : 200,
			response : function(settings) {
				this.responseText = getTree(settings.data.path);
			}
		});

		// Less.js tries to do an XMLHttpRequest. Not sure how to circumvent, so we'll just hijack that too.
		// Yes, the fact that there are two hijackers is stupid, I know. There's a good explanation... well, a reasonable explanation, and I'll fix later.
		var server = new MockHttpServer();
		server.handle = function(request) {

			if(request.url.match(/\.less/i)) {
				request.url = request.url.replace(/app:\//ig, '');
				var getFile = Paths.project.resolvePath(request.url);
				if(!getFile.exists) {
					request.receive(404, "Not found.");
				} else {
					request.setResponseHeader("Last-Modified", getFile.modificationDate);
					var fileStream = new air.FileStream();
					fileStream.open(getFile, air.FileMode.READ);
					request.receive(200, fileStream.readUTFBytes(fileStream.bytesAvailable));
					fileStream.close();
				}
			}
		};
		server.start();
		$(window).bind('crunch.error', function(ev, e, href) {
			var activeEl = $("#tabs li.active .messages");
			var msg = e.message;
			// Fix line numbers later
			//		showMessage(activeEl, e.message + " (Line " + e.line + ")<br>Filename: " + href
			//			.replace('app:/' + $('#root').attr('title'),''));
			//		showMessage(activeEl, e.message + "<br>Filename: " + href
			//			.replace('app:/' + $('#root').attr('title'),''));
			showMessage(activeEl, e.message + "<br>Filename: " + href.replace('app://', ''));

		});
		function showMessage(el, msg) {
			el.addClass('show').find('.description').html(msg);
			el.closest('li').data('editor').resize();
		}

		function hideMessage(el) {
			el.removeClass('show').find('.description').html('');
			el.closest('li').data('editor').resize();
		}

		function openFile(file, silent) {
			if(!file.nativePath)
				file = new air.File(file);

			// For now, only open CSS and LESS files.
			if(!file.nativePath.match(/\.(less|css)$/i))
				return;
			// Wait a tick, what if it's already open?
			var found = false;
			var el = null;
			$("#tabs li.t").each(function() {
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
							backgroundColor : ['rgba(141,71,28,1)', 'rgba(141,71,28,0.8)'],
							color : ['#000000', '#FFFFFF']
						}, 200, 3);
					el = $(this);
					found = true;
				}
			});
			if(!found) {
				var stream = new air.FileStream();
				
				// Add check to make sure file exists, otherwise return
				if(file.exists) {
					stream.open(file, air.FileMode.READ);
					Crunch.FileMonitor.watch(file);
					var fileData = stream.readUTFBytes(stream.bytesAvailable);
				} else {
					return
				}
				stream.close();

				if(silent)
					el = newTab(false, $("#tabs li.t.active"));
				else
					el = newTab(false);
				el.find('.filename').html(file.name);
				el.data('editor').getSession().setValue(fileData);

				el.data('saved', true);
				el.find('.save').hide();
				if(!file.name.match(/\.less/i)) {
					setTabType(el, true);
				}
				el.data('file-less', file);
				setActive(el.find('a.tab'));
				addOpenFile(file);
				
				//setTimeout(function() {
				//	$("li.active").data('editor').resize();
				//},1000);

			}
			return el;

		}

		function crunchFile(el) {
			var output;
			try {
				var entryPath = el.data('file-less').nativePath.replace(/[\w\.-]+$/, '');
				Parser = new (less.Parser)({
					//paths : [entryPath],
					entryPath : entryPath,
					//rootpath: entryPath,
					relativeUrls: true,
					filename: el.data('file-less').name
				}).parse(el.data('editor').getSession().getValue(), function(err, tree) {

					if(err) {
						throw err;
					}
					output = "/* CSS crunched with Crunch - http://crunchapp.net/ */\n" + tree.toCSS({
						compress : App.prefs.minify
					});
					//$('#output').val(output);
					hideMessage(el.find('.messages'));
				});
			} catch(err) {
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
				showMessage(el.find('.messages'), errMessage);
				return false;
			}

			return output;
		}

		function trySave(el, crunch, closeWindow) {
			if(el.length == 0)
				return;
			if(closeWindow) {
				closeWindow.alwaysInFront = false;
				nativeWindow.activate();
				closeWindow.close();
			} else
				closeWindow = false;
			if(crunch)
				fileSelect = el.data('file-css');
			else
				fileSelect = el.data('file-less');

			if(!fileSelect) {
				saveAsFile(el, crunch, closeWindow);
			} else {
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
				} catch(err) {
					alert("I failed at saving. My bad. Here's what happened: " + err.message);
					return false;
				}
			} else {
				fileSelect = el.data('file-less');
				writeData = el.data('editor').getSession().getValue();
			}

			Crunch.FileMonitor.unwatch(fileSelect);

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
						setTabType(el, false);
					}

				} catch(err) {
					alert("I failed at saving. My bad. Here's what happened: " + err.message);
					return false;
				} finally {
					stream.close();
					setTimeout(function() { Crunch.FileMonitor.watch(fileSelect) }, 1000);
				}
			} catch(err) {
				alert("I failed in the saving of your glorious creation. Here's why: " + err.message);
				return false;
			}
			if(crunch)
				openFile(fileSelect, true);
			el.data('saved', true);
			el.find('.save').hide();

			if(update) {
				$('#filelist li').each(function() {
					if($(this).attr('title') == fileSelect.parent.nativePath)
						$('#filelist').jstree('refresh', this);
				});
			}
			setActive(el.find('a.tab'));

			return true;

		}

		function saveAsFile(el, crunch, closeAfterSave) {
			var filename = el.find('.filename').html();
			var fileSelect;
			var filemonitored = false;
			if(crunch) {
				if(!el.data('file-css'))
					fileSelect = Paths.css.resolvePath(filename.replace('.less', '.css'));
				else
					fileSelect = el.data('file-css');
			} else {
				if(!el.data('file-less'))
					fileSelect = Paths.less.resolvePath(filename);
				else {
					fileSelect = el.data('file-less');
					Crunch.FileMonitor.unwatch(fileSelect);
					filemonitored = true;
				}	
			}
			
			setTimeout(function() {
				try {
					fileSelect.browseForSave("Save As");
					fileSelect.addEventListener(air.Event.SELECT, saveData);
					if(filemonitored)
						fileSelect.addEventListener(air.Event.CANCEL, reWatch);
				} catch (error) {
					alert("I tried to Save As something, but then I must have done something wrong. Error is: " + err.message);
				}

			}, 100);
			function reWatch(event) {
				Crunch.FileMonitor.watch(fileSelect);
			}
			function saveData(event) {
				var newFile = event.target;
				if(crunch) {
					el.data('file-css', newFile);
					App.paths.css = newFile.parent;
					updateOpenFile(el.data('file-less'), el.data('file-css'));
				} else {
					el.data('file-less', newFile);
					el.find('.filename').html(newFile.name);
					el.find('.tab').attr('title', newFile.nativePath);
					App.paths.less = newFile.parent;
				}
				updateAppState();

				saveFile(el, crunch, false, true);

				if(closeAfterSave) {
					//closeAfterSave.close();
					closeTab(el);
				}
			}

		}

		function openWindow(url, width, height, utility) {
			var winType;
			if(!utility) {
				winType = air.NativeWindowType.NORMAL;
				utility = false;
			} else {
				winType = air.NativeWindowType.UTILITY;
				utility = true;
			}

			var options = new air.NativeWindowInitOptions();
			var modalWin = null;
			var bounds = new air.Rectangle(nativeWindow.x + (width / 2), nativeWindow.y + (height / 2), width, height);
			//		options.minSize = new air.Point(width, height);
			options.type = winType;
			//		options.alwaysInFront = alwaysInFront;
			options.maximizable = !utility;
			options.minimizable = !utility;
			options.resizable = !utility;
			if(utility)
				options.owner = window.nativeWindow;
			modalWin = air.HTMLLoader.createRootWindow(true, options, true, bounds);

			modalWin.load(new air.URLRequest(url));

			modalWin.addEventListener(air.Event.HTML_DOM_INITIALIZE, function(e) {
				e.target.window.parent = e.target.window.opener = this;

			});
		}

		function htmlEncode(value) {
			return $('<div/>').text(value).html();
		}

		function textEncode(value) {
			return $('<div/>').html(value).text();
		}

		function getTree(treePath) {
			var target = Paths.project.resolvePath(treePath);
			var files = target.getDirectoryListing();
			var tree = '<ul>';
			for(var i = 0; i < files.length; i++) {
				if(!files[i].isHidden) {
					tree += '<li';
					if(files[i].isDirectory) {
						var dir = files[i].getDirectoryListing();
						if(dir.length == 0)
							tree += ' class="jstree-leaf folder"';
						else
							tree += ' class="jstree-closed folder"';
					} else if(files[i].name.match(/\.less$/i))
						tree += ' class="jstree-leaf file less"';
					else if(files[i].name.match(/\.css$/i))
						tree += ' class="jstree-leaf file css"';
					else
						tree += ' class="jstree-leaf file"';
					tree += ' title="' + files[i].nativePath + '"><a href="#">' + files[i].name + '</a></li>';
				}
			}
			tree += '</ul>';
			return tree;
		}

		function openProject(dir) {
			App.paths.project = App.paths.less = App.paths.css = dir.nativePath;
			addRecentProject(dir);
			updateAppState();
			
			var directory = Paths.project;
			
			var tree = '<li id="root" class="jstree-open" title="' + directory.nativePath + '"><a href="#">' + directory.name + '</a>' + getTree(directory.nativePath) + '</li>';
			$("#filelist").jstree({
				"core" : {
					"initially_open" : ["root"],
					"animation" : 100
				},
				"ui" : {
					"select_limit" : 1
				},
				"html_data" : {
					"data" : tree,
					"ajax" : {
						"url" : "dir.html",
						"data" : function(n) {
							return {
								path : n.attr("title")
							};
						}
					}
				},
				"themes" : {
					"theme" : "new",
					"dots" : true,
					"icons" : true
				},
				"plugins" : ["themes", "html_data", "ui", "types"]
			});
			$('#project').addClass("show").find("#open-project").removeClass('big');
			$('#refresh').removeAttr('disabled').click(function() {
				$('#filelist').jstree('refresh', -1);
				$(this).toggleClass('click');
			});
		}
		
		function initAppState() {
			checkValidPaths();
			
			if(App.paths.project != "")
				openProject(Paths.project);
			$.each(App.openFiles, function(idx, val) {
				var $el = openFile(Paths.project.resolvePath(idx));
				if(val.cssFile) {
					$el.data('file-css', Paths.project.resolvePath(val.cssFile));
				}
			});
			
			$('#tabs li.t').each(function() {
				if($(this).data('file-less') && $(this).data('file-less').nativePath == App.activeTab)
					setActive($(this).find("a"));
			});
			$('#chk-minify').attr('checked', App.prefs.minify);

		}
		function init() {
			CreateMenus();
			initAppState();
			
			$('#chk-minify').on('change',function() {
				App.prefs.minify = $('#chk-minify').is(':checked');
				updateAppState();
			});
			$('#actions').on('click', "li", function(e) {
				var $el = $(this);
				$el.addClass('active').siblings().removeClass('active');
				
				if($el.attr('id') == 'tab-prefs') {
					$('#panel-prefs').addClass('active');
					$('#panel-files').removeClass('active');
				}
				else {
					$('#panel-prefs').removeClass('active');
					$('#panel-files').addClass('active');
				}
			});
				
			$(window).on('crunch.filechanged', function(e, file) {
				nativeWindow.activate();
				openWindow('win/reload.html?' + encodeURIComponent(file.name) + '#' + encodeURIComponent(file.nativePath), 520, 225, true);
			});
			$("#container > table").colResizable({
				minWidth : 215,
				liveDrag : true,
				gripInnerHtml : '<div id="resize"></div>',
				onResize : function() {
					if($('#tabs li.t.active').length > 0) {
						$('#tabs li.t.active').data('editor').resize();
						adjustTabOverflow();
					}
				}
			});
			$(window).resize(function() {
				if($('#tabs li.t.active').length > 0) {
					$('#tabs li.t.active').data('editor').resize();
					adjustTabOverflow();
				}
			});

			$('#tabs > li.t > a').click(function() {
				if(!pendingClose && $(this).parent().data('file-less')) {
					App.activeTab = $(this).parent().data('file-less').nativePath;
					updateAppState();
				}
				setActive(this);
			});
			$('.messages .close').click(function() {
				hideMessage($(this).closest('.messages'));
			});
			
			$("#arrow-left").click(function() {
				var tabs = $("#tabs");
				if(tabs.margin().left > -scrollWidth)
					tabs.animate({
						'margin-left' : "0"
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
				else
					tabs.animate({
						'margin-left' : "+=" + scrollWidth
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
			});
			$("#arrow-right").click(function() {
				var tabs = $("#tabs");
				var width = $("#scroller").width();
				if(((tabs.margin().left * -1) + width + scrollWidth) > tabs[0].scrollWidth)
					tabs.animate({
						'margin-left' : (tabs[0].scrollWidth - width) * -1
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
				else
					tabs.animate({
						'margin-left' : "-=" + scrollWidth
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
			});
			$("#findbar .up").click(function() {
				$("#tabs li.t.active").data('editor').findPrevious();
			});
			$("#findbar .down").click(function() {
				$("#tabs li.t.active").data('editor').findNext();
			});
			$('#tabs a.tab .close').click(function() {
				var listItem = $(this).parent().parent();
				tryCloseTab(listItem);
			});

			$("#findbar .close").click(function() {
				$("#findbar").animate({
					top : '-33px'
				}, 100);
				$("#tabs li.t.active").data('editor').focus();
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
				if($target.is("a"))
					$target = $target.parent();
				if($target.is("li")) {
					var title = $target.attr('title');
					if(title.match(/\.(less|css)$/i)) {
						var fileToOpen = new air.File(title);
						openFile(fileToOpen);
					}
				}
			});
			$('.new-less').click(Commands.newLess);
			$('.new-css').click(Commands.newCss);

			$('.open-file').click(function() {
				var fileToOpen = new air.File(Paths.less.nativePath);
				var txtFilter = new air.FileFilter("LESS file", "*.less;*.css");
				try {
					fileToOpen.browseForOpen("Open", [txtFilter]);
					fileToOpen.addEventListener(air.Event.SELECT, fileSelected);
				} catch (error) {
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
			
			$('#save-as').click(Commands.saveAs);
			
			$('#convert').bind('click', function(event) {
				var activeEl = $("#tabs li.active");
				lastCrunch = crunchFile(activeEl);
				if(!lastCrunch)
					return;

				if(!(activeEl.data('saved'))) {
					var answer = confirm('You have to save before crunching. Go ahead and save?');
					if(answer) {
						trySave(activeEl, false);
					} else
						return;
				}
				trySave(activeEl, true);

			});
			$('#openwindow').click(function() {
				openWindow('win/save.html', 522, 225, true);
			});
			$('#open-project').bind('click', function(event) {
				var selectDir = new air.File(Paths.project.nativePath);
				try {
					selectDir.browseForDirectory("Select Directory");
					selectDir.addEventListener(air.Event.SELECT, directorySelected);
				} catch (error) {
					alert("Failed:" + error.message);
				}

				function directorySelected(event) {
					openProject(event.target);
				}

			});

			$('#info').click(function() {
				openWindow('win/about.html', 522, 550, true);
			});
			$('#help').click(function() {
				openWindow('win/help.html', 750, 490, false);
			});
		}

		var application = air.NativeApplication.nativeApplication;

		function CreateMenus() {
			var fileMenu;
			var editMenu;
			
			if(air.NativeWindow.supportsMenu && nativeWindow.systemChrome != air.NativeWindowSystemChrome.NONE) {
				$('.windowMenu').show();
				fileMenu = createFileMenu();
				
				// Edit menu is hidden for now.
				//editMenu = createEditMenu();
				$('#fileMenu').click(function(e) {
					fileMenu.display(window.nativeWindow.stage, $(this).position().left + 55, $(this).position().top + 27);
				});
				$('#editMenu').click(function(e) {
					editMenu.display(window.nativeWindow.stage, $(this).position().left + 55, $(this).position().top + 27);
				});
			}

			if(air.NativeApplication.supportsMenu) {
				// Let's get rid of those pesky Mac menus. We can add stuff in later.

				var appMenu = application.menu;
				while(appMenu.items.length > 1) {
					appMenu.removeItemAt(appMenu.items.length - 1);
				}
				// Now we're adding stuff
				application.menu.addEventListener(air.Event.SELECT, selectCommandMenu);
				fileMenu = application.menu.addItem(new air.NativeMenuItem("File"));
				fileMenu.submenu = createFileMenu();
			//	editMenu = application.menu.addItem(new air.NativeMenuItem("Edit"));
			//	editMenu.submenu = createEditMenu();

			}
		}
		function addMenuItem(menu, label, func, key) {

			var cmd = menu.addItem(new air.NativeMenuItem(label));
			cmd.addEventListener(air.Event.SELECT, func);
			if(key)
				cmd.keyEquivalent = key;

		}
		
		function createFileMenu() {
			var fileMenu = new air.NativeMenu();
			fileMenu.addEventListener(air.Event.SELECT, selectCommandMenu);
			fileMenu.addEventListener(air.Event.PREPARING, updateRecentMenus);

			addMenuItem(fileMenu, "New", Commands.newLess, "n");
			addMenuItem(fileMenu, "Open File...", Commands.openFile, "o");
			addMenuItem(fileMenu, "Open Project...", Commands.openProject, "O");
			
			fileMenu.addItem(new air.NativeMenuItem("", true));
			
			addMenuItem(fileMenu, "Save", Commands.save, "s");
			addMenuItem(fileMenu, "Save As...", Commands.saveAs, "s");

			fileMenu.addItem(new air.NativeMenuItem("", true));
			var recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Files");
			recentFiles.name = "recentFiles";
			
			recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Websites");
			recentFiles.name = "recentSites";
			
			fileMenu.addItem(new air.NativeMenuItem("", true));
			addMenuItem(fileMenu, "Crunch!", Commands.crunch, "enter");
			
			fileMenu.addItem(new air.NativeMenuItem("", true));
			addMenuItem(fileMenu, "Check for updates...", Commands.checkForUpdates, "U");
			addMenuItem(fileMenu, "Exit", Commands.exit, "e");
			
			// var openProj = fileMenu.addItem(new air.NativeMenuItem("Recent Projects"));
			// openProj.submenu = new air.NativeMenu();
			// openProj.submenu.addEventListener(air.Event.PREPARING, updateRecentDocumentMenu);
			// openProj.submenu.addEventListener(air.Event.SELECT, selectCommandMenu);

			return fileMenu;
		}

		function createEditMenu() {
			var editMenu = new air.NativeMenu();
			editMenu.addEventListener(air.Event.SELECT, selectCommandMenu);

			var copyCommand = editMenu.addItem(new air.NativeMenuItem("Copy"));
			copyCommand.addEventListener(air.Event.SELECT, selectCommand);
			copyCommand.keyEquivalent = "c";
			var pasteCommand = editMenu.addItem(new air.NativeMenuItem("Paste"));
			pasteCommand.addEventListener(air.Event.SELECT, selectCommand);
			pasteCommand.keyEquivalent = "v";
			editMenu.addItem(new air.NativeMenuItem("", true));
			//var preferencesCommand = editMenu.addItem(new air.NativeMenuItem("Preferences"));
			//preferencesCommand.addEventListener(air.Event.SELECT,selectCommand);

			return editMenu;
		}

		function updateRecentMenus(event) {
			var docMenu = air.NativeMenu(event.target).getItemByName("recentFiles").submenu;

			docMenu.removeAllItems();

			for(var i in App.recent.files) {
				var menuItem = docMenu.addItem(new air.NativeMenuItem(App.recent.files[i]));
				menuItem.data = Paths.project.resolvePath(App.recent.files[i]);
				menuItem.addEventListener(air.Event.SELECT, function(e) {
					openFile(e.target.data);
				});
			}
			
			docMenu = air.NativeMenu(event.target).getItemByName("recentSites").submenu;
			docMenu.removeAllItems();
			
			for(var i in App.recent.folders) {
				var menuItem = docMenu.addItem(new air.NativeMenuItem(App.recent.folders[i]));
				menuItem.data = Paths.project.resolvePath(App.recent.folders[i]);
				menuItem.addEventListener(air.Event.SELECT, function(e) {
					openProject(e.target.data);
				});
			}
			
		}

		function selectCommand(event) {
			//air.trace("Selected command: " + event.target.label);
		}

		function selectCommandMenu(event) {
			if(event.currentTarget.parent != null) {
				var menuItem = findItemForMenu(event.currentTarget);
				if(menuItem != null) {
					air.trace("Select event for \"" + event.target.label + "\" command handled by menu: " + menuItem.label);
				}
			} else {
				air.trace("Select event for \"" + event.target.label + "\" command handled by root menu.");
			}
		}

		function findItemForMenu(menu) {
			for(var item in menu.parent.items) {
				if(item != null) {
					if(item.submenu == menu) {
						return item;
					}
				}
			}
			return null;
		}

		return {
			init : init,
			closeTab : closeTab,
			trySave : trySave,
			openFile : openFile,
			Parser: Parser,
			App: App
		}
	}();

	window.Crunch = Crunch;

	$(document).ready(function() {
		Crunch.init();
	});
	$(window).on('load', function() {
		window.nativeWindow.visible = true;
	})
})(jQuery);
