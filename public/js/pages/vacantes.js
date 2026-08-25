"use strict";
import{initLayout}from"../common/layout.js";
import{initResourcePage}from"../common/resource-page.js";
if(!await initLayout())await new Promise(()=>{});
await initResourcePage("vacantes");
