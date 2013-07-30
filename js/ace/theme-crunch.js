/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 * 
 * Copyright 2011 Irakli Gozalishvili. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 * ***** END LICENSE BLOCK ***** */

define('ace/theme/crunch', ['require', 'exports', 'module' , 'ace/lib/dom'], function(require, exports, module) {

exports.isDark = false;
exports.cssClass = "ace-crunch";
exports.cssText = ".ace-crunch {\
line-height: 24px;\
font-family: Ubuntu,\"Courier New\",Courier,monospace;\
font-weight: normal;\
letter-spacing: 0;\
font-size: 14px;\
color: #7a7974;\
text-shadow: 0 1px 0 rgba(255, 255, 255, 0.43);\
}\
.ace-crunch .ace_gutter {\
background-color: transparent;\
color: #584130;\
text-shadow: 0 1px 0 rgba(255, 255, 255, 0.43);\
width: 46px;\
}\
.ace-crunch .ace_print-margin {\
width: 1px;\
background: #e8e8e8;\
}\
.ace-crunch .ace_fold {\
background-color: #6B72E6;\
}\
.ace-crunch .ace_scroller {\
background-color: #FFFFFF;\
}\
.ace-crunch .ace_cursor {\
border-left: 2px solid black;\
}\
.ace-crunch .ace_overwrite-cursors .ace_cursor {\
border-left: 0px;\
border-bottom: 1px solid black;\
}\
.ace-crunch .ace_invisible {\
color: rgb(191, 191, 191);\
}\
.ace-crunch .ace_storage,\
color: blue;\
}\
.ace-crunch .ace_keyword {\
color: #3e1c07;\
}\
.ace-crunch .ace_constant {\
color: #a9549b;\
}\
.ace-crunch .ace_invalid {\
background-color: rgba(255, 0, 0, 0.1);\
color: red;\
}\
.ace-crunch .ace_support.ace_function {\
color: rgb(60, 76, 114);\
}\
.ace-crunch .ace_support.ace_constant {\
color: rgb(6, 150, 14);\
}\
.ace-crunch .ace_support.ace_type,\
.ace-crunch .ace_support.ace_class {\
color: rgb(109, 121, 222);\
}\
.ace-crunch .ace_variable, .ace-crunch .ace_string {\
color: #55712b;\
}\
.ace-crunch .ace_variable.ace_language {\
color: #b7602a;\
}\
.ace-crunch .ace_type {\
color: #2086a2;\
}\
.ace-crunch .ace_comment {\
color: #b08a6b;\
}\
.ace-crunch .ace_xml-pe {\
color: rgb(104, 104, 91);\
}\
.ace-crunch .ace_entity.ace_name.ace_function {\
color: #0000A2;\
}\
.ace-crunch .ace_markup.ace_heading {\
color: rgb(12, 7, 255);\
}\
.ace-crunch .ace_markup.ace_list {\
color:rgb(185, 6, 144);\
}\
.ace-crunch .ace_meta.ace_tag {\
color:rgb(0, 22, 142);\
}\
.ace-crunch .ace_marker-layer .ace_selection {\
background: rgb(181, 213, 255);\
}\
.ace-crunch.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px white;\
border-radius: 2px;\
}\
.ace-crunch .ace_marker-layer .ace_step {\
background: rgb(252, 255, 0);\
}\
.ace-crunch .ace_marker-layer .ace_stack {\
background: rgb(164, 229, 101);\
}\
.ace-crunch .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
border: 1px solid rgb(192, 192, 192);\
}\
.ace-crunch .ace_marker-layer .ace_active-line {\
background: rgba(0, 0, 0, 0.07);\
}\
.ace-crunch .ace_gutter-active-line {\
background-color : #dcdcdc;\
}\
.ace-crunch .ace_gutter-cell {\
padding-left: 9px;\
}\
.ace-crunch .ace_marker-layer .ace_selected-word {\
background: rgb(250, 250, 255);\
border: 1px solid rgb(200, 200, 250);\
}\
.ace-crunch .ace_indent-guide {\
background: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==\") right repeat-y;\
}\
";

var dom = require("../lib/dom");
dom.importCssString(exports.cssText, exports.cssClass);
});