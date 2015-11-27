'use strict';

var fs = require('fs');
var PO = require('pofile');
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');

var pluginName = require('./package.json').name;

module.exports = function(poFile) {
    var poContent = fs.readFileSync(poFile);
    var poParsed = PO.parse(poContent.toString());

    return through.obj(function(file, enc, throughCallback) {
	if (file.isNull()) {
	    this.push(file);
	    throughCallback();
	    return;
	}

	if (file.isStream()) {
	    this.emit('error', new gutil.PluginError(pluginName, 'Streaming not supported'));
	    throughCallback();
	    return;
	}
	
	var self = this;
	var newFile = file.clone();

	var src = newFile.contents.toString();
	var dst = '';

	var TOKEN_START = "<(";
	var TOKEN_END = ")>";
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
		    for(var i in poParsed.items) {
			if(poParsed.items[i].msgid === trStr) {	    
			    trStr = poParsed.items[i].msgstr[0];
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

	newFile.contents = new Buffer(dst);
	newFile.path = path.basename(newFile.path);
	newFile.base = './';
	self.push(newFile);
    });

    throughCallback();
};

