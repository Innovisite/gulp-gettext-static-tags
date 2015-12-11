'use strict';

var _ = require('lodash');
var fs = require('fs');
var PO = require('pofile');
var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var glob = require('glob');

var pluginName = require('./package.json').name;

module.exports = function(poFiles) {
    poFiles = glob.sync(poFiles);

    var languages = _.map(poFiles, function(file) {
	return path.basename(file, '.po')
    });
    
    var parsedPoFiles = _.map(poFiles, function(poFile) {
	var content = fs.readFileSync(poFile);
	return PO.parse(content.toString());
    });

    var translations = _.zipObject(languages, _.pluck(parsedPoFiles, 'items'));

    //var poContent = fs.readFileSync(poFile);
    //var poParsed = PO.parse(poContent.toString());

    return through.obj(function(file, enc, throughCallback) {
	if (file.isNull()) {
	    this.push(file);
	    throughCallback();
	    return;
	}

	var self = this;
	_.forEach(languages, function(language) {
	    var translation = translations[language];
	    var newFile = file.clone();
	    var src = newFile.contents.toString();
	    var dst = '';

	    var TOKEN_START = "@<<";
	    var TOKEN_END = ">>@";
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
			for(var i in translation) {			    
			    var trItem = translation[i];
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

	    newFile.contents = new Buffer(dst);
	    newFile.path = language + "/" + path.basename(newFile.path);
	    newFile.base = './';
	    self.push(newFile);
	});
    });

    throughCallback();
};

