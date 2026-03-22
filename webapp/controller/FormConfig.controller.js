sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("myapp.controller.FormConfig", {
        onInit: function () {
            var oModel = this.getOwnerComponent().getModel("process");
            if (oModel) {
                this.getView().setModel(oModel, "process");
            }
        },

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteHome");
        }
    });
});