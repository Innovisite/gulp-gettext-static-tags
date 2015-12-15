'use strict';

var _ = require('lodash');
var fs = require('fs');
var PO = require('pofile');
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var glob = require('glob');
var PluginError = gutil.PluginError;

var PLUGIN_NAME = require('./package.json').name;

function getParsedPO(filename) {
    var content = fs.readFileSync(filename);
    return PO.parse(content.toString());    
}

function gulpTranslate(poFile, tokStart, tokEnd) {
    var language = path.basename(poFile, '.po');      
    var parsedPoFile = getParsedPO(poFile);
    var items = parsedPoFile.items;

    return through.obj(function(file, enc, cb) {
	
	if(file.isNull()) {
	    return cb(null, file);
	}

	var src = file.contents.toString();
	var dst = '';		
	var TOKEN_START = tokStart !== undefined ? tokStart : "@<<";
	var TOKEN_END = tokEnd !== undefined ? tokEnd : ">>@";
	var TOKEN_LENGTH = TOKEN_START.length;
	var lastIndex = 0;
	var finished = false;
	while(!finished) {
	    var tokenStart = src.indexOf(TOKEN_START, lastIndex);
	    if(tokenStart != -1) {
		dst += src.substring(lastIndex, tokenStart);
		var tokenEnd = src.indexOf(TOKEN_END, tokenStart);
		if(tokenEnd != -1) {
		    var trStr = src.substring(tokenStart + TOKEN_LENGTH,
					      tokenEnd);
		    for(var i in items) {
			var trItem = items[i];
			if(trItem.msgid === trStr) {	    
			    trStr = trItem.msgstr[0];
			    break;
			}
		    }
		    dst += trStr;
		    lastIndex = tokenEnd + TOKEN_LENGTH;
		} else {
		    dst += src.substring(tokenStart);
		    finished = true;
		}
	    } else {
		dst += src.substring(lastIndex);
		finished = true;
	    }
	}	
	file.contents = new Buffer(dst);
	cb(null, file);
    });
}

module.exports = gulpTranslate;
