CoffeeMaker v 0.1
-----------------
  
  A CoffeeScript compiler/development tool for LAMP that does not require node.js

  CoffeeMaker - compiles CoffeeScript clientside
  and caches it on the serverside
  with no need for node.js installation
  
  Please Note: 
  For security reasons you are adviced to turn off cache creation 
  in a production environment.
  
  Includes the CoffeeScript Compiler
  MIT-licensed, Copyright Jeremy Ashkenas
  
  Uses Marijn Haverbeke's online UglifyJS server
  UglifyJS is written by Mihai Bazon
  (the parser is a port of Marijns H. parse-js for Lisp)
  
  Icon from http://www.visualpharm.com
   
  Copyright 2011 Thomas Frank
  MIT-licensed...
  
-----------------

INSTALL:

1) Make sure you have a LAMP server with PHP > 5.3 (Might work on older I haven't tested).

2) Copy the coffeemaker folder to your public document root folder.

3) If you do NOT have an .htaccess file in your public document root folder already
   then copy the .htaccess file here.
	 
   ELSE add the following 4 lines to the .htaccess file in your public document root folder 
   RewriteEngine On
   RewriteRule (.*\.cof)/?$ /coffeemaker/coffeemaker.php?file=/$1
   RewriteRule coffeemaker/?$ /_-_-_-_-_-_-_-_
   RewriteRule coffeemaker/.*/.* /_-_-_-_-_-_-

4) Set write permissions for the coffeemaker/cache folder so that PHP can write to it (777 is ok)
   (Preferably don't do this for the whole coffeemaker-folder...)
	 
-----------------

BASIC USAGE:

* Write your CoffeeScript and include it on your web page with the following code
  <script type="text/javascript" src="nameOfMyCoffeeScript.cof"></script>
	 
Important: The script	must have the extension ".cof"...

-----------------

INCLUDES:

Naturally you can include several CoffeeScripts on your web page using multiple script tags.
But you can also do includes of CoffeeScripts in your Coffeescript file.
You do this through a comment:

# include filename.cof

The file will be included on the same 'indentation level' as your comment.
If you include a file with the extension '.js' CoffeeMaker assumes this is JavaScript
and includes it without compilation.

-----------------


HOW DOES IT WORK?

The rewrite rules in the .htaccess will rewrite the request for the script to coffeemaker.php.
CoffeMaker then checks if the script has been cached since last changes - if so it returns a
cached version. Otherwise CoffeeMaker will compile the script and cache it.

CoffeeMaker uses the client (your browser) for compilation but caches the result on the server,
in its cache folder. (See notes on safety later.)

-----------------

CONFIGURATION:

Configuration can be made in the coffeemaker/config.php file.
Here you will find a number of flags that can be set to true or false:


$allowCacheCreation
Default: true
If you turn this off CoffeeMaker can not compile anymore - it can only serve up
files already compiled. For maximum security please configure this flag so that it is
set to false on your production server - since CoffeeMaker compiles on the client side
there could otherwise be a danger of code injection. (However CoffeeMaker also counters
this with a ticket system - thus blocking unlegit write attempts to its cache.)

$allowIncludes
Default: true
Can be turned off if you do not want to enable includes (see above).

$splitVarDeclarations
Default: true
Splits long lines of var declarations in the compiled JavaScript code,
for enhanced readability.

$splitConcatenations = true
Default: true
Splits long lines of string concatenations in the compiled JavaScript code,
for enhanced readability.

$keepCoffeeComments
Default: true
Keeps one-line comments from CoffeeSCript in the compiled JavaScript code,
for debugging and readability purposes.

$keepBlankLines
Default: true
Keeps blank lines from CoffeeSCript in the compiled JavaScript code,
for debugging and readability purposes.

$uglifyJS
Default: false
Minifies the compiled JavaScript code using UglifyJS.