/*\
title: $:/plugins/wikilabs/custom-markup/wikirules/ticktext.js
type: application/javascript
module-type: wikirule

Wiki text block rule for ticktext and angletext

Detect

´asdf.my.Class This is some text with a name and class
´.a.b.c.d This is some text with class

»»»asdf.my.Class This is some text with a name and class
».a.b.c.d This is some text with class

\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw:false exports:false */
"use strict";

var CLASS_GROUP = "wltc";
var CLASS_PREFIX = CLASS_GROUP + "-l"; // l .. level

exports.name = "ticktext";
exports.types = {block: true};
	
var idTypes = "tick,single,degree,angle,almost,pilcrow".split(",");

exports.init = function(parser) {
	this.parser = parser;

	var self = this;

	// Regexp to match 
	// match[1] ... all symbols 1-4 ´ or » or ° or , or _
	// match[2] ... htmlTag ... default DIV
	// match[3] ... classString
//	this.matchRegExp = /((?=´[^´])´|[»≈]{1,4}|(?=°[^°])°|(?=›[^›])›|(?=_[^_])_)((?:[^\.\r\n\s´°]+))?(\.(?:[^\r\n\s]+))?/mg; // OK
// 	this.matchRegExp = /((?=´[^´])´|[»≈]{1,4}|(?=°[^°])°|(?=›[^›])›|(?=_[^_])_)((?:[^\.:\r\n\s´°]+))?(\.(?:[^:\r\n\s]+))?(\:(?:[^.\r\n\s]+))?/mg; // V0.6.x
//	this.matchRegExp = /((?=´[^´])´|[»≈]{1,4}|(?=°[^°])°|(?=›[^›])›)((?:[^\.:\r\n\s]+))?(\.(?:[^:\r\n\s]+))?(\:(?:[^.\r\n\s]+))?/mg; // V0.7.0
	this.matchRegExp = /((?=´[^´])´|[»≈]{1,4}|(?=°[^°])°|(?=›[^›])›|(?=¶[^¶])¶)((?:[^\.:\r\n\s]+))?(\.(?:[^:\r\n\s]+))?(\:(?:[^.\r\n\s]+))?/mg; // V0.7.1
	
	this.p = this.parser;
	this.p.configTickText = this.p.configTickText || {};
	
	this.pc = this.p.configTickText;

	idTypes.map( function(id) {
		self.pc[id] = self.pc[id] || {};
	})
	
	this.pc.X = {}; // There is a naming problem
};

