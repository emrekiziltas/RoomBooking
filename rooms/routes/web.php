<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
     $count = App\Models\LookupValue::count();
    return "LookupValue count: $count";
  //  return view('welcome');
});
