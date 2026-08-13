 "use strict";
 var RWMCS = RWMCS || {};
 RWMCS.VZRepro = (function () {
   var PANE_ID = "rwmcsVZReproPane";
   var WEB_RESOURCE = "rwmcs_vzAgentSidePanelHTML";
 
   async function onFormLoad() {
     try {
       var existing = Xrm.App.sidePanes.getPane(PANE_ID);
       if (existing) {
         existing.select();
         return;
       }
       var pane = await Xrm.App.sidePanes.createPane({
         paneId: PANE_ID,
         title: "Dynamics AI",
         imageSrc: "WebResources/rwmcs_bot.svg",
         canClose: true,
         isSelected: true,
         width: 400
       });
       pane.navigate({
         pageType: "webresource",
         webresourceName: WEB_RESOURCE
       });
     } catch (e) {
       console.error("[vzrepro] sidebar failed", e);
     }
   }
 
   return { onFormLoad: onFormLoad };
 })();