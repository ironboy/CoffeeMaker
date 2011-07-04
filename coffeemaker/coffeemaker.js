/*
  CoffeeMaker - compiles CoffeeScript clientside
  and caches it on the serverside
  with no need for node.js installation
  
  Includes the CoffeeScript Compiler
  MIT-licensed, Copyright Jeremy Ashkenas
  
  Uses Marijn Haverbeke's online UglifyJS server
  UglifyJS is written by Mihai Bazon
  (the parser is a port of Marijns H. parse-js for Lisp)
   
  Copyright 2011 Thomas Frank
  MIT-licensed...
*/

(function(){
  
  // Synchronous ajax post
  var getFile = function(url, passData) {
    if (window.XMLHttpRequest) {              
      AJAX=new XMLHttpRequest();              
    } else {                                  
      AJAX=new ActiveXObject("Microsoft.XMLHTTP");
    };
    if (AJAX) {
      AJAX.open("POST", url, false);
      AJAX.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
      AJAX.send(passData);
      if(AJAX.responseText.indexOf('<b>Warning</b>:') >=0 
        && AJAX.responseText.indexOf('<br />') == 0){
          alert("CoffeeMaker: Check permissions for cache folder!")
          location.href="javascript:void(0)"
      }
      return AJAX.responseText;                                         
    } else {
       return false;
    }                                             
  };
  
  // Strip inner strings
  var stringStripper = {
    remove : function(str){
      var inStr = false, strMem = [], ar = [], i, co = 0, x;
      x = str.split('');
      for(i = 0;i < x.length; i++){
        // start of string
        if(!inStr && (x[i] == '"' || x[i] == "'")){
           inStr = x[i];
           strMem.push([inStr]);
           ar.push('_-_strMem' + co + '_-_');
           co++
           continue
        };
        // end of string
        if(inStr && x[i-1]!='\\' && x[i] == inStr){
          strMem[strMem.length-1].push(inStr);
          inStr = false;
          continue 
        };
        // push characters
        (inStr ? strMem[strMem.length-1] : ar).push(x[i]);
      };
      // join arrays to strings
      ar = ar.join('');
      for(i = 0; i < strMem.length; i++){
        strMem[i] = strMem[i].join('')
      }
      // return stripped string and string memory
      return {
        stripped: ar,
        strMem: strMem
      }
    },
    restore: function(stripped,strMem){
      // reinsert strings
      var x = stripped, i;
      for(i = 0; i < strMem.length;i++){
        x = x.split('_-_strMem' + i + '_-_').join(strMem[i])
      };
      return x
    }
  };
  
  // Do per line 
  var lineDo = function(str,eachLineFunc){
    var i, stripperObj = stringStripper.remove(str);
    var x = stripperObj.stripped;
    var l = x.split('\n')
    for(i = l.length - 1; i >= 0; i--){
      l[i] = eachLineFunc(l[i],l,i);  
    };
    for(i = l.length - 1; i >= 0; i--){
      if(l[i] == '_-_markedfordeletion_-_'){
        l.splice(i,1);
      }
    };
    x = l.join('\n');
    x = stringStripper.restore(x,stripperObj.strMem);
    return x
  };
  
  // Do includes
  var allIncludes;
  var doIncludes = function(x,path,subinclude){
    
    !subinclude && (allIncludes = []);
    
    path = path.substring(0,path.lastIndexOf('/')+1);
    
    x = lineDo(x,function(l){
      if(l && !l.replace(/\s*#\s*include.*/,'')){
        var wspace = l.replace(/(\s*).*/,'$1');
        var toinclude = l.replace(/\s*#\s*include(.*)/,'$1');
        toinclude = toinclude.replace(/\s*/g,'');
        l = wspace + '_-_include_-_' + toinclude
      };
      return l
    });
    
    x = x.split('\n');
    var l, ifile, content, wspace, i, j, js, pathy;
    for(i = 0; i < x.length; i++){
      l = x[i];
      if (l.indexOf('_-_include_-_') >= 0){
        wspace = l.replace(/(\s*).*/,'$1');
        ifile = path + l.split('_-_include_-_').join('').
          split('"').join('').split("'").join('').replace(/\s*/g,'');
        content = getFile(ifile);
        pathy = ifile.substring(ifile.indexOf('=')+1);
        content && allIncludes.push(pathy);
        content = doIncludes(content,ifile,true);
        if(content.split(/\w/).length < 2){
          l = '';
        }
        else {
          content = content.split('\n');
          l = wspace + '#include ' + pathy;
          js = ifile.substring(ifile.length-3) == '.js';
          for(j = 0; j < content.length; j++){
            l += '\n' + wspace + (js && j==0 ? '`' : '') 
            + content[j] + (js && j+1 == content.length ? '`' : '') ;
          };
          l += '\n';
        }
      }
      x[i] = l;
    };
    x = x.join('\n');
	  return x
  };
  
  
  // Preprocess the coffee script file
  var preProcessCoffee = function(x){
    
    x = !coffeemaker.keepBlankLines ? x :   lineDo(x,function(l,whole,co){
      if(!l.replace(/\s*/,'')){
        var wspace = whole[whole[co+1] ? co+1 : co-1].replace(/(\s*).*/,'$1');
        l = wspace + '# _-_isABlankLine_-_'
      }
      return l
    });
    
    x = !(coffeemaker.keepCoffeeComments || coffeemaker.keepBlankLines) ? x :
    lineDo(x,function(l){
      if(!l.replace(/\s*#.*/,'') && l.indexOf('###')<0){
        if(!coffeemaker.keepCoffeeComments && l.indexOf('_-_isABlankLine_-_') < 0){return};
        l = l.replace(/(\s*)#\s*(.*)/g,
        '$1###\n_-_onelinecoffeecomment_-_\n$2\n###\n');
      }
      return l
    });
    
    return x
  };
  
  // Postprocess the compiled javascript
  var postProcessJS = function(x){
    
    x = !coffeemaker.splitVarDeclarations ? x :
    lineDo(x,function(l,whole,co){
        if(!l.replace(/\s*var\s{1,}.*/,'')){
          var wspace = l.substring(0,l.indexOf('var')) + '    ';
          l = l.split(/\,\s*/);
          for(var i = l.length - 1; i >= 0; i--){
            if(l[i].indexOf('__bind')>=0){
              l[i] += ', ' + l[i+1] + ', ' +l[i+2];
              l.splice(i+1,2);
            };
            if(l[i].indexOf('__extends')>=0){
              l[i] += ', ' + l[i+1];
              l.splice(i+1,1);
              for(var j = co + 1; j < co + 8; j++){
                whole[j] = wspace + whole[j]
              }
              whole[co+7] += '\n';
            };
          };
          l = l.join(',\n' + wspace);
          l += l.indexOf('__extends') < 0 ? '\n' : '';
        };
        return l
    });
    
    x = !(coffeemaker.keepCoffeeComments || coffeemaker.keepBlankLines) ? x :
    lineDo(x,function(l,whole,co){
      if(l.indexOf('_-_onelinecoffeecomment_-_') >= 0){
        var c = whole[co+1];
        var co2 = whole[co+2].replace(/\*\/\s*/,'');
        whole[co+2] = !co2.replace(/\s*/g,'') ? '_-_markedfordeletion_-_' : co2;
        whole[co+1] = whole[co-1] = '_-_markedfordeletion_-_';
        l = c.replace(/(\s*)(.*)/,'$1// $2');
        if(l.indexOf('_-_isABlankLine_-_') >=0){l = ''}
      };
      return l
    });
    
    x = !coffeemaker.splitConcatenations ? x :
    lineDo(x,function(l){
      wspace = l.replace(/(\s*).*/,'$1');
      l = l.split('++').join('_-_doublePlussesHere_-_').split('+');
      var k = l[0];
      l[0] = l[0].split(wspace).join('');
      for(var i = 1; i < l.length; i++){
        k +=  k.split('\n').pop().length >= 40 ?  '\n' 
          + wspace + '+' + l[i] : '+' + l[i];
      }
      return k.split('_-_doublePlussesHere_-_').join('++')
    });
    
    return x
  };
  
  // Compile
  var brewmem=',';
  coffeemaker.compile = function(coffeeFile){
    if(brewmem.indexOf(',' + coffeeFile + ',') >= 0){return};
    //brewmem += coffeeFile + ',';
    this.tocompile = undefined;
    var x = getFile(coffeeFile);
    x = coffeemaker.allowIncludes ? doIncludes(x,coffeeFile) : x;
    x = coffeemaker.uglifyJS ? x : preProcessCoffee(x);
    var y = CoffeeScript.compile(x);
    y = coffeemaker.uglifyJS ? y : postProcessJS(y);
    getFile(coffeeFile.split('?')[0],'path=' 
      + encodeURIComponent(coffeeFile.split('passthru=')[1]) 
      + '&store=' + encodeURIComponent(y)
      + (!allIncludes ? '' : '&includes=' 
      + encodeURIComponent(allIncludes.join('\n  ')))
      + '&ticket=' + encodeURIComponent(this.ticket)
    );
    return true
  };
  
  // First compile...
  if(coffeemaker.tocompile){
    coffeemaker.compile(coffeemaker.tocompile);
  };

})();