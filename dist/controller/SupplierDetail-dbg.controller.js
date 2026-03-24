sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.SupplierDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteSupplierDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sSupplierId = oEvent.getParameter("arguments").supplierId;
            var oSupplierModel = this.getView().getModel("suppliers");
            var aSuppliers = oSupplierModel.getProperty("/suppliers");
            var oSupplier = aSuppliers.find(function(sup) {
                return sup.id === sSupplierId;
            });
            if (oSupplier) {
                this.getView().bindElement({
                    path: "/suppliers/" + aSuppliers.indexOf(oSupplier),
                    model: "suppliers"
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteSupplierList", {}, true);
            }
        },

        onSave: function () {
            // In a real app, save to backend
            MessageToast.show(this._getText("supplierSaved"));
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