/*
Parse the most recent match
*/
exports.parse = function() {
	/*
	Skip the endstring at the current position. Options are:
	treatNewlinesAsNonWhitespace: true if newlines are NOT to be treated as whitespace
	*/
	function skipEndString (endString) {
		var endRegExp = (endString instanceof RegExp) ? new RegExp(endString, "mg") : new RegExp("(" + $tw.utils.escapeRegExp(endString) + ")","mg")
		endRegExp.lastIndex = self.parser.pos;
		var endMatch = endRegExp.exec(self.parser.source);
		if(endMatch && endMatch.index === self.parser.pos) {
			self.parser.pos = endRegExp.lastIndex;
		}
	}

//---------------------
	var self = this,
		tree = [],
		root = [];

	// Get all the details of the match
	var id,
		level    = (this.match[1]) ? this.match[1].length : 0,
		sym      = this.match[2], // needs to be undefined if no match
		_classes = (this.match[3]) ? this.match[3] : "",
		_params  = (this.match[4]) ? this.match[4] : "";

	var useParagraph = false; // use paragraph by default

	// global custom pragmas
	var gPc = this.parser.wiki.caches["$:/config/custom-markup/pragma/PageTemplate"].blockParseTree.configTickText;

	switch (this.match[1][0]) {
		case "»":
			id = "angle";
			useParagraph = true;
		break;
		case "≈":
			id = "almost";
			useParagraph = true;
		break;
		case "¶":
			id = "pilcrow";
			useParagraph = true;
		break;
		case "´":
			id = "tick"
		break;
		case "›":
			id = "single"
		break;
		case "°":
			id = "degree"
		break;
	}

	// "_debug" is a binary parameter
	var options = {symbol: sym, _mode : "inline", _element : (useParagraph) ? "p" : "div", _classes : _classes,
		_endString : "", _use: "", _useGlobal: "", _debug: false, _debugString: "", _srcName:"src", _params : (_params !== "") ? _params.split(":") : [] };

	var textEndInner,
		textStartInner,
		textEnd,
		textStart = this.parser.pos; // remember text postions for widget text handling

	// Move past the start symbol
	this.parser.pos = this.matchRegExp.lastIndex;
	
	this.parser.skipWhitespace({treatNewlinesAsNonWhitespace: true});
	// remember text postions for macro src handling
	textStartInner = this.parser.pos
	// Parse any classes, whitespace and then the heading itself
	var classes = _classes.split(".");

	var forceDebug = false,
		_useError = false;

	var config = {};

	// !!! The order of the checks is important!!! TODO make this nicer
	if (!sym && this.pc[id]["true"]) {
	// ID is locally defined
		forceDebug = (this.pc[id]["true"]._debug) ? this.pc[id]["true"]._debug : false;
		sym = (this.pc[id]["true"]._use) ? this.pc[id]["true"]._use : true;
		config = this.pc[id][sym];
	} else if (sym && this.pc[id][sym] && this.pc[id][sym]._use)  {
		// ID and _use are locally defined
		forceDebug = (this.pc[id][sym]._debug) ? this.pc[id][sym]._debug : false;
		if ((sym === this.pc[id][sym]._use) && (this.pc[id][sym].imported !== true)) {
			// error Can't use itself
			_useError = "Error - \\customize " + id + "=" + sym + " _use=" + sym + " is not possible!";
			forceDebug = true;
		}
		sym = this.pc[id][sym]._use;
		config = this.pc[id][sym];
	} else if (sym && this.pc[id][sym] && this.pc[id][sym]._useGlobal && gPc[id][this.pc[id][sym]._useGlobal] )  {
		// Use global symbol 
		forceDebug = (this.pc[id][sym]._debug) ? this.pc[id][sym]._debug : false;
		sym = this.pc[id][sym]._useGlobal;

		// Switch to global configuration   TODO duplicated code
		forceDebug = (forceDebug) ? forceDebug : (gPc[id][sym]._debug) ? gPc[id][sym]._debug : false;
		config = gPc[id][sym];
	} else if (sym && this.pc[id][sym])  {
		// Switch to local configuration
		forceDebug = (this.pc[id][sym]._debug) ? this.pc[id][sym]._debug : false;
		config = this.pc[id][sym];
	} else if (sym && gPc[id][sym])  {
		// Switch to global configuration
		forceDebug = (gPc[id][sym]._debug) ? gPc[id][sym]._debug : false;
		config = gPc[id][sym];
	} else if (sym !== "") {
	// Check if symbol is an HTML element
		options._element = ($tw.config.htmlBlockElements.indexOf(sym) !== -1) ? sym : options._element;
		config = this.pc[id][sym];
	}

	if (config) {
		options.symbol = config.symbol || options.symbol;
		options._endString = config._endString || options._endString;
		options._mode = config._mode || options._mode;
		options._element = config._element || options._element;
		options._classes = config._classes || options._classes;
		
		if (forceDebug) options._debug = forceDebug;
		else options._debug = config._debug || options._debug;
		
		options._debugString = (_useError) ? _useError : config._debugString || options._debugString;
		options._srcName = config._srcName || options._srcName;
		options._1 = config._1 || options._1;
		options._2 = config._2 || options._2;

		var xMaps = (config._params) ? config._params.split(":") : ["",""];
		var lMaps = (options._params.length > 0 ) ? options._params : ["",""];

		options._params[1] = (lMaps[1]) ? lMaps[1] : xMaps[1];
		options._params[2] = (lMaps[2]) ? lMaps[2] : xMaps[2];

		classes = (options._classes + _classes).split(".") // pragma _classes are added to tick _classes
//		classes[0] = options._classes.split(".").join(" ").trim() // replace the name element
	}
	
// done in line 122
// 	this.parser.skipWhitespace({treatNewlinesAsNonWhitespace: true});
	
	var oneBlock = false;

	if ((options._mode === "block") ) { //&& (options._endString !== "")) {
	// standard rendering
		// no GROUP in block mode
		classes.push(CLASS_PREFIX + level);

		if (options._endString === "") {
			options._endString = (useParagraph) ? "\\r?\\n\\r?\\n" : "\\r?\\n";
			oneBlock = true;
		} 

//		tree = this.parser.parseBlocks("^" + $tw.utils.escapeRegExp(options._endString) + "$");
//		tree = this.parser.parseBlocks($tw.utils.escapeRegExp(options._endString));
		tree = (oneBlock) ? this.parser.parseBlock(options._endString) : this.parser.parseBlocks(options._endString);
	} else {
		// apply CLASS_GROUP only if in inline mode. 
		classes.push(CLASS_PREFIX + level + " " + CLASS_GROUP);

		if (options._endString === "") {
//			tree = this.parser.parseInlineRun((useParagraph) ? /(\r?\n\r?\n)/mg : /(\r?\n)/mg, {eatTerminator:true}); 
			tree = this.parser.parseInlineRun((useParagraph) ? /(\r?\n\r?\n)/mg : /(\r?\n)/mg);// OK for single new-line
		} else {
//			tree = this.parser.parseInlineRun(new RegExp("(^" + $tw.utils.escapeRegExp(options._endString) + "$)","mg")); // V0.7.0
			tree = this.parser.parseInlineRun(new RegExp("(" + $tw.utils.escapeRegExp(options._endString) + "$)","mg"));
		}
	}
	// remember text postions for macro src handling
	textEndInner = this.parser.pos - options._endString.length;

	skipEndString(options._endString);
	
	textEnd = this.parser.pos;

	var attributes = {
			"class": {type: "string", value: classes.join(" ").trim()}
		}
	
	var fixAttributes = ["pilcrow", "tick", "angle", "almost", "single", "degree", "symbol", 
						"_endString", "_mode", "_element", "_classes", "_use", "_1", "_2", "_params",
						"_srcName", "_debug", "_debugString"];

	// Callback is invoked with (element,title,object)
	$tw.utils.each(config, function(val,title,obj) {
		if (fixAttributes.indexOf(title) === -1) {
			attributes[title] = obj[title];
			}
	});

	// show tick config and code
	var showRendered = true;
	if (options._debug) {
		switch (options._debug) {
			case "no":
			break;
			case "both":
				root.push({type:"codeblock", attributes:{ code: {type:"string", value: options._debugString}}})
				var textOuter = this.parser.source.slice(textStart, textEnd);
				root.push({type:"codeblock", attributes:{ code: {type:"string", value: textOuter}}})
			break;
			case "textOnly":
				showRendered = false;
				// intentional fall through
			case "text":
				var textOuter = this.parser.source.slice(textStart, textEnd);
	//			var textInner = this.parser.source.slice(textStartInner, textEndInner);
				root.push({type:"codeblock", attributes:{ code: {type:"string", value: textOuter}}})
			break;
			case "pragmaOnly":
				showRendered = false;
				// intentional fall through
			case "pragma": 
				// intentional fall through
			default:
				root.push({type:"codeblock", attributes:{ code: {type:"string", value: options._debugString}}})
			break;
		}
	}
	
	if (showRendered) {
		// check if element is a widget
		if (options._element[0] === "$") {
	//		var textOuter = this.parser.source.slice(textStart, textEnd);
			var textInner = this.parser.source.slice(textStartInner, textEndInner);
			var type = options._element.slice(1);
			var maps = options._params,
				ml = maps.length,
				x = "";

			if (ml > 0) {
				for (var i=1; i <= ml; i++) {
					x = (maps[i] && options["_"+i]) ? options["_"+i].value : "";
					if (x) attributes[x] = {type: "string", value: maps[i]}
				}
			}
			attributes[options._srcName] = {type: "string", value: textInner}
			root.push({ type: type,
						tag: options._element,
						attributes: attributes,
						children: tree})
		} else {
			root.push( { type: "element", tag: options._element, attributes: attributes, children: tree});
		}
	}
	// Return the paragraph
	return root;
};
})();
