define("ace/mode/xml",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/xml_highlight_rules","ace/mode/behaviour/xml","ace/mode/folding/xml"],function(a,b,c){var d=a("../lib/oop"),e=a("./text").Mode,f=a("../tokenizer").Tokenizer,g=a("./xml_highlight_rules").XmlHighlightRules,h=a("./behaviour/xml").XmlBehaviour,i=a("./folding/xml").FoldMode,j=function(){this.$tokenizer=new f((new g).getRules()),this.$behaviour=new h,this.foldingRules=new i};d.inherits(j,e),function(){this.getNextLineIndent=function(a,b,c){return this.$getIndent(b)}}.call(j.prototype),b.Mode=j}),define("ace/mode/xml_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/xml_util","ace/mode/text_highlight_rules"],function(a,b,c){var d=a("../lib/oop"),e=a("./xml_util"),f=a("./text_highlight_rules").TextHighlightRules,g=function(){this.$rules={start:[{token:"text",regex:"<\\!\\[CDATA\\[",next:"cdata"},{token:"xml_pe",regex:"<\\?.*?\\?>"},{token:"comment",merge:!0,regex:"<\\!--",next:"comment"},{token:"meta.tag",regex:"<\\/?",next:"tag"},{token:"text",regex:"\\s+"},{token:"text",regex:"[^<]+"}],cdata:[{token:"text",regex:"\\]\\]>",next:"start"},{token:"text",regex:"\\s+"},{token:"text",regex:"(?:[^\\]]|\\](?!\\]>))+"}],comment:[{token:"comment",regex:".*?-->",next:"start"},{token:"comment",merge:!0,regex:".+"}]},e.tag(this.$rules,"tag","start")};d.inherits(g,f),b.XmlHighlightRules=g}),define("ace/mode/xml_util",["require","exports","module"],function(a,b,c){function d(a){return[{token:"string",regex:'".*?"'},{token:"string",merge:!0,regex:'["].*',next:a+"-qqstring"},{token:"string",regex:"'.*?'"},{token:"string",merge:!0,regex:"['].*",next:a+"-qstring"}]}function e(a,b){return[{token:"string",merge:!0,regex:".*?"+a,next:b},{token:"string",merge:!0,regex:".+"}]}b.tag=function(a,b,c){a[b]=[{token:"text",regex:"\\s+"},{token:"meta.tag",merge:!0,regex:"[-_a-zA-Z0-9:]+",next:b+"embed-attribute-list"},{token:"empty",regex:"",next:b+"embed-attribute-list"}],a[b+"-qstring"]=e("'",b+"embed-attribute-list"),a[b+"-qqstring"]=e('"',b+"embed-attribute-list"),a[b+"embed-attribute-list"]=[{token:"meta.tag",merge:!0,regex:"/?>",next:c},{token:"keyword.operator",regex:"="},{token:"entity.other.attribute-name",regex:"[-_a-zA-Z0-9:]+"},{token:"constant.numeric",regex:"[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"},{token:"text",regex:"\\s+"}].concat(d(b))}}),define("ace/mode/behaviour/xml",["require","exports","module","ace/lib/oop","ace/mode/behaviour","ace/mode/behaviour/cstyle"],function(a,b,c){var d=a("../../lib/oop"),e=a("../behaviour").Behaviour,f=a("./cstyle").CstyleBehaviour,g=function(){this.inherit(f,["string_dquotes"]),this.add("brackets","insertion",function(a,b,c,d,e){if(e=="<"){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?!1:{text:"<>",selection:[1,1]}}if(e==">"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j==">")return{text:"",selection:[1,1]}}else if(e=="\n"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),k=i.substring(h.column,h.column+2);if(k=="</"){var l=this.$getIndent(d.doc.getLine(h.row))+d.getTabString(),m=this.$getIndent(d.doc.getLine(h.row));return{text:"\n"+l+"\n"+m,selection:[1,l.length,1,l.length]}}}})};d.inherits(g,e),b.XmlBehaviour=g}),define("ace/mode/behaviour/cstyle",["require","exports","module","ace/lib/oop","ace/mode/behaviour"],function(a,b,c){var d=a("../../lib/oop"),e=a("../behaviour").Behaviour,f=function(){this.add("braces","insertion",function(a,b,c,d,e){if(e=="{"){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"{"+g+"}",selection:!1}:{text:"{}",selection:[1,1]}}if(e=="}"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var k=d.$findOpeningBracket("}",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}else if(e=="\n"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var l=d.findMatchingBracket({row:h.row,column:h.column+1});if(!l)return null;var m=this.getNextLineIndent(a,i.substring(0,i.length-1),d.getTabString()),n=this.$getIndent(d.doc.getLine(l.row));return{text:"\n"+m+"\n"+n,selection:[1,m.length,1,m.length]}}}}),this.add("braces","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="{"){var g=d.doc.getLine(e.start.row),h=g.substring(e.end.column,e.end.column+1);if(h=="}")return e.end.column++,e}}),this.add("parens","insertion",function(a,b,c,d,e){if(e=="("){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"("+g+")",selection:!1}:{text:"()",selection:[1,1]}}if(e==")"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j==")"){var k=d.$findOpeningBracket(")",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}}),this.add("parens","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="("){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h==")")return e.end.column++,e}}),this.add("string_dquotes","insertion",function(a,b,c,d,e){if(e=='"'){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);if(g!=="")return{text:'"'+g+'"',selection:!1};var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column-1,h.column);if(j=="\\")return null;var k=d.getTokens(f.start.row,f.start.row)[0].tokens,l=0,m,n=-1;for(var o=0;o<k.length;o++){m=k[o],m.type=="string"?n=-1:n<0&&(n=m.value.indexOf('"'));if(m.value.length+l>f.start.column)break;l+=k[o].value.length}if(!m||n<0&&m.type!=="comment"&&(m.type!=="string"||f.start.column!==m.value.length+l-1&&m.value.lastIndexOf('"')===m.value.length-1))return{text:'""',selection:[1,1]};if(m&&m.type==="string"){var p=i.substring(h.column,h.column+1);if(p=='"')return{text:"",selection:[1,1]}}}}),this.add("string_dquotes","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=='"'){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h=='"')return e.end.column++,e}})};d.inherits(f,e),b.CstyleBehaviour=f}),define("ace/mode/folding/xml",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode","ace/token_iterator"],function(a,b,c){var d=a("../../lib/oop"),e=a("../../range").Range,f=a("./fold_mode").FoldMode,g=a("../../token_iterator").TokenIterator,h=b.FoldMode=function(a){f.call(this),this.voidElements=a||{}};d.inherits(h,f),function(){this.getFoldWidget=function(a,b){var c=a.getTokens(b,b)[0].tokens.filter(function(a){return a.type==="meta.tag"}).map(function(a){return a.value}).join("").trim().replace(/^<|>$|\s+/g,"").split("><"),d=c[0];return!d||this.voidElements[d]?"":d.charAt(0)=="/"?"end":c.indexOf("/"+d)!==-1?"":"start"},this.getFoldWidgetRange=function(a,b){var c,d,f=[],h=new g(a,b,0),i="stepForward",j=!1;do{var k=h.getCurrentToken(),l=k.value.trim();if(k&&k.type=="meta.tag"&&k.value!==">"){var m=l.replace(/^[<\s]*|[\s*>]$/g,"");if(this.voidElements[m])continue;if(!c)m.charAt(0)=="/"&&(m=m.slice(1),i="stepBackward",j=!0),c={row:b,column:h.getCurrentTokenColumn()+(j?0:l.length+1)},f.push(m);else{var n;m.charAt(0)=="/"?(m=m.slice(1),n=!j):n=j;if(n)if(f[f.length-1]==m){f.pop();if(f.length===0)return d={row:h.getCurrentTokenRow(),column:h.getCurrentTokenColumn()+(j?l.length+1:0)},j?e.fromPoints(d,c):e.fromPoints(c,d)}else console.error("unmatched tags!",m,f);else f.push(m)}}}while(k=h[i]())}}.call(h.prototype)}),define("ace/mode/folding/fold_mode",["require","exports","module","ace/range"],function(a,b,c){var d=a("../../range").Range,e=b.FoldMode=function(){};((function(){this.FOO=12,this.foldingStartMarker=null,this.foldingStopMarker=null,this.getFoldWidget=function(a,b){return this.foldingStartMarker?this.foldingStopMarker?(e.prototype.getFoldWidget=this.$testBoth,this.$testBoth(a,b)):(e.prototype.getFoldWidget=this.$testStart,this.$testStart(a,b)):""},this.getFoldWidgetRange=function(a,b){return null},this.indentationBlock=function(a,b){var c=/^\s*/,e=b,f=b,g=a.getLine(b),h=g.length-1,i=g.match(c)[0].length;while(g=a.getLine(++b)){var j=g.match(c)[0].length;if(j==g.length)continue;if(j<=i)break;f=b}if(f>e){var k=a.getLine(f).length;return new d(e,h,f,k)}},this.$testStart=function(a,b){return this.foldingStartMarker.test(a.getLine(b))?"start":""},this.$testBoth=function(a,b){var c=a.getLine(b);return this.foldingStartMarker.test(c)?"start":this.foldingStopMarker.test(c)?"end":""}})).call(e.prototype)})