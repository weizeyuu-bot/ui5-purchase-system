sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast"
], function (Controller, History, MessageToast) {
    "use strict";

    return Controller.extend("myapp.controller.PurchaseOrderDetail", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RoutePurchaseOrderDetail").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            var oModel = this.getView().getModel("purchaseOrders");
            var aOrders = oModel.getProperty("/purchaseOrders");
            var oOrder = aOrders.find(function (item) {
                return item.id === sOrderId;
            });
            if (oOrder) {
                this.getView().bindElement({
                    path: "/purchaseOrders/" + aOrders.indexOf(oOrder),
                    model: "purchaseOrders"
                });
            }
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrderList", {}, true);
            }
        },

        onSave: function () {
            MessageToast.show("采购订单保存成功");
            this.onNavBack();
        },

        onCancel: function () {
            this.onNavBack();
        },

        onNavigateToMaterial: function (oEvent) {
            var sMaterialId = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RouteMaterialDetail", {
                materialId: sMaterialId
            });
        },

        onNavigateToSupplier: function (oEvent) {
            var sSupplierId = oEvent.getSource().getText();
            this.getOwnerComponent().getRouter().navTo("RouteSupplierDetail", {
                supplierId: sSupplierId
            });
        }

    });
});