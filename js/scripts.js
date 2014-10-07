var appUpdater = new runtime.air.update.ApplicationUpdaterUI();
appUpdater.configurationFile = new air.File("app:/updateConfig.xml");
appUpdater.initialize();

if(air.Introspector && air.Introspector.Console) {
	console = air.Introspector.Console; 
}
else {
	console = {};
	console.log = function() {};
}

(function($) {


	var Crunch = function() {
		var Parser;
		var pendingClose = false;
		var scrollWidth = 100;
		var selectedTab = null;
		var tabMenu = null;
		var modelist = ace.require("ace/ext/modelist");

		var isPlatformMac = navigator.platform.indexOf('Mac') > -1;
		// Get stored state

		// Paths are the default folders for open/save file dialogs
		Paths = {
			project: air.File.documentsDirectory,
			css: air.File.documentsDirectory,
			less: air.File.documentsDirectory
		};
		App = {
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
				minify: true,
				filemonitoring: true,
				saveOnCrunch: true,
				ieCompat: false,
				strictMath: false,
				strictUnits: false,
				openCSSafterCrunch: true
			}
		};	
		var prefsPath = air.File.applicationStorageDirectory;
		var prefsFile = prefsPath.resolvePath("prefs.json");

		if(prefsFile.exists) {
			var stream = new air.FileStream(); 
			stream.open(prefsFile, air.FileMode.READ); 
			var storedPrefs = stream.readUTFBytes(stream.bytesAvailable); 
			stream.close();		
			$.extend(true, App, JSON.parse(storedPrefs));
		 	copyPaths();
		}

		function updateAppState() {
			var str = JSON.stringify(App);
			var stream = new air.FileStream(); 
			stream.open(prefsFile, air.FileMode.WRITE); 
			stream.writeUTFBytes(str); 
			stream.close(); 
			//copyPaths();
		}

        //var storedPrefs = air.EncryptedLocalStore.getItem("state");
        
  //       if(storedPrefs != null) {
		// 	var val = storedPrefs.readUTFBytes(storedPrefs.length);
  //       	$.extend(true, App, JSON.parse(val));
		// 	copyPaths();
		// }

		// function updateAppState() {
		// 	var str = JSON.stringify(App);
		// 	var bytes = new air.ByteArray();
		// 	bytes.writeUTFBytes(str);
		// 	air.EncryptedLocalStore.setItem("state", bytes);
		// 	//copyPaths();
		// }


		function applyAppSetting(pref) {
			switch(pref) {
				case 'filemonitoring':
					if(App.prefs[pref]) Crunch.FileMonitor.start();
					else Crunch.FileMonitor.stop();
					break;
				default:
					break;
			}
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
				};
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
				var Crunch = $('#convert:not(:disabled)');
				if(Crunch.length > 0) {
					if(App.prefs.saveOnCrunch)
						Commands.save();
					Crunch.click();
				}
			},
			checkForUpdates: function() {
				appUpdater.isCheckForUpdateVisible = true;
				appUpdater.checkNow();
			},
			exit: function() {
				closeWindow();
			},
			closeTab: function() {
				tryCloseTab($("#tabs li.t.active"));
			},
			nextTab: function() {
				var nextTab = $('#tabs li.t.active').next('li.t[id]').find('a');
				if(nextTab.length > 0) setActive(nextTab);
				else if($('#tabs li.t[id]').length > 1) setActive($('#tabs li.t[id]:first').find('a'));
			},
			previousTab: function() {
				var previousTab = $('#tabs li.t.active').prev('li.t[id]').find('a');
				if(previousTab.length > 0) setActive(previousTab);
				else if($('#tabs li.t[id]').length > 1) setActive($('#tabs li.t[id]:last').find('a'));
			},
			selectAll: function() {
				$("#tabs li.active").data("editor").selectAll();
			},
			Find: function() {
				toggleDropdown($("#findbar"));
			},
			findNext: function() {
				$("#tabs li.t.active").data("editor").findNext();
			},
			findPrevious: function() {
				$("#tabs li.t.active").data("editor").findPrevious();
			},
			gotoLine: function() {
				toggleDropdown($("#gotolinebar"));
			}
		};
		

		// Keyboard mappings
		var meta = isPlatformMac ? "cmd" : "ctrl";

		bindKey('n', Commands.newLess);
		bindKey('o', Commands.openFile);
		bindKey('shift+o', Commands.openProject);
		bindKey('s', Commands.save);
		bindKey('shift+s', Commands.saveAs);
		bindKey('enter', Commands.crunch);
		bindKey('e', Commands.exit);
		bindKey('w', Commands.closeTab);
		bindKey('tab', Commands.nextTab);
		bindKey('shift+tab', Commands.previousTab);

		function bindKey(keys, fn) {
			jwerty.key(meta + '+' + keys, fn);
			$('#tabs li textarea').on('keydown', jwerty.event(meta + '+' + keys, false));
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
				$("#dropdowns-outer > div > .close").click();
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
				el = $firstTab.clone(true, true).insertAfter(position);
			else
				el = $firstTab.clone(true, true).insertBefore($('#tabs li.n'));
			t++;
			el.attr('id', 'panel-' + t);
			el.find('.messages').attr('id', 'messages-' + t);
			el.find('.editor').attr('id', 'editor-' + t);

			var editor = ace.edit("editor-" + t);
			editor.setTheme("ace/theme/crunch");
			editor.setShowPrintMargin(false);
			editor.setBehavioursEnabled(false);
			editor.setDisplayIndentGuides(false);
//			editor.setScrollSpeed(0.5);
			editor.setShowInvisibles(false);

			editor.getSession().setMode("ace/mode/less");
			
			// wow. much duplication. so hack. such windows.
			editor.commands.addCommands([{
				name : "save",   
				bindKey : {
					win : "Ctrl-S",
					mac : "Command-S",
					sender : "editor"
				},
				exec : Commands.save
			},{
				name : "saveAs",
				bindKey : {
					win : "Ctrl-Shift-S",
					mac : "Command-Shift-S",
					sender : "editor"
				},
				exec : Commands.saveAs
			},{
				name : "crunch",
				bindKey : {
					win : "Ctrl-Enter",
					mac : "Command-Enter",
					sender : "editor"
				},
				exec : Commands.crunch
			},{
				name : "gotoline",
				bindKey : {
					win : "Ctrl-G",
					mac : "Command-L",
					sender : "editor"
				},
				exec : Commands.gotoLine
			},{
				name : "find",
				bindKey : {
					win : "Ctrl-F",
					mac : "Command-F",
					sender : "editor"
				},
				exec : Commands.Find
			}, {
			},{
				name : "findnext",
				bindKey : {
					win : "Ctrl-K|F3",
					mac : "Command-K",
					sender : "editor"
				},
				exec : Commands.findNext
			}, {
			}, {
				name : "findprevious",
				bindKey : {
					win : "Ctrl-Shift-K|Shift-F3",
					mac : "Command-Shift-K",
					sender : "editor"
				},
				exec : Commands.findPrevious
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
			}, {
				name : "foldall",
				bindKey : {
					win : "Alt-0",
					mac : "Command-Option-0",
					sender : "editor"
				},
				exec : function() {
					// Not implemented
				}

			}]);
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
			el.find("a.tab").on("contextmenu", function(e) {
				e.preventDefault();
				selectedTab = $(this).parent();
				tabMenu.display(window.nativeWindow.stage, e.pageX, e.pageY);
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

		function toggleDropdown(e) {
			// @losnir: If already open, then just focus & highlight all
			if(e.is(":visible")) {
				e.find("input").focus().select();
				return;
			}

			// @losnir: Let's close everything else
			$("#dropdowns-outer > div:visible").each(function() {
				$(this).find(".close").click();
			});

			// @losnir: Let's slide it down
			e.show().animate({top : '0'}, 100, function() { $(this).find("input").focus().select(); }).parent().show();
		}

		function findText(val) {
			$("#tabs li.active").data('editor').find(val, {
				wrap : true,
				caseSensitive : false,
				wholeWord : false,
				regExp : false
			});
			return false;
		}

		function gotoLine(val) {
			$("#tabs li.active").data('editor').gotoLine(val, 0, true);
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
		$.mockjaxSettings.logging = false;
		$.mockjax({
			url : 'dir.html',
			status : 200,
			response : function(settings) {
				this.responseText = getTree(settings.data.path, true);
			}
		});

		// Less.js tries to do an XMLHttpRequest. Not sure how to circumvent, so we'll just hijack that too.
		// Yes, the fact that there are two hijackers is stupid, I know. There's a good explanation... well, a reasonable explanation, and I'll fix later.
		// var server = new MockHttpServer();
		// server.handle = function(request) {
			// if(request.url.match(/\.less/i)) {
				// request.url = request.url.replace(/app:\//ig, '');
				// var getFile = Paths.project.resolvePath(request.url);
				// if(!getFile.exists) {
					// request.receive(404, "Not found.");
				// } else {
					// request.setResponseHeader("Last-Modified", getFile.modificationDate);
					// var fileStream = new air.FileStream();
					// fileStream.open(getFile, air.FileMode.READ);
					// request.receive(200, fileStream.readUTFBytes(fileStream.bytesAvailable));
					// fileStream.close();
				// }
			// }
		// };
		// server.start();
		function handleError(ev, e, href) {
			var activeEl = $("#tabs li.active .messages");
			var msg = e.message;
			// Fix line numbers later
			//		showMessage(activeEl, e.message + " (Line " + e.line + ")<br>Filename: " + href
			//			.replace('app:/' + $('#root').attr('title'),''));
			//		showMessage(activeEl, e.message + "<br>Filename: " + href
			//			.replace('app:/' + $('#root').attr('title'),''));
			showMessage(activeEl, e.message + "<br>Filename: " + href.replace('app://', ''));
		}
		less.errorReporting = handleError;
		$(window).bind('crunch.error', handleError);
		
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
			if(!App.pro && !file.nativePath.match(/\.(less|css)$/i))
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
					return;
				}
				stream.close(); 

				if(silent)
					el = newTab(false, $("#tabs li.t.active"));
				else
					el = newTab(false);
				el.find('.filename').html(file.name);

				if(!file.nativePath.match(/\.(less|css)$/i)) {
					var mode = modelist.getModeForPath(file.nativePath).mode;
					el.data('editor').getSession().setMode(mode);
				}

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
					javascriptEnabled: false,
					//rootpath: entryPath,  -- putting in a rootpath appends to every URL
					relativeUrls: false,
					//filename: el.data('file-less').name  -- should be full qualified path
					filename: el.data('file-less').nativePath // ?
				}).parse(el.data('editor').getSession().getValue(), function(err, tree) {

					if(err) {
						throw err;
					}
					output = "/* CSS crunched with Crunch - http://crunchapp.net/ */\n" + tree.toCSS({
						compress : App.prefs.minify,
						ieCompat: App.prefs.ieCompat,
						strictMath: App.prefs.strictMath,
						strictUnits: App.prefs.strictUnits,
						verbose: true,
                    	//sourceMap: true
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
					setTimeout(function() { Crunch.FileMonitor.watch(fileSelect); }, 1000);
				}
			} catch(err) {
				alert("I failed in the saving of your glorious creation. Here's why: " + err.message);
				return false;
			}
			if(crunch && App.prefs.openCSSafterCrunch)
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
					// This fixes directory opening on Mac
					// Unfortunately, breaks save As

					// if(fileSelect.parent) {
					// 	fileSelect.parent.browseForSave("Save As");
					// }
					// else {
						fileSelect.browseForSave("Save As");
					//}
					
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
					App.paths.css = newFile.parent.nativePath;
					updateOpenFile(el.data('file-less'), el.data('file-css'));
				} else {
					el.data('file-less', newFile);
					el.find('.filename').html(newFile.name);
					el.find('.tab').attr('title', newFile.nativePath);
					App.paths.less = newFile.parent.nativePath;
				}
				updateAppState();

				saveFile(el, crunch, false, true);

				if(closeAfterSave) {
					closeTab(el);
				}
				else {
					if(!newFile.nativePath.match(/\.(less|css)$/i)) {
						var mode = modelist.getModeForPath(newFile.nativePath).mode;
						el.data('editor').getSession().setMode(mode);
					}
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

		function getTree(treePath, end) {
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
					tree += ' title="' + files[i].nativePath + '"><a href="#">' + files[i].name + '</a>'
					if(files[i].isDirectory && !end) {
						tree += getTree(files[i].nativePath, true);
					}
					tree += '</li>';
				}
			}
			tree += '</ul>';
			return tree;
		}

		function openProject(dir, dontInitPaths) {
			
			App.paths.project = dir.nativePath;
			Paths.less = Paths.css = Paths.project = dir;

			if(!dontInitPaths) {
				App.paths.less = App.paths.css = dir.nativePath;
			}
			addRecentProject(dir);
			updateAppState();
			
			var directory = Paths.project;
			
			var tree = '<li id="root" class="jstree-open" title="' + directory.nativePath + '"><a href="#">' + directory.name + '</a>' + getTree(directory.nativePath) + '</li>';
			var $fileTree = $('#filelist');
			$fileTree.jstree({
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
			}).bind("open_node.jstree", 'li', function (e, data) {
				var ref = $.jstree._reference($fileTree);

				$(data.args[0][0]).parent().find('li.jstree-closed').each(function() {
					var $node = $(this);
					if($node.find('ul').length === 0) {
						ref.load_node_html(this);
					}
				});
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
				openProject(Paths.project, true);

			$.each(App.openFiles, function(idx, val) {
				console.log('Open: ' + idx);
				var $el = openFile(Paths.project.resolvePath(idx));
				if(val.cssFile) {
					$el.data('file-css', Paths.project.resolvePath(val.cssFile));
				}
			});
			
			$('#tabs li.t').each(function() {
				if($(this).data('file-less') && $(this).data('file-less').nativePath == App.activeTab)
					setActive($(this).find("a"));
			});

			$('#panel-prefs .panel-body input[type="checkbox"]').each(function() {
				$(this).attr('checked', App.prefs[$(this).data("pref")]);
				applyAppSetting($(this).data("pref"));
			});
		}
		function init() {
			CreateMenus();
			initAppState();
			if(App.pro) {
				$('body').addClass('pro');
			}
			less.env = "production";
			// Restoring parser function from develop branch (replaces HTTP request)

			// less.Parser.fileLoader = function(path, paths, callback, env) {
					// var entryPath = (paths.entryPath && paths.entryPath != "")
						// ? paths.entryPath : env.rootpath;
			        // var file = Paths.project.resolvePath(entryPath).resolvePath(path);
					// console.log(callback);
					// console.log(env);
			        // // Adopted from the Node.js implementation
			        // if(file.exists) {
			                // var fileStream = new air.FileStream();
			                // fileStream.open(file, air.FileMode.READ);
			                // var fileData = fileStream.readUTFBytes(fileStream.bytesAvailable);
			                // fileStream.close();
// 			          
			                // new (less.Parser)({
			                	// //rootpath: env.rootpath,
								// relativeUrls: false,
			                	// filename : file.nativePath
			                // }).parse(fileData, function(e, root) {
			                        // callback(null, fileData, file.nativePath);
			                // });
			        // } else {
	                        // callback({
	                                // type : 'File',
	                                // message : "'" + file.nativePath + "' wasn't found.\n"
	                        // }, env.rootpath, file.nativePath);
			        // }
// 			
			// };
			
			less.Parser.fileLoader = function(originalHref, currentFileInfo, callback, env, modifyVars) {
				
			    // sheet may be set to the stylesheet for the initial load or a collection of properties including
			    // some env variables for imports
	//		    var hrefParts = extractUrlParts(originalHref, window.location.href);
	//		    var href      = hrefParts.url;
				
			    
			    var entryPath = (currentFileInfo.currentDirectory && currentFileInfo.currentDirectory != "")
						? currentFileInfo.currentDirectory : currentFileInfo.rootpath;
			    var file = Paths.project.resolvePath(entryPath).resolvePath(originalHref); // file full URL

			    var href = file.nativePath;
			    
			    var newFileInfo = {
			        currentDirectory: file.parent.nativePath + '/',
			        filename: file.name
			    };
			
			    if (currentFileInfo) {  // is this sometimes not present? why?
			        newFileInfo.entryPath = currentFileInfo.entryPath;
			        newFileInfo.rootpath = currentFileInfo.rootpath;
			        newFileInfo.rootFilename = currentFileInfo.rootFilename;
			        newFileInfo.relativeUrls = currentFileInfo.relativeUrls;
			    } else {
			        newFileInfo.entryPath = entryPath;
			        newFileInfo.rootpath = less.rootpath || entryPath;
			        newFileInfo.rootFilename = href;
			        newFileInfo.relativeUrls = env.relativeUrls;
			    }
			
				if(file.exists) {
					var fileStream = new air.FileStream();
					fileStream.open(file, air.FileMode.READ);
					var fileData = fileStream.readUTFBytes(fileStream.bytesAvailable);
					fileStream.close();
		          
			        try {
			            callback(null, fileData, href, newFileInfo, { lastModified: file.modificationDate });
			        } catch (e) {
			            callback(e, null, href);
			        }
		        } else {
					callback({
					        type : 'File',
					        message : "'" + file.nativePath + "' wasn't found.\n"
					}, null, href);
		        }
				
			};
			
			// @losnir: Will serve well every 'checkbox' based pref
			$('#panel-prefs .panel-body input[type="checkbox"]').on('change', function() {
				App.prefs[$(this).data("pref")] = $(this).is(":checked");
				updateAppState();
				applyAppSetting($(this).data("pref"));
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
				 
				$("#tabs li.t").each(function() {
					var $this = $(this);
					if($this.data('file-less') && ($this.data('file-less').nativePath == file.nativePath)) {

						if($this.data('saved'))
							openFile(file);
						else {
							// TODO: Check to see if this file is already open
							openWindow('win/reload.html?' + encodeURIComponent(file.name) + '#' + encodeURIComponent(file.nativePath), 520, 225, true);
						}
						return;
					}
				});

				
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
				Commands.findPrevious();
			});
			$("#findbar .down").click(function() {
				Commands.findNext();
			});
			$('#tabs a.tab .close').click(function() {
				var listItem = $(this).parent().parent();
				tryCloseTab(listItem);
			});

			$("#dropdowns-outer > div > .close").click(function() {
				$(this).parent().animate({top : '-33px'}, 100, function() {
					if(!$(this).siblings(":visible").length) {
						$(this).parent().hide();
						$("#tabs li.t.active").length && $("#tabs li.t.active").data('editor').focus();
					}
					$(this).hide();
				});
			});
			$("#gotoline").submit(function() {
				if((/^\d+$/).test(n = $(this).find("input").val()))
					gotoLine(n);
				return false;
			});
			$("#find").submit(function() {
				findText($(this).find("input").val());
				return false;
			});
			$("#findbar input").on("input", function() {
				findText($(this).val());
			});
			$("#dropdowns-outer > div input").on("keydown", jwerty.event('esc', function() {
				$(this).parent().siblings(".close").click();
			})).on("keydown", jwerty.event('ctrl+g', function(e) {
				e.preventDefault();
				Commands.gotoLine();
			})).on("keydown", jwerty.event('ctrl+f', function(e) {
				e.preventDefault();
				Commands.Find();
			}));
			$("#dropdowns-outer, #dropdowns-outer > div").hide();

			$("#filelist").dblclick(function(e) {

				var $target = $(event.target);
				if($target.is("a"))
					$target = $target.parent();
				if($target.is("li")) {
					var title = $target.attr('title');
					//if(title.match(/\.(less|css)$/i)) {
					var fileToOpen = new air.File(title);
					openFile(fileToOpen);
					//}
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
				openWindow('win/help.html', 760, 490, false);
			});
		}

		var application = air.NativeApplication.nativeApplication;

		function CreateMenus() {
			tabMenu = createTabMenu();
			var fileMenu;
			var editMenu;

			if(air.NativeWindow.supportsMenu && nativeWindow.systemChrome != air.NativeWindowSystemChrome.NONE) {
				$('.windowMenu').show();
				fileMenu = createFileMenu();
				editMenu = createEditMenu();

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
				editMenu = application.menu.addItem(new air.NativeMenuItem("Edit"));
				editMenu.submenu = createEditMenu();
			}
		}
		function addMenuItem(menu, label, func, keyEq, keyMod) {

			var cmd = menu.addItem(new air.NativeMenuItem(label));
			cmd.addEventListener(air.Event.SELECT, func);
			if(keyEq) cmd.keyEquivalent = keyEq;
			if(keyMod !== undefined) cmd.keyEquivalentModifiers = keyMod;
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
			addMenuItem(fileMenu, "Save As...", Commands.saveAs, "S");

			fileMenu.addItem(new air.NativeMenuItem("", true));
			var recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Files");
			recentFiles.name = "recentFiles";
			
			recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Websites");
			recentFiles.name = "recentSites";
			
			fileMenu.addItem(new air.NativeMenuItem("", true));
			addMenuItem(fileMenu, "Crunch!", Commands.crunch, "enter");
			
			fileMenu.addItem(new air.NativeMenuItem("", true));
			addMenuItem(fileMenu, "Check for updates...", Commands.checkForUpdates);
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

			addMenuItem(editMenu, "Select All", Commands.selectAll, "a");
			//addMenuItem(editMenu, "Cut", Commands.cut, "x");
			//addMenuItem(editMenu, "Copy", Commands.copy, "c");
			//addMenuItem(editMenu, "Paste", Commands.paste, "v");

			editMenu.addItem(new air.NativeMenuItem("", true));

			addMenuItem(editMenu, "Find...", Commands.Find, "f");
			addMenuItem(editMenu, "Find Next...", Commands.findNext, isPlatformMac ? "k" : "f3", isPlatformMac ? undefined : []);
			addMenuItem(editMenu, "Find Previous...", Commands.findPrevious, isPlatformMac ? "K" : "F3", isPlatformMac ? undefined : []);

			editMenu.addItem(new air.NativeMenuItem("", true));

			addMenuItem(editMenu, "Goto Line...", Commands.gotoLine, isPlatformMac ? "l" : "g");

			//var preferencesCommand = editMenu.addItem(new air.NativeMenuItem("Preferences"));
			//preferencesCommand.addEventListener(air.Event.SELECT,selectCommand);

			return editMenu;
		}

		function createTabMenu() {
			var tabMenu = new air.NativeMenu();
			tabMenu.addEventListener(air.Event.SELECT, selectCommandMenu);

			addMenuItem(tabMenu, "Close", function() {
				tryCloseTab(selectedTab);
			});


			addMenuItem(tabMenu, "Close others", function() {
				$("#tabs li.t[id]").each(function() {
					if($(this).attr("id") == selectedTab.attr("id")) return;
					tryCloseTab($(this));
				});
			});	

			/*addMenuItem(tabMenu, "Close tabs to the left", function() {
				$("#tabs li.t[id]").each(function() {
					if($(this).attr("id") == selectedTab.attr("id")) return false;
					tryCloseTab($(this));
				});
			});*/

			addMenuItem(tabMenu, "Close tabs to the right", function() {
				$.each($("#tabs li.t[id]").get().reverse(), function() {
					if($(this).attr("id") == selectedTab.attr("id")) return false;
					tryCloseTab($(this));
				});
			});	

			return tabMenu;		
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
		
		cheet('↑ ↑ ↓ ↓ ← → ← → b a', function () {
			if(!App.pro) {
				App.pro = true;
				updateAppState();
				alert('ACHIEVEMENT UNLOCKED!');	
				$('body').addClass('godmode pro');
			}
			else {
				App.pro = false;
				updateAppState();
				alert('ACHIEVEMENT UN-UNLOCKED!');	
				$('body').removeClass('godmode pro');
			}
		});

		return {
			init : init,
			closeTab : closeTab,
			trySave : trySave,
			openFile : openFile,
			Parser: Parser,
			App: App
		};
	}();

	window.Crunch = Crunch;

	$(document).ready(function() {
		Crunch.init();
	});
	$(window).on('load', function() {
		window.nativeWindow.visible = true;
	})
})(jQuery);
