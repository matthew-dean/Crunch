/// DEVELOPMENT SETTINGS
var subTabsEnabled = true;
var importsEnabled = false;

var appUpdater = new runtime.air.update.ApplicationUpdaterUI();
appUpdater.configurationFile = new air.File("app:/updateConfig.xml");
appUpdater.initialize();

//var AIRIntrospectorConfig = new Object();
//AIRIntrospectorConfig.debuggerKey = 152;

if(air && air.Introspector) {
	console = air.Introspector.Console;
	//console.log('test');
}(function($) {

	var Crunch = function() {
		var Parser;
		var pendingClose = false;
		var scrollWidth = 100;
		var Editor;
		var lessMode = require("ace/mode/less").Mode;
		var EditSession = require("ace/edit_session").EditSession;
		var UndoManager = require("ace/undomanager").UndoManager;
		var canChangeSave = true;
		var SaveDialog;
		
		// Get stored state
		var $crunchEl;

		// Paths are the default folders for open/save file dialogs
		var Paths = {
			project : air.File.documentsDirectory,
			css : air.File.documentsDirectory,
			less : air.File.documentsDirectory
		}
		var App = {
			paths : {
				project : "",
				css : "",
				less : ""
			},
			// currently open files
			openFiles : {},
			activeTab : "",
			recent : {
				files : [],
				folders : []
			},
			prefs : {
				minify : true
			}
		};
		var Sessions = {};

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
			if(update)
				updateAppState();

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
					rootFile : file.nativePath
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

		Commands = {
			newLess : function() {
				newTab();
			},
			newCss : function() {
				newTab(true);
			},
			openFile : function() {
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

			},
			openProject : function() {
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

			},
			save : function() {
				
				var $activeEl = $("#tabs li.active .subtabs .active");
				trySave($activeEl, false);
			},
			saveAs : function() {
				var $activeEl = $("#tabs li.active .subtabs .active");
				if(!$activeEl.hasClass('.main'))
					return;
				saveAsFile($activeEl, false);
			},
			crunch : function() {
				var $activeEl = $("#tabs li.active");
				lastCrunch = crunchFile($activeEl);
				if(lastCrunch.err != null) {
					showMessage($activeEl.find('.messages'), lastCrunch.err);
					return;
				}
				if(!($activeEl.data('session').saved)) {
					var answer = confirm('You have to save before crunching. Go ahead and save?');
					if(answer) {
						trySave($activeEl, false);
					} else
						return;
				}
				trySave($activeEl, true);
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

		function bindKey(keys, fn) {
			jwerty.key(meta + '+' + keys, fn);
			$('#editor textarea').live('keydown', jwerty.event(meta + '+' + keys, false));
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
			var $el = $(el);
			console.log('Setting active tab...');
			console.log($el);
			var $scrollContainer;
			var $tabContainer;
			var $thisTab;
			var tabSession;

			if($el.is("a")) {
				$scrollContainer = $("#scroller");
				$tabContainer = $('#tabs');	
				$thisTab = $el.parent();
				$tabContainer.find('li').removeClass('active');
				$thisTab.addClass('active');
				tabSession = $thisTab.find('span.t.active').data('session');
			
				if($thisTab.data('notless') || !$thisTab.data('file-less')) {
					$("#convert").attr('disabled', 'disabled');
				} else {
					$("#convert").removeAttr('disabled');
				}
			
			}
			else {
				var $parentTab = $el.closest('.subtabs');
				$scrollContainer = $parentTab.find('.imports');
				$tabContainer = $scrollContainer.find('>div');
				$thisTab = $el;
				$parentTab.find('span.t').removeClass('active');
				$el.addClass('active');
				tabSession = $el.data('session');
			}
			
			if($thisTab.length == 0)
				return;
			
			var width = $scrollContainer.width();
			var tabs = $tabContainer;
			if(!($el.hasClass('.main') || $el.hasClass('.crunched'))) {
				if(($thisTab.outerWidth() + $thisTab.position().left) > width) {
					$tabContainer.animate({
						'margin-left' : ($tabContainer[0].scrollWidth - width) * -1
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
				} else if($thisTab.position().left < 0) {
					$tabContainer.animate({
						'margin-left' : $tabContainer.margin().left - $thisTab.position().left + 25
					}, {
						duration : 'fast',
						complete : function() {
							adjustTabOverflow();
						}
					});
				}
			}
			console.log('Switching to this tab\'s active session...');
			console.log(tabSession);
			
			Editor.setSession(tabSession.session);
			
			if(tabSession.readonly) {
				console.log('Setting readonly to true.');
				Editor.setReadOnly(true);
			}
			else
				Editor.setReadOnly(false);
				
			if(tabSession.saved)
				$thisTab.find('.save:first').hide();
			else
				$thisTab.find('.save:first').show();
			Editor.focus();
			Editor.resize();

		}
		
		function tryCloseTab($el) {
			var pendingFiles = [];
			$el.find('span.t').each(function() {
				// Some sub-tabs don't have sessions yet (crunched file subtab)
				if($(this).data('session') && !$(this).data('session').saved) {
					pendingFiles.push($(this));
				}
			});
			
			if(pendingFiles.length != 0) {
				console.log(SaveDialog);
				SaveDialog.window.init(pendingFiles, $el);
				//openWindow('win/save.html?#' + $el.attr('id'), 520, 225, true);
			}
			else
				closeTab($el);
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

			$(el).remove();

			if($('#tabs').children().length == 2) {
				$('#splash').show();
				$('#editor').css('z-index', -1);
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

		function unSave(tabSession) {
			console.log('Unsaving session...');
			console.log(tabSession);
			
			if(tabSession.saved) {
				tabSession.saved = false;
				$('#tabs li.t, #tabs .subtabs span.t').each(function() {
					var $el = $(this);
					if($(this).data('session') == tabSession)
						$el.find('.save:first').show();
				});
				
			}
		}
		function setSave(tabSession) {
			console.log('Saving session...');
			console.log(tabSession);
			
			if(!tabSession.saved) {
				tabSession.saved = true;
				$('#tabs li.t, #tabs .subtabs span.t').each(function() {
					var $el = $(this);
					if($(this).data('session') == tabSession)
						$el.find('.save:first').hide();
				});
				
			}
		}

		function newTab(css, position) {
			$('#splash').hide();
			$('#editor').css('z-index', 1);
			$('#save, #save-as').removeAttr('disabled');
			var $el;
			var $firstTab = $('#tabs li:first-child');
			if(position && position.length == 1)
				$el = $firstTab.clone(true, true).show().insertAfter(position);
			else
				$el = $firstTab.clone(true, true).show().insertBefore($('#tabs li.n'));
			t++;
			$el.attr('id', 'panel-' + t);
			$el.find('.messages').attr('id', 'messages-' + t);

			var tabSession = getTabSession();
			// tabSession.session.on('change', function() {
				// if(!canChangeSave) return;
				// unSave($el);
			// });
			
			if(css) {
				setTabType($el, true);
				$el.find('> a > .filename').html('new.css');
			}

			$el.data('session', tabSession);
			$el.find('.subtabs .main').data('session', tabSession);
			setActive($el.find('a.tab'));
			adjustTabOverflow();
			return $el;
		}
		function getTabSession(file) {
			if(file) {
				if(file.nativePath in Sessions) {
					return Sessions[file.nativePath];
				} 
				else {
					var tabSession = {
						saved: true
					};
					var session = new EditSession("", new lessMode());
					session.setUndoManager(new UndoManager());
					tabSession.session = session;
					
					tabSession.session.on('change', function() {
						if(!canChangeSave) return;
						unSave(tabSession);
					});
					
					Sessions[file.nativePath] = tabSession;
					
					return tabSession;
				}
			}
			else {
				var tabSession = {
					saved: true
				};
				var session = new EditSession("", new lessMode());
				session.setUndoManager(new UndoManager());
				tabSession.session = session;
				
				tabSession.session.on('change', function() {
					if(!canChangeSave) return;
					unSave(tabSession);
				});
				return tabSession;
			}
			
			
		}

		function setTabType($el, notless) {
			$el.data('notless', notless);
			if(notless)
				$el.find('a.tab').addClass('other');
			else
				$el.find('a.tab').removeClass('other');
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
			Editor.find(val, {
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
		
		// No longer needed as of LESS 1.3
		// $(window).bind('crunch.error', function(ev, e, href) {
			// air.trace('LESS error')
			// var $activeEl = $("#tabs li.active .messages");
			// var msg = e.message;
			// // Fix line numbers later
			// //		showMessage(activeEl, e.message + " (Line " + e.line + ")<br>Filename: " + href
			// //			.replace('app:/' + $('#root').attr('title'),''));
			// //		showMessage(activeEl, e.message + "<br>Filename: " + href
			// //			.replace('app:/' + $('#root').attr('title'),''));
			// showMessage($activeEl, e.message + "<br>Filename: " + href.replace('app://', ''));
// 
		// });
		
		function showMessage($el, msg) {
			$el.add('#editor').addClass('show').find('.description').html(msg);
			Editor.resize();
		}

		function hideMessage($el) {
			$el.add('#editor').removeClass('show').find('.description').html('');
			Editor.resize();
		}

		function addSubTab(file, fileData) {
			if(!$crunchEl.data('imports'))
				$crunchEl.data('imports', {});
			else {
				if(file.nativePath in $crunchEl.data('imports'))
					return;
			}
			$crunchEl.data('imports')[file.nativePath] = "";
			
			var tabSession;
			if(!(file.nativePath in Sessions)) {
				canChangeSave = false;
				tabSession = getTabSession(file);
				tabSession.session.setValue(fileData);
				canChangeSave = true;
			}
			else
				tabSession = getTabSession(file);
			
			var tabTemplate = '<span class="t"><span class="filename">' + file.name.replace('.less','')  +'</span><span class="save" style="display: none;">*</span></span>';
			var $imports = $crunchEl.find('.subtabs .imports > div');
			var $subtab = $(tabTemplate);
			t++;
			$subtab.attr('id', 'panel-' + t);
			$subtab.data('file-less',file);
			$subtab.data('session',tabSession);
			$subtab.data('filename', file.name);
			$imports.append($subtab);
			if(!tabSession.saved)
				$subtab.find('.save:first').show();			
			
		}
		function getFileData(file) {
			var stream = new air.FileStream();
			// Add check to make sure file exists, otherwise return
			if(file.exists) {
				stream.open(file, air.FileMode.READ);
				Crunch.FileMonitor.watch(file);
				return stream.readUTFBytes(stream.bytesAvailable);
			} else {
				return false;
			}
			stream.close();
		}
		function openFile(file, silent) {
			console.log('Opening file...');
			
			if(!file.nativePath)
				file = new air.File(file);
			
			// For now, only open CSS and LESS files.
			// Later, allow other file types that Ace supports?
			if(!file.nativePath.match(/\.(less|css)$/i))
				return;
			// Wait a tick, what if it's already open?
			var found = false;
			var $el = null;

			$("#tabs li.t").each(function() {

				// Don't know if this is needed anymore with the new file monitoring of 1.5
				if($(this).data('file-less') && ($(this).data('file-less').nativePath == file.nativePath)) {
					if($(this).data('session').saved && $(this).data('file-less').modificationDate != file.modificationDate) {
						var fileData = getFileData(file);
						
						canChangeSave = false;
						$(this).data('session').session.setValue(fileData);
						canChangeSave = true;
					}
					if(!silent)
						setActive($(this).find('a.tab'));
					else
						$(this).find('span.crunched').pulse({
							backgroundColor : ['rgba(141,71,28,1)', 'rgba(141,71,28,0.8)'],
							color : ['#000000', '#FFFFFF']
						}, 200, 3);
					$el = $(this);
					found = true;
				}
			});
			if(!found) {
				
				if(silent)
					$el = newTab(false, $("#tabs li.t.active"));
				else
					$el = newTab(false);
				$el.find('> a > .filename').html(file.name);

				var tabSession;
				console.log('Creating file session...');
				if(!(file.nativePath in Sessions)) {
					
					var fileData = getFileData(file);
					if(fileData === false)
						return;
					
					canChangeSave = false;
					tabSession = getTabSession(file);
					tabSession.session.setValue(fileData);
					canChangeSave = true;
				}
				else {
					tabSession = getTabSession(file);
				}
				
				
				//console.log(tabSession);
					
				$el.data('session', tabSession);
					
				if(tabSession.saved)
					$el.find('.save.first').hide();
				else
					$el.find('.save:first').show();
					
				
				$el.data('file-less', file);
				$el.find('.subtabs .main').data('file-less', file).data('session', tabSession).data('filename', file.name).find('.filename').html(file.name);
				
				// Non-LESS files don't have subtabs. Because screw those files.
				if(!file.name.match(/\.less/i)) {
					setTabType($el, true);
					
				}
				else {
					if(subTabsEnabled) {
						$el.find('.subtabs').css('display','');
					
						// Cool feature, bra. We immediately create a Crunched file session from the LESS file we opened.
						// That way, we can immediately support debugging without having to initially save a new CSS
						var compiled = crunchFile($el);
						console.log('Auto-creating compiled file...');
						console.log(compiled);
						var $crunchTab = $el.find('.subtabs .crunched');
						if(compiled.err == null) {
							var tabSession = getTabSession();
							canChangeSave = false;
							tabSession.session.setValue(compiled.output);
							canChangeSave = true;
							tabSession.readonly = true;
							$crunchTab.data('session', tabSession).css('display','');
						}
							
					}
				}
				
				setActive($el.find('a.tab'));
				addOpenFile(file);

				//setTimeout(function() {
				//	$("li.active").data('editor').resize();
				//},1000);

			}
			return $el;

		}

		function crunchFile($el) {
			var output;
			var errMessage = null;
			try {

				// TODO: Should be top session
				$crunchEl = $el;
				Parser = new (less.Parser)({
					paths : [$el.data('file-less').nativePath.replace(/[\w\.-]+$/, '')],
					rootpath: ""
				}).parse($el.data('session').session.getValue(), function(err, tree) {
					// Useful for stuff later
					//console.log(tree);
					if(err) {
						throw err;
					}
					output = "/* CSS crunched with Crunch - http://crunchapp.net/ */\n" + tree.toCSS({
						compress : App.prefs.minify
					});
					//$('#output').val(output);
					hideMessage($el.find('.messages'));
				});
			} catch(err) {
				errMessage = err.message;
				//if(err.index) {
				//	errMessage += ' Index: ' + err.index;
				//}
				if(err.line) {
					errMessage += ' (Line: ' + err.line + ')';
				}
				if(err.filename) {
					errMessage += '<br>Filename: ' + err.filename;
				}
				return false;
			}

			return { output: output, err: errMessage };
		}

		function trySave($el, crunch, closeWindow) {
			if($el.length == 0)
				return;
			if(closeWindow) {
				closeWindow.alwaysInFront = false;
				nativeWindow.activate();
				closeWindow.close();
			} else
				closeWindow = false;
			if(crunch)
				fileSelect = $el.data('file-css');
			else
				fileSelect = $el.data('file-less');

			if(!fileSelect) {
				saveAsFile($el, crunch, closeWindow);
			} else {
				saveFile($el, crunch, false);
				if(closeWindow)
					tryCloseTab($el);
			}
		}

		function saveFile($el, crunch, ask, update) {
			var fileSelect;
			var writeData;

			if(crunch) {
				fileSelect = $el.data('file-css');
				try {
					writeData = lastCrunch.output;
				} catch(err) {
					alert("I failed at saving. My bad. Here's what happened: " + err.message);
					return false;
				}
				
				var tabSession;
				if(!(fileSelect.nativePath in Sessions)) {
					canChangeSave = false;
					tabSession = getTabSession(fileSelect);
					tabSession.session.setValue(writeData);
					tabSession.readonly = true;
					canChangeSave = true;
				}
				else
					tabSession = getTabSession(fileSelect);
				
				$el.find('.subtabs .crunched').css('display','').data('session', tabSession).find('.filename').html(fileSelect.name);
				
			} else {
				fileSelect = $el.data('file-less');
				writeData = Editor.getSession().getValue();
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
					if($el.data('notless') && fileSelect.name.match(/\.less/i)) {
						setTabType($el, false);
					}

				} catch(err) {
					alert("I failed at saving. My bad. Here's what happened: " + err.message);
					return false;
				} finally {
					stream.close();
					setTimeout(function() {
						Crunch.FileMonitor.watch(fileSelect)
					}, 1000);
				}
			} catch(err) {
				alert("I failed in the saving of your glorious creation. Here's why: " + err.message);
				return false;
			}
			
			// With subtabs completely off, we open the crunched file in a new main tab.
			if(!subTabsEnabled) {
				if(crunch)
					openFile(fileSelect, true);
			}
			//$el.data('session').saved = true;
			setSave($el.data('session'));
			
			//$el.find('.save:first').hide();

			if(update) {
				$('#filelist li').each(function() {
					if($(this).attr('title') == fileSelect.parent.nativePath)
						$('#filelist').jstree('refresh', this);
				});
			}
			setActive($el.find('a.tab'));

			return true;

		}

		function saveAsFile($el, crunch, closeAfterSave) {
			var filename = $el.find('> a > .filename').html();
			var fileSelect;
			var filemonitored = false;
			if(crunch) {
				if(!$el.data('file-css'))
					fileSelect = Paths.css.resolvePath(filename.replace('.less', '.css'));
				else
					fileSelect = $el.data('file-css');
			} else {
				if(!$el.data('file-less'))
					fileSelect = Paths.less.resolvePath(filename);
				else {
					fileSelect = $el.data('file-less');
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
					$el.data('file-css', newFile);
					$el.find('.subtabs .crunched .filename').html(newFile.name);
					App.paths.css = newFile.parent.nativePath;
					updateOpenFile($el.data('file-less'), $el.data('file-css'));
				} else {
					$el.data('file-less', newFile);
					$el.find('> a > .filename').html(newFile.name);
					$el.find('.tab').attr('title', newFile.nativePath);
					App.paths.less = newFile.parent.nativePath;
				}
				updateAppState();

				saveFile($el, crunch, false, true);

				if(closeAfterSave) {
					//closeAfterSave.close();
					closeTab($el);
				}
			}

		}

		function openWindow(url, width, height, utility, callback) {
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
			if(callback)
				modalWin.window.nativeWindow.visible = false;
			if(utility)
				modalWin.window.nativeWindow.alwaysInFront = true;
			
			
			modalWin.load(new air.URLRequest(url));

			modalWin.addEventListener(air.Event.HTML_DOM_INITIALIZE, function(e) {
				e.target.window.parent = e.target.window.opener = this;
				if(callback)
					callback(e.target);
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
					console.log('Has attached css file:');
					console.log(val.cssFile);
					var file = Paths.project.resolvePath(val.cssFile)
					$el.data('file-css', file);
					$el.find('span.crunched .filename').html(file.name);
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
			
			// Create save window
			openWindow('win/save.html?', 520, 225, true, function(win) {
				SaveDialog = win;
			});
			
			// Set up global editor
			Editor = ace.edit('editor');
			Editor.session.setMode("ace/mode/less");
			Editor.setShowPrintMargin(false);
			
			// Set up parser function
			less.Parser.importer = function(path, paths, callback, env) {

				var file = Paths.project.resolvePath(paths[0]).resolvePath(path);

				// Adopted from the Node.js implementation
				if(file.exists) {
					var fileStream = new air.FileStream();
					fileStream.open(file, air.FileMode.READ);
					var fileData = fileStream.readUTFBytes(fileStream.bytesAvailable);
					fileStream.close();
					
					
					// Populate a scrollable list of imports. This will rock.
					if(importsEnabled)
						addSubTab(file, fileData);
						
					new (less.Parser)({
						paths : [file.nativePath.replace(/[\w\.-]+$/, '')].concat(paths),
						filename : file.nativePath
					}).parse(fileData, function(e, root) {
						callback(e, root, fileData);
					});
				} else {
					if( typeof (env.errback) === "function") {
						env.errback.call(null, path, paths, callback, env);
					} else {
						callback({
							type : 'File',
							message : "'" + path + "' wasn't found.\n"
						});
					}
				}

			};
			initAppState();

			$('#chk-minify').on('change', function() {
				App.prefs.minify = $('#chk-minify').is(':checked');
				updateAppState();
			});
			$('#actions').on('click', "li", function(e) {
				var $el = $(this);
				$el.addClass('active').siblings().removeClass('active');

				if($el.attr('id') == 'tab-prefs') {
					$('#panel-prefs').addClass('active');
					$('#panel-files').removeClass('active');
				} else {
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
						Editor.resize();
						adjustTabOverflow();
					}
				}
			});
			$(window).resize(function() {
				if($('#tabs li.t.active').length > 0) {
					Editor.resize();
					adjustTabOverflow();
				}
			});

			$('#tabs').on('click','li.t > a', function() {
				if(!pendingClose && $(this).parent().data('file-less')) {
					App.activeTab = $(this).parent().data('file-less').nativePath;
					updateAppState();
				}
				setActive($(this));
			});
			$('.subtabs').on('click', '.t', function() {
				setActive($(this));
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
				Editor.findPrevious();
			});
			$("#findbar .down").click(function() {
				Editor.findNext();
			});
			$('#tabs a.tab .close').click(function() {
				var listItem = $(this).parent().parent();
				tryCloseTab(listItem);
				return false;
			});

			$("#findbar .close").click(function() {
				$("#findbar").animate({
					top : '-33px'
				}, 100);
				Editor.focus();
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
			$('.open-file').click(Commands.openFile);
			$('#save').click(Commands.save);
			$('#save-as').click(Commands.saveAs);
			$('#convert').click(Commands.crunch);

			// $('#openwindow').click(function() {
				// openWindow('win/save.html', 522, 225, true);
			// });
			$('#open-project').click(Commands.openProject);

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
			addMenuItem(fileMenu, "Save As...", Commands.saveAs, "S");

			fileMenu.addItem(new air.NativeMenuItem("", true));
			var recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Files");
			recentFiles.name = "recentFiles";
			recentFiles = fileMenu.addSubmenu(new air.NativeMenu(), "Recent Websites");
			recentFiles.name = "recentSites";

			fileMenu.addItem(new air.NativeMenuItem("", true));
			addMenuItem(fileMenu, "Crunch!", Commands.crunch, "enter");

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
					if(e.target.data.exists)
						openFile(e.target.data);
					else
						alert('File no longer exists.');
				});
			}
			docMenu = air.NativeMenu(event.target).getItemByName("recentSites").submenu;
			docMenu.removeAllItems();

			for(var i in App.recent.folders) {
				var menuItem = docMenu.addItem(new air.NativeMenuItem(App.recent.folders[i]));
				menuItem.data = Paths.project.resolvePath(App.recent.folders[i]);
				menuItem.addEventListener(air.Event.SELECT, function(e) {
					if(e.target.data.exists)
						openProject(e.target.data);
					else
						alert('Directory no longer exists.');
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
			tryCloseTab: tryCloseTab,
			trySave : trySave,
			openFile : openFile,
			Parser : Parser,
			App : App
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
