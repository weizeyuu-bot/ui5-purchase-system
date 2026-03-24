sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.MaterialDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteMaterialDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sMaterialId = oEvent.getParameter("arguments").materialId;
            var oModel = this.getView().getModel("materials");
            var aMaterials = oModel.getProperty("/materials");
            var oMaterial = aMaterials.find(function (item) {
                return item.id === sMaterialId;
            });
            if (oMaterial) {
                this.getView().bindElement({
                    path: "/materials/" + aMaterials.indexOf(oMaterial),
                    model: "materials"
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteMaterialList", {}, true);
            }
        },

        onSave: function () {
            MessageToast.show(this._getText("materialSaved"));
            this.onNavBack();
        },

        onCancel: function () {
            this.onNavBack();
        },

        _getText: function (sKey) {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sKey);
        }
    });
});