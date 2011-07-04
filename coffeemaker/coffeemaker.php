<?
/*
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
*/

// version number off Coffeemaker
$version = '0.1';

// tune error_reporting and read config
error_reporting(E_ALL & ~E_NOTICE);
require('config.php');

// mime-type
header("Content-type: application/x-javascript");

// check if paths are safe (within document_root) else die
function okPath($x){
  $x = realpath($_SERVER['DOCUMENT_ROOT'].$x);
  $y = explode($_SERVER['DOCUMENT_ROOT'],$x);
  count($y) < 2 && die();
}

isset($_GET['passthru']) && okPath($_GET['passthru']);
isset($_GET['file']) && okPath($_GET['file']);
isset($_POST['path']) && okPath($_POST['path']);

// return the content of a .cof file
if(isset($_GET['passthru'])){
  $x = $_SERVER['DOCUMENT_ROOT'].$_GET['passthru'];
  die(file_exists($x) ? file_get_contents($x) : '');
};

// files involved
$f = isset($_GET['file']) ? $_GET['file'] : '';
$f = isset($_POST['path']) ? $_POST['path'] : $f;
$COF_file = $_SERVER['DOCUMENT_ROOT'].$f;
$COF_f_exists = file_exists($COF_file) || die();
$JS_file = dirname(__FILE__).'/cache'.str_replace('.cof','.js',$f);
$JS_f_exists = file_exists($JS_file);


// check coffeescript file + includes + config for latest time of change
$COF_f_time = $COF_f_exists ? filemtime($COF_file) : 0;
$CONFIG_f_time = filemtime('config.php');
$includes = file_exists($JS_file) ? file_get_contents($JS_file) : '';
$includes = explode('*/',$includes);
$includes = $includes[0];
$includes = explode("Includes:",$includes);
$includes = $includes[1];
$includes = explode("\n  ",$includes);
foreach ($includes as $ifile){
  if($ifile){
    $f = $_SERVER['DOCUMENT_ROOT'].$ifile;
    if(file_exists($f) && filemtime($f) > $COF_f_time){
      $COF_f_time = filemtime($f);
    }
  }
};

// check cached javascript file for latest time of change
$JS_f_time = $JS_f_exists ? filemtime($JS_file) : 0;

// save compiled version
if($allowCacheCreation && isset($_POST['path']) && isset($_POST['store'])){
  if(str_replace('__tickets.txt','',$_POST['path']) != $_POST['path']){die();}
  if(!isset($_POST['ticket'])){die("No ticket");}
  $tickets  = explode("\n",file_get_contents('cache/__tickets.txt'));
  if(!in_array($_POST['ticket'],$tickets)){
    die('<br /><b>Warning</b>:');
  }
  else {
    file_put_contents('cache/__tickets.txt',str_replace($_POST['ticket']."\n",'',implode("\n",$tickets)));
  }
  $path = dirname(__FILE__).'/cache'.str_replace('.cof','.js',str_replace('..','',$_POST['path']));
  if(!file_exists($path)){
    mkdir(dirname($path),0777,true);
  }
  else {
    unlink($path);
  }
  $readVer = explode('CoffeeScript',file_get_contents('coffee-script.js'));
  $readVer = explode("\n",$readVer[1]);
  $readVer = $readVer[0];
  $store = utf8_encode($_POST['store']);
  if($uglifyJS){
    $session = curl_init('http://marijnhaverbeke.nl/uglifyjs');
    curl_setopt ($session, CURLOPT_POST, true);
    curl_setopt ($session, CURLOPT_POSTFIELDS, 'js_code='.urlencode($store));
    curl_setopt($session, CURLOPT_HEADER, false);
    curl_setopt($session, CURLOPT_RETURNTRANSFER, true);
    $store = curl_exec($session);
    curl_close($session);
  };
  $toStore = "/*\n  Auto-generated JavaScript, using CoffeeMaker v".$version."\n".
    "  and the CoffeeScript".$readVer.
    "\n\n  CoffeeScript last modified: ".date("F d Y H:i:s", $COF_f_time ).
    "\n  Compiled to JavaScript:     ".date ("F d Y H:i:s").
    ($uglifyJS ? "\n  Minified using UglifyJS." : '').
    ($_POST['includes'] ? "\n\n  Includes:\n  ".$_POST['includes']."\n" : '').
    "\n*/\n\n".$store;
  $toStore = utf8_encode(str_replace("\r","",$toStore));
  file_put_contents($path,$toStore);
  die();
};

// if we need to compile
if($allowCacheCreation && ($JS_f_time < $COF_f_time || $JS_f_time < $CONFIG_f_time)){
  // include once of the coffee-script compiler and the coffeemaker.js-script (client side)
  // and always include a new script tag same as the original
  $ticket = sha1(mt_rand().mt_rand());
  file_put_contents('cache/__tickets.txt',$ticket."\n",FILE_APPEND);
  $goAfterwards = '<script type="text/javascript" src="'.str_replace($_SERVER['DOCUMENT_ROOT'],'',__FILE__)
  .'?rand='.rand().'&file='.$_GET['file'].'"></script>';
  echo('window.cofeemaker ? window.coffeemaker.compile("'
  .str_replace($_SERVER['DOCUMENT_ROOT'],'',__FILE__).'?passthru='.$_GET['file']
  .'") && document.write(\''.$goAfterwards.'\') : (window.coffeemaker = {tocompile:"'
  .str_replace($_SERVER['DOCUMENT_ROOT'],'',__FILE__)
  .'?passthru='.$_GET['file'].'"'
  .',ticket:"'.$ticket.'"'
  .',allowIncludes:0'.$allowIncludes
  .',splitVarDeclarations:0'.$splitVarDeclarations
  .',keepCoffeeComments:0'.$keepCoffeeComments
  .',keepBlankLines:0'.$keepBlankLines
  .',splitConcatenations:0'.$splitConcatenations 
  .',uglifyJS:0'.$uglifyJS 
  .'}) && document.write'
  .'(\'<script type="text/javascript" src="'.str_replace($_SERVER['DOCUMENT_ROOT'],'',dirname(__FILE__))
  .'/coffee-script.js"></script><script type="text/javascript" src="'
  .str_replace($_SERVER['DOCUMENT_ROOT'],'',dirname(__FILE__))
  .'/coffeemaker.js"></script>'.$goAfterwards.'\');');
}
// otherwise spit out the coffee
else {
  echo(file_get_contents(dirname(__FILE__).'/cache'.str_replace('.cof','.js',str_replace('..','',$_GET['file']))));
